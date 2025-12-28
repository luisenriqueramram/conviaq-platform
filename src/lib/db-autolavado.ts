// src/lib/db-autolavado.ts
import { Pool } from "pg";

let poolInstance: Pool | null = null;

function getPool() {
  if (!poolInstance) {
    const AUTOLAVADO_DB_URL = process.env.AUTOLAVADO_DB_URL;
    if (!AUTOLAVADO_DB_URL) {
      throw new Error("AUTOLAVADO_DB_URL is not set in environment variables");
    }
    
    // Modificar URL para forzar IPv4
    let connectionString = AUTOLAVADO_DB_URL;
    if (connectionString.includes('supabase.com')) {
      const url = new URL(connectionString.replace('postgresql://', 'http://'));
      connectionString = connectionString.replace(url.hostname, `ipv4.${url.hostname}`);
    }
    
    poolInstance = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
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
