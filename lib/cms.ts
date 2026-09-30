import type { SupabaseClient } from "@supabase/supabase-js";

import { downscaleImage } from "@/lib/image-utils";
import type { Database } from "@/lib/supabase";

type DbClient = SupabaseClient<Database>;

/**
 * Uploads an admin-authored image (announcement cover, event cover) into the
 * `cms-images` bucket under the owner's Clerk-id folder — the same shape the
 * storage RLS policy (`cms_images_write_own`) requires — then returns its
 * public URL for the `image_url` / `cover_image_url` columns.
 */
export async function uploadCmsImage(
  client: DbClient,
  ownerId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  // Posted covers are normalised to 1080p-class before upload.
  const uploadable = await downscaleImage(file);
  const safeName = uploadable.name.replace(/[^\w.\-]+/g, "-");
  const path = `${ownerId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await client.storage
    .from("cms-images")
    .upload(path, uploadable, { upsert: false });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = client.storage.from("cms-images").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
