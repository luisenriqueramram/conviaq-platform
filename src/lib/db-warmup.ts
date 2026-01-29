// src/lib/db-warmup.ts
// Mantiene las conexiones de DB vivas con queries dummy cada 30 segundos

import { db } from './db';
import { dbAutolavado } from './db-autolavado';

let warmupInterval: NodeJS.Timeout | null = null;

const shouldWarmup = process.env.DB_WARMUP_ENABLED === 'true' || process.env.NODE_ENV === 'development';

export function startWarmup() {
  if (!shouldWarmup) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DB Warmup] Skipped (disabled by configuration)');
    }
    return;
  }

  if (warmupInterval) {
    console.log('[DB Warmup] Already running');
    return;
  }

  console.log('[DB Warmup] Starting connection keepalive (30s interval)');

  const warmup = async () => {
    try {
      // Warmup CRM DB
      await db.query('SELECT 1 as warmup').catch((e: any) => {
        console.warn('[DB Warmup] CRM failed:', e.message);
      });

      // Warmup Autolavado DB
      await dbAutolavado.query('SELECT 1 as warmup').catch((e: any) => {
        console.warn('[DB Warmup] Autolavado failed:', e.message);
      });

      console.log('[DB Warmup] Ping successful');
    } catch (error: any) {
      console.error('[DB Warmup] Error:', error.message);
    }
  };

  // Primera ejecución inmediata
  warmup();

  // Luego cada 30 segundos
  warmupInterval = setInterval(warmup, 30000);
}

export function stopWarmup() {
  if (warmupInterval) {
    clearInterval(warmupInterval);
    warmupInterval = null;
    console.log('[DB Warmup] Stopped');
  } else if (shouldWarmup) {
    console.log('[DB Warmup] Not running');
  }
}
