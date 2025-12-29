// src/lib/db.ts
import { Pool } from "pg";
import dns from "dns";

// Configurar DNS para preferir IPv4
dns.setDefaultResultOrder('ipv4first');

let poolInstance: Pool | null = null;
let isCreatingPool = false;

async function getPool() {
  // Si ya existe, retornar
  if (poolInstance) {
    return poolInstance;
  }

  // Evitar race condition - esperar si otro request está creando el pool
  if (isCreatingPool) {
    console.log('[CRM DB] Waiting for pool creation...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return getPool(); // Reintentar
  }

  isCreatingPool = true;
  
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    console.log('[CRM DB] Creating new pool connection...');
    
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3, // Aumentar a 3 para evitar bloqueos
      min: 0,
      connectionTimeoutMillis: 30000, // Reducir a 30s
      idleTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 30000,
      allowExitOnIdle: true,
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
    const pool = getPool();
    return (pool as any)[prop];
  }
});

// Helper para queries con tipos
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const result = await db.query(text, params);
  return result as { rows: T[] };
}
