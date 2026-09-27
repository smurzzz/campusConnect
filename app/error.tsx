"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCw, TriangleAlert } from "lucide-react";

import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";

/**
 * Route error boundary (system state screen). `error` is intentionally logged
 * in development only so demos stay clean.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="empty-state-icon mx-auto">
          <TriangleAlert className="size-6 text-danger" aria-hidden />
        </span>
        <h1 className="page-title mt-5 text-3xl">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This screen could not load. Try again — if the problem continues, contact{" "}
          <a className="section-link" href="mailto:support@campusconnect.app">
            support
          </a>
          .
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RotateCw />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.HOME}>
              <Home />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
