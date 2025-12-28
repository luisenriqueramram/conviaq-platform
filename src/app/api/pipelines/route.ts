import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type PipelineRow = {
  id: number;
  tenant_id?: number;
  name: string;
  kind: string;
  is_default: boolean;
  created_at: string;
};

type StageRow = {
  id: number;
  pipeline_id: number;
  name: string;
  stage_key: string;
  position: number;
  color: string | null;
  is_final: boolean;
};

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    // 1) Pipelines del tenant
    const pipelinesResult = await db.query(
      `
      SELECT id, name, kind, is_default, created_at
      FROM pipelines
      WHERE tenant_id = $1
      ORDER BY is_default DESC, created_at ASC
      `,
      [tenantId]
    );

    const pipelineRows = pipelinesResult.rows as PipelineRow[];

    if (pipelineRows.length === 0) {
      return NextResponse.json({
        ok: true,
        data: { count: 0, items: [] as any[] },
      });
    }

    // 2) Stages de esos pipelines
    const pipelineIds = pipelineRows.map((row) => row.id);

    const stagesResult = await db.query(
      `
      SELECT
        id,
        pipeline_id,
        name,
        stage_key,
        position,
        color,
        is_final
      FROM pipeline_stages
      WHERE pipeline_id = ANY($1::bigint[])
      ORDER BY pipeline_id ASC, position ASC
      `,
      [pipelineIds]
    );

    const stageRows = stagesResult.rows as StageRow[];

    // 3) Unir pipelines + stages
    const items = pipelineRows.map((pipeline) => {
      const stages = stageRows.filter((s) => s.pipeline_id === pipeline.id);
      return { ...pipeline, stages };
    });

    return NextResponse.json({
      ok: true,
      data: { count: items.length, items },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    console.error("🔥 Error en GET /api/pipelines:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
