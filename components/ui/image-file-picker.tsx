"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ImageIcon, Paperclip, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import type { UseFormRegisterReturn } from "react-hook-form";

type Preview = {
  url: string | null;
  name: string;
  sizeLabel: string;
  isImage: boolean;
};

type ImageFilePickerProps = {
  /** Spread of react-hook-form's `register("attachment")` — keeps zod validation wired. */
  registerProps?: UseFormRegisterReturn;
  /** zod error message for the field, rendered under the picker. */
  error?: string;
  label: string;
  note?: string;
  /** Accepted types for the gallery/files button. Camera is always image-only. */
  accept?: string;
  /** Extra onChange (already receives the raw event; RHF stays wired through the spread). */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * Controlled mode (no registerProps): the picker reports the chosen File and
   * the parent owns it — used by plain-state forms (announcement/event managers).
   */
  onFileSelected?: (file: File | null) => void;
  /** Optional external preview URL to show before anything is picked (e.g. an existing cover). */
  existingUrl?: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Attachment picker with an explicit "Take photo" (device camera) vs
 * "Choose from gallery / files" choice, plus a thumbnail preview with a
 * remove button.
 *
 * A single hidden file input is registered with react-hook-form; the two
 * visible buttons only drive that input (adjusting `accept` and the `capture`
 * attribute per mode), so zod validation of the FileList is untouched.
 */
export function ImageFilePicker({
  registerProps,
  error,
  label,
  note,
  accept = "image/png,image/jpeg,image/webp,application/pdf",
  onChange,
  onFileSelected,
  existingUrl,
}: ImageFilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  // Revoke object URLs so blobs do not outlive their preview.
  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const openWith = (mode: "camera" | "files") => {
    const input = inputRef.current;
    if (!input) return;
    if (mode === "camera") {
      input.setAttribute("accept", "image/*");
      input.setAttribute("capture", "environment");
    } else {
      input.setAttribute("accept", accept);
      input.removeAttribute("capture");
    }
    input.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      if (!file) return null;
      return {
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        name: file.name,
        sizeLabel: formatBytes(file.size),
        isImage: file.type.startsWith("image/"),
      };
    });
    onFileSelected?.(file);
    onChange?.(event);
  };

  const clear = () => {
    const input = inputRef.current;
    if (!input) return;
    input.value = "";
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    onFileSelected?.(null);
    // Let react-hook-form (and any caller handler) observe the cleared value.
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div className="border-t pt-4">
      <Label htmlFor={registerProps?.name ?? label.toLowerCase().replace(/\s+/g, "-")}>{label}</Label>
      {note && <p className="mb-2 text-xs text-muted-foreground">{note}</p>}

      <input
        type="file"
        id={registerProps?.name ?? label.toLowerCase().replace(/\s+/g, "-")}
        className="sr-only"
        accept={accept}
        {...registerProps}
        onChange={(event) => {
          // Both handlers must run: ours drives the preview, react-hook-form's
          // records the FileList. Overriding the spread `onChange` outright
          // (the previous code) silently dropped the value, so zod saw
          // `undefined`, the upload branch was skipped and rows saved with a
          // null photo/attachment URL.
          handleChange(event);
          registerProps?.onChange?.(event);
        }}
        ref={(node) => {
          // Keep react-hook-form's ref AND our own handle for the buttons.
          registerProps?.ref(node);
          inputRef.current = node;
        }}
      />

      {!preview && existingUrl ? (
        <div className="flex items-center gap-4 rounded-md border border-border bg-muted/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- user-provided CMS image, not a Next-optimized asset */}
          <img src={existingUrl} alt="Current image" className="size-16 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Current image</p>
            <p className="text-xs text-muted-foreground">Pick a file to replace it</p>
          </div>
        </div>
      ) : null}

      {!preview ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center"
            onClick={() => openWith("camera")}
          >
            <Camera className="size-6" />
            <span className="text-sm font-semibold">Take photo</span>
            <span className="text-xs text-muted-foreground">Open the camera</span>
          </button>
          <button
            type="button"
            className="upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center"
            onClick={() => openWith("files")}
          >
            <ImageIcon className="size-6" />
            <span className="text-sm font-semibold">Choose from gallery / files</span>
            <span className="text-xs text-muted-foreground">Browse your device</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-md border border-border bg-muted/40 p-3">
          {preview.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset
            <img src={preview.url} alt={preview.name} className="size-16 rounded-md object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-md bg-background">
              <Paperclip className="size-6 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{preview.name}</p>
            <p className="text-xs text-muted-foreground">{preview.sizeLabel}</p>
          </div>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
            aria-label="Remove selected file"
            onClick={clear}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
