import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();

    // Buscar workflow registrado para este tenant en la tabla workflows
    const res = await db.query(
      `
      SELECT id, key, name, description, created_at
      FROM workflows
      WHERE tenant_id = $1
      LIMIT 1
      `,
      [tenantId]
    );

    const workflow = res.rows[0] ?? null;

    if (!workflow) {
      return NextResponse.json(
        { ok: true, workflow: null, message: "No workflow found for this tenant" },
        { status: 200 }
      );
    }

    // Si existe, intentar obtener el contenido del webhook
    let webhookContent: string | null = null;
    let webhookError: string | null = null;

    // Resolve webhook URL: prefer workflows.url if exists; fallback to tenant_apps.api_webhook_url
    let webhookUrl: string | null = null;
    try {
      // Attempt to read a webhook URL from tenant apps if not present in workflows
      const appRes = await db.query(
        `SELECT api_webhook_url FROM tenant_apps WHERE tenant_id = $1 AND api_webhook_url IS NOT NULL AND is_active = true ORDER BY id LIMIT 1`,
        [tenantId]
      );
      webhookUrl = appRes.rows?.[0]?.api_webhook_url ?? null;
    } catch (_) {
      webhookUrl = null;
    }

    if (webhookUrl) {
      try {
        const webhookRes = await fetch(webhookUrl, {
          method: "GET",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });

        if (webhookRes.ok) {
          const contentType = webhookRes.headers.get("content-type") ?? "";
          if (contentType.includes("text/html")) {
            webhookContent = await webhookRes.text();
          } else if (contentType.includes("application/json")) {
            const json = await webhookRes.json();
            webhookContent = json.html ?? JSON.stringify(json, null, 2);
          } else {
            webhookContent = await webhookRes.text();
          }
        } else {
          webhookError = `Webhook returned status ${webhookRes.status}`;
        }
      } catch (e: any) {
        webhookError = `Failed to fetch webhook: ${e?.message ?? String(e)}`;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        workflow: {
          id: workflow.id,
          key: workflow.key,
          url: webhookUrl,
          name: workflow.name,
          description: workflow.description,
          created_at: workflow.created_at,
          updated_at: workflow.updated_at,
        },
        content: webhookContent,
        error: webhookError,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/workflows error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const body = await req.json();
    const { action, data } = body;

    // Buscar workflow para este tenant
    // Resolve webhook URL from tenant apps (preferred), else 404
    const appRes = await db.query(
      `SELECT api_webhook_url FROM tenant_apps WHERE tenant_id = $1 AND api_webhook_url IS NOT NULL AND is_active = true ORDER BY id LIMIT 1`,
      [tenantId]
    );
    const webhookUrl = appRes.rows?.[0]?.api_webhook_url ?? null;
    if (!webhookUrl) {
      return NextResponse.json({ ok: false, error: "No workflow configured" }, { status: 404 });
    }

    // Hacer POST al webhook con la acción y datos
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data, tenantId }),
      });

      const webhookData = await webhookRes.json().catch(() => null);

      return NextResponse.json(
        {
          ok: webhookRes.ok,
          status: webhookRes.status,
          data: webhookData,
        },
        { status: webhookRes.status }
      );
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: `Webhook request failed: ${e?.message ?? String(e)}` },
        { status: 502 }
      );
    }
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/workflows error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
