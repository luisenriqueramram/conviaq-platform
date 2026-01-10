import { NextResponse } from "next/server";
import { requireSolarPanelAccess } from "@/lib/server/solar-panel-guard";
import { query } from "@/lib/db";

// GET: Obtener configuración
export async function GET(_req: Request, { params }: { params: { configId: string } }) {
  try {
    const configId = Number(params.configId);
    if (isNaN(configId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    await requireSolarPanelAccess({ configId });
    const result = await query<{ schema_json: string }>(
      `SELECT schema_json FROM industry_configs WHERE id = $1`,
      [configId]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(JSON.parse(result.rows[0].schema_json));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error de acceso" }, { status: 403 });
  }
}

// PUT: Actualizar configuración
export async function PUT(req: Request, { params }: { params: { configId: string } }) {
  try {
    const configId = Number(params.configId);
    if (isNaN(configId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    await requireSolarPanelAccess({ configId });
    const body = await req.json();
    await query(
      `UPDATE industry_configs SET schema_json = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(body), configId]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error de acceso" }, { status: 403 });
  }
}
