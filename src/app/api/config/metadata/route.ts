// src/app/api/config/metadata/route.ts
import { NextResponse } from 'next/server';
import { getConfigMetadata } from '@/lib/db-autolavado';

export async function GET(req: Request) {
  // Aquí deberías obtener el tenant_id del usuario autenticado o del request
  // Por simplicidad, lo dejo como un valor fijo o puedes extraerlo de un header/query
  const tenant_id = req.headers.get('x-tenant-id') || null;
  try {
    const data = await getConfigMetadata(tenant_id);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
