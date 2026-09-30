import type { SupabaseClient } from "@supabase/supabase-js";

import { downscaleImage } from "@/lib/image-utils";
import type { Database } from "@/lib/supabase";

type Tables = Database["public"]["Tables"];

export type LostFoundRow = Tables["lost_found_items"]["Row"];

type DbClient = SupabaseClient<Database>;

/** Exact columns a list view needs — never `select('*')` (code standards §4). */
const LIST_COLUMNS = "id, type, name, category, location, date, status, photo_url, created_at";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, description, reported_by`;

/** List row with the reporter's name joined for staff tables. */
export type LostFoundListItem = LostFoundRow & { reporter_name: string | null };

type Embed = LostFoundRow & {
  reporter?: { full_name: string | null } | { full_name: string | null }[] | null;
};

function flattenReporter(embed: { reporter?: { full_name: string | null } | { full_name: string | null }[] | null }): string | null {
  if (!embed.reporter) return null;
  return Array.isArray(embed.reporter) ? (embed.reporter[0]?.full_name ?? null) : embed.reporter.full_name;
}

/**
 * All lost & found items, newest first. Reads are public
 * (`lost_found_items_select_public`); staff tables pass `withReporter` to
 * include the reporter join.
 */
export async function listLostFoundItems(
  client: DbClient,
  options: { withReporter?: boolean } = {},
): Promise<{ rows: LostFoundListItem[]; error: string | null }> {
  const columns = options.withReporter
    ? `${LIST_COLUMNS}, reporter:users!lost_found_items_reported_by_fkey (full_name)`
    : LIST_COLUMNS;

  const { data, error } = await client
    .from("lost_found_items")
    .select(columns)
    .order("created_at", { ascending: false });

  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((row) => {
      const embed = row as unknown as Embed;
      return { ...embed, reporter_name: flattenReporter(embed) };
    }),
    error: null,
  };
}

export async function getLostFoundItem(
  client: DbClient,
  id: string,
): Promise<{ row: LostFoundListItem | null; error: string | null }> {
  const { data, error } = await client
    .from("lost_found_items")
    .select(`${DETAIL_COLUMNS}, reporter:users!lost_found_items_reported_by_fkey (full_name)`)
    .eq("id", id)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: null };

  const embed = data as unknown as Embed;
  return { row: { ...embed, reporter_name: flattenReporter(embed) }, error: null };
}

/**
 * Uploads a photo into the `lost-found-attachments` bucket under the
 * owner's Clerk-id folder (matching the storage RLS policy).
 */
export async function uploadLostFoundPhoto(
  client: DbClient,
  ownerId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  // Photos are normalised to 1080p-class before upload.
  const uploadable = await downscaleImage(file);
  const safeName = uploadable.name.replace(/[^\w.\-]+/g, "-");
  const path = `${ownerId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await client.storage
    .from("lost-found-attachments")
    .upload(path, uploadable, { upsert: false });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = client.storage.from("lost-found-attachments").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/**
 * Submits a lost/found report. `reportedBy` is the Clerk id from the
 * session. `type` is stored lowercase to match the CHECK constraint.
 */
export async function createLostFoundItem(
  client: DbClient,
  input: {
    reportedBy: string;
    type: "lost" | "found";
    name: string;
    description: string;
    category: string;
    location: string;
    date: string;
    photoUrl?: string | null;
  },
): Promise<{ ok: boolean; error: string | null; id: string | null }> {
  const { data, error } = await client
    .from("lost_found_items")
    .insert({
      reported_by: input.reportedBy,
      type: input.type,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      location: input.location,
      date: input.date,
      photo_url: input.photoUrl ?? null,
      status: "reported",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message, id: null };
  return { ok: true, error: null, id: data?.id ?? null };
}

export const LOST_FOUND_DB_STATUSES = ["reported", "claimed"] as const;
export type LostFoundDbStatus = (typeof LOST_FOUND_DB_STATUSES)[number];

export async function updateLostFoundStatus(
  client: DbClient,
  id: string,
  status: LostFoundDbStatus,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await client.from("lost_found_items").update({ status }).eq("id", id);
  if (!error) return { ok: true, error: null };
  return { ok: false, error: error.message };
}
