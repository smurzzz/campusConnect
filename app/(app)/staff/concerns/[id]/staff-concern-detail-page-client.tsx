"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { CampusPage, StatusBadge } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  addConcernMessage,
  assignConcern,
  getConcern,
  listConcernMessages,
  listPersonnel,
  toConcernStatusLabel,
  updateConcernStatus,
  type ConcernDetail,
  type PersonnelOption,
  type ThreadMessage,
} from "@/lib/concerns";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

const STATUS_OPTIONS = [
  ["pending", "Pending"],
  ["in_progress", "In Progress"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
] as const;

export default function StaffConcernDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useUser();
  const client = useSupabaseClient();

  const [concern, setConcern] = useState<ConcernDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchThread = useCallback(async () => {
    if (!id) {
      setError("Concern ID is missing");
      setLoading(false);
      return;
    }

    const [concernResult, messageResult] = await Promise.all([
      getConcern(client, id),
      listConcernMessages(client, id),
    ]);

    if (concernResult.error) {
      setError(concernResult.error);
    } else if (!concernResult.row) {
      setError("Concern not found or you don't have access to it.");
    } else {
      setConcern(concernResult.row);
      setError(null);
    }
    setMessages(messageResult.rows);
    setLoading(false);
  }, [client, id]);

  useEffect(() => {
    void fetchThread();
  }, [fetchThread]);

  // Assignment dropdown needs the personnel directory (admin SELECT policy
  // on `users`; personnel callers get an empty list and fall back to free
  // status updates only).
  useEffect(() => {
    void (async () => {
      const result = await listPersonnel(client);
      if (!result.error) setPersonnel(result.rows);
    })();
  }, [client]);

  const handleStatusChange = async (dbStatus: string) => {
    if (!concern) return;
    setStatusLoading(true);
    try {
      const result = await updateConcernStatus(client, concern.id, dbStatus as Parameters<typeof updateConcernStatus>[2]);
      if (!result.ok) {
        toast.error("Failed to update status", { description: result.error });
        return;
      }
      setConcern((prev) => (prev ? { ...prev, status: dbStatus } : prev));
      toast.success("Status updated — the student has been notified");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAssignChange = async (assigneeId: string | null) => {
    if (!concern) return;
    setAssignLoading(true);
    try {
      const result = await assignConcern(client, concern.id, assigneeId);
      if (!result.ok) {
        toast.error("Failed to update assignee", { description: result.error });
        return;
      }
      const name = personnel.find((p) => p.id === assigneeId)?.full_name ?? null;
      setConcern((prev) => (prev ? { ...prev, assigned_to: assigneeId, assignee_name: name } : prev));
      toast.success(assigneeId ? "Concern assigned" : "Assignment removed");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleReplySubmit = async () => {
    const text = reply.trim();
    if (!text || !id || !user) return;

    setReplyLoading(true);
    try {
      const result = await addConcernMessage(client, id, user.id, text);
      if (!result.ok) {
        toast.error("Failed to send reply", { description: result.error });
        return;
      }
      setReply("");
      toast.success("Reply sent");
      await fetchThread();
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return (
      <CampusPage page="staff-concern-detail">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </CampusPage>
    );
  }

  if (error || !concern) {
    return (
      <CampusPage page="staff-concern-detail">
        <p>{error ?? "Concern not found"}</p>
      </CampusPage>
    );
  }

  return (
    <CampusPage page="staff-concern-detail">
      <Link
        href="/staff/concerns"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft /> Back to all concerns
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="section-panel">
          <span className="category-badge">{concern.category ?? "General"}</span>
          <h2 className="mt-3 text-xl font-bold">{concern.subject}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted by {concern.student_name ?? "a student"}
            {concern.student_email ? ` (${concern.student_email})` : ""} ·{" "}
            {new Date(concern.created_at).toLocaleDateString()}
          </p>
          <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{concern.description}</p>

          {concern.attachment_url && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Attachment</p>
              <a
                href={concern.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View attachment
              </a>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="section-title">Conversation</h3>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No replies yet.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {messages.map((msg) => (
                  <div className="thread-item" key={msg.id}>
                    <span className="avatar">{(msg.sender_name ?? "?").charAt(0).toUpperCase()}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{msg.sender_name ?? "Unknown"}</strong>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 border-t border-border pt-5">
              <Textarea
                placeholder="Reply to the student…"
                className="min-h-24"
                disabled={replyLoading}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <Button disabled={replyLoading || !reply.trim()} onClick={() => void handleReplySubmit()}>
                  {replyLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send /> Send response
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <aside className="section-panel h-fit">
          <h3 className="section-title">Manage concern</h3>
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>
                <div className="flex items-center gap-2">
                  <select
                    className="field-select w-full"
                    aria-label="Update status"
                    disabled={statusLoading}
                    value={concern.status}
                    onChange={(event) => void handleStatusChange(event.target.value)}
                  >
                    {!STATUS_OPTIONS.some(([value]) => value === concern.status) && (
                      <option value={concern.status}>{toConcernStatusLabel(concern.status)}</option>
                    )}
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {statusLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                </div>
              </dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>
                <div className="flex items-center gap-2">
                  <select
                    className="field-select w-full"
                    aria-label="Assign to personnel"
                    disabled={assignLoading}
                    value={concern.assigned_to ?? ""}
                    onChange={(event) => void handleAssignChange(event.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {personnel.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name ?? person.email ?? person.id}
                      </option>
                    ))}
                  </select>
                  {assignLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                </div>
              </dd>
            </div>
            <div>
              <dt>Current status</dt>
              <dd>
                <StatusBadge status={toConcernStatusLabel(concern.status)} />
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{concern.category ?? "—"}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{new Date(concern.created_at).toLocaleString()}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-md bg-primary-soft p-3 text-xs text-primary">
            Status changes notify the student automatically.
          </p>
        </aside>
      </div>
    </CampusPage>
  );
}
