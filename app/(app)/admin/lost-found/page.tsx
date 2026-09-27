import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ManagementTable } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage lost & found — CampusConnect",
  description: "Review and manage lost and found reports across campus.",
};

export default function AdminLostFoundPage() {
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLostFoundItems();
  }, []);

  const fetchLostFoundItems = async () => {
    try {
      const { data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLostFoundItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="admin-lost" />;
  if (error) return <CampusPage page="admin-lost" >Error loading lost & found items: {error}</CampusPage>;

  return (
    <CampusPage page="admin-lost">
      <ManagementTable kind="lost" data={lostFoundItems} />
    </CampusPage>
  );
}
