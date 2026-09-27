import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { AnnouncementCards } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Announcements — CampusConnect",
  description: "News and important information from across the university.",
};

export default function AnnouncementsPage() {
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
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="announcements" />;
  if (error) return <CampusPage page="announcements" >Error loading announcements: {error}</CampusPage>;

  return (
    <CampusPage page="announcements">
      <AnnouncementCards items={announcements} />
    </CampusPage>
  );
}
