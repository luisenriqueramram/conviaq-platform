// src/lib/server/normalize.ts
export function extractCount(data: any): number | undefined {
  if (typeof data === "number") return data;
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const c = data.count ?? data.total ?? data.meta?.count ?? data.meta?.total;
    if (typeof c === "number") return c;
    if (Array.isArray(data.items)) return data.items.length;
  }
  return undefined;
}

export function extractItems<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data.items as T[];
    if (Array.isArray(data.data)) return data.data as T[];
    if (Array.isArray(data.rows)) return data.rows as T[];
  }
  return [];
}
