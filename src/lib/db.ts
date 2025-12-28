// src/lib/db.ts
import { Pool } from "pg";

let poolInstance: Pool | null = null;

function getPool() {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    // Modificar URL para usar IPv4.supabase.co en lugar de directo
    let connectionString = process.env.DATABASE_URL;
    
    // Forzar IPv4 agregando parámetro a la URL de Supabase
    if (connectionString.includes('supabase.co')) {
      const url = new URL(connectionString.replace('postgresql://', 'http://'));
      // Cambiar el hostname para forzar IPv4
      connectionString = connectionString.replace(url.hostname, `ipv4.${url.hostname}`);
    }
    
    poolInstance = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
    });
  }
  return poolInstance;
}

export const db = new Proxy({} as Pool, {
  get(target, prop) {
    return (getPool() as any)[prop];
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
