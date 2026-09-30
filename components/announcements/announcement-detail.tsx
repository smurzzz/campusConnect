"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

import { PublicPage, StatusBadge } from "@/components/campus-page";
import { EmptyState } from "@/components/campus-page";
import { Skeleton } from "@/components/ui/skeleton";
import { toPublicationLabel } from "@/lib/constants/statuses";
import { useAnnouncement } from "@/lib/hooks/use-announcements";

export function AnnouncementDetail({ id }: { id: string }) {
  const { announcement, loading, error } = useAnnouncement(id);

  if (loading) {
    return (
      <PublicPage title="Announcement" text="Loading the full announcement…">
        <div className="section-panel max-w-4xl" aria-busy="true">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-4 h-64 w-full" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
      </PublicPage>
    );
  }

  if (error) {
    return (
      <PublicPage title="Announcement" text="We couldn't load this announcement.">
        <EmptyState
          title="Couldn't load this announcement"
          text={error}
          action={
            <Link href="/announcements" className="text-sm font-semibold text-primary">
              Back to all announcements
            </Link>
          }
        />
      </PublicPage>
    );
  }

  // A draft simply isn't visible to a guest or a student, so treat it as absent
  // rather than leaking unpublished copy.
  if (!announcement) {
    return (
      <PublicPage title="Announcement" text="We couldn't find that announcement.">
        <EmptyState
          title="Announcement not found"
          text="It may have been unpublished or removed."
          action={
            <Link href="/announcements" className="text-sm font-semibold text-primary">
              Back to all announcements
            </Link>
          }
        />
      </PublicPage>
    );
  }

  return (
    <PublicPage title={announcement.title} text="Posted announcement">
      <Link
        href="/announcements"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
      >
        <ArrowLeft />
        Back to announcements
      </Link>

      <article className="section-panel max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.category && <span className="category-badge">{announcement.category}</span>}
          <StatusBadge status={toPublicationLabel(announcement.status)} />
          <span className="text-xs text-muted-foreground">
            {new Date(announcement.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {announcement.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded CMS image from Supabase Storage, not a Next-optimized local asset
          <img
            src={announcement.image_url}
            alt={announcement.title}
            className="mt-6 max-h-96 w-full rounded-md object-cover"
          />
        ) : (
          <div className="mt-6 overflow-hidden rounded-md bg-event-blue p-10 text-center">
            <BookOpen className="mx-auto size-16 text-primary" />
          </div>
        )}

        <div className="prose-copy whitespace-pre-line">{announcement.body}</div>
      </article>
    </PublicPage>
  );
}
