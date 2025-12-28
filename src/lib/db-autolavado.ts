// src/lib/db-autolavado.ts
import { Pool } from "pg";
import dns from "dns";

// Configurar DNS para preferir IPv4
dns.setDefaultResultOrder('ipv4first');

let poolInstance: Pool | null = null;

function getPool() {
  if (!poolInstance) {
    const AUTOLAVADO_DB_URL = process.env.AUTOLAVADO_DB_URL;
    if (!AUTOLAVADO_DB_URL) {
      throw new Error("AUTOLAVADO_DB_URL is not set in environment variables");
    }
    
    poolInstance = new Pool({
      connectionString: AUTOLAVADO_DB_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });

    // Resetear pool si hay error de circuit breaker
    poolInstance.on('error', (err) => {
      console.error('[Autolavado DB] Pool error:', err.message);
      if (err.message?.includes('Circuit breaker')) {
        console.log('[Autolavado DB] Resetting pool due to circuit breaker');
        poolInstance?.end();
        poolInstance = null;
      }
    });
  }
  return poolInstance;
}

export const dbAutolavado = new Proxy({} as Pool, {
  get(target, prop) {
    return (getPool() as any)[prop];
  }
});

// Helper para ejecutar queries con manejo de errores
export async function queryAutolavado<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const result = await dbAutolavado.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    console.error("[Autolavado DB] Query error:", error);
    throw error;
  }
}
