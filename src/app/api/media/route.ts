import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const mime = searchParams.get("mime") || "audio/ogg";

  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  // Passthrough Range (clave para que el audio muestre duración)
  const range = req.headers.get("range") || undefined;

  const upstream = await fetch(url, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  });

  // Copiamos headers relevantes del upstream, pero forzamos inline + mime
  const headers = new Headers(upstream.headers);

  headers.set("Content-Type", headers.get("Content-Type") || mime);
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "public, max-age=3600");

  // Importante: permitir que el browser vea headers de rango si aplica
  headers.set(
    "Access-Control-Expose-Headers",
    "Content-Range, Accept-Ranges, Content-Length, Content-Type"
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
