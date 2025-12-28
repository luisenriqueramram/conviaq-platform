import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function clampGranularity(g: string | null): "hour" | "day" {
  if (g === "hour" || g === "day") return g;
  return "day";
}

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const url = new URL(req.url);
    const granularity = clampGranularity(url.searchParams.get("granularity"));
    const sinceParam = parseDateParam(url.searchParams.get("since"));
    const untilParam = parseDateParam(url.searchParams.get("until"));

    const now = new Date();
    const defaultSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days
    const since = sinceParam ?? defaultSince;
    const until = untilParam ?? now;

    // Status distribution
    const statusRes = await db.query(
      `
      SELECT status, COUNT(*)::int AS count
      FROM conversations
      WHERE tenant_id = $1
      GROUP BY status
      ORDER BY status
      `,
      [tenantId]
    );

    const status_counts = statusRes.rows.map((r: any) => ({ status: r.status ?? "unknown", count: r.count ?? 0 }));

    // New conversations by bucket (using started_at)
    const bucketExpr = `date_trunc('${granularity}', started_at)`;
    const seriesRes = await db.query(
      `
      SELECT
        ${bucketExpr} AS bucket,
        COUNT(*)::int AS count
      FROM conversations
      WHERE tenant_id = $1
        AND started_at >= $2
        AND started_at < $3
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [tenantId, since, until]
    );

    const series = seriesRes.rows.map((r: any) => ({ bucket: r.bucket ? new Date(r.bucket).toISOString() : null, count: r.count ?? 0 }));

    return NextResponse.json({
      ok: true,
      data: {
        granularity,
        range: { since: since.toISOString(), until: until.toISOString() },
        status_counts,
        series,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("metrics/conversations error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
