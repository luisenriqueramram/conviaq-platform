// src/app/api/leads/[id]/conversations/route.ts
import { NextResponse } from 'next/server';
import { getLeadConversations } from '@/lib/db-autolavado';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const data = await getLeadConversations(id);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
