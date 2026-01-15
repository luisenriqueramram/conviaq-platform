import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";

const TENANT_ID = 26;

// POST: Subir imagen y guardar en media_assets
export async function POST(req: Request) {
  try {
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    }
    // Aquí deberías subir el archivo a tu storage (ej: S3, Supabase Storage, etc.)
    // y guardar la URL pública en la tabla media_assets
    // Por ahora, solo simula la respuesta:
    const fakeUrl = `https://cdn.turisticos.com/assets/${Date.now()}_${file.name}`;
    // Guarda en media_assets
    await db.query(
      `INSERT INTO media_assets (tenant_id, file_name, public_url, created_at) VALUES ($1, $2, $3, NOW())`,
      [TENANT_ID, file.name, fakeUrl]
    );
    return NextResponse.json({ ok: true, url: fakeUrl });
  } catch (error) {
    console.error("[API] POST turisticos-del-norte/upload", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
