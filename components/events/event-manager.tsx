"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { ImageFilePicker } from "@/components/ui/image-file-picker";
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
import { useUser } from "@clerk/nextjs";
import type { EventDraft, EventRow } from "@/lib/events";
import { useEventMutations, useEvents } from "@/lib/hooks/use-events";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import { uploadCmsImage } from "@/lib/cms";
import { EVENT_CATEGORIES, CAMPUS_LOCATIONS, type EventCategory } from "@/lib/constants/categories";
import { ALL_OPTION } from "@/lib/constants/statuses";

const CATEGORY_OPTIONS = [ALL_OPTION, ...EVENT_CATEGORIES] as const;
const LOCATION_OPTIONS = CAMPUS_LOCATIONS;

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** `<input type="datetime-local">` value for an ISO timestamp, in local time. */
function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type FormState = {
  title: string;
  description: string;
  category: EventCategory | typeof ALL_OPTION;
  location: string;
  start: string;
  end: string;
  capacity: string;
  coverImageUrl: string;
};

function emptyForm(): FormState {
  const now = new Date();
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    category: ALL_OPTION,
    location: LOCATION_OPTIONS[0],
    start: toDateTimeLocal(now.toISOString()),
    end: toDateTimeLocal(later.toISOString()),
    capacity: "60",
    coverImageUrl: "",
  };
}

function toFormState(row: EventRow): FormState {
  return {
    title: row.title,
    description: row.description ?? "",
    category: (row.category as EventCategory | null) ?? ALL_OPTION,
    location: row.location ?? LOCATION_OPTIONS[0],
    start: toDateTimeLocal(row.start_time),
    end: toDateTimeLocal(row.end_time),
    capacity: row.capacity == null ? "" : String(row.capacity),
    coverImageUrl: row.cover_image_url ?? "",
  };
}

function toDraft(form: FormState): EventDraft | { error: string } {
  const title = form.title.trim();
  if (title.length < 4) return { error: "Give the event a title of at least 4 characters." };

  const start = new Date(form.start);
  const end = new Date(form.end);
  if (Number.isNaN(start.getTime())) return { error: "Choose a valid start date and time." };
  if (Number.isNaN(end.getTime())) return { error: "Choose a valid end date and time." };
  if (end <= start) return { error: "The event must end after it starts." };

  let capacity: number | null = null;
  if (form.capacity.trim() !== "") {
    const parsed = Number.parseInt(form.capacity, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5000) {
      return { error: "Capacity must be a whole number between 1 and 5000 (or blank for unlimited)." };
    }
    capacity = parsed;
  }

  return {
    title,
    description: form.description.trim(),
    category: form.category === ALL_OPTION ? null : form.category,
    location: form.location,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    capacity,
    coverImageUrl: form.coverImageUrl.trim() || null,
  };
}

type EditorDialogProps = {
  open: boolean;
  /** `null` creates a new event; a row edits that one. */
  editing: EventRow | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: EventDraft) => void;
  /** Uploads a picked image and resolves to its public URL. */
  uploadCover: (file: File) => Promise<{ url: string | null; error: string | null }>;
};

