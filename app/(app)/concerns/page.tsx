import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { CampusPage } from "@/components/campus-page";
import { ConcernsTable } from "@/components/campus-page";
import type { Concern } from "@/types";

export const metadata: Metadata = {
  title: "My concerns — CampusConnect",
  description: "Track every request from submission to resolution.",
};

export default function ConcernsPage() {
  const { user } = useUser();
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchConcerns();
  }, [user]);

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
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to the Concern type
      const mappedConcerns: Concern[] = data.map((concern) => ({
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

  if (loading) return <CampusPage page="concerns" />;
  if (error) return <CampusPage page="concerns" >Error loading concerns: {error}</CampusPage>;

  return (
    <CampusPage page="concerns">
      <ConcernsTable concerns={concerns} />
    </CampusPage>
  );
}