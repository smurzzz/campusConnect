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

export default function StaffLostFoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Item ID is missing");
      setLoading(false);
      return;
    }
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const { data, error } = await supabase
        .from('lost_found_items')
        .select(`
          id,
          type,
          name,
          description,
          category,
          location,
          date,
          photo_url,
          status,
          reported_by,
          reported_by:users!lost_found_items_reported_by_fkey (full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        setError("Lost & found item not found");
        setLoading(false);
        return;
      }

      // Map the data to include the reporter's name
      const mappedItem = {
        id: data.id,
        type: data.type,
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        date: data.date,
        photoUrl: data.photo_url,
        status: data.status,
        reportedBy: data.reported_by?.[0]?.full_name ?? '',
      };

      setItem(mappedItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!item) return;
    setStatusLoading(true);
    try {
      const { error } = await supabase
        .from('lost_found_items')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      // Update local state
      setItem((prev: typeof item) => ({ ...prev, status: newStatus }));
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <CampusPage page="staff-lost-detail" />;
  if (error) return <CampusPage page="staff-lost-detail" >{error}</CampusPage>;
  if (!item) return <CampusPage page="staff-lost-detail" >Item not found</CampusPage>;

  return (
    <CampusPage page="staff-lost-detail">
      <div className="space-y-6">
        {/* Item details */}
        <section className="border rounded-lg p-4">
          <h2 className="mb-4 text-lg font-semibold">{item.name}</h2>
          <div className="grid gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-base">{item.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-base">{item.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location</p>
              <p className="text-base">{item.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="text-base">{item.date}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <select
                id="status-update"
                className="field-select w-full"
                disabled={statusLoading}
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="reported">Reported</option>
                <option value="claimed">Claimed</option>
              </select>
              {statusLoading && (
                <span className="ml-2 h-4 w-4 animate-spin">
                  <Loader2 className="h-4 w-4" />
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reported by</p>
              <p className="text-base">{item.reportedBy}</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
            <p className="text-base text-muted-foreground">{item.description}</p>
          </div>
          {item.photoUrl && (
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Photo</p>
              <img
                src={item.photoUrl}
                alt={`${item.name} photo`}
                className="rounded-lg border border-border max-w-xs"
              />
            </div>
          )}
        </section>
      </div>
    </CampusPage>
  );
}