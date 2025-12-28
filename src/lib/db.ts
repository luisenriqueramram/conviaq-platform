// src/lib/db.ts
import { Pool } from "pg";
import dns from "dns";

// Configurar DNS para preferir IPv4
dns.setDefaultResultOrder('ipv4first');

let poolInstance: Pool | null = null;

function getPool() {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 60000,
      idleTimeoutMillis: 60000,
      query_timeout: 60000,
      statement_timeout: 60000,
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
