import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ConcernsTable } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage concerns — CampusConnect",
  description: "Review and manage concerns across campus.",
};

export default function AdminConcernsPage() {
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConcerns();
  }, []);

  const fetchConcerns = async () => {
    try {
      const { data, error } = await supabase
        .from('concerns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConcerns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="admin-concerns" />;
  if (error) return <CampusPage page="admin-concerns" >Error loading concerns: {error}</CampusPage>;

  return (
    <CampusPage page="admin-concerns">
      <ConcernsTable admin items={concerns} />
    </CampusPage>
  );
}
