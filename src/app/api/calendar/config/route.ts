import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";
import type { BookingSchema } from "@/types/calendar";

type IndustryConfigRow = {
  id: number;
  industry: string | null;
  booking_schema: BookingSchema | string | null;
  updated_at: string | null;
};

function parseSchema(value: IndustryConfigRow["booking_schema"]): BookingSchema | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("[Calendar API] Invalid booking_schema JSON", error);
      return null;
    }
  }

  return value;
}

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();
    const { searchParams } = new URL(req.url);
    const industry = searchParams.get("industry");

    const baseQuery = `
      SELECT id, industry, booking_schema, updated_at
      FROM industry_configs
      WHERE tenant_id = $1
        AND booking_schema IS NOT NULL
        ${industry ? "AND industry = $2" : ""}
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
    `;

    const params = industry ? [tenantId, industry] : [tenantId];
    const { rows } = await db.query<IndustryConfigRow>(baseQuery, params);
    const row = rows[0];

    if (!row) {
      return NextResponse.json({ ok: true, config: null });
    }

    const schema = parseSchema(row.booking_schema);
    if (!schema) {
      return NextResponse.json({ ok: true, config: null });
    }

    return NextResponse.json({
      ok: true,
      config: {
        id: row.id,
        industry: row.industry,
        updatedAt: row.updated_at,
        schema,
      },
    });
  } catch (error) {
    console.error("[Calendar API] Failed to load booking schema", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await requireSession();
    const body = await req.json();
    const schema = body?.schema as BookingSchema | undefined;
    const industry = typeof body?.industry === "string" && body.industry.trim().length
      ? body.industry.trim()
      : null;

    if (!schema || typeof schema !== "object") {
      return NextResponse.json(
        { error: "INVALID_SCHEMA", message: "El campo schema es requerido" },
        { status: 400 }
      );
    }

    const serializedSchema = JSON.stringify(schema);

    const selectQuery = `
      SELECT id, industry, booking_schema, updated_at
      FROM industry_configs
      WHERE tenant_id = $1
        ${industry ? "AND industry = $2" : ""}
      ORDER BY (booking_schema IS NULL) ASC, updated_at DESC NULLS LAST, id DESC
      LIMIT 1
    `;

    const selectParams = industry ? [tenantId, industry] : [tenantId];
    const { rows: existingRows } = await db.query<IndustryConfigRow>(selectQuery, selectParams);
    let row: IndustryConfigRow | undefined;

    if (existingRows[0]) {
      const updateQuery = `
        UPDATE industry_configs
        SET booking_schema = $1::jsonb,
            updated_at = NOW(),
            industry = COALESCE($3, industry)
        WHERE id = $2
        RETURNING id, industry, booking_schema, updated_at
      `;

      const { rows } = await db.query<IndustryConfigRow>(updateQuery, [serializedSchema, existingRows[0].id, industry]);
      row = rows[0];
    } else {
      const insertQuery = `
        INSERT INTO industry_configs (tenant_id, industry, booking_schema)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id, industry, booking_schema, updated_at
      `;

      const { rows } = await db.query<IndustryConfigRow>(insertQuery, [tenantId, industry, serializedSchema]);
      row = rows[0];
    }

    if (!row) {
      throw new Error("FAILED_TO_PERSIST_SCHEMA");
    }

    const parsedSchema = parseSchema(row.booking_schema);
    return NextResponse.json({
      ok: true,
      config: {
        id: row.id,
        industry: row.industry,
        updatedAt: row.updated_at,
        schema: parsedSchema,
      },
    });
  } catch (error) {
    console.error("[Calendar API] Failed to update booking schema", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
