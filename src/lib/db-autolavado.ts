import { query as queryCRM } from "@/lib/db";
import { Pool } from "pg";
import dns from "dns";

// Obtiene el historial de conversaciones (chat) de un lead
export async function getLeadConversations(lead_id: string) {
  const sql = `
    SELECT id, sender, message, sent_at
    FROM lead_conversations
    WHERE lead_id = $1
    ORDER BY sent_at ASC;
  `;
  const { rows } = await queryCRM(sql, [lead_id]);
  return rows;
}
// Obtiene el historial de actividad (timeline) de un lead
export async function getLeadActivityLog(lead_id: string) {
  const sql = `
    SELECT 
      id,
      activity_type, -- 'ai_audit_update', 'human_update', 'note'
      description,   -- El "reason"
      performed_by_ai,
      created_at,
      metadata       -- El JSON con detalles
    FROM public.lead_activity_log
    WHERE lead_id = $1
    ORDER BY created_at DESC;
  `;
  const { rows } = await queryCRM(sql, [lead_id]);
  return rows;
}

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
      max: 5,
      min: 1, // Mantener 1 conexión siempre lista
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 120000, // 2 minutos antes de cerrar idle
      query_timeout: 30000,
      statement_timeout: 30000,
      allowExitOnIdle: false, // NO cerrar el pool automáticamente
      keepAlive: true, // Mantener conexiones vivas
      keepAliveInitialDelayMillis: 10000, // Primer keep-alive a los 10s
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
      // Si el error es crítico, destruir el pool y forzar recreación en el siguiente uso
      if (err.message?.includes('timeout') || err.message?.includes('connect') || err.message?.includes('ECONNRESET') || err.message?.includes('Connection terminated')) {
        console.warn('[Autolavado DB] Reiniciando pool por error crítico...');
        try {
          poolInstance?.end();
        } catch (e) {
          console.error('[Autolavado DB] Error al cerrar pool:', (e as any)?.message || e);
        }
        poolInstance = null;
      }
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
  const maxRetries = 5; // Aumentar a 5 intentos
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
      
      // Si es timeout o connection error, reiniciar el pool para forzar reconexión limpia
      if (error.message?.includes('timeout') || error.message?.includes('connect') || error.message?.includes('ECONNRESET') || error.message?.includes('Connection terminated')) {
        console.log('[Autolavado DB] Connection issue detected, pool will be reset and retried');
        try {
          poolInstance?.end();
        } catch (e) {
          console.error('[Autolavado DB] Error al cerrar pool:', (e as any)?.message || e);
        }
        poolInstance = null;
      }
      
      // Si es el último intento, no esperar
      if (attempt === maxRetries) {
        console.error('[Autolavado DB] All retry attempts failed');
        break;
      }
      
      // Esperar con backoff exponencial: 1s, 2s, 4s, 8s, 10s
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`[Autolavado DB] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  console.error("[Autolavado DB] Final error:", lastError);
  throw lastError;
}

// Obtiene etapas y etiquetas fusionadas (universales + tenant) para el Kanban y selects
export async function getConfigMetadata(tenant_id: number | null) {
  const sql = `
    SELECT json_build_object(
      'stages', (
         SELECT json_agg(s ORDER BY t_order DESC, position ASC) 
         FROM (
            SELECT id, name, color, position, 
                   CASE WHEN tenant_id IS NULL THEN 0 ELSE 1 END as t_order
        FROM public.pipeline_stages 
        WHERE (tenant_id = $1::bigint OR tenant_id IS NULL)
         ) s
      ),
      'tags', (
         SELECT json_agg(t ORDER BY is_system DESC, name ASC)
         FROM (
            SELECT id, name, color, description, 
                   CASE WHEN tenant_id IS NULL THEN true ELSE false END as is_system
        FROM public.tags 
        WHERE (tenant_id = $1::bigint OR tenant_id IS NULL)
         ) t
      )
    ) as config;
  `;
  const { rows } = await queryCRM(sql, [tenant_id]);
  return rows[0]?.config;
}
