// src/lib/server/custom-module-guard.ts
import { requireSession } from "./session";
import { query } from "@/lib/db";

export async function requireCustomModuleAccess({ allowedTenants, moduleSlug, allowedIndustries }: {
  allowedTenants?: number[];
  moduleSlug?: string;
  allowedIndustries?: string[];
}) {
  const session = await requireSession();

  if (allowedTenants && !allowedTenants.includes(session.tenantId)) {
    throw new Error("CUSTOM_MODULE_ACCESS_DENIED");
  }

  if (moduleSlug) {
    const result = await query<{ has_module: boolean }>(
      `SELECT 
        CASE 
          WHEN custom_modules IS NOT NULL 
          AND custom_modules::jsonb @> $2::jsonb
          THEN true
          ELSE false
        END as has_module
      FROM tenants 
      WHERE id = $1`,
      [session.tenantId, JSON.stringify([{ slug: moduleSlug }])]
    );
    if (!result.rows[0]?.has_module) {
      throw new Error("CUSTOM_MODULE_ACCESS_DENIED");
    }
  }

  if (allowedIndustries) {
    const result = await query<{ industry: string }>(
      `SELECT industry FROM tenants WHERE id = $1`,
      [session.tenantId]
    );
    if (!result.rows[0] || !allowedIndustries.includes(result.rows[0].industry)) {
      throw new Error("CUSTOM_MODULE_ACCESS_DENIED");
    }
  }

  return session;
}
