import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  type AnnouncementAudience,
  type AnnouncementCategory,
} from "@/lib/constants/categories";
import {
  PUBLICATION_DB_VALUES,
  toPublicationDbValue,
  type PublicationDbValue,
  type PublicationStatus,
} from "@/lib/constants/statuses";
import type { Database } from "@/lib/supabase";

type Tables = Database["public"]["Tables"];

export type AnnouncementRow = Tables["announcements"]["Row"];
export type AnnouncementInsert = Tables["announcements"]["Insert"];

type AnnouncementClient = SupabaseClient<Database>;

/** Exact columns a list view needs — never `select('*')` (code standards §4). */
const LIST_COLUMNS =
  "id, title, category, status, audience, image_url, created_by, created_at, body";

/** Every write returns the same projection so callers get a complete row back. */
const DETAIL_COLUMNS =
  "id, title, category, status, audience, image_url, created_by, created_at, body";

/** Row limit per page. List views are always paginated. */
export const ANNOUNCEMENTS_PAGE_SIZE = 12;

export type AnnouncementListFilters = {
  /**
   * `published` only — what guests and students are allowed to see. Set by
   * default so forgetting it fails closed rather than leaking drafts.
   */
  publishedOnly?: boolean;
  /** Admins can narrow to a single publication state. */
  status?: PublicationDbValue;
  category?: AnnouncementCategory | null;
  /** Matches the title or body, case-insensitively, in Postgres. */
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AnnouncementListResult = {
  rows: AnnouncementRow[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Raw Supabase failure so callers can render a human-readable message. */
  error: string | null;
};

export type AnnouncementWriteResult = {
  row: AnnouncementRow | null;
  error: string | null;
};

function emptyResult(page = 0, pageSize = ANNOUNCEMENTS_PAGE_SIZE): AnnouncementListResult {
  return { rows: [], count: 0, page, pageSize, totalPages: 1, error: null };
}

/**
 * Escapes the ILIKE metacharacters so a user's search term is matched
 * literally. Without this, searching for `100%` matches every row.
 */
function escapeLikeTerm(term: string): string {
  return term.replace(/[%_\\]/g, (match) => `\\${match}`);
}

export async function listAnnouncements(
  client: AnnouncementClient,
  filters: AnnouncementListFilters = {},
): Promise<AnnouncementListResult> {
  const pageSize = Math.max(1, filters.pageSize ?? ANNOUNCEMENTS_PAGE_SIZE);
  const page = Math.max(0, filters.page ?? 0);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Fails closed: an unset `publishedOnly` still means "published only". Only
  // `publishedOnly: false` (admin) may omit the filter entirely to see all
  // states, or narrow to one.
  const status =
    filters.publishedOnly === false
      ? filters.status
      : PUBLICATION_DB_VALUES.PUBLISHED;

  let query = client
    .from("announcements")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  const search = filters.search?.trim();
  if (search) {
    const term = escapeLikeTerm(search);
    query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return { ...emptyResult(page, pageSize), error: error.message };
  }

  const total = count ?? 0;

  return {
    rows: (data ?? []) as AnnouncementRow[],
    count: total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    error: null,
  };
}

export async function getAnnouncement(
  client: AnnouncementClient,
  id: string,
): Promise<AnnouncementWriteResult> {
  const { data, error } = await client
    .from("announcements")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  return { row: (data as AnnouncementRow | null) ?? null, error: null };
}

export type AnnouncementDraft = {
  title: string;
  body: string;
  category: AnnouncementCategory | null;
  audience: AnnouncementAudience | null;
  status: PublicationStatus;
  imageUrl?: string | null;
};

/**
 * `created_by` is the Clerk user id, taken from the session by the caller —
 * never from the form, so a user cannot forge authorship. The column is
 * nullable so a row created before the session resolved is still readable.
 */
function toInsert(draft: AnnouncementDraft, createdBy: string | null): AnnouncementInsert {
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    category: draft.category,
    audience: draft.audience,
    status: toPublicationDbValue(draft.status),
    image_url: draft.imageUrl?.trim() || null,
    created_by: createdBy,
  };
}

export async function createAnnouncement(
  client: AnnouncementClient,
  draft: AnnouncementDraft,
  createdBy: string | null,
): Promise<AnnouncementWriteResult> {
  const { data, error } = await client
    .from("announcements")
    .insert(toInsert(draft, createdBy))
    .select(DETAIL_COLUMNS)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: data as AnnouncementRow, error: null };
}

export async function updateAnnouncement(
  client: AnnouncementClient,
  id: string,
  draft: AnnouncementDraft,
): Promise<AnnouncementWriteResult> {
  // `created_by` is intentionally omitted: an edit must never reassign
  // authorship.
  const { data, error } = await client
    .from("announcements")
    .update({
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category,
      audience: draft.audience,
      status: toPublicationDbValue(draft.status),
      image_url: draft.imageUrl?.trim() || null,
    })
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: data as AnnouncementRow, error: null };
}

/** Flips a single announcement between published and draft. */
export async function setAnnouncementStatus(
  client: AnnouncementClient,
  id: string,
  status: PublicationStatus,
): Promise<AnnouncementWriteResult> {
  const { data, error } = await client
    .from("announcements")
    .update({ status: toPublicationDbValue(status) })
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: data as AnnouncementRow, error: null };
}

export async function deleteAnnouncement(
  client: AnnouncementClient,
  id: string,
): Promise<{ deleted: boolean; error: string | null }> {
  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) return { deleted: false, error: error.message };
  return { deleted: true, error: null };
}

export function isAnnouncementCategory(value: string): value is AnnouncementCategory {
  return (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(value);
}

export function isAnnouncementAudience(value: string): value is AnnouncementAudience {
  return (ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(value);
}
