'use client';

import type { Metadata } from "next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef } from "react";

import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Send } from "lucide-react";
import { AlertTriangle } from "lucide-react";

import { useUser } from "@clerk/nextjs";

import { concernSchema } from "@/lib/validators";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const metadata: Metadata = {
  title: "Submit a concern — CampusConnect",
  description: "Tell us what happened and the right team will follow up.";
};

export default function NewConcernPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(concernSchema),
    defaultValues: {
      subject: "",
      category: "Academic",
      description: "",
    },
  });
  const { user: currentUser } = useUser();

  const onSubmit = async (data: z.infer<typeof concernSchema>) => {
    setLoading(true);
    setError(null);

    try {
      // Handle file upload if provided
      let attachmentUrl = null;
      if (data.attachment && data.attachment[0]) {
        const file = data.attachment[0];
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('concern-attachments')
          .upload(filename, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('concern-attachments')
          .getPublicUrl(uploadData.path);

        attachmentUrl = urlData.publicUrl;
      }

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Insert concern into database
      const { data: concernData, error: concernError } = await supabase
        .from('concerns')
        .insert({
          subject: data.subject,
          category: data.category,
          description: data.description,
          attachment_url: attachmentUrl,
          student_id: currentUser.id,
          status: 'pending',
        })
        .select()
        .single();

      if (concernError) throw concernError;

      // TODO: Create notification for staff/admins

      setSuccess(true);
      reset();
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Show success toast
      toast.success("Concern submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit concern');
      toast.error("Failed to submit concern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CampusPage page="concern-new">
      {success && (
        <div className="mb-6 p-4 bg-green-soft rounded-lg border border-green/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 shrink-0 h-4 w-4 text-green"/>
            <div>
              <h3 className="font-semibold">Concern submitted!</h3>
              <p className="text-sm text-muted-foreground">
                The right team will review your concern and follow up shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      <form
        className="space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Briefly summarize your concern"
              {...register("subject")}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="field-select w-full"
              {...register("category")}
            >
              <option value="Academic">Academic</option>
              <option value="Facility">Facility</option>
              <option value="Administrative">Administrative</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
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
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="border-t pt-4">
          <Label htmlFor="attachment">Attachment (optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            PNG, JPG, WEBP or PDF up to 10 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            id="attachment"
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="block w-full text-sm text-muted-foreground border border-input bg-background hover:border-primary/20"
            {...register("attachment")}
          />
          {errors.attachment && (
            <p className="text-sm text-destructive">{errors.attachment.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-[200px]"
          >
            {isSubmitting || loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                Submitting...
              </>
            ) : (
              <Send className="mr-2"/>
              Submit Concern
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-soft rounded-lg border border-red/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 h-4 w-4 text-red"/>
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