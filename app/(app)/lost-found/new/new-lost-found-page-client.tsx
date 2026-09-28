"use client";

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

import { lostFoundSchema } from "@/lib/validators";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CAMPUS_LOCATIONS } from "@/lib/constants/categories";

export default function NewLostFoundPage() {
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
    resolver: zodResolver(lostFoundSchema),
    defaultValues: {
      name: "",
      type: "Lost",
      category: "Personal item",
      location: CAMPUS_LOCATIONS[0],
      date: "",
      description: "",
      // No default: `FileList` only exists in the browser, and an empty array
      // would fail the schema's `value instanceof FileList` check. `.optional()`
      // accepts `undefined`.
    },
  });
  const { user: currentUser } = useUser();

  const onSubmit = async (data: z.infer<typeof lostFoundSchema>) => {
    setLoading(true);
    setError(null);

    try {
      // Handle file upload if provided (for lost/found items, we expect a photo)
      let photoUrl = null;
      if (data.attachment && data.attachment[0]) {
        const file = data.attachment[0];
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('lost-found-attachments')
          .upload(filename, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('lost-found-attachments')
          .getPublicUrl(uploadData.path);

        photoUrl = urlData.publicUrl;
      }

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Insert lost/found item into database
      const { data: itemData, error: itemError } = await supabase
        .from('lost_found_items')
        .insert({
          type: data.type,
          name: data.name,
          description: data.description,
          category: data.category,
          location: data.location,
          date: data.date,
          photo_url: photoUrl,
          reported_by: currentUser.id,
          status: 'reported',
        })
        .select()
        .single();

      if (itemError) throw itemError;

      setSuccess(true);
      reset();
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Show success toast
      toast.success("Item reported successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit item');
      toast.error("Failed to submit item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CampusPage page="lost-new">
      {success && (
        <div className="mb-6 p-4 bg-green-soft rounded-lg border border-green/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 shrink-0 h-4 w-4 text-green"/>
            <div>
              <h3 className="font-semibold">Item reported!</h3>
              <p className="text-sm text-muted-foreground">
                The item has been reported and will be visible to others who can help return it.
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
            <Label htmlFor="name">Item name</Label>
            <Input
              id="name"
              placeholder="e.g. Black umbrella"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Lost or Found</Label>
            <select
              id="type"
              className="field-select w-full"
              {...register("type")}
            >
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="field-select w-full"
              {...register("category")}
            >
              <option value="Personal item">Personal item</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
              <option value="Keys">Keys</option>
              <option value="Clothing">Clothing</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <select
              id="location"
              className="field-select w-full"
              {...register("location")}
            >
              {CAMPUS_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Add a short description..."
            className="min-h-[120px]"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="border-t pt-4">
          <Label htmlFor="photo">Photo (optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            PNG, JPG, WEBP or PDF up to 10 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            id="photo"
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="block w-full text-sm text-muted-foreground border border-input bg-background hover:border-primary/20"
          />
          {/* We don't register this input with react-hook-form because we're handling it separately.
               If we want to include it in form validation, we would need to update the schema.
               For now, we'll just handle the file upload manually. */}
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
              <>
                <Send className="mr-2"/>
                Submit Report
              </>
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