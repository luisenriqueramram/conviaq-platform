// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dbAutolavado } from "@/lib/db-autolavado";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: { crm: 'unknown', autolavado: 'unknown' },
    uptime: process.uptime(),
  };

  try {
    // Check CRM database (timeout 3s)
    const crmPromise = db.query('SELECT 1 as health').then(() => 'healthy').catch((e: any) => `error: ${e.message}`);
    const crmTimeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 3000));
    checks.database.crm = await Promise.race([crmPromise, crmTimeout]) as string;

    // Check Autolavado database (timeout 3s)
    const autoPromise = dbAutolavado.query('SELECT 1 as health').then(() => 'healthy').catch((e: any) => `error: ${e.message}`);
    const autoTimeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 3000));
    checks.database.autolavado = await Promise.race([autoPromise, autoTimeout]) as string;

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
