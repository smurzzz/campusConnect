"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, Send, Archive, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, StatusBadge } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AnnouncementDraft, AnnouncementRow } from "@/lib/announcements";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  type AnnouncementAudience,
  type AnnouncementCategory,
} from "@/lib/constants/categories";
import {
  ALL_OPTION,
  PUBLICATION_STATUSES,
  PUBLICATION_STATUS_VALUES,
  toPublicationLabel,
  type PublicationStatus,
} from "@/lib/constants/statuses";
import { useAnnouncementMutations, useAnnouncements } from "@/lib/hooks/use-announcements";

const CATEGORY_OPTIONS = [ALL_OPTION, ...ANNOUNCEMENT_CATEGORIES] as const;
// No `ALL_OPTION` here: the vocabulary already contains "Everyone", so adding
// it would render two identical choices that store different values (null vs
// the literal). Legacy rows with a null audience fall back to "Everyone".
const AUDIENCE_OPTIONS = ANNOUNCEMENT_AUDIENCES;

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

type FormState = {
  title: string;
  body: string;
  category: AnnouncementCategory | typeof ALL_OPTION;
  audience: AnnouncementAudience;
  imageUrl: string;
  status: PublicationStatus;
};

function emptyForm(): FormState {
  return {
    title: "",
    body: "",
    category: ALL_OPTION,
    audience: "Everyone",
    imageUrl: "",
    status: PUBLICATION_STATUSES.DRAFT,
  };
}

function toFormState(row: AnnouncementRow): FormState {
  return {
    title: row.title,
    body: row.body,
    category: (row.category as AnnouncementCategory | null) ?? ALL_OPTION,
    audience: (row.audience as AnnouncementAudience | null) ?? "Everyone",
    imageUrl: row.image_url ?? "",
    status: toPublicationLabel(row.status),
  };
}

function toDraft(form: FormState): AnnouncementDraft {
  return {
    title: form.title,
    body: form.body,
    category: form.category === ALL_OPTION ? null : form.category,
    audience: form.audience,
    status: form.status,
    imageUrl: form.imageUrl.trim() || null,
  };
}

function validate(form: FormState): string | null {
  if (form.title.trim().length < 5) return "Give the announcement a title of at least 5 characters.";
  if (form.body.trim().length < 20) return "The body needs at least 20 characters.";
  return null;
}

type EditorDialogProps = {
  open: boolean;
  /** `null` creates a new announcement; a row edits that one. */
  editing: AnnouncementRow | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AnnouncementDraft) => void;
};

