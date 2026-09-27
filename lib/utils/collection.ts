/** Small, dependency-free helpers shared by list screens. */

/** Case-insensitive "does any of these fields contain the query" filter. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return fields.some((field) => field?.toLowerCase().includes(term));
}

/** Keeps a single `All …` option plus the values present in the data. */
export function withAllOption<T extends string>(label: string, values: readonly T[]): (T | string)[] {
  return [label, ...values];
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), totalPages(total, pageSize));
}

export function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const value = key(item);
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function sumBy<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
