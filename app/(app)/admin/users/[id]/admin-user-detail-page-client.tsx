"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          campus_id,
          role,
          status,
          avatar_url,
          contact_number,
          created_at
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        setError("User not found");
        setLoading(false);
        return;
      }
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError("User ID is missing");
      setLoading(false);
      return;
    }
    fetchUser();
  }, [id]);

  // Role and status changes go through API routes, which verify the caller is an
  // admin. The previous `updateUserRole`/`deactivateUser`/`activateUser` server
  // actions had no authorisation check at all.
  const handleRoleChange = async (newRole: string) => {
    if (!user) return;
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, role: newRole }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setUser((prev: typeof user) => ({ ...prev, role: newRole }));
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  };

  const handleStatusChange = async (status: 'active' | 'deactivated') => {
    if (!user) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, status }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setUser((prev: typeof user) => ({ ...prev, status }));
      toast.success(status === 'active' ? "User activated" : "User deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDeactivate = () => handleStatusChange('deactivated');
  const handleActivate = () => handleStatusChange('active');

  if (loading) return <CampusPage page="admin-user-detail" />;
  if (error) return <CampusPage page="admin-user-detail" >{error}</CampusPage>;
  if (!user) return <CampusPage page="admin-user-detail" >User not found</CampusPage>;

  return (
    <CampusPage page="admin-user-detail">
      <div className="space-y-6">
        {/* User details */}
        <section className="border rounded-lg p-4">
          <h2 className="mb-4 text-lg font-semibold">{user.full_name || 'No name'}</h2>
          <div className="grid gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Campus ID</p>
              <p className="text-base">{user.campus_id || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <select
                id="role-update"
                className="field-select w-full"
                disabled={roleLoading}
                value={user.role}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              {roleLoading && (
                <span className="ml-2 h-4 w-4 animate-spin">
                  <Loader2 className="h-4 w-4" />
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex items-center gap-3">
                {user.status === 'active' ? (
                  <Button
                    variant="destructive"
                    onClick={handleDeactivate}
                    disabled={statusLoading}
                  >
                    {statusLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        Deactivating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4"/>
                        Deactivate
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={handleActivate}
                    disabled={statusLoading}
                  >
                    {statusLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        Activating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4"/>
                        Activate
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact number</p>
              <p className="text-base">{user.contact_number || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-base">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {user.avatar_url && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Avatar</p>
              <img
                src={user.avatar_url}
                alt={`${user.full_name}'s avatar`}
                className="rounded-lg border border-border max-w-xs"
              />
            </div>
          )}
        </section>
      </div>
    </CampusPage>
  );
}