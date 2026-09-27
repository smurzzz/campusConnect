import { GraduationCap } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";
import { cn } from "@/lib/utils";

type BrandProps = {
  /** `light` is for dark surfaces (auth split panels, admin preview). */
  tone?: "default" | "light";
  showTagline?: boolean;
  className?: string;
};

export function Brand({ tone = "default", showTagline = false, className }: BrandProps) {
  const isLight = tone === "light";

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          isLight ? "bg-white/15 text-white" : "bg-primary text-primary-foreground",
        )}
      >
        <GraduationCap className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight",
            isLight ? "text-white" : "text-foreground",
          )}
        >
          {APP_NAME}
        </span>
        {showTagline ? (
          <span className={cn("text-xs", isLight ? "text-white/70" : "text-muted-foreground")}>
            {APP_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
