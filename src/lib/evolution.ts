// src/lib/evolution.ts
import { db } from "@/lib/db";



const BASE_URL = (process.env.EVOLUTION_BASE_URL ?? "").trim().replace(/\/+$/, "");
const API_KEY = (process.env.EVOLUTION_API_KEY ?? "").trim();



if (!BASE_URL) throw new Error("EVOLUTION_BASE_URL is not set");
if (!API_KEY) throw new Error("EVOLUTION_API_KEY is not set");

export type ChannelAccount = {
  id: number;
  tenant_id: number;
  channel_type: string;
  provider: string;
  account_label: string | null;
  account_type: string | null;
  phone_e164: string | null;
  is_default: boolean;
  is_active: boolean;
  provider_account_id: string | null; // instance name
  created_at: string;
};

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export async function evolutionFetch(path: string, init: RequestInit = {}) {
  const url = `${BASE_URL}${normalizePath(path)}`;

  const headers = new Headers(init.headers);
  // muchas instalaciones de Evolution aceptan apikey; otras Bearer; mandamos ambos.
  headers.set("apikey", API_KEY);
  headers.set("Authorization", `Bearer ${API_KEY}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json, url };
}

/**
 * Para aguantar diferencias de rutas entre despliegues/versiones,
 * intentamos varias rutas y nos quedamos con la primera que responda ok.
 */
export async function evolutionTryFetch(paths: string[], init: RequestInit = {}) {
  let last: { res: Response; json: any; url: string } | null = null;

  for (const p of paths) {
    const r = await evolutionFetch(p, init);
    last = r;
    if (r.res.ok) return r;
  }

  // si ninguna respondió ok, regresamos la última para debug
  return last!;
}

export async function getDefaultEvolutionWhatsAppAccount(tenantId: number) {
  const q = `
    select
      id, tenant_id, channel_type, provider, account_label, account_type,
      phone_e164, is_default, is_active, provider_account_id, created_at
    from public.channel_accounts
    where tenant_id = $1
      and channel_type = 'whatsapp'
      and provider = 'evolution'
      and is_active = true
    order by is_default desc, id asc
    limit 1
  `;
  const { rows } = await db.query(q, [tenantId]);
  return (rows[0] ?? null) as ChannelAccount | null;
}

export function getInstanceNameOrThrow(acc: ChannelAccount) {
  const name = (acc.provider_account_id ?? "").trim();
  if (!name) throw new Error("MISSING_INSTANCE_NAME");
  return name;
}

/** Rutas “probables” (no rompes nada si una no existe, porque hacemos try) */
export const EVOLUTION_PATHS = {
  status: (instance: string) => [
    `/instance/connectionState/${encodeURIComponent(instance)}`,
    `/instance/connection-state/${encodeURIComponent(instance)}`,
    `/instance/status/${encodeURIComponent(instance)}`,
  ],

  qr: (instance: string) => [
    `/instance/connect/${encodeURIComponent(instance)}`,
    `/instance/qr/${encodeURIComponent(instance)}`,
    `/instance/qrcode/${encodeURIComponent(instance)}`,
  ],

  settingsGet: (instance: string) => [
    `/instance/settings/${encodeURIComponent(instance)}`,
    `/settings/find/${encodeURIComponent(instance)}`,
    `/instance/findSettings/${encodeURIComponent(instance)}`,
  ],

  settingsSet: (instance: string) => [
    `/instance/settings/${encodeURIComponent(instance)}`,
    `/settings/set/${encodeURIComponent(instance)}`,
    `/instance/setSettings/${encodeURIComponent(instance)}`,
  ],
};

export function mapEvolutionStatusToUi(json: any): "CONNECTED" | "CONNECTING" | "DISCONNECTED" {
  const raw =
    json?.state ??
    json?.connectionState ??
    json?.status ??
    json?.instance?.state ??
    json?.instance?.status ??
    null;

  const s = String(raw ?? "").toLowerCase();

  if (["open", "connected", "online", "ready"].some((x) => s.includes(x))) return "CONNECTED";
  if (["connecting", "pairing", "qr", "scan"].some((x) => s.includes(x))) return "CONNECTING";
  return "DISCONNECTED";
}

export function pickQrFromEvolution(json: any): string | null {
  // casos comunes:
  // - { qr: "data:image/png;base64,..." }
  // - { base64: "..." }
  // - { qrcode: { base64: "..." } }
  const direct = json?.qr ?? json?.qrcode ?? null;
  if (typeof direct === "string" && direct.startsWith("data:image/")) return direct;

  const b64 =
    json?.base64 ??
    json?.qrcode?.base64 ??
    json?.qrCode?.base64 ??
    json?.qr?.base64 ??
    null;

  if (typeof b64 === "string" && b64.length > 40) {
    return b64.startsWith("data:image/") ? b64 : `data:image/png;base64,${b64}`;
  }

  return null;
}
