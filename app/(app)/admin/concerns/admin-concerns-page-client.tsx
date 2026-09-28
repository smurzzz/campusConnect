"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ConcernsTable } from "@/components/campus-page";

export default function AdminConcernsPage() {
  const [concerns, setConcerns] = useState<Database["public"]["Tables"]["concerns"]["Row"][]>([]);
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
      <ConcernsTable
        admin
        items={concerns.map((row) => ({
          id: row.id,
          subject: row.subject,
          category: row.category,
          status: row.status,
          submittedAt: row.created_at,
          studentName: null,
          assignee: null,
        }))}
      />
    </CampusPage>
  );
}