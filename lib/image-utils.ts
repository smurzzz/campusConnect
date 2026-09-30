/**
 * Client-side image downscale.
 *
 * Phone cameras produce 4000px-wide multi-MB shots; posted images look best
 * (and upload fast) at 1080p, so every image is decoded, fitted within
 * MAX_IMAGE_WIDTH, and re-encoded before it reaches Supabase Storage.
 * Non-image files (PDFs) and small images pass through untouched.
 */

export const MAX_IMAGE_WIDTH = 1920;

/**
 * Downscales `file` to at most MAX_IMAGE_WIDTH px wide, preserving aspect
 * ratio. Returns the original File when it is not a raster image or is
 * already within bounds.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // Undecodable — let the upload surface the error.

  const { width, height } = bitmap;
  if (width <= MAX_IMAGE_WIDTH) {
    bitmap.close();
    return file;
  }

  const scale = MAX_IMAGE_WIDTH / width;
  const canvas = document.createElement("canvas");
  canvas.width = MAX_IMAGE_WIDTH;
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type === "image/png" ? "image/png" : "image/jpeg", 0.9),
  );
  if (!blob) return file;

  // Keep the original extension so storage paths stay truthful.
  const name = file.name.replace(/(\.[^.]+)$/, "") + (file.type === "image/png" ? ".png" : ".jpg");
  return new File([blob], name, { type: file.type === "image/png" ? "image/png" : "image/jpeg", lastModified: Date.now() });
}
