// src/app/api/health/route.ts
import "@/app/api/_init";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dbAutolavado } from "@/lib/db-autolavado";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

const PING_TIMEOUT_MS = Number(process.env.HEALTHCHECK_DB_TIMEOUT ?? 2500);

type PoolLike = {
  connect: () => Promise<{ query: (sql: string) => Promise<any>; release: (force?: boolean) => void }>;
};

async function pingDatabase(pool: PoolLike, label: string) {
  let client: any = null;
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    if (client) {
      console.warn(`[Health] ${label} ping exceeded ${PING_TIMEOUT_MS}ms, forcing client release`);
      client.release(true);
      client = null;
    }
  }, PING_TIMEOUT_MS);

  try {
    client = await pool.connect();
    await client.query('SELECT 1 as health');
    return 'healthy';
  } catch (error: any) {
    if (timedOut) {
      return 'timeout';
    }
    return `error: ${error.message}`;
  } finally {
    clearTimeout(timeoutId);
    if (client) {
      client.release();
    }
  }
}

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: { crm: 'unknown', autolavado: 'unknown' },
    uptime: process.uptime(),
  };

  try {
    checks.database.crm = await pingDatabase(db, 'crm');
    checks.database.autolavado = await pingDatabase(dbAutolavado, 'autolavado');

    // Si alguna DB falló, marcar como unhealthy
    if (checks.database.crm !== 'healthy' || checks.database.autolavado !== 'healthy') {
      checks.status = 'degraded';
    }

    // Si ambas DBs tienen timeout o error crítico, marcar como unhealthy
    if (checks.database.crm.includes('timeout') && checks.database.autolavado.includes('timeout')) {
      checks.status = 'unhealthy';
      return NextResponse.json(checks, { status: 503 });
    }

    return NextResponse.json(checks, { 
      status: checks.status === 'healthy' ? 200 : 200 // Siempre 200 para no reiniciar por degraded
    });
  } catch (error: any) {
    checks.status = 'unhealthy';
    return NextResponse.json({
      ...checks,
      error: error.message,
    }, { status: 503 });
  }
}
