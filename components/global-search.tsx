"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Loader2, Megaphone, MessageSquareText, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

type DbClient = SupabaseClient<Database>;

type Result = {
  type: "announcement" | "event" | "concern";
  id: string;
  title: string;
  href: string;
};

const TYPE_ICON = { announcement: Megaphone, event: CalendarDays, concern: MessageSquareText } as const;

/**
 * Global search (functionality doc, cross-cutting requirements): a debounced
 * query across announcements, events and concerns, rendered as a results
 * dropdown under the navbar search box. RLS scopes every query to what the
 * signed-in user may see. Closes on outside click, Escape, or navigation.
 */
export function GlobalSearch({ client }: { client: DbClient }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const needle = debounced.trim();
    if (needle.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    void (async () => {
      const pattern = `%${needle.replace(/[%_]/g, "")}%`;
      const [announcements, events, concerns] = await Promise.all([
        client.from("announcements").select("id, title").ilike("title", pattern).limit(5),
        client.from("events").select("id, title").ilike("title", pattern).limit(5),
        client.from("concerns").select("id, subject").ilike("subject", pattern).limit(5),
      ]);
      if (cancelled) return;
      const found: Result[] = [
        ...(announcements.data ?? []).map((row) => ({ type: "announcement" as const, id: row.id, title: row.title, href: `/announcements/${row.id}` })),
        ...(events.data ?? []).map((row) => ({ type: "event" as const, id: row.id, title: row.title, href: `/events/${row.id}` })),
        ...(concerns.data ?? []).map((row) => ({ type: "concern" as const, id: row.id, title: row.subject, href: `/concerns/${row.id}` })),
      ];
      setResults(found);
      setSearching(false);
      setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, client]);

  // Close on navigation and on outside click.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative hidden w-full max-w-sm lg:block" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder="Search CampusConnect"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        aria-label="Search CampusConnect"
      />
      {open && (searching || results.length > 0) && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border border-border bg-background shadow-lg">
          {searching ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : (
            results.map((result) => {
              const Icon = TYPE_ICON[result.type];
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{result.title}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">{result.type}</span>
                </Link>
              );
            })
          )}
        </div>
      )}
      {open && !searching && debounced.trim().length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground shadow-lg">
          No matches for “{debounced.trim()}”
        </div>
      )}
    </div>
  );
}
