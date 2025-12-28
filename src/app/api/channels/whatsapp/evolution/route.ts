import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { EVOLUTION_PATHS, evolutionTryFetch, getDefaultEvolutionWhatsAppAccount } from "@/lib/evolution";

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const acc = await getDefaultEvolutionWhatsAppAccount(tenantId);
    if (!acc) {
      return NextResponse.json({ ok: false, error: "No channel_account for evolution/whatsapp" }, { status: 404 });
    }

    if (!acc.provider_account_id) {
      return NextResponse.json({ ok: false, error: "provider_account_id is null (instance name missing)" }, { status: 400 });
    }

    // status real desde Evolution (probamos varias rutas conocidas)
    const { res, json, url } = await evolutionTryFetch(EVOLUTION_PATHS.status(acc.provider_account_id));

    return NextResponse.json({
      ok: true,
      account: {
        id: acc.id,
        tenant_id: acc.tenant_id,
        account_label: acc.account_label,
        provider_account_id: acc.provider_account_id,
        is_default: acc.is_default,
        is_active: acc.is_active,
      },
      evolution: {
        status: res.status,
        url,
        data: json,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET evolution panel error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
