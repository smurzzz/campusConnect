"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ConcernsTable } from "@/components/campus-page";

export default function StaffConcernsPage() {
  const [concerns, setConcerns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConcerns();
  }, []);

  const fetchConcerns = async () => {
    try {
      const { data, error } = await supabase
        .from('concerns')
        .select(`
          id,
          subject,
          category,
          description,
          status,
          submittedAt,
          updatedAt,
          student_id,
          assigned_to,
          attachment_url,
          student:users!concerns_student_id_fkey (full_name, email),
          assignee:users!concerns_assigned_to_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to include studentName and assignee
      const mappedConcerns = data.map((concern: any) => ({
        id: concern.id,
        subject: concern.subject,
        category: concern.category,
        description: concern.description,
        status: concern.status,
        submittedAt: concern.submittedAt,
        updatedAt: concern.updatedAt,
        studentName: concern.student?.[0]?.full_name ?? '',
        studentEmail: concern.student?.[0]?.email ?? '',
        assignee: concern.assignee?.[0]?.full_name ?? null,
        attachmentName: concern.attachment_url
          ? concern.attachment_url.split('/').pop()
          : null,
      }));

      setConcerns(mappedConcerns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="staff-concerns" />;
  if (error) return <CampusPage page="staff-concerns" >Error loading concerns: {error}</CampusPage>;

  return (
    <CampusPage page="staff-concerns">
      <ConcernsTable staff items={concerns} />
    </CampusPage>
  );
}