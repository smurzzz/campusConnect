import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { clerkClient, type WebhookEvent } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

  if (!WEBHOOK_SECRET) {
    return new Response('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local', {
      status: 500,
    })
  }

  // `headers()` is async as of Next 15.
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent

  // Verify the webhook.
  //
  // NB: svix 2.x verifies the signature but returns `undefined` even on
  // success (it calls the underlying verifier with `jsonParse: false`), so
  // the verified body is parsed here rather than trusted from `verify()`.
  try {
    wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
    evt = JSON.parse(body) as unknown as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type;

  // `user.created` and `user.updated` are both handled as an upsert. Without a
  // `user.created` branch the row was never created, so `user.updated` had
  // nothing to match against and the users table stayed empty.
  //
  // This uses the service-role client because a webhook carries no user
  // session. That is also the only way it can work at all: `public.users` has
  // no INSERT and no DELETE policy, so an anon/session client is rejected.
  const admin = createSupabaseAdminClient();

  if (eventType === 'user.created' || eventType === 'user.updated') {
    // Clerk v7 delivers raw webhook payloads, but `WebhookEvent['data']` is
    // typed with the camelCase frontend object shape. The keys read below are
    // the snake_case ones that are actually on the wire, so the payload is
    // widened here rather than lying about the shape of `evt.data`.
    const { id, ...userData } = evt.data as unknown as {
      id: string
      first_name?: string | null
      last_name?: string | null
      image_url?: string | null
      primary_email_address_id?: string | null
      email_addresses?: Array<{ id: string; email_address: string }>
      public_metadata?: { role?: string }
      unsafe_metadata?: { campusId?: string }
    }

    const clerkRole = userData.public_metadata?.role;
    // New accounts carry no `publicMetadata.role` yet (the sign-up resource
    // rejects unknown publicMetadata, so the custom flow never sets one).
    // Default them to 'student' on creation so `public.jwt_role()`-driven RLS
    // and the session-token `role` claim resolve for every fresh sign-up.
    // Updates stay conditional below: an admin promotion must never be reset
    // by an unrelated profile update.
    const roleForUpsert = clerkRole ?? (eventType === 'user.created' ? 'student' : undefined);

    // Mirror the default into Clerk `publicMetadata` too: the session token's
    // `metadata` claim (what `public.jwt_role()` falls back to) is built from
    // publicMetadata at token-mint time, so leaving it empty would keep
    // student RLS checks failing until an admin touched the account.
    if (eventType === 'user.created' && !clerkRole) {
      try {
        // `clerkClient` is a factory in Clerk v7 — await before `.users`.
        const client = await clerkClient();
        await client.users.updateUserMetadata(id, {
          publicMetadata: { role: 'student' },
        });
      } catch (error) {
        // Non-fatal: the Supabase row already carries the default, and the
        // next `user.updated` retries this via the `?? 'student'` fallback.
        console.error('Error defaulting publicMetadata.role for new user:', error);
      }
    }
    // The custom sign-up flow stashes the Campus ID in `unsafeMetadata` at
    // account creation (Clerk rejects unrecognised `publicMetadata` on the
    // sign-up resource), and the claim route mirrors it here once claimed.
    // The webhook persists it into `public.users.campus_id` so RLS-era joins
    // (registrant CSVs, user detail) and Campus ID sign-in resolve it.
    const campusId = userData.unsafe_metadata?.campusId;

    const fullName = [userData.first_name, userData.last_name]
      .filter((part): part is string => Boolean(part))
      .join(' ');

    const primaryEmail = userData.email_addresses?.find(
      (address) => address.id === userData.primary_email_address_id
    )?.email_address;

    try {
      const { error } = await admin.from('users').upsert(
        {
          // `public.users.id` is TEXT and holds the Clerk user id, so this
          // matches the id every other table's foreign key now expects.
          id,
          full_name: fullName || null,
          email: primaryEmail || null,
          avatar_url: userData.image_url || null,
          // Write the resolved role only when we actually have one, so an
          // unrelated `user.updated` can never silently reset an admin.
          ...(roleForUpsert ? { role: roleForUpsert } : {}),
          // Same defensive pattern for the Campus ID: only write when present,
          // so admin-managed values are never clobbered by an empty payload.
          ...(campusId ? { campus_id: campusId } : {}),
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error syncing Clerk user to Supabase:', error);
      }
    } catch (error) {
      console.error('Exception syncing Clerk user to Supabase:', error);
    }
  }

  // Handle user deletion
  if (eventType === 'user.deleted') {
    const { id } = evt.data as { id?: string };

    if (!id) {
      return new Response('Missing user id', { status: 400 })
    }

    try {
      const { error } = await admin
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting user from Supabase:', error);
      }
    } catch (error) {
      console.error('Exception deleting user from Supabase:', error);
    }
  }

  return new Response('', { status: 200 })
}