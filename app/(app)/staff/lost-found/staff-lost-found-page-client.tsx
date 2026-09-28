"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ManagementTable } from "@/components/campus-page";

export default function StaffLostFoundPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLostFoundItems();
  }, []);

  const fetchLostFoundItems = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to include the reporter's name
      const mappedItems = data.map((item: any) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        description: item.description,
        category: item.category,
        location: item.location,
        date: item.date,
        photoUrl: item.photo_url,
        status: item.status,
        reportedBy: item.reported_by?.[0]?.full_name ?? '',
      }));

      setItems(mappedItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="staff-lost" />;
  if (error) return <CampusPage page="staff-lost" >Error loading lost & found items: {error}</CampusPage>;

  return (
    <CampusPage page="staff-lost">
      <ManagementTable kind="lost" data={items} />
    </CampusPage>
  );
}