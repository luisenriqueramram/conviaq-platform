import { NextRequest, NextResponse } from "next/server";
import { queryAutolavado } from "@/lib/db-autolavado";
import { requireSession } from "@/lib/server/session";

type WeeklyHours = {
  id: number;
  tenant_id: number;
  day_of_week: number;
  start_local: string;
  end_local: string;
  is_enabled: boolean;
};

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;

    const query = `
      SELECT * FROM weekly_hours 
      WHERE tenant_id = $1 AND is_enabled = true 
      ORDER BY day_of_week
    `;

    const { rows } = await queryAutolavado<WeeklyHours>(query, [tenantId]);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error fetching weekly hours:", error);
    return NextResponse.json(
      { error: "Error al obtener horarios semanales", details: error.message },
      { status: 500 }
    );
  }
}
