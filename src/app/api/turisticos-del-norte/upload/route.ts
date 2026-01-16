import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const TENANT_ID = 26;
const BUCKET = "media";

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\.\-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

// POST: Subir imagen y guardar en media_assets
export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = sanitizeFileName(file.name || "archivo");
    const path = `tenants/${TENANT_ID}/portal/templates/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      console.error("[UPLOAD] Supabase upload error", uploadError);
      return NextResponse.json({ error: "UPLOAD_FAILED", detail: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: "PUBLIC_URL_ERROR" }, { status: 500 });
    }

    await db.query(
      `INSERT INTO media_assets (tenant_id, file_name, public_url, storage_path, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [TENANT_ID, file.name, publicUrl, path]
    );

    return NextResponse.json({ ok: true, url: publicUrl, path });
  } catch (error) {
    console.error("[API] POST turisticos-del-norte/upload", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE: eliminar un archivo del storage y limpiar media_assets
export async function DELETE(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    const { path } = await req.json();
    if (!path) {
      return NextResponse.json({ error: "NO_PATH" }, { status: 400 });
    }

    const { error: removeError } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (removeError) {
      console.error("[UPLOAD] remove error", removeError);
      return NextResponse.json({ error: "REMOVE_FAILED", detail: removeError.message }, { status: 500 });
    }

    await db.query(`delete from media_assets where tenant_id = $1 and storage_path = $2`, [TENANT_ID, path]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] DELETE turisticos-del-norte/upload", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