function EditorDialog({ open, editing, pending, onOpenChange, onSubmit }: EditorDialogProps) {
  const [form, setForm] = useState<FormState>(() => (editing ? toFormState(editing) : emptyForm()));
  const [problem, setProblem] = useState<string | null>(null);

  // Re-seed the form whenever the dialog opens for a different row.
  const seed = editing?.id ?? "new";
  const [seeded, setSeeded] = useState(seed);
  if (open && seeded !== seed) {
    setSeeded(seed);
    setForm(editing ? toFormState(editing) : emptyForm());
    setProblem(null);
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setProblem(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
          <DialogDescription>
            Drafts stay hidden from the public and from students until you publish them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Title</span>
            <Input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Enrollment opens Monday"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Body</span>
            <Textarea
              rows={6}
              value={form.body}
              onChange={(event) => update("body", event.target.value)}
              placeholder="What does the campus need to know?"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <select
                className="field-select w-full"
                value={form.category}
                onChange={(event) =>
                  update("category", event.target.value as FormState["category"])
                }
              >
                {CATEGORY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value === ALL_OPTION ? "No category" : value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Audience</span>
              <select
                className="field-select w-full"
                value={form.audience}
                onChange={(event) =>
                  update("audience", event.target.value as FormState["audience"])
                }
              >
                {AUDIENCE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Cover image URL <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Input
              value={form.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="https://…"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Publication state</span>
            <select
              className="field-select w-full"
              value={form.status}
              onChange={(event) => update("status", event.target.value as PublicationStatus)}
            >
              {PUBLICATION_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          {problem && <p className="text-sm text-danger">{problem}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              const message = validate(form);
              setProblem(message);
              if (message) return;
              onSubmit(toDraft(form));
            }}
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Create announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Admin announcement management.
 *
 * Reads and writes go through the token-bound Supabase client, so every change
 * is authorised by the RLS admin policies rather than by a client-side role
 * check alone.
 */
export function AnnouncementManager() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_OPTION);
  const [status, setStatus] = useState<PublicationStatus | typeof ALL_OPTION>(ALL_OPTION);
  const [page, setPage] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementRow | null>(null);

  const { announcements, count, totalPages, loading, error, refresh } = useAnnouncements({
    manageAll: true,
    search,
    category,
    status,
    page,
  });
  const { create, update, setStatus: changeStatus, remove, pending } = useAnnouncementMutations();

  const resetPaging = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (row: AnnouncementRow) => {
    setEditing(row);
    setEditorOpen(true);
  };

  const handleSubmit = async (draft: AnnouncementDraft) => {
    const result = editing ? await update(editing.id, draft) : await create(draft);
    const failure = "error" in result ? result.error : null;

    if (failure) {
      toast.error("Couldn't save the announcement", { description: failure });
      return;
    }

    toast.success(editing ? "Announcement updated" : "Announcement created");
    setEditorOpen(false);
    setEditing(null);
    void refresh();
  };

  const toggleStatus = async (row: AnnouncementRow) => {
    const next: PublicationStatus =
      toPublicationLabel(row.status) === PUBLICATION_STATUSES.PUBLISHED
        ? PUBLICATION_STATUSES.DRAFT
        : PUBLICATION_STATUSES.PUBLISHED;

    const result = await changeStatus(row.id, next);
    if (result.error) {
      toast.error(`Couldn't ${next === PUBLICATION_STATUSES.DRAFT ? "unpublish" : "publish"}`, {
        description: result.error,
      });
      return;
    }

    toast.success(
      next === PUBLICATION_STATUSES.PUBLISHED
        ? "Announcement published"
        : "Announcement moved back to draft",
    );
    void refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await remove(deleting.id);
    if (result.error) {
      toast.error("Couldn't delete the announcement", { description: result.error });
      return;
    }
    toast.success("Announcement deleted");
    setDeleting(null);
    void refresh();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} disabled={pending}>
          <Plus />
          New announcement
        </Button>

        <div className="relative min-w-56 flex-1">
          <Input
            className="pl-9"
            placeholder="Search by title or body"
            aria-label="Search announcements"
            value={search}
            onChange={(event) => resetPaging(setSearch)(event.target.value)}
          />
        </div>

        <select
          className="field-select"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => resetPaging(setCategory)(event.target.value)}
        >
          {CATEGORY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === ALL_OPTION ? "All categories" : value}
            </option>
          ))}
        </select>

        <select
          className="field-select"
          aria-label="Filter by publication status"
          value={status}
          onChange={(event) =>
            resetPaging(setStatus)(event.target.value as PublicationStatus | typeof ALL_OPTION)
          }
        >
          <option value={ALL_OPTION}>All statuses</option>
          {PUBLICATION_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading announcements">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          title="No announcements found"
          text="Nothing matches these filters yet. Create one, or widen the search."
          action={
            <Button onClick={openCreate}>
              <Plus />
              New announcement
            </Button>
          }
        />
      ) : (
        <div className="table-shell">
          <div className="data-grid-row hidden bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[2.2fr_1fr_1fr_auto]">
            <span>Announcement</span>
            <span>Category</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {announcements.map((row) => {
            const label = toPublicationLabel(row.status);
            const published = label === PUBLICATION_STATUSES.PUBLISHED;

            return (
              <div
                key={row.id}
                className="data-grid-row md:grid-cols-[2.2fr_1fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.audience ?? "Everyone"} · {formatDate(row.created_at)}
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">{row.category ?? "—"}</div>

                <div>
                  <StatusBadge status={label} />
                </div>

                <div className="flex justify-end gap-1">
                  {published && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        href={`/announcements/${row.id}`}
                        aria-label={`Preview ${row.title}`}
                        title="Preview"
                      >
                        <ExternalLink />
                      </Link>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={published ? `Unpublish ${row.title}` : `Publish ${row.title}`}
                    title={published ? "Move to draft" : "Publish now"}
                    disabled={pending}
                    onClick={() => void toggleStatus(row)}
                  >
                    {published ? <Archive /> : <Send />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.title}`}
                    title="Edit"
                    disabled={pending}
                    onClick={() => openEdit(row)}
                  >
                    <Pencil />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${row.title}`}
                    title="Delete"
                    disabled={pending}
                    onClick={() => setDeleting(row)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && count > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {count} announcement{count === 1 ? "" : "s"}
            {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
          </p>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <EditorDialog
        open={editorOpen}
        editing={editing}
        pending={pending}
        onOpenChange={setEditorOpen}
        onSubmit={(draft) => void handleSubmit(draft)}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void confirmDelete()}>
              {pending ? "Deleting…" : "Delete announcement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
