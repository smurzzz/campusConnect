import { ITEM_STATUSES } from "@/lib/constants/statuses";

/**
 * `lost_found_items.status` is stored lowercase (`reported`/`claimed`);
 * map it to the chip label the UI speaks.
 */
export function toItemStatusLabel(value: string | null | undefined): string {
  return value === "claimed" ? ITEM_STATUSES.CLAIMED : ITEM_STATUSES.OPEN;
}