function EditorDialog({ open, editing, pending, onOpenChange, onSubmit, uploadCover }: EditorDialogProps) {
  const [form, setForm] = useState<FormState>(() => (editing ? toFormState(editing) : emptyForm()));
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            Events are visible across campus as soon as they are saved. Capacity blocks new
            registrations once seats run out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Title</span>
            <Input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Innovation Week 2026"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description</span>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What will attendees do and learn?"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <select
                className="field-select w-full"
                value={form.category}
                onChange={(event) => update("category", event.target.value as FormState["category"])}
              >
                {CATEGORY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value === ALL_OPTION ? "No category" : value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Location</span>
              <select
                className="field-select w-full"
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
              >
                {LOCATION_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Starts</span>
              <Input
                type="datetime-local"
                value={form.start}
                onChange={(event) => update("start", event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Ends</span>
              <Input
                type="datetime-local"
                value={form.end}
                onChange={(event) => update("end", event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Capacity <span className="font-normal text-muted-foreground">(blank = unlimited)</span>
              </span>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) => update("capacity", event.target.value)}
                placeholder="60"
              />
            </label>

          </div>

          <ImageFilePicker
            label="Cover image (optional)"
            note="PNG, JPG or WEBP up to 10 MB — take a photo or pick from your gallery"
            accept="image/png,image/jpeg,image/webp"
            existingUrl={form.coverImageUrl || null}
            onFileSelected={
              uploading
                ? undefined
                : (file) => {
                    if (!file) {
                      update("coverImageUrl", "");
                      return;
                    }
                    void (async () => {
                      setUploading(true);
                      setProblem(null);
                      const { url, error } = await uploadCover(file);
                      setUploading(false);
                      if (error || !url) {
                        setProblem(error ?? "Image upload failed.");
                        return;
                      }
                      update("coverImageUrl", url);
                      toast.success("Cover image uploaded");
                    })();
                  }
            }
          />

          {uploading && <p className="text-sm text-muted-foreground">Uploading image…</p>}
          {problem && <p className="text-sm text-danger">{problem}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              const draft = toDraft(form);
              if ("error" in draft) {
                setProblem(draft.error);
                return;
              }
              setProblem(null);
              onSubmit(draft);
            }}
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Admin event management. Reads and writes go through the token-bound
 * Supabase client, so every change is authorised by the RLS policies.
 */
export function EventManager() {
  const client = useSupabaseClient();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_OPTION);
  const [page, setPage] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);

  const { events, count, totalPages, loading, error, refresh } = useEvents({
    search,
    category,
    page,
  });
  const { create, update, remove, pending } = useEventMutations();

  const resetPaging = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (row: EventRow) => {
    setEditing(row);
    setEditorOpen(true);
  };

  const handleSubmit = async (draft: EventDraft) => {
    const result = editing ? await update(editing.id, draft) : await create(draft, user?.id ?? null);
    if (result.error) {
      toast.error("Couldn't save the event", { description: result.error });
      return;
    }

    toast.success(editing ? "Event updated" : "Event created");
    setEditorOpen(false);
    setEditing(null);
    void refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await remove(deleting.id);
    if (result.error) {
      toast.error("Couldn't delete the event", { description: result.error });
      return;
    }
    toast.success("Event deleted");
    setDeleting(null);
    void refresh();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} disabled={pending}>
          <Plus />
          New event
        </Button>

        <div className="relative min-w-56 flex-1">
          <Input
            className="pl-9"
            placeholder="Search by title or location"
            aria-label="Search events"
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
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading events">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No events found"
          text="Nothing matches these filters yet. Create one, or widen the search."
          action={
            <Button onClick={openCreate}>
              <Plus />
              New event
            </Button>
          }
        />
      ) : (
        <div className="table-shell">
          <div className="data-grid-row hidden bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <span>Event</span>
            <span>Category</span>
            <span>When</span>
            <span>Seats</span>
            <span className="text-right">Actions</span>
          </div>

          {events.map((row) => {
            const full = row.capacity != null && row.registration_count >= row.capacity;

            return (
              <div
                key={row.id}
                className="data-grid-row md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.location ?? "Location TBA"}</p>
                </div>

                <div className="text-sm text-muted-foreground">{row.category ?? "—"}</div>

                <div className="text-sm text-muted-foreground">{formatDateTime(row.start_time)}</div>

                <div className="text-sm">
                  {full ? (
                    <span className="font-semibold text-danger">
                      {row.capacity == null ? "—" : "Full"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {row.capacity == null
                        ? `${row.registration_count} registered`
                        : `${row.registration_count} / ${row.capacity}`}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      href={`/admin/events/${row.id}/registrants`}
                      aria-label={`Registrants for ${row.title}`}
                      title="Registrants"
                    >
                      <UsersRound />
                    </Link>
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
            {count} event{count === 1 ? "" : "s"}
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
        uploadCover={(file) => uploadCmsImage(client, user?.id ?? "", file)}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its registration list will be removed permanently. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void confirmDelete()}>
              {pending ? "Deleting…" : "Delete event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
