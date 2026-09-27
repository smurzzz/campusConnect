import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateUserRole, deactivateUser, activateUser } from "@/lib/actions";

export const metadata: Metadata = {
  title: "User — CampusConnect",
  description: "View and update user details.",
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("User ID is missing");
      setLoading(false);
      return;
    }
    fetchUser();
  }, [id]);

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

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;
    setRoleLoading(true);
    try {
      await updateUserRole(id, newRole);
      // Update local state
      setUser(prev => ({ ...prev, role: newRole }));
      toast.success("Role updated");
    } catch (err) {
      toast.error("Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    setStatusLoading(true);
    try {
      await deactivateUser(id);
      // Update local state
      setUser(prev => ({ ...prev, status: 'deactivated' }));
      toast.success("User deactivated");
    } catch (err) {
      toast.error("Failed to deactivate user");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    setStatusLoading(true);
    try {
      await activateUser(id);
      // Update local state
      setUser(prev => ({ ...prev, status: 'active' }));
      toast.success("User activated");
    } catch (err) {
      toast.error("Failed to activate user");
    } finally {
      setStatusLoading(false);
    }
  };

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