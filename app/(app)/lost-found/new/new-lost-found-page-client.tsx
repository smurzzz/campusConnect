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
import { ImageFilePicker } from "@/components/ui/image-file-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { lostFoundSchema } from "@/lib/validators";
import { CAMPUS_LOCATIONS, LOST_FOUND_CATEGORIES, type LostFoundCategory } from "@/lib/constants/categories";
import { createLostFoundItem, uploadLostFoundPhoto } from "@/lib/lost-found";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

export default function NewLostFoundPage() {
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
    resolver: zodResolver(lostFoundSchema),
    defaultValues: {
      name: "",
      type: "Lost" as const,
      category: "Personal item" as LostFoundCategory,
      location: CAMPUS_LOCATIONS[0],
      date: "",
      description: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof lostFoundSchema>) => {
    setError(null);
    if (!user) {
      setError("You must be signed in to report an item.");
      return;
    }

    try {
      let photoUrl: string | null = null;
      if (data.attachment && data.attachment[0]) {
        const upload = await uploadLostFoundPhoto(client, user.id, data.attachment[0]);
        if (upload.error) throw new Error(upload.error);
        photoUrl = upload.url;
      }

      const result = await createLostFoundItem(client, {
        reportedBy: user.id,
        type: data.type.toLowerCase() as "lost" | "found",
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        date: data.date,
        photoUrl,
      });

      if (!result.ok || !result.id) throw new Error(result.error ?? "Failed to submit item");

      setSubmittedId(result.id);
      reset();
      toast.success("Item reported successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit item";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <CampusPage page="lost-new">
      {submittedId && (
        <div className="mb-6 rounded-lg border border-success/20 bg-success-soft p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <h3 className="font-semibold">Item reported!</h3>
              <p className="text-sm text-muted-foreground">
                The item has been reported and will be visible to others who can help return it.{" "}
                <Link href={`/lost-found/${submittedId}`} className="font-semibold text-primary hover:underline">
                  View the report
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Item name</Label>
            <Input id="name" placeholder="e.g. Black umbrella" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="type">Lost or Found</Label>
            <select id="type" className="field-select w-full" {...register("type")}>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <select id="category" className="field-select w-full" {...register("category")}>
              {LOST_FOUND_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <select id="location" className="field-select w-full" {...register("location")}>
              {CAMPUS_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="Add a short description..." className="min-h-[120px]" {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <ImageFilePicker
          label="Photo (optional)"
          note="PNG, JPG or WEBP up to 10 MB — use your camera or pick from your gallery"
          accept="image/png,image/jpeg,image/webp"
          registerProps={register("attachment")}
          error={errors.attachment?.message}
        />

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
                Submit Report
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
