import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";

// Tenant fijo para Turísticos del Norte
const TENANT_ID = 26;
const INDUSTRY = 'turisticos-del-norte';

// GET: Obtener configuración (schema_json) de industry_configs
export async function GET() {
  try {
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    let res = await db.query(
      `SELECT id, industry, schema_json FROM industry_configs WHERE tenant_id = $1 AND industry = $2 LIMIT 1`,
      [TENANT_ID, INDUSTRY]
    );

    // Fallback: si no hay registro para el industry esperado, tomar el primero del tenant
    if (!res.rows[0]) {
      res = await db.query(
        `SELECT id, industry, schema_json FROM industry_configs WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1`,
        [TENANT_ID]
      );
    }

    if (!res.rows[0]) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, config: res.rows[0] });
  } catch (error) {
    console.error("[API] GET turisticos-del-norte/config", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH: Actualizar configuración (schema_json)
export async function PATCH(req: Request) {
  try {
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 });
    }
    const body = await req.json();
    const { schema_json } = body;
    if (!schema_json) {
      return NextResponse.json({ error: "NO_SCHEMA_JSON" }, { status: 400 });
    }
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        // Intentar actualizar el registro del industry específico
        let res = await db.query(
          `UPDATE industry_configs SET schema_json = $1 WHERE tenant_id = $2 AND industry = $3 RETURNING id, schema_json`,
          [schema_json, TENANT_ID, INDUSTRY]
        );

        // Fallback: si no existe el industry esperado, usa el primer registro del tenant
        if (!res.rows[0]) {
          const fallback = await db.query(
            `SELECT id FROM industry_configs WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1`,
            [TENANT_ID]
          );
          if (fallback.rows[0]?.id) {
            res = await db.query(
              `UPDATE industry_configs SET schema_json = $1, industry = $2 WHERE id = $3 RETURNING id, schema_json`,
              [schema_json, INDUSTRY, fallback.rows[0].id]
            );
          }
        }

        // Si tampoco hay fallback, crear el registro
        if (!res.rows[0]) {
          const inserted = await db.query(
            `INSERT INTO industry_configs (tenant_id, industry, schema_json) VALUES ($1, $2, $3) RETURNING id, schema_json`,
            [TENANT_ID, INDUSTRY, schema_json]
          );
          res = inserted;
        }

        return NextResponse.json({ ok: true, config: res.rows[0] });
      } catch (err: any) {
        lastError = err;
        const message = String(err?.message || "").toLowerCase();
        const retryable = message.includes("timeout") || message.includes("connect") || message.includes("econn");
        if (!retryable || attempt === maxRetries) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }

    console.error("[API] PATCH turisticos-del-norte/config retry failed", lastError);
    return NextResponse.json({ error: "DB_TIMEOUT" }, { status: 503 });
  } catch (error) {
    console.error("[API] PATCH turisticos-del-norte/config", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
