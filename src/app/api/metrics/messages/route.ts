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
    const defaultSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const since = sinceParam ?? defaultSince;
    const until = untilParam ?? now;

    const bucketExpr = `date_trunc('${granularity}', coalesce(sent_at, created_at))`;

    const result = await db.query(
      `
      SELECT
        ${bucketExpr} AS bucket,
        COUNT(*)::int AS total,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END)::int AS inbound,
        SUM(CASE WHEN direction = 'outbound' AND sender_type = 'human' THEN 1 ELSE 0 END)::int AS outbound_human,
        SUM(CASE WHEN direction = 'outbound' AND sender_type = 'ai' THEN 1 ELSE 0 END)::int AS outbound_ai
      FROM messages
      WHERE tenant_id = $1
        AND coalesce(sent_at, created_at) >= $2
        AND coalesce(sent_at, created_at) < $3
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [tenantId, since, until]
    );

    const series = result.rows.map((r: any) => ({
      bucket: r.bucket ? new Date(r.bucket).toISOString() : null,
      total: r.total ?? 0,
      inbound: r.inbound ?? 0,
      outbound_human: r.outbound_human ?? 0,
      outbound_ai: r.outbound_ai ?? 0,
    }));

    // Overall totals in the same range
    const totalsRes = await db.query(
      `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END)::int AS inbound,
        SUM(CASE WHEN direction = 'outbound' AND sender_type = 'human' THEN 1 ELSE 0 END)::int AS outbound_human,
        SUM(CASE WHEN direction = 'outbound' AND sender_type = 'ai' THEN 1 ELSE 0 END)::int AS outbound_ai
      FROM messages
      WHERE tenant_id = $1
        AND coalesce(sent_at, created_at) >= $2
        AND coalesce(sent_at, created_at) < $3
      `,
      [tenantId, since, until]
    );

    const totals = totalsRes.rows[0] ?? { total: 0, inbound: 0, outbound_human: 0, outbound_ai: 0 };

    return NextResponse.json({
      ok: true,
      data: {
        granularity,
        range: { since: since.toISOString(), until: until.toISOString() },
        series,
        totals,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("metrics/messages error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
