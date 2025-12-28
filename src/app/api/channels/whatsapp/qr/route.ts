import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { getDefaultEvolutionWhatsAppAccount, EVOLUTION_PATHS, evolutionTryFetch, pickQrFromEvolution } from "@/lib/evolution";

export async function GET() {
  try {
    const { tenantId } = await requireSession();
    const acc = await getDefaultEvolutionWhatsAppAccount(tenantId);

    if (!acc?.provider_account_id) {
      return NextResponse.json(
        { ok: false, error: "No instance_name (provider_account_id) in channel_accounts" },
        { status: 400 }
      );
    }

    const r = await evolutionTryFetch(EVOLUTION_PATHS.qr(acc.provider_account_id));

    if (!r || !r.res?.ok) {
      console.error("EVOLUTION QR fetch failed:", { url: r?.url, status: r?.res?.status, body: r?.json });
    }

    console.log("EVOLUTION QR response:", { url: r?.url, status: r?.res?.status, json: r?.json });

    const qr = pickQrFromEvolution(r?.json);
    console.log("Extracted QR:", { hasQr: !!qr, qrLength: qr?.length ?? 0 });

    return NextResponse.json({
      ok: true,
      data: {
        qr,
        upstream: r
          ? { ok: r.res?.ok ?? false, status: r.res?.status ?? null, url: r.url, preview: r.json ?? null }
          : null,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET whatsapp qr error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
