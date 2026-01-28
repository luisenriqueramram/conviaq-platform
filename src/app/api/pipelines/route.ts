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

    // 1) Pipelines del tenant y universales
    const pipelinesResult = await db.query(
      `
      SELECT id, tenant_id, name, kind, is_default, created_at, stage_order
      FROM pipelines
      WHERE tenant_id = $1 OR tenant_id IS NULL
      ORDER BY CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END, is_default DESC, created_at ASC
      `,
      [tenantId]
    );

    const pipelineRows = pipelinesResult.rows as (PipelineRow & { stage_order: number[] | null })[];

    if (pipelineRows.length === 0) {
      return NextResponse.json({
        ok: true,
        data: { count: 0, items: [] as any[] },
      });
    }

    // 2) Stages de esos pipelines
    const pipelineIds = pipelineRows.map((row) => row.id);


    // Query para traer todos los stages de los pipelines, sin filtrar por position

    // Asegurarse que pipelineIds sea arreglo de enteros
    const pipelineIdsInt = pipelineIds.map(Number);
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
      `,
      [pipelineIdsInt]
    );

    const stageRows = stagesResult.rows as StageRow[];

    // 3) Unir pipelines + stages, solo los que están en stage_order y en ese orden
    // DEBUG: Imprimir datos intermedios para depuración
    // console.log('pipelineRows:', pipelineRows);
    // console.log('stageRows:', stageRows);
    // Build a global map of stages by id so we can fallback to universal stages
    const globalStageMap = new Map<number, StageRow>(stageRows.map(s => [Number(s.id), s]));

    const items = pipelineRows.map((pipeline) => {
      // stages that belong to this pipeline
      let stages = stageRows.filter((s) => s.pipeline_id === pipeline.id);
      // DEBUG: Imprimir mapeo de stages por pipeline
      // console.log(`Pipeline ${pipeline.id} stages:`, stages);
      if (pipeline.stage_order && Array.isArray(pipeline.stage_order) && pipeline.stage_order.length > 0) {
        const stageOrderInt = pipeline.stage_order.map(Number);
        // DEBUG: Imprimir stageOrderInt
        // console.log(`Pipeline ${pipeline.id} stageOrderInt:`, stageOrderInt);
        const stageMap = new Map(stages.map(s => [Number(s.id), s]));
        // Map using pipeline-local stages first, then fallback to globalStageMap
        stages = stageOrderInt
          .map((id) => stageMap.get(id) ?? globalStageMap.get(id))
          .filter((stage): stage is StageRow => Boolean(stage));
      }
      // DEBUG: Imprimir resultado final de stages
      // console.log(`Pipeline ${pipeline.id} final stages:`, stages);
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
