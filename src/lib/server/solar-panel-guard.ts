// src/lib/server/solar-panel-guard.ts
import { requireSession } from "./session";
import { query } from "@/lib/db";

/**
 * Valida que el tenant tenga acceso a la pantalla personalizada de paneles solares
 * usando industry_configs (por id y tenant_id).
 * @param configId id de industry_configs
 * @param tenantId tenant_id a validar (opcional, por defecto el de la sesión)
 */
export async function requireSolarPanelAccess({ configId, tenantId }: { configId: number, tenantId?: number }) {
  const session = await requireSession();
  const effectiveTenantId = tenantId ?? session.tenantId;

  const result = await query<{ id: number }>(
    `SELECT id FROM industry_configs WHERE id = $1 AND tenant_id = $2`,
    [configId, effectiveTenantId]
  );

  if (!result.rows[0]) {
    throw new Error("SOLAR_PANEL_ACCESS_DENIED");
  }

  return session;
}
