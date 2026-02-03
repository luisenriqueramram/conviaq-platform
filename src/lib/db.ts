// src/lib/db.ts
import { Pool } from "pg";
import dns from "dns";

// Configurar DNS para preferir IPv4
dns.setDefaultResultOrder('ipv4first');

let poolInstance: Pool | null = null;
let isCreatingPool = false;

const MAX_QUERY_RETRIES = Number(process.env.CRM_DB_MAX_RETRIES ?? 5);
const RETRY_BASE_DELAY = Number(process.env.CRM_DB_RETRY_BASE_DELAY ?? 250);
const RETRY_MAX_DELAY = Number(process.env.CRM_DB_RETRY_MAX_DELAY ?? 2000);

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
    
    const maxConnections = Number(process.env.CRM_DB_POOL_MAX ?? 3);
    const minConnections = Number(process.env.CRM_DB_POOL_MIN ?? 0);
    const allowExitOnIdle = String(process.env.CRM_DB_ALLOW_EXIT_ON_IDLE ?? 'true').toLowerCase() === 'true';

    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number.isFinite(maxConnections) ? maxConnections : 10,
      min: Number.isFinite(minConnections) ? minConnections : 1,
      connectionTimeoutMillis: Number(process.env.CRM_DB_CONNECTION_TIMEOUT ?? 30000),
      idleTimeoutMillis: Number(process.env.CRM_DB_IDLE_TIMEOUT ?? 120000),
      query_timeout: Number(process.env.CRM_DB_QUERY_TIMEOUT ?? 30000),
      statement_timeout: Number(process.env.CRM_DB_STATEMENT_TIMEOUT ?? 30000),
      allowExitOnIdle,
      keepAlive: true,
      keepAliveInitialDelayMillis: Number(process.env.CRM_DB_KEEPALIVE_DELAY ?? 10000),
    });

    console.log('[CRM DB] Pool configuration', {
      max: poolInstance.options.max,
      min: poolInstance.options.min,
      allowExitOnIdle,
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
  get(_target, prop) {
    if (prop === 'query') {
      return executeQuery;
    }
    const pool = getPool() as any;
    const value = pool[prop];
    if (typeof value === 'function') {
      return value.bind(pool);
    }
    return value;
  }
});

// Helper para queries con tipos y retry automático
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  return executeQuery<T>(text, params);
}

async function executeQuery<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const maxRetries = Math.max(1, MAX_QUERY_RETRIES);
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await getPool().query(text, params);
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

      const jitter = Math.random() * 50;
      const waitTime = Math.min(
        RETRY_BASE_DELAY * Math.pow(2, attempt - 1),
        RETRY_MAX_DELAY
      ) + jitter;
      console.log(`[CRM DB] Query failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(waitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
