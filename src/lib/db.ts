// src/lib/db.ts
import { Pool } from "pg";
import dns from "dns";

// Configurar DNS para preferir IPv4
dns.setDefaultResultOrder('ipv4first');

let poolInstance: Pool | null = null;
let isCreatingPool = false;

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
    
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      min: 1, // Mantener 1 conexión siempre lista
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 120000, // 2 minutos antes de cerrar idle
      query_timeout: 30000,
      statement_timeout: 30000,
      allowExitOnIdle: false, // NO cerrar el pool automáticamente
      keepAlive: true, // Mantener conexiones vivas
      keepAliveInitialDelayMillis: 10000,
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
