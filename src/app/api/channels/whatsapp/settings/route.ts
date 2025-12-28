import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import {
  EVOLUTION_PATHS,
  evolutionTryFetch,
  getDefaultEvolutionWhatsAppAccount,
  getInstanceNameOrThrow,
} from "@/lib/evolution";

type UiSettings = {
  always_online?: boolean;
  reject_calls?: boolean;
  reject_calls_message?: string;
  mark_read_messages?: boolean;
  mark_read_status?: boolean;
};

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const acc = await getDefaultEvolutionWhatsAppAccount(tenantId);
    if (!acc) return NextResponse.json({ ok: false, error: "NO_ACCOUNT" }, { status: 404 });

    let instance = "";
    try {
      instance = getInstanceNameOrThrow(acc);
    } catch {
      return NextResponse.json({ ok: false, error: "NO_INSTANCE" }, { status: 400 });
    }

    const r = await evolutionTryFetch(EVOLUTION_PATHS.settingsGet(instance));

    if (!r.res.ok) {
      return NextResponse.json(
        { ok: false, error: "EVOLUTION_SETTINGS_GET_FAILED", debug: { url: r.url, raw: r.json } },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data: { raw: r.json } });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/channels/whatsapp/settings error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const acc = await getDefaultEvolutionWhatsAppAccount(tenantId);
    if (!acc) return NextResponse.json({ ok: false, error: "NO_ACCOUNT" }, { status: 404 });

    let instance = "";
    try {
      instance = getInstanceNameOrThrow(acc);
    } catch {
      return NextResponse.json({ ok: false, error: "NO_INSTANCE" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as UiSettings;

    // Construir objeto con sólo las claves presentes (no enviar undefined)
    const settingsOnly: Record<string, any> = {};
    if (typeof body.always_online !== "undefined") settingsOnly.always_online = !!body.always_online;
    if (typeof body.reject_calls !== "undefined") settingsOnly.reject_calls = !!body.reject_calls;
    if (typeof body.reject_calls_message !== "undefined") settingsOnly.reject_calls_message = body.reject_calls_message;
    if (typeof body.mark_read_messages !== "undefined") settingsOnly.mark_read_messages = !!body.mark_read_messages;
    if (typeof body.mark_read_status !== "undefined") settingsOnly.mark_read_status = !!body.mark_read_status;

    // Map local keys to Evolution expected keys (camelCase example you provided)
    const evolutionPayload: Record<string, any> = {};
    // Provide explicit defaults expected by some Evolution deployments
    evolutionPayload.rejectCall = typeof settingsOnly.reject_calls !== "undefined" ? settingsOnly.reject_calls : false;
    evolutionPayload.msgCall = typeof settingsOnly.reject_calls_message !== "undefined" ? settingsOnly.reject_calls_message : "";
    evolutionPayload.groupsIgnore = true; // Always true as per requirement
    evolutionPayload.alwaysOnline = typeof settingsOnly.always_online !== "undefined" ? settingsOnly.always_online : false;
    evolutionPayload.readMessages = false; // Always false as per requirement
    evolutionPayload.syncFullHistory = typeof settingsOnly.syncFullHistory !== "undefined" ? settingsOnly.syncFullHistory : false;
    evolutionPayload.readStatus = typeof settingsOnly.mark_read_status !== "undefined" ? settingsOnly.mark_read_status : false;

    // Headers to include instance name (some deployments expect instance in header)
    const instanceHeaders = {
      instance,
      "Instance-Name": instance,
      "X-Instance-Name": instance,
    } as Record<string, string>;

    // Helpers that include instance headers
    const tryJson = async (paths: string[]) =>
      await evolutionTryFetch(paths, { method: "PATCH", headers: instanceHeaders, body: JSON.stringify(evolutionPayload) });

    const tryPostWithInstance = async (paths: string[]) =>
      await evolutionTryFetch(paths, { method: "POST", headers: instanceHeaders, body: JSON.stringify({ instance, ...evolutionPayload }) });

    const toForm = (obj: Record<string, any>) =>
      Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");

    const tryForm = async (paths: string[]) =>
      await evolutionTryFetch(paths, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...instanceHeaders },
        body: toForm({ instance, ...evolutionPayload }),
      });

    // 1) PATCH JSON to instance-based paths
    const r1 = await tryJson(EVOLUTION_PATHS.settingsSet(instance));
    if (r1 && r1.res?.ok) return NextResponse.json({ ok: true, data: { raw: r1.json, used: r1.url } });

    console.error("EVOLUTION settings set attempt failed (PATCH JSON):", { url: r1?.url, status: r1?.res?.status, body: JSON.stringify(r1?.json, null, 2) });

    // 2) POST to explicit path /settings/set/{instance}
    const pathWithInstance = `/settings/set/${encodeURIComponent(instance)}`;
    try {
      const rExact = await evolutionTryFetch([pathWithInstance], { method: "POST", headers: { ...{ instance }, ...(await Promise.resolve({})) }, body: JSON.stringify(evolutionPayload) });
      if (rExact && rExact.res?.ok) return NextResponse.json({ ok: true, data: { raw: rExact.json, used: rExact.url } });
      console.error("EVOLUTION settings set attempt failed (POST exact):", { url: rExact?.url, status: rExact?.res?.status, body: JSON.stringify(rExact?.json, null, 2) });
    } catch (e) {
      console.error("EVOLUTION exact POST attempt error", e);
    }

    // 3) POST with instance in body to common paths
    const r2 = await tryPostWithInstance(["/settings/set", "/settings", "/instance/settings"]);
    if (r2 && r2.res?.ok) return NextResponse.json({ ok: true, data: { raw: r2.json, used: r2.url } });

    console.error("EVOLUTION settings set attempt failed (POST body):", { url: r2?.url, status: r2?.res?.status, body: JSON.stringify(r2?.json, null, 2) });

    // 4) form-urlencoded POST
    const r3 = await tryForm(["/settings/set", "/settings", "/instance/settings"]);
    if (r3 && r3.res?.ok) return NextResponse.json({ ok: true, data: { raw: r3.json, used: r3.url } });

    console.error("EVOLUTION settings set attempt failed (form):", { url: r3?.url, status: r3?.res?.status, body: JSON.stringify(r3?.json, null, 2) });

    return NextResponse.json(
      {
        ok: false,
        error: "EVOLUTION_SETTINGS_SET_FAILED",
        debug: { tried: [r1?.url ?? null, r2?.url ?? null, r3?.url ?? null], raw: r3?.json ?? r2?.json ?? r1?.json },
      },
      { status: 502 }
    );
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/channels/whatsapp/settings error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
