// src/lib/db.ts
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper para queries con tipos
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  return db.query(text, params);
}
