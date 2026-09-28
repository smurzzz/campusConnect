"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { CampusPage, ConcernsTable } from "@/components/campus-page";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import { listConcerns, toConcernStatusLabel, type ConcernListItem } from "@/lib/concerns";

export default function ConcernsPage() {
  const { user, isLoaded } = useUser();
  const client = useSupabaseClient();
  const [concerns, setConcerns] = useState<ConcernListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }

    void (async () => {
      const result = await listConcerns(client, { studentId: user.id });
      if (result.error) setError(result.error);
      setConcerns(result.rows);
      setLoading(false);
    })();
  }, [client, isLoaded, user]);

  return (
    <CampusPage page="concerns">
      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}
      <ConcernsTable
        items={concerns.map((row) => ({
          id: row.id,
          subject: row.subject,
          category: row.category,
          status: toConcernStatusLabel(row.status),
          submittedAt: new Date(row.created_at).toLocaleDateString(),
          studentName: row.student_name,
          assignee: row.assignee_name,
        }))}
      />
    </CampusPage>
  );
}
