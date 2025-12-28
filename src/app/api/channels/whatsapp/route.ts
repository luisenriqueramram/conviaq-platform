import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { getDefaultEvolutionWhatsAppAccount } from "@/lib/evolution";

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const acc = await getDefaultEvolutionWhatsAppAccount(tenantId);

    return NextResponse.json({ ok: true, data: acc });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/channels/whatsapp error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
