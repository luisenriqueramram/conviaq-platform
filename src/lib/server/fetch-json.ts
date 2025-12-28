// src/lib/server/fetch-json.ts
import { headers } from "next/headers";

export class FetchError extends Error {
  status: number;
  url: string;

  constructor(url: string, status: number, message?: string) {
    super(message ?? `Request failed: ${status}`);
    this.name = "FetchError";
    this.status = status;
    this.url = url;
  }
}

type FetchJSONOptions = RequestInit & {
  fallback?: unknown;
};

async function getBaseUrlFromHeaders() {
  // Next 16: headers() es async
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function fetchJSON<T>(pathOrUrl: string, options: FetchJSONOptions = {}): Promise<T> {
  const { fallback, ...init } = options;

  // Si ya viene como URL absoluta, úsala. Si no, construye base.
  const url =
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : new URL(
          pathOrUrl,
          process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : await getBaseUrlFromHeaders())
        ).toString();

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch (e) {
    if (fallback !== undefined) return fallback as T;
    throw e;
  }

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;

    // intenta leer body sin romper
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = (await res.json()) as any;
        if (j?.error) msg = `${msg} — ${String(j.error)}`;
      } else {
        const t = await res.text();
        if (t) msg = `${msg} — ${t.slice(0, 140)}`;
      }
    } catch {}

    if (fallback !== undefined) return fallback as T;
    throw new FetchError(url, res.status, msg);
  }

  // 204 No Content
  if (res.status === 204) return (fallback !== undefined ? (fallback as T) : (undefined as T));

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const t = await res.text();
    return (t as unknown) as T;
  }

  return (await res.json()) as T;
}
