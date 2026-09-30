"use client";

import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignConcern, listPersonnel, type PersonnelOption } from "@/lib/concerns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

type DbClient = SupabaseClient<Database>;

/**
 * Admin "Assign to personnel" modal (functionality doc §32). Lists every
 * personnel account from `public.users` (admin SELECT policy), writes the
 * choice through `assignConcern`, and reports success — the assignment also
 * notifies the personnel via the concern-status notification flow.
 */
export function AssignConcernDialog({
  client,
  concern,
  onAssigned,
}: {
  client: DbClient;
  concern: { id: string; subject: string; studentName?: string | null; category?: string | null; assignee?: string | null };
  onAssigned?: (concernId: string, assigneeName: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load the personnel directory when the dialog opens.
  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoadingList(true);
      const result = await listPersonnel(client);
      setLoadingList(false);
      if (result.error) {
        toast.error("Couldn't load personnel", { description: result.error });
        return;
      }
      setPersonnel(result.rows);
    })();
  }, [open, client]);

  const confirm = async () => {
    setSaving(true);
    const chosen = personnel.find((person) => person.id === assigneeId) ?? null;
    const result = await assignConcern(client, concern.id, chosen?.id ?? null);
    setSaving(false);
    if (!result.ok) {
      toast.error("Couldn't assign the concern", { description: result.error });
      return;
    }
    toast.success(chosen ? `Assigned to ${chosen.full_name ?? "personnel"}` : "Assignment cleared");
    onAssigned?.(concern.id, chosen?.full_name ?? null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Assign ${concern.subject}`}>
          <UserRound />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign concern</DialogTitle>
          <DialogDescription>Choose the personnel member responsible for this concern.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/50 p-4">
          <p className="text-sm font-semibold">{concern.subject}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {concern.studentName ? `Submitted by ${concern.studentName}` : "Submitted"} · {concern.category ?? "Uncategorised"}
          </p>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading personnel…
          </div>
        ) : personnel.length === 0 ? (
          <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">
            No personnel accounts yet. Promote a user on the Users page first.
          </p>
        ) : (
          <select
            className="field-select w-full"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            aria-label="Assign to personnel"
          >
            <option value="">Unassigned</option>
            {personnel.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name ?? person.email ?? person.id}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-start gap-3 rounded-md bg-primary-soft p-3 text-sm text-primary">
          <UserRound className="mt-0.5 size-4 shrink-0" />
          <p>The selected team member will be notified and can update the concern immediately.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={saving || loadingList}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
