import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/constants/statuses";

/** Status chips reuse the design's `badge-*` utilities so tones stay consistent. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        primary: "category-badge",
        success: "badge-success",
        warning: "badge-warning",
        danger: "badge-danger",
        neutral: "badge-neutral",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Maps a module status onto its tone, e.g. `concernStatusTone(status)`. */
export function StatusBadge({
  tone,
  ...props
}: { tone: StatusTone } & Omit<BadgeProps, "tone">) {
  return <Badge tone={tone} {...props} />;
}

export { Badge, badgeVariants };
