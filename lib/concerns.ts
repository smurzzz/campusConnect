import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConcernCategory } from "@/lib/constants/categories";
import type { Database } from "@/lib/supabase";

type Tables = Database["public"]["Tables"];

export type ConcernRow = Tables["concerns"]["Row"];
export type ConcernMessageRow = Tables["concern_messages"]["Row"];

type DbClient = SupabaseClient<Database>;

/** Exact columns a list view needs — never `select('*')` (code standards §4). */
const LIST_COLUMNS =
  "id, subject, category, status, student_id, assigned_to, created_at";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, description, attachment_url`;

/**
 * A concern row joined with the student/assignee names the tables render.
 * PostgREST returns embeds as arrays for many-to-one joins, so callers get
 * flattened strings here.
 */
export type ConcernListItem = {
  id: string;
  subject: string;
  category: string | null;
  status: string;
  created_at: string;
  student_id: string;
  assigned_to: string | null;
  student_name: string | null;
  assignee_name: string | null;
};

type ConcernEmbed = {
  id: string;
  subject: string;
  category: string | null;
  status: string;
  created_at: string;
  student_id: string;
  assigned_to: string | null;
  student?: { full_name: string | null } | { full_name: string | null }[] | null;
  assignee?: { full_name: string | null } | { full_name: string | null }[] | null;
};

/** Detail embed uses the same student shape (full_name only). */
type ConcernDetailEmbed = ConcernEmbed;

function flattenName(
  embed: { full_name: string | null } | { full_name: string | null }[] | null | undefined,
): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0]?.full_name ?? null;
  return embed.full_name ?? null;
}

function toListItem(row: ConcernEmbed): ConcernListItem {
  return {
    id: row.id,
    subject: row.subject,
    category: row.category,
    status: row.status,
    created_at: row.created_at,
    student_id: row.student_id,
    assigned_to: row.assigned_to,
    student_name: flattenName(row.student),
    assignee_name: flattenName(row.assignee),
  };
}

/**
 * Concerns visible to the caller. Students get their own rows (enforced by
 * RLS, the filter is a belt-and-braces match); personnel and admins get
 * everything. Pass a `studentId` to narrow the list server-side.
 */
export async function listConcerns(
  client: DbClient,
  options: { studentId?: string | null } = {},
): Promise<{ rows: ConcernListItem[]; error: string | null }> {
  let query = client
    .from("concerns")
    .select(
      `${LIST_COLUMNS},
       student:users!concerns_student_id_fkey (full_name),
       assignee:users!concerns_assigned_to_fkey (full_name)`,
    )
    .order("created_at", { ascending: false });

  if (options.studentId) {
    query = query.eq("student_id", options.studentId);
  }

  const { data, error } = await query;
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((row) => toListItem(row as unknown as ConcernEmbed)), error: null };
}

export type ConcernDetail = Omit<ConcernRow, "description"> & {
  /** The column is nullable in Postgres; the generated Row type is not. */
  description: string | null;
  student_name: string | null;
  student_email: string | null;
  assignee_name: string | null;
};

export async function getConcern(
  client: DbClient,
  id: string,
): Promise<{ row: ConcernDetail | null; error: string | null }> {
  const { data, error } = await client
    .from("concerns")
    .select(
      `${DETAIL_COLUMNS},
       student:users!concerns_student_id_fkey (full_name),
       assignee:users!concerns_assigned_to_fkey (full_name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: null };

  // The embed is typed loosely on purpose: PostgREST returns many-to-one
  // embeds as arrays, and the generated row type cannot express that.
  const embed = data as unknown as ConcernDetailEmbed & {
    description: string | null;
    attachment_url: string | null;
  };

  const student = Array.isArray(embed.student) ? embed.student[0] : embed.student;
  const assignee = Array.isArray(embed.assignee) ? embed.assignee[0] : embed.assignee;

  return {
    row: {
      id: embed.id,
      subject: embed.subject,
      category: embed.category,
      description: embed.description ?? null,
      status: embed.status,
      student_id: embed.student_id,
      assigned_to: embed.assigned_to,
      attachment_url: embed.attachment_url ?? null,
      created_at: embed.created_at,
      student_name: student?.full_name ?? null,
      student_email: null,
      assignee_name: assignee?.full_name ?? null,
    },
    error: null,
  };
}

