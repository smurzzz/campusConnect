"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { useRole } from "@/lib/clerk/use-role";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import {
  ANNOUNCEMENTS_PAGE_SIZE,
  createAnnouncement as createAnnouncementRow,
  deleteAnnouncement as deleteAnnouncementRow,
  getAnnouncement as getAnnouncementRow,
  listAnnouncements as listAnnouncementRows,
  setAnnouncementStatus as setAnnouncementStatusRow,
  updateAnnouncement as updateAnnouncementRow,
  type AnnouncementDraft,
  type AnnouncementListResult,
  type AnnouncementRow,
} from "@/lib/announcements";
import {
  ALL_OPTION,
  toPublicationDbValue,
  type PublicationStatus,
} from "@/lib/constants/statuses";
import type { AnnouncementCategory } from "@/lib/constants/categories";

export type AnnouncementQuery = {
  /**
   * Admins may see drafts. Ignored for every other role, and the underlying
   * query still fails closed to `published` when the caller omits it.
   */
  manageAll?: boolean;
  category?: string;
  search?: string;
  status?: PublicationStatus | typeof ALL_OPTION;
  page?: number;
};

function emptyResult(): AnnouncementListResult {
  return { rows: [], count: 0, page: 0, pageSize: ANNOUNCEMENTS_PAGE_SIZE, totalPages: 1, error: null };
}

/**
 * Announcement list bound to Supabase.
 *
 * Search is debounced and the category filter, publication state and
 * pagination are all pushed into the query, so every visible row comes from
 * the database instead of a client-side slice of a full table fetch.
 */
export function useAnnouncements(query: AnnouncementQuery = {}, initial?: AnnouncementListResult) {
  const role = useRole();
  const client = useSupabaseClient();
  const manageAll = query.manageAll === true && role === "admin";

  // Server-provided first page: matches the requestKey the default public
  // query produces (no filters, page 0), so no skeleton flashes over the
  // SSR content while the client-side refresh runs.
  const INITIAL_KEY = JSON.stringify([false, undefined, undefined, "", 0]);
  const [state, setState] = useState<{
    key: string;
    result: AnnouncementListResult;
    error: string | null;
  }>(() =>
    initial && initial.error === null
      ? { key: INITIAL_KEY, result: initial, error: null }
      : { key: "", result: emptyResult(), error: null },
  );

  const debouncedSearch = useDebouncedValue(query.search ?? "");
  const category = query.category;
  const status = query.status;
  const page = query.page ?? 0;

  const dbStatus =
    manageAll && status && status !== ALL_OPTION ? toPublicationDbValue(status) : undefined;
  const dbCategory =
    category && category !== ALL_OPTION ? (category as AnnouncementCategory) : undefined;

  // Identifies the query the displayed rows belong to. `loading` is derived by
  // comparing it against the last completed request instead of being set inside
  // the effect, which would cause a cascading render on every filter change.
  const requestKey = JSON.stringify([manageAll, dbStatus, dbCategory, debouncedSearch, page]);
  const loading = state.key !== requestKey;

  const load = useCallback(async () => {
    try {
      const result = await listAnnouncementRows(client, {
        // Only an admin can look past `published`.
        publishedOnly: !manageAll,
        status: dbStatus,
        category: dbCategory,
        search: debouncedSearch,
        page,
        pageSize: ANNOUNCEMENTS_PAGE_SIZE,
      });
      setState({ key: requestKey, result, error: null });
    } catch (cause) {
      setState({
        key: requestKey,
        result: emptyResult(),
        error: cause instanceof Error ? cause.message : "Couldn't load announcements",
      });
    }
  }, [client, manageAll, dbStatus, dbCategory, debouncedSearch, page, requestKey]);

  // Reading Supabase from the browser needs an effect. State is only written
  // after the awaited query resolves, and `loading` is derived from
  // `requestKey`, so there is no synchronous setState in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const result = state.key === requestKey ? state.result : emptyResult();

  return {
    announcements: result.rows,
    count: result.count,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    loading,
    error: state.error ?? result.error,
    refresh: load,
  };
}

/** Single announcement, with loading and not-found states. */
export function useAnnouncement(id: string | undefined) {
  const client = useSupabaseClient();
  const [state, setState] = useState<{
    key: string;
    row: AnnouncementRow | null;
    error: string | null;
  }>({ key: "", row: null, error: null });

  // Same derived-loading approach as the list hook above.
  const requestKey = id ?? "";
  const loading = state.key !== requestKey;

  const load = useCallback(async () => {
    if (!id) {
      setState({ key: "", row: null, error: null });
      return;
    }
    try {
      const { row: found, error: failure } = await getAnnouncementRow(client, id);
      setState({ key: id, row: found, error: failure });
    } catch (cause) {
      setState({
        key: id,
        row: null,
        error: cause instanceof Error ? cause.message : "Couldn't load this announcement",
      });
    }
  }, [client, id]);

  // See the note on the list hook above.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const row = state.key === id ? state.row : null;

  return { announcement: row, loading, error: state.error, refresh: load };
}

/**
 * Announcement writes.
 *
 * Every mutation runs through the token-bound client so RLS can see the Clerk
 * `role` claim, and `created_by` is taken from the session rather than the form
 * so a user cannot forge authorship.
 */
export function useAnnouncementMutations() {
  const { user } = useUser();
  const client = useSupabaseClient();
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T> => {
    setPending(true);
    try {
      return await work();
    } finally {
      setPending(false);
    }
  }, []);

  const create = useCallback(
    (draft: AnnouncementDraft) =>
      run(() => createAnnouncementRow(client, draft, user?.id ?? null)),
    [run, client, user?.id],
  );

  const update = useCallback(
    (id: string, draft: AnnouncementDraft) => run(() => updateAnnouncementRow(client, id, draft)),
    [run, client],
  );

  const setStatus = useCallback(
    (id: string, status: PublicationStatus) =>
      run(() => setAnnouncementStatusRow(client, id, status)),
    [run, client],
  );

  const remove = useCallback((id: string) => run(() => deleteAnnouncementRow(client, id)), [run, client]);

  return { create, update, setStatus, remove, pending };
}
