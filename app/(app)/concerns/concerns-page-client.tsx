"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { CampusPage } from "@/components/campus-page";
import { ConcernsTable } from "@/components/campus-page";

/** Row shape `ConcernsTable` renders. Mirrors the columns selected below. */
type MyConcernRow = {
  id: string;
  subject: string;
  category: string | null;
  status: string;
  submittedAt: string;
  studentName: string | null;
  assignee: string | null;
};

export default function ConcernsPage() {
  const { user, isLoaded } = useUser();
  const [concerns, setConcerns] = useState<MyConcernRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConcerns = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('concerns')
        .select(`
          id,
          subject,
          category,
          status,
          created_at,
          student_id,
          assigned_to,
          attachment_url,
          student:users!concerns_student_id_fkey (full_name, email),
          assignee:users!concerns_assigned_to_fkey (full_name)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // `concerns` has no `submitted_at`/`updated_at` columns — `created_at` is
      // the only timestamp, and the assignee is denormalised from the join.
      setConcerns(
        (data ?? []).map((concern) => ({
          id: concern.id,
          subject: concern.subject,
          category: concern.category,
          status: concern.status,
          submittedAt: concern.created_at,
          studentName: concern.student?.[0]?.full_name ?? null,
          assignee: concern.assignee?.[0]?.full_name ?? null,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void fetchConcerns(user.id);
  }, [user, isLoaded, fetchConcerns]);

  if (loading) return <CampusPage page="concerns" />;
  if (error) return <CampusPage page="concerns" >Error loading concerns: {error}</CampusPage>;

  return (
    <CampusPage page="concerns">
      <ConcernsTable items={concerns} />
    </CampusPage>
  );
}