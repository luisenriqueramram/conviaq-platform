// src/app/api/evolution/_debug/route.ts
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { db } from '@/lib/db';
import { evolutionFetch } from '@/lib/evolution';

function enc(x: string) {
  return encodeURIComponent(x);
}

async function getInstanceName(tenantId: number) {
  const { rows } = await db.query(
    `
    select provider_account_id
    from public.channel_accounts
    where tenant_id=$1
      and channel_type='whatsapp'
      and provider='evolution'
      and is_active=true
    order by is_default desc, id desc
    limit 1
    `,
    [tenantId]
  );
  return (rows?.[0]?.provider_account_id as string | null) ?? null;
}

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const instanceName = await getInstanceName(tenantId);
    if (!instanceName) {
      return NextResponse.json({ ok: false, error: 'NO_INSTANCE provider_account_id' }, { status: 400 });
    }

    // Rutas comunes en distintas versiones/builds de Evolution
    const probes = [
      // info / health
      { name: 'health', path: '/health' },
      { name: 'manager', path: '/manager' },

      // status
      { name: 'status.connectionState', path: `/instance/connectionState/${enc(instanceName)}` },
      { name: 'status.status', path: `/instance/status/${enc(instanceName)}` },
      { name: 'status.getConnectionState', path: `/instance/getConnectionState/${enc(instanceName)}` },
      { name: 'status.connection', path: `/connectionState/${enc(instanceName)}` },

      // qr
      { name: 'qr.qrcode', path: `/instance/qrcode/${enc(instanceName)}` },
      { name: 'qr.qr', path: `/instance/qr/${enc(instanceName)}` },
      { name: 'qr.connect', path: `/instance/connect/${enc(instanceName)}` },
      { name: 'qr.getQrCode', path: `/instance/getQrCode/${enc(instanceName)}` },
      { name: 'qr.qrcodeBase64', path: `/instance/qrcodeBase64/${enc(instanceName)}` },
      { name: 'qr.qrcode-image', path: `/instance/qrcode-image/${enc(instanceName)}` },
    ];

    const results: any[] = [];
    for (const p of probes) {
      const r = await evolutionFetch(p.path);
      results.push({
        name: p.name,
        url: r.url,
        ok: r.res?.ok ?? false,
        status: r.res?.status ?? null,
        // recortamos para que no sea enorme
        dataPreview: r.json ? JSON.stringify(r.json).slice(0, 500) : null,
        rawPreview: r.json
          ? typeof r.json === 'string'
            ? (r.json as string).slice(0, 500)
            : JSON.stringify(r.json).slice(0, 500)
          : null,
      });
    }

    const okOnes = results.filter((x) => x.ok);

    return NextResponse.json({
      ok: true,
      tenantId,
      instanceName,
      working: okOnes,
      all: results,
    });
  } catch (err: any) {
    if (String(err?.message) === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/evolution/_debug error', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
