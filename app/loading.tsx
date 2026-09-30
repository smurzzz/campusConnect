import { LoaderCircle } from "lucide-react";

/**
 * Route-level fallback shown by the App Router while a segment's page loads.
 * A single centered spinner covers every route; individual screens layer
 * their own skeleton loaders on top of their data fetches.
 */
export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading page">
      <LoaderCircle className="size-8 animate-spin text-primary" />
    </div>
  );
}
