"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CampusPage, EmptyState } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/campus-page";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

type SeededRow = {
  id: string;
  campus_id: string;
  is_claimed: boolean;
  claimed_by: string | null;
  claimant_name: string | null;
};

const CAMPUS_ID_PATTERN = /^CA\d{1,8}$/i;

function normalizeId(value: string): string {
  // Store the canonical no-dash student number ("ca-20240001" → "CA20240001").
  return value.trim().toUpperCase().replace(/-/g, "");
}

export default function CampusIdsPage() {
  const client = useSupabaseClient();
  const [rows, setRows] = useState<SeededRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [adding, setAdding] = useState(false);

  const [deleting, setDeleting] = useState<SeededRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchRows = useCallback(async () => {
    // `seeded_campus_ids_select_all` makes the table public-read; the claimant
    // name is joined from `users` (readable to admins via users_select_admin).
    const { data, error: queryError } = await client
      .from("seeded_campus_ids")
      .select("id, campus_id, is_claimed, claimed_by, claimant:users!seeded_campus_ids_claimed_by_fkey(full_name)")
      .order("campus_id", { ascending: true });

    if (queryError) setError(queryError.message);
    setRows(
      (data ?? []).map((row) => {
        const embed = row as { claimant?: { full_name: string | null } | { full_name: string | null }[] | null };
        const claimant = Array.isArray(embed.claimant) ? embed.claimant[0] : embed.claimant;
        return {
          id: row.id,
          campus_id: row.campus_id,
          is_claimed: row.is_claimed,
          claimed_by: row.claimed_by,
          claimant_name: claimant?.full_name ?? null,
        };
      }),
    );
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void (async () => {
      await fetchRows();
    })();
  }, [fetchRows]);

  const addId = async () => {
    const candidate = newId.trim();
    if (!CAMPUS_ID_PATTERN.test(normalizeId(candidate.replace(/\s+/g, "")))) {
      toast.error("Campus ID must look like CA20240001 (CA + 1–8 digits)");
      return;
    }
    setAdding(true);
    const normalized = normalizeId(candidate);
    const { error: insertError } = await client.from("seeded_campus_ids").insert({ campus_id: normalized });
    setAdding(false);
    if (insertError) {
      if (insertError.code === "23505") {
        toast.error("That Campus ID is already in the list");
      } else {
        toast.error("Couldn't add the Campus ID", { description: insertError.message });
      }
      return;
    }
    toast.success(`Campus ID ${normalized} added`);
    setNewId("");
    setAddOpen(false);
    void fetchRows();
  };

  const removeId = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error: deleteError } = await client.from("seeded_campus_ids").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    if (deleteError) {
      toast.error("Couldn't delete the Campus ID", { description: deleteError.message });
      return;
    }
    toast.success(`${deleting.campus_id} removed`);
    setDeleting(null);
    void fetchRows();
  };

  const filtered = rows.filter((row) => row.campus_id.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <CampusPage page="admin-campus-ids">
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          Add Campus ID
        </Button>
      </div>
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search campus IDs" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {error && <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No campus IDs found" text="Add IDs with the button above — new students can only sign up with an ID that exists here." />
      ) : (
        <div className="table-shell">
          <div className="data-grid-row hidden bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1fr_0.8fr_1fr_auto]">
            <span>Campus ID</span>
            <span>Status</span>
            <span>Claimed by</span>
            <span className="text-right">Actions</span>
          </div>
          {filtered.map((row) => (
            <div key={row.id} className="data-grid-row md:grid-cols-[1fr_0.8fr_1fr_auto]">
              <div className="font-semibold">{row.campus_id}</div>
              <div>
                <StatusBadge status={row.is_claimed ? "Claimed" : "Unclaimed"} />
              </div>
              <div className="text-sm text-muted-foreground">{row.is_claimed ? (row.claimant_name ?? row.claimed_by) : "—"}</div>
              <div className="flex justify-end">
                {!row.is_claimed && (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${row.campus_id}`} onClick={() => setDeleting(row)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Campus ID</DialogTitle>
            <DialogDescription>
              Format: CA followed by 1–8 digits (e.g. CA12 or CA20240001). The ID becomes claimable at sign-up immediately.
            </DialogDescription>
          </DialogHeader>
          <Input value={newId} onChange={(event) => setNewId(event.target.value)} placeholder="CA20240006" aria-label="New campus ID" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={() => void addId()} disabled={adding || !newId.trim()}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add ID
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.campus_id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Unclaimed IDs can be deleted safely. Claimed IDs cannot be deleted from here to protect the linked account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={(event) => {
                event.preventDefault();
                void removeId();
              }}
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete ID
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CampusPage>
  );
}
