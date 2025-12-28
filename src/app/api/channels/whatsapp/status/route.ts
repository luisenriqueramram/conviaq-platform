// src/app/api/channels/whatsapp/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/server/session';
import { evolutionTryFetch, EVOLUTION_PATHS } from '@/lib/evolution';

function normalizeStatus(x: any): 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' {
  const s = String(x ?? '').toLowerCase();

  if (s.includes('open') || s.includes('connected') || s.includes('online')) return 'CONNECTED';
  if (s.includes('connecting') || s.includes('qr') || s.includes('pair')) return 'CONNECTING';
  return 'DISCONNECTED';
}

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const { rows } = await db.query(
      `
      select provider_account_id
      from public.channel_accounts
      where tenant_id = $1
        and channel_type = 'whatsapp'
        and provider = 'evolution'
        and is_active = true
      order by is_default desc, id desc
      limit 1
      `,
      [tenantId]
    );

    const instanceName = rows?.[0]?.provider_account_id as string | null;

    if (!instanceName) {
      return NextResponse.json(
        { ok: true, data: { status: 'DISCONNECTED', reason: 'NO_INSTANCE' } },
        { status: 200 }
      );
    }

    /**
     * ⚠️ OJO: los paths dependen de tu versión de Evolution.
     * Estos 2 suelen existir en muchas builds:
     * - /instance/connectionState/{instanceName}
     * - /instance/status/{instanceName}
     *
     * Si uno falla, probamos el otro.
     */
    let r = await evolutionTryFetch(EVOLUTION_PATHS.status(instanceName));

    if (!r || !r.res?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Evolution status failed',
          details: r?.json ?? null,
        },
        { status: 502 }
      );
    }

    // intentamos detectar el estado dentro del json
    const raw = r.json;
    const candidate =
      raw?.state ??
      raw?.instance?.state ??
      raw?.status ??
      raw?.connectionState ??
      raw?.data?.state ??
      raw;

    const status = normalizeStatus(candidate);

    return NextResponse.json({
      ok: true,
      data: { status, raw },
    });
  } catch (err: any) {
    if (String(err?.message) === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/channels/whatsapp/status error', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
