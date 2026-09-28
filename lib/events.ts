import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventCategory } from "@/lib/constants/categories";
import type { Database } from "@/lib/supabase";

type Tables = Database["public"]["Tables"];

export type EventRow = Tables["events"]["Row"];
export type RegistrationRow = Tables["event_registrations"]["Row"];

type DbClient = SupabaseClient<Database>;

/** Exact columns a list view needs — never `select('*')` (code standards §4). */
const LIST_COLUMNS =
  "id, title, category, location, start_time, end_time, capacity, cover_image_url, created_by, created_at";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, description`;

/** Row limit per page. List views are always paginated. */
export const EVENTS_PAGE_SIZE = 12;

export type EventListFilters = {
  category?: EventCategory | null;
  /** Matches the title or location, case-insensitively, in Postgres. */
  search?: string;
  /** `upcoming` keeps only events that have not ended. Omit for all. */
  when?: "upcoming" | null;
  page?: number;
  pageSize?: number;
};

export type EventListResult = {
  rows: (EventRow & { registration_count: number })[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

export type EventWriteResult = {
  row: EventRow | null;
  error: string | null;
};

function emptyResult(page = 0, pageSize = EVENTS_PAGE_SIZE): EventListResult {
  return { rows: [], count: 0, page, pageSize, totalPages: 1, error: null };
}

/**
 * Escapes the ILIKE metacharacters so a user's search term is matched
 * literally. Without this, searching for `100%` matches every row.
 */
function escapeLikeTerm(term: string): string {
  return term.replace(/[%_\\]/g, (match) => `\\${match}`);
}

export async function listEvents(
  client: DbClient,
  filters: EventListFilters = {},
): Promise<EventListResult> {
  const pageSize = Math.max(1, filters.pageSize ?? EVENTS_PAGE_SIZE);
  const page = Math.max(0, filters.page ?? 0);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("events")
    .select(`${LIST_COLUMNS}, event_registrations(count)`, { count: "exact" })
    .order("start_time", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.when === "upcoming") {
    query = query.gte("end_time", new Date().toISOString());
  }

  const search = filters.search?.trim();
  if (search) {
    const term = escapeLikeTerm(search);
    query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return { ...emptyResult(page, pageSize), error: error.message };
  }

  const total = count ?? 0;

  return {
    rows: (data ?? []).map((row) => {
      const { event_registrations, ...rest } = row as unknown as EventRow & {
        event_registrations?: Array<{ count: number }> | null;
      };
      return {
        ...rest,
        registration_count: event_registrations?.[0]?.count ?? 0,
      } as EventRow & { registration_count: number };
    }),
    count: total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    error: null,
  };
}

export async function getEvent(
  client: DbClient,
  id: string,
): Promise<EventWriteResult> {
  const { data, error } = await client
    .from("events")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  return { row: (data as EventRow | null) ?? null, error: null };
}

export type EventDraft = {
  title: string;
  description: string;
  category: EventCategory | null;
  location: string | null;
  startTime: string;
  endTime: string;
  capacity: number | null;
  coverImageUrl: string | null;
};

export async function createEvent(
  client: DbClient,
  draft: EventDraft,
  createdBy: string | null,
): Promise<EventWriteResult> {
  const { data, error } = await client
    .from("events")
    .insert({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      location: draft.location,
      start_time: draft.startTime,
      end_time: draft.endTime,
      capacity: draft.capacity,
      cover_image_url: draft.coverImageUrl,
      // Clerk ids are not UUIDs; the column is TEXT post-20260928030000,
      // but the generated Insert type still expects `string | undefined`.
      created_by: createdBy === null ? undefined : createdBy,
    })
    .select(DETAIL_COLUMNS)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: (data ?? null) as unknown as EventRow | null, error: null };
}

export async function updateEvent(
  client: DbClient,
  id: string,
  draft: EventDraft,
): Promise<EventWriteResult> {
  // `created_by` is intentionally omitted: an edit must never reassign
  // authorship.
  const { data, error } = await client
    .from("events")
    .update({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      location: draft.location,
      start_time: draft.startTime,
      end_time: draft.endTime,
      capacity: draft.capacity,
      cover_image_url: draft.coverImageUrl,
    })
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: data as EventRow, error: null };
}

export async function deleteEvent(
  client: DbClient,
  id: string,
): Promise<{ deleted: boolean; error: string | null }> {
  const { error } = await client.from("events").delete().eq("id", id);
  if (error) return { deleted: false, error: error.message };
  return { deleted: true, error: null };
}

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

/** Registrant projection with the student join flattened for display. */
export type RegistrantRow = {
  id: string;
  registered_at: string;
  status: string;
  student_name: string | null;
  student_email: string | null;
  student_campus_id: string | null;
};

export async function listRegistrants(
  client: DbClient,
  eventId: string,
): Promise<{ rows: RegistrantRow[]; error: string | null }> {
  const { data, error } = await client
    .from("event_registrations")
    .select(
      "id, registered_at, status, student:users!event_registrations_student_id_fkey (id, full_name, email, campus_id)",
    )
    .eq("event_id", eventId)
    .order("registered_at", { ascending: true });

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((row) => {
      const student = (row as unknown as { student?: { full_name: string | null; email: string | null; campus_id: string | null } | null })
        .student;
      return {
        id: row.id,
        registered_at: row.registered_at,
        status: row.status,
        student_name: student?.full_name ?? null,
        student_email: student?.email ?? null,
        student_campus_id: student?.campus_id ?? null,
      };
    }),
    error: null,
  };
}

/**
 * Live seat count for one event. `count: 'exact', head: true` returns only
 * the number — no rows travel over the wire.
 */
export async function getEventRegistrationCount(
  client: DbClient,
  eventId: string,
): Promise<number> {
  const { count, error } = await client
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * The signed-in student's registrations, newest first, joined with the
 * event. RLS restricts the result to the caller's own rows, so no
 * client-side filter is needed (or trustworthy).
 */
export async function listMyRegistrations(
  client: DbClient,
): Promise<{ rows: Array<RegistrationRow & { event: EventRow | null }>; error: string | null }> {
  const { data, error } = await client
    .from("event_registrations")
    .select("id, event_id, registered_at, status, event:events!event_registrations_event_id_fkey (*)")
    .order("registered_at", { ascending: false });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as unknown as Array<RegistrationRow & { event: EventRow | null }>, error: null };
}

/**
 * Registers the signed-in student. Identity comes from the session, never
 * the form. Returns the human-readable failure so callers can toast it.
 *
 * Capacity is enforced by the `event_capacity_trigger` database trigger, so
 * even a race between two requests cannot overbook the event; this catches
 * the trigger's error and translates it.
 */
export async function registerForEvent(
  client: DbClient,
  eventId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await client
    .from("event_registrations")
    .insert({ event_id: eventId });

  if (!error) return { ok: true, error: null };

  if (error.code === "23505") {
    return { ok: false, error: "You are already registered for this event." };
  }
  if (error.message.includes("capacity") || error.code === "23514") {
    return { ok: false, error: "This event is at full capacity." };
  }
  return { ok: false, error: error.message };
}

/**
 * Cancels the signed-in student's own registration. RLS guarantees the
 * delete can only ever touch the caller's row.
 */
export async function unregisterFromEvent(
  client: DbClient,
  eventId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await client
    .from("event_registrations")
    .delete()
    .eq("event_id", eventId);

  if (!error) return { ok: true, error: null };
  return { ok: false, error: error.message };
}

/**
 * Registrant list as CSV for the admin export button.
 */
export function registrantsToCsv(rows: RegistrantRow[]): string {
  const escape = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const header = ["Student name", "Email", "Campus ID", "Registered at", "Status"].map(escape).join(",");
  const body = rows
    .map((row) =>
      [
        escape(row.student_name),
        escape(row.student_email),
        escape(row.student_campus_id),
        escape(row.registered_at),
        escape(row.status),
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}
