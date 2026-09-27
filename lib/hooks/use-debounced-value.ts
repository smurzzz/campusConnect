"use client";

import { useEffect, useState } from "react";

import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/app";

/**
 * Delays a fast-changing value so list screens only re-filter after the user
 * stops typing (300 ms, per the interaction standards).
 */
export function useDebouncedValue<T>(value: T, delay: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
