"use client";

import { useCallback, useEffect, useState } from "react";

import { useUser } from "@clerk/nextjs";

import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import {
  createEvent as createEventRow,
  deleteEvent as deleteEventRow,
  getEvent as getEventRow,
  listEvents as listEventRows,
  listMyRegistrations as listMyRegistrationRows,
  listRegistrants as listRegistrantRows,
  registerForEvent as registerForEventRow,
  unregisterFromEvent as unregisterFromEventRow,
  updateEvent as updateEventRow,
  type EventDraft,
  type EventListResult,
  type EventRow,
  type RegistrantRow,
} from "@/lib/events";
import type { EventCategory } from "@/lib/constants/categories";
import { ALL_OPTION } from "@/lib/constants/statuses";

function emptyResult(): EventListResult {
  return { rows: [], count: 0, page: 0, pageSize: 12, totalPages: 1, error: null };
}

export type EventQuery = {
  category?: string;
  search?: string;
  upcomingOnly?: boolean;
  page?: number;
};

/**
 * Event list bound to the token-bound Supabase client. Search and category
 * filters are debounced upstream and pushed into the query; the seat count
 * arrives embedded via an `event_registrations(count)` embed.
 */
export function useEvents(query: EventQuery = {}) {
  const client = useSupabaseClient();
  const [state, setState] = useState<{
    key: string;
    result: EventListResult;
    error: string | null;
  }>({ key: "", result: emptyResult(), error: null });

  const search = query.search ?? "";
  const category = query.category && query.category !== ALL_OPTION ? (query.category as EventCategory) : undefined;
  const page = query.page ?? 0;
  const upcomingOnly = query.upcomingOnly === true;

  const requestKey = JSON.stringify([category, search, upcomingOnly, page]);
  const loading = state.key !== requestKey;

  const load = useCallback(async () => {
    try {
      const result = await listEventRows(client, {
        category,
        search,
        when: upcomingOnly ? "upcoming" : null,
        page,
      });
      setState({ key: requestKey, result, error: null });
    } catch (cause) {
      setState({
        key: requestKey,
        result: emptyResult(),
        error: cause instanceof Error ? cause.message : "Couldn't load events",
      });
    }
  }, [client, category, search, upcomingOnly, page, requestKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void load();
  }, [load]);

  const result = state.key === requestKey ? state.result : emptyResult();

  return {
    events: result.rows,
    count: result.count,
    page: result.page,
    totalPages: result.totalPages,
    loading,
    error: state.error ?? result.error,
    refresh: load,
  };
}

/** Single event, with loading and not-found states. */
export function useEvent(id: string | undefined) {
  const client = useSupabaseClient();
  const [state, setState] = useState<{
    key: string;
    row: EventRow | null;
    error: string | null;
  }>({ key: "", row: null, error: null });

  const load = useCallback(async () => {
    if (!id) {
      setState({ key: "", row: null, error: null });
      return;
    }
    try {
      const { row, error } = await getEventRow(client, id);
      setState({ key: id, row, error });
    } catch (cause) {
      setState({
        key: id,
        row: null,
        error: cause instanceof Error ? cause.message : "Couldn't load this event",
      });
    }
  }, [client, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void load();
  }, [load]);

  return {
    event: state.key === id ? state.row : null,
    loading: state.key !== (id ?? ""),
    error: state.error,
    refresh: load,
  };
}

/** Registrant list for one event (admin view). */
export function useRegistrants(eventId: string | undefined) {
  const client = useSupabaseClient();
  const [state, setState] = useState<{
    key: string;
    rows: RegistrantRow[];
    error: string | null;
    loading: boolean;
  }>({ key: "", rows: [], error: null, loading: true });

  const load = useCallback(async () => {
    if (!eventId) {
      setState({ key: "", rows: [], error: null, loading: false });
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    try {
      const { rows, error } = await listRegistrantRows(client, eventId);
      setState({ key: eventId, rows, error, loading: false });
    } catch (cause) {
      setState({
        key: eventId,
        rows: [],
        error: cause instanceof Error ? cause.message : "Couldn't load registrants",
        loading: false,
      });
    }
  }, [client, eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void load();
  }, [load]);

  return {
    registrants: state.key === eventId ? state.rows : [],
    loading: state.key !== (eventId ?? "") || state.loading,
    error: state.error,
    refresh: load,
  };
}

/** The signed-in student's registrations. */
export function useMyRegistrations() {
  const client = useSupabaseClient();
  const [rows, setRows] = useState<Array<{ id: string; event: EventRow | null; registered_at: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await listMyRegistrationRows(client);
      setRows(result.rows);
      setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your events");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void load();
  }, [load]);

  return { registrations: rows, loading, error, refresh: load };
}

/** Event writes for the admin manager. */
export function useEventMutations() {
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
    (draft: EventDraft, createdBy: string | null) =>
      run(() => createEventRow(client, draft, createdBy)),
    [run, client],
  );

  const update = useCallback(
    (id: string, draft: EventDraft) => run(() => updateEventRow(client, id, draft)),
    [run, client],
  );

  const remove = useCallback(
    (id: string) => run(() => deleteEventRow(client, id)),
    [run, client],
  );

  return { create, update, remove, pending };
}

/** Registration actions for the event detail and My Events screens. */
export function useEventRegistration(eventId: string | null) {
  const client = useSupabaseClient();
  const { user } = useUser();

  const register = useCallback(async () => {
    if (!eventId) return { ok: false, error: "No event selected" };
    return registerForEventRow(client, eventId, user?.id ?? null);
  }, [client, eventId, user?.id]);

  const unregister = useCallback(async () => {
    if (!eventId) return { ok: false, error: "No event selected" };
    return unregisterFromEventRow(client, eventId);
  }, [client, eventId]);

  return { register, unregister };
}
