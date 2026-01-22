// src/app/api/config/metadata/route.ts
import { NextResponse } from 'next/server';
import { getConfigMetadata } from '@/lib/db-autolavado';
import { requireSession } from '@/lib/server/session';

export async function GET() {
  try {
    const { tenantId } = await requireSession();
    const data = await getConfigMetadata(tenantId ?? null);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    if (String(error?.message) === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
