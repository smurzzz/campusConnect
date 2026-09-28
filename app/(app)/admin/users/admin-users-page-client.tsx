"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { CampusPage, EmptyState, StatusBadge } from "@/components/campus-page";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import { toAccountStatusLabel } from "@/lib/users-labels";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  campus_id: string | null;
  role: string;
  status: string;
  created_at: string;
};

const ROLE_FILTERS = ["", "student", "personnel", "admin"] as const;

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
}

export default function AdminUsersPage() {
  const client = useSupabaseClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  useEffect(() => {
    void (async () => {
      // The admin SELECT policy on `users` (20260928050000) is what makes
      // this list readable; students/personnel still only see their own row.
      const { data, error: queryError } = await client
        .from("users")
        .select("id, full_name, email, campus_id, role, status, created_at")
        .order("created_at", { ascending: false });

      if (queryError) setError(queryError.message);
      setUsers(data ?? []);
      setLoading(false);
    })();
  }, [client]);

  const filtered = users.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      (user.full_name ?? "").toLowerCase().includes(needle) ||
      (user.email ?? "").toLowerCase().includes(needle) ||
      (user.campus_id ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <CampusPage page="admin-users">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email or campus ID"
            aria-label="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="field-select"
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="">All roles</option>
          {ROLE_FILTERS.slice(1).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role as Role]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading users">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          text="Accounts appear here as people sign up. Try changing your search or role filter."
        />
      ) : (
        <div className="table-shell">
          <div className="data-grid-row hidden bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1.6fr_1.6fr_0.8fr_0.8fr_0.8fr_auto]">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span className="text-right">Actions</span>
          </div>
          {filtered.map((user) => (
            <div key={user.id} className="data-grid-row md:grid-cols-[1.6fr_1.6fr_0.8fr_0.8fr_0.8fr_auto]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                  {(user.full_name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.full_name ?? "Unnamed"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{user.campus_id ?? "—"}</p>
                </div>
              </div>
              <div className="truncate text-sm text-muted-foreground">{user.email ?? "—"}</div>
              <div className="text-sm capitalize text-muted-foreground">
                {ROLE_LABELS[user.role as Role] ?? user.role}
              </div>
              <div>
                <StatusBadge status={toAccountStatusLabel(user.status)} />
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(user.created_at)}</div>
              <div className="flex justify-end">
                <a
                  href={`/admin/users/${user.id}`}
                  className="text-sm font-semibold text-primary hover:underline"
                  aria-label={`Manage ${user.full_name ?? "user"}`}
                >
                  Manage
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </CampusPage>
  );
}
