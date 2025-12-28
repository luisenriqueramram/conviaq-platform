// src/app/api/tenant/custom-modules/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const query = `
      SELECT custom_modules 
      FROM tenants 
      WHERE id = $1
    `;

    const { rows } = await db.query(query, [tenantId]);

    const modules = rows[0]?.custom_modules || [];

    return NextResponse.json({ ok: true, modules });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[API] Get custom modules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
