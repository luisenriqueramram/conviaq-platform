// src/lib/db-autolavado.ts
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
    throw new Error('[Autolavado DB] Pool is being created, please retry');
  }

  isCreatingPool = true;
  
  try {
    const AUTOLAVADO_DB_URL = process.env.AUTOLAVADO_DB_URL;
    if (!AUTOLAVADO_DB_URL) {
      throw new Error("AUTOLAVADO_DB_URL is not set in environment variables");
    }
    
    console.log('[Autolavado DB] Creating new pool connection...');
    
    poolInstance = new Pool({
      connectionString: AUTOLAVADO_DB_URL,
      max: 5, // 5 conexiones para manejar múltiples queries simultáneos
      min: 1, // Mantener 1 conexión siempre lista
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 60000,
      query_timeout: 30000,
      statement_timeout: 30000,
      allowExitOnIdle: true,
    });

    // Monitorear conexiones
    poolInstance.on('connect', (client) => {
      console.log('[Autolavado DB] New client connected, total:', poolInstance?.totalCount);
    });

    poolInstance.on('acquire', (client) => {
      console.log('[Autolavado DB] Client acquired, waiting:', poolInstance?.waitingCount);
    });

    poolInstance.on('remove', (client) => {
      console.log('[Autolavado DB] Client removed, idle:', poolInstance?.idleCount);
    });

    poolInstance.on('error', (err, client) => {
      console.error('[Autolavado DB] Pool error:', err.message);
      // No resetear el pool aquí, dejar que se recupere solo
    });

    console.log('[Autolavado DB] Pool created successfully');
    return poolInstance;
  } finally {
    isCreatingPool = false;
  }
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
    const attemptStartTime = Date.now();
    
    try {
      console.log(`[Autolavado DB] Attempt ${attempt}/${maxRetries}: Executing query`);
      
      const result = await dbAutolavado.query(text, params);
      
      const duration = Date.now() - attemptStartTime;
      console.log(`[Autolavado DB] Query succeeded in ${duration}ms on attempt ${attempt}`);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error: any) {
      const duration = Date.now() - attemptStartTime;
      lastError = error;
      console.error(`[Autolavado DB] Attempt ${attempt} failed after ${duration}ms:`, error.message);
      
      // Si es el último intento, no esperar
      if (attempt === maxRetries) {
        console.error('[Autolavado DB] All retry attempts failed');
        break;
      }
      
      // Esperar con backoff exponencial: 500ms, 1s, 2s
      const waitTime = Math.min(500 * Math.pow(2, attempt - 1), 2000);
      console.log(`[Autolavado DB] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  console.error("[Autolavado DB] Final error:", lastError);
  throw lastError;
}
