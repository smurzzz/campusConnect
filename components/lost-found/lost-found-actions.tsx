"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { deleteLostFoundItem, updateLostFoundStatus, type LostFoundDbStatus } from "@/lib/lost-found";
import { toItemStatusLabel } from "@/lib/lost-found-labels";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

type DbClient = SupabaseClient<Database>;

/**
 * Row actions for lost & found management (staff + admin):
 * - pencil → status-change modal (Open ↔ Claimed), saves immediately
 * - ⋯ → admin-only Delete with an explicit confirmation step (RLS enforces
 *   the admin role; personnel never see the menu entry).
 */
export function LostFoundRowActions({
  client,
  item,
  isAdmin,
  onUpdated,
  onDeleted,
}: {
  client: DbClient;
  item: { id: string; name: string; status: string };
  isAdmin: boolean;
  onUpdated: (id: string, status: LostFoundDbStatus) => void;
  onDeleted: (id: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<LostFoundDbStatus>(item.status === "claimed" ? "claimed" : "reported");
  const [busy, setBusy] = useState(false);

  const saveStatus = async () => {
    setBusy(true);
    const result = await updateLostFoundStatus(client, item.id, nextStatus);
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't update the item", { description: result.error });
      return;
    }
    toast.success(`Status set to ${toItemStatusLabel(nextStatus)}`);
    onUpdated(item.id, nextStatus);
    setEditOpen(false);
  };

  const remove = async () => {
    setBusy(true);
    const result = await deleteLostFoundItem(client, item.id);
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't delete the item", { description: result.error });
      return;
    }
    toast.success("Item deleted");
    onDeleted(item.id);
    setConfirmOpen(false);
  };

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Edit status for ${item.name}`} onClick={() => setEditOpen(true)}>
        <Pencil />
      </Button>
      {isAdmin && (
        <Button variant="ghost" size="icon" aria-label={`More actions for ${item.name}`} onClick={() => setConfirmOpen(true)}>
          <MoreHorizontal />
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update item status</DialogTitle>
            <DialogDescription>
              {item.name} — marking an item as claimed tells the reporter it has been resolved.
            </DialogDescription>
          </DialogHeader>
          <select
            className="field-select w-full"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as LostFoundDbStatus)}
            aria-label="New status"
          >
            <option value="reported">Open</option>
            <option value="claimed">Claimed</option>
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void saveStatus()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item report?</AlertDialogTitle>
            <AlertDialogDescription>
              “{item.name}” will be permanently removed for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
