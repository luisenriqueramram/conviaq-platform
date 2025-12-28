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
    
    console.log('[Autolavado DB] Creating new pool connection...');
    const startTime = Date.now();
    
    poolInstance = new Pool({
      connectionString: AUTOLAVADO_DB_URL,
      max: 1,
      min: 0,
      connectionTimeoutMillis: 180000,
      idleTimeoutMillis: 180000,
      query_timeout: 180000,
      statement_timeout: 180000,
    });

    poolInstance.on('connect', () => {
      const duration = Date.now() - startTime;
      console.log(`[Autolavado DB] Pool connected successfully in ${duration}ms`);
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

// Helper para ejecutar queries con manejo de errores y retry
export async function queryAutolavado<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Autolavado DB] Attempt ${attempt}/${maxRetries}: Executing query`);
      const startTime = Date.now();
      
      const result = await dbAutolavado.query(text, params);
      
      const duration = Date.now() - startTime;
      console.log(`[Autolavado DB] Query succeeded in ${duration}ms`);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error: any) {
      lastError = error;
      const duration = Date.now();
      console.error(`[Autolavado DB] Attempt ${attempt} failed after ${duration}ms:`, error.message);
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        console.error('[Autolavado DB] All retry attempts failed');
        break;
      }
      
      // Esperar antes del siguiente intento (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[Autolavado DB] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Si fue un error de pool, resetear
      if (error.message?.includes('timeout') || error.message?.includes('Circuit breaker')) {
        console.log('[Autolavado DB] Resetting pool before retry');
        try {
          await poolInstance?.end();
        } catch (e) {
          // Ignorar errores al cerrar
        }
        poolInstance = null;
      }
    }
  }
  
  console.error("[Autolavado DB] Final error:", lastError);
  throw lastError;
}
