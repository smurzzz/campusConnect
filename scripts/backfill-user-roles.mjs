/**
 * Backfills Clerk publicMetadata.role='student' for every user whose
 * publicMetadata carries no role yet (accounts created before the webhook
 * default existed). Never overwrites an existing role — admins and personnel
 * are left untouched.
 *
 * Usage: node scripts/backfill-user-roles.mjs
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const CLERK_KEY = env.CLERK_SECRET_KEY;
if (!CLERK_KEY) {
  console.error("Missing CLERK_SECRET_KEY in .env.local");
  process.exit(1);
}

const clerk = async (path, init = {}) => {
  const res = await fetch(`https://api.clerk.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${CLERK_KEY}`, ...(init.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clerk ${path}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

let updated = 0;
let skipped = 0;
let offset = 0;

for (;;) {
  const body = await clerk(`users?limit=100&offset=${offset}`);
  // Clerk returns either { data: [...], total_count } or a bare array
  // depending on API version — tolerate both.
  const users = Array.isArray(body) ? body : body.data;
  const total = Array.isArray(body) ? users.length + (users.length === 100 ? 1 : 0) : body.total_count;
  if (!users?.length) break;

  for (const user of users) {
    const label = `${user.id} (${user.email_addresses?.find((e) => e.id === user.primary_email_address_id)?.email_address ?? "no email"})`;
    if (user.public_metadata?.role) {
      console.log(`skip  ${label} — role already "${user.public_metadata.role}"`);
      skipped += 1;
      continue;
    }
    // POST /metadata merges publicMetadata, so only `role` is written.
    await clerk(`users/${user.id}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_metadata: { role: "student" } }),
    });
    console.log(`set   ${label} — role -> "student"`);
    updated += 1;
  }

  offset += users.length;
  if (offset >= total) break;
}

console.log(`\ndone: ${updated} user(s) updated, ${skipped} already had roles, ${offset} scanned.`);
