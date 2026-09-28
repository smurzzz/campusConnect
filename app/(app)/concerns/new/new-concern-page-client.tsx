"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle, Loader2, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { concernSchema } from "@/lib/validators";
import { CONCERN_CATEGORIES, type ConcernCategory } from "@/lib/constants/categories";
import { createConcern, uploadConcernAttachment } from "@/lib/concerns";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

export default function NewConcernPage() {
  const client = useSupabaseClient();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(concernSchema),
    defaultValues: {
      subject: "",
      category: "Academic" as ConcernCategory,
      description: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof concernSchema>) => {
    setError(null);
    if (!user) {
      setError("You must be signed in to submit a concern.");
      return;
    }

    try {
      // Upload first so a failed upload does not leave a concern row behind.
      let attachmentUrl: string | null = null;
      if (data.attachment && data.attachment[0]) {
        const upload = await uploadConcernAttachment(client, user.id, data.attachment[0]);
        if (upload.error) throw new Error(upload.error);
        attachmentUrl = upload.url;
      }

      const result = await createConcern(client, {
        studentId: user.id,
        subject: data.subject,
        description: data.description,
        category: data.category as ConcernCategory,
        attachmentUrl,
      });

      if (!result.ok || !result.id) throw new Error(result.error ?? "Failed to submit concern");

      setSubmittedId(result.id);
      reset();
      toast.success("Concern submitted successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit concern";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <CampusPage page="concern-new">
      {submittedId && (
        <div className="mb-6 rounded-lg border border-success/20 bg-success-soft p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <h3 className="font-semibold">Concern submitted!</h3>
              <p className="text-sm text-muted-foreground">
                The right team will review your concern and follow up shortly.{" "}
                <Link href={`/concerns/${submittedId}`} className="font-semibold text-primary hover:underline">
                  View the thread
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Briefly summarize your concern" {...register("subject")} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select id="category" className="field-select w-full" {...register("category")}>
              {CONCERN_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Please provide details about your concern..."
            className="min-h-[120px]"
            {...register("description")}
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="border-t pt-4">
          <Label htmlFor="attachment">Attachment (optional)</Label>
          <p className="mb-2 text-xs text-muted-foreground">PNG, JPG, WEBP or PDF up to 10 MB</p>
          <input
            type="file"
            id="attachment"
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="block w-full border border-input bg-background text-sm text-muted-foreground hover:border-primary/20"
            {...register("attachment")}
          />
          {errors.attachment && <p className="text-sm text-destructive">{errors.attachment.message}</p>}
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-[200px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2" />
                Submit Concern
              </>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div>
              <h3 className="font-semibold">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
    </CampusPage>
  );
}
