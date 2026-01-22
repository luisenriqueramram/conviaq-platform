// src/app/api/leads/[id]/activity/route.ts
import { NextResponse } from 'next/server';
import { getLeadActivityLog } from '@/lib/db-autolavado';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const lead_id = params.id;
  try {
    const data = await getLeadActivityLog(lead_id);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
