import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ManagementTable } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage announcements — CampusConnect",
  description: "Review and manage announcements across campus.",
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="admin-announcements" />;
  if (error) return <CampusPage page="admin-announcements" >Error loading announcements: {error}</CampusPage>;

  return (
    <CampusPage page="admin-announcements">
      <ManagementTable kind="announcements" data={announcements} />
    </CampusPage>
  );
}
