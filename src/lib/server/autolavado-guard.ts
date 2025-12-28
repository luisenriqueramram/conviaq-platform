// src/lib/server/autolavado-guard.ts
import { requireSession } from "./session";
import { query } from "@/lib/db";

export type AutolavadoRole = "admin" | "worker";

export async function requireAutolavadoAccess(): Promise<{
  tenantId: number;
  userId: number;
  role: AutolavadoRole;
  isAdmin: boolean;
}> {
  const session = await requireSession();

  // Verificar si el tenant tiene el módulo de autolavado configurado
  const result = await query<{ has_module: boolean }>(
    `SELECT 
      CASE 
        WHEN custom_modules IS NOT NULL 
        AND custom_modules::jsonb @> '[{"slug": "autolavado"}]'::jsonb
        THEN true
        ELSE false
      END as has_module
    FROM tenants 
    WHERE id = $1`,
    [session.tenantId]
  );

  if (!result.rows[0]?.has_module) {
    console.error("[Autolavado Guard] Access denied - module not enabled for tenant", session.tenantId);
    throw new Error("AUTOLAVADO_ACCESS_DENIED");
  }

  // Determinar rol basado en el role de la sesión
  // 'tenant' = admin (ve todo)
  // 'worker' = trabajador (solo ve sus servicios)
  const userRole = session.role?.toLowerCase() || "tenant";
  const isAdmin = userRole === "tenant";
  const role: AutolavadoRole = isAdmin ? "admin" : "worker";

  return {
    tenantId: session.tenantId,
    userId: session.userId,
    role,
    isAdmin,
  };
}

export async function requireAutolavadoAdmin() {
  const access = await requireAutolavadoAccess();
  
  if (!access.isAdmin) {
    throw new Error("AUTOLAVADO_ADMIN_REQUIRED");
  }

  return access;
}
