// src/lib/db.ts
import { Pool } from "pg";
import dns from "dns";

// Configurar DNS para preferir IPv4
dns.setDefaultResultOrder('ipv4first');

let poolInstance: Pool | null = null;
let isCreatingPool = false;

const CRITICAL_ERROR_KEYWORDS = [
  'timeout',
  'connect',
  'econnreset',
  'connection terminated',
  'terminating connection'
];

function shouldResetPool(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return false;
  }
  const message = String((error as any).message || '').toLowerCase();
  return CRITICAL_ERROR_KEYWORDS.some(keyword => message.includes(keyword));
}

function resetPool(reason: string) {
  if (!poolInstance) {
    return;
  }

  const poolToClose = poolInstance;
  poolInstance = null;
  console.warn(`[CRM DB] Resetting pool (${reason})`);

  poolToClose.end().catch((endError) => {
    console.error('[CRM DB] Failed to close pool gracefully:', (endError as any)?.message || endError);
  });
}

function getPool() {
  // Si ya existe, retornar
  if (poolInstance) {
    return poolInstance;
  }

  // Evitar race condition - bloquear hasta que termine la creación
  if (isCreatingPool) {
    // Si otro thread está creando, esperar a que termine
    // En Node.js esto no debería pasar (single-threaded), pero por seguridad
    throw new Error('[CRM DB] Pool is being created, please retry');
  }

  isCreatingPool = true;
  
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    console.log('[CRM DB] Creating new pool connection...');
    
    const maxConnections = Number(process.env.CRM_DB_POOL_MAX ?? 10);
    const minConnections = Number(process.env.CRM_DB_POOL_MIN ?? 1);

    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number.isFinite(maxConnections) ? maxConnections : 10,
      min: Number.isFinite(minConnections) ? minConnections : 1,
      connectionTimeoutMillis: Number(process.env.CRM_DB_CONNECTION_TIMEOUT ?? 30000),
      idleTimeoutMillis: Number(process.env.CRM_DB_IDLE_TIMEOUT ?? 120000),
      query_timeout: Number(process.env.CRM_DB_QUERY_TIMEOUT ?? 30000),
      statement_timeout: Number(process.env.CRM_DB_STATEMENT_TIMEOUT ?? 30000),
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: Number(process.env.CRM_DB_KEEPALIVE_DELAY ?? 10000),
    });

    // Monitorear conexiones
    poolInstance.on('connect', (client) => {
      console.log('[CRM DB] New client connected, total:', poolInstance?.totalCount);
    });

    poolInstance.on('acquire', (client) => {
      console.log('[CRM DB] Client acquired, waiting:', poolInstance?.waitingCount);
    });

    poolInstance.on('remove', (client) => {
      console.log('[CRM DB] Client removed, idle:', poolInstance?.idleCount);
    });

    poolInstance.on('error', (err, client) => {
      console.error('[CRM DB] Pool error:', err.message);
      if (shouldResetPool(err)) {
        resetPool('pool error event');
      }
    });

    console.log('[CRM DB] Pool created successfully');
    return poolInstance;
  } finally {
    isCreatingPool = false;
  }
}

export const db = new Proxy({} as Pool, {
  get(target, prop) {
    return (getPool() as any)[prop];
  }
});

// Helper para queries con tipos y retry automático
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const maxRetries = 5;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.query(text, params);
      if (attempt > 1) {
        console.log(`[CRM DB] Query succeeded on attempt ${attempt}`);
      }
      return result as { rows: T[] };
    } catch (error: any) {
      lastError = error;
      
      if (shouldResetPool(error)) {
        resetPool('query failure');
      }

      if (attempt === maxRetries) {
        console.error(`[CRM DB] Query failed after ${maxRetries} attempts:`, error.message);
        break;
      }

      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`[CRM DB] Query failed (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
