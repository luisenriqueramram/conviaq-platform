// src/lib/db-autolavado.ts
import { Pool } from "pg";

const AUTOLAVADO_DB_URL = process.env.AUTOLAVADO_DB_URL;

if (!AUTOLAVADO_DB_URL) {
  throw new Error("AUTOLAVADO_DB_URL is not set in environment variables");
}

// Pool de conexiones para la base de datos de autolavado (separada del CRM)
export const dbAutolavado = new Pool({
  connectionString: AUTOLAVADO_DB_URL,
  max: 10, // máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