export type ThreadMessage = {
  id: string;
  message: string;
  created_at: string;
  sender_id: string | null;
  sender_name: string | null;
};

export async function listConcernMessages(
  client: DbClient,
  concernId: string,
): Promise<{ rows: ThreadMessage[]; error: string | null }> {
  const { data, error } = await client
    .from("concern_messages")
    .select(
      "id, message, created_at, sender_id, sender:users!concern_messages_sender_id_fkey (full_name)",
    )
    .eq("concern_id", concernId)
    .order("created_at", { ascending: true });

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((row) => {
      const embed = row as unknown as {
        id: string;
        message: string;
        created_at: string;
        sender_id: string | null;
        sender?: { full_name: string | null } | { full_name: string | null }[] | null;
      };
      return {
        id: embed.id,
        message: embed.message,
        created_at: embed.created_at,
        sender_id: embed.sender_id,
        sender_name: flattenName(embed.sender),
      };
    }),
    error: null,
  };
}

/** Adds a reply. The sender is the session user — never a form field. */
export async function addConcernMessage(
  client: DbClient,
  concernId: string,
  senderId: string | null,
  message: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await client.from("concern_messages").insert({
    concern_id: concernId,
    sender_id: senderId,
    message: message.trim(),
  });
  if (!error) return { ok: true, error: null };
  return { ok: false, error: error.message };
}

export type ConcernDbStatus = "pending" | "in_progress" | "resolved" | "closed";

/** Maps the Title Case UI vocabulary onto the lowercase stored values. */
export function toConcernDbStatus(label: string): ConcernDbStatus | null {
  switch (label) {
    case "Pending":
      return "pending";
    case "In Progress":
      return "in_progress";
    case "Resolved":
      return "resolved";
    case "Closed":
      return "closed";
    default:
      return null;
  }
}

export function toConcernStatusLabel(value: string): string {
  switch (value) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

export async function updateConcernStatus(
  client: DbClient,
  concernId: string,
  status: ConcernDbStatus,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await client.from("concerns").update({ status }).eq("id", concernId);
  if (!error) return { ok: true, error: null };
  return { ok: false, error: error.message };
}

export async function assignConcern(
  client: DbClient,
  concernId: string,
  assigneeId: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await client.from("concerns").update({ assigned_to: assigneeId }).eq("id", concernId);
  if (!error) return { ok: true, error: null };
  return { ok: false, error: error.message };
}

export type PersonnelOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

/**
 * Personnel directory for assignment dropdowns. Requires the admin SELECT
 * policy on `users`; personnel users see their own row only, so the dropdown
 * is populated for admins (who are the ones assigning).
 */
export async function listPersonnel(
  client: DbClient,
): Promise<{ rows: PersonnelOption[]; error: string | null }> {
  const { data, error } = await client
    .from("users")
    .select("id, full_name, email")
    .in("role", ["personnel", "staff"])
    .order("full_name", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: data ?? [], error: null };
}

/**
 * Uploads an attachment into the `concern-attachments` bucket under the
 * owner's Clerk-id folder (matching the storage RLS policy), then returns
 * its public URL. The old code uploaded to the bucket root and failed.
 */
export async function uploadConcernAttachment(
  client: DbClient,
  ownerId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "-");
  const path = `${ownerId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await client.storage
    .from("concern-attachments")
    .upload(path, file, { upsert: false });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = client.storage.from("concern-attachments").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/**
 * Submits a concern. `studentId` comes from the session; the lowercase
 * status matches the column default and the staff status vocabulary.
 */
export async function createConcern(
  client: DbClient,
  input: {
    studentId: string;
    subject: string;
    description: string;
    category: ConcernCategory;
    attachmentUrl?: string | null;
  },
): Promise<{ ok: boolean; error: string | null; id: string | null }> {
  const { data, error } = await client
    .from("concerns")
    .insert({
      student_id: input.studentId,
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: input.category,
      attachment_url: input.attachmentUrl ?? null,
      // Stored lowercase to match the staff status vocabulary.
      status: "pending" as const,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message, id: null };
  return { ok: true, error: null, id: data?.id ?? null };
}
