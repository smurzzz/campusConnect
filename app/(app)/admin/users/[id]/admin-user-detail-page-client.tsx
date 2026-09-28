"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { CampusPage, StatusBadge } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import { toAccountStatusLabel } from "@/lib/users-labels";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";

type UserDetail = {
  id: string;
  full_name: string | null;
  email: string | null;
  campus_id: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  contact_number: string | null;
  created_at: string;
};

/** Surfaces the server's error message instead of a generic failure. */
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const client = useSupabaseClient();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!id) {
      setError("User ID is missing");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await client
      .from("users")
      .select(
        "id, full_name, email, campus_id, role, status, avatar_url, contact_number, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (queryError) setError(queryError.message);
    else if (!data) setError("User not found");
    else setUser(data as UserDetail);
    setLoading(false);
  }, [client, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void fetchUser();
  }, [fetchUser]);

  // Role changes go through the admin-checked API route, which updates both
  // Clerk publicMetadata and (below) the Supabase `users` row.
  const handleRoleChange = async (newRole: string) => {
    if (!user) return;
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, role: newRole }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setUser((prev) => (prev ? { ...prev, role: newRole } : prev));
      toast.success(`Role updated to ${ROLE_LABELS[newRole as Role] ?? newRole}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  };

  // Deactivation bans the Clerk account (blocking sign-in immediately) and
  // mirrors the flag into `public.users.status` via the same route.
  const handleStatusChange = async (status: "active" | "deactivated") => {
    if (!user) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, status }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setUser((prev) => (prev ? { ...prev, status } : prev));
      toast.success(status === "active" ? "User activated" : "User deactivated — sign-in is now blocked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <CampusPage page="admin-user-detail">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </CampusPage>
    );
  }

  if (error || !user) {
    return (
      <CampusPage page="admin-user-detail">
        <p>{error ?? "User not found"}</p>
      </CampusPage>
    );
  }

  return (
    <CampusPage page="admin-user-detail">
      <Link
        href="/admin/users"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft /> Back to users
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="section-panel">
          <div className="mb-5 flex items-center gap-4">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="size-16 rounded-full object-cover" />
            ) : (
              <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-xl font-bold text-primary">
                {(user.full_name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <h2 className="text-xl font-bold">{user.full_name || "Unnamed user"}</h2>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={toAccountStatusLabel(user.status)} />
                <span className="text-sm text-muted-foreground">
                  {ROLE_LABELS[user.role as Role] ?? user.role}
                </span>
              </div>
            </div>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Campus ID</dt>
              <dd>{user.campus_id ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Contact number</dt>
              <dd>{user.contact_number ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </section>

        <aside className="section-panel h-fit">
          <h3 className="section-title">Manage account</h3>

          <div className="mb-5">
            <label className="block" htmlFor="role-update">
              <span className="mb-2 block text-sm font-semibold">Role</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                id="role-update"
                className="field-select w-full"
                disabled={roleLoading}
                value={user.role}
                onChange={(event) => void handleRoleChange(event.target.value)}
              >
                <option value="student">Student</option>
                <option value="personnel">Personnel</option>
                <option value="admin">Admin</option>
              </select>
              {roleLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Applies immediately to Clerk permissions and the Supabase record.
            </p>
          </div>

          <div className="mb-5">
            <span className="mb-2 block text-sm font-semibold">Account status</span>
            {user.status === "active" ? (
              <Button variant="destructive" onClick={() => void handleStatusChange("deactivated")} disabled={statusLoading} className="w-full">
                {statusLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Deactivating…
                  </>
                ) : (
                  <>
                    <ShieldOff className="mr-2 size-4" /> Deactivate (block sign-in)
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => void handleStatusChange("active")} disabled={statusLoading} className="w-full">
                {statusLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Activating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" /> Reactivate account
                  </>
                )}
              </Button>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              Deactivation bans the Clerk account, revoking sign-in and existing sessions.
            </p>
          </div>
        </aside>
      </div>
    </CampusPage>
  );
}
