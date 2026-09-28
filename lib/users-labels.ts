import { ACCOUNT_STATUSES } from "@/lib/constants/statuses";

/**
 * `users.status` is stored lowercase (`active`/`deactivated`); map it to the
 * chip label the UI speaks.
 */
export function toAccountStatusLabel(value: string | null | undefined): string {
  return value === "deactivated" ? ACCOUNT_STATUSES.DEACTIVATED : ACCOUNT_STATUSES.ACTIVE;
}
