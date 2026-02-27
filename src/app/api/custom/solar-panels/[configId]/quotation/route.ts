import { NextRequest, NextResponse } from "next/server";
import { requireSolarPanelAccess } from "@/lib/server/solar-panel-guard";

const WEBHOOK_URL =
  "http://prueba1_n8n:5678/webhook/Gustavo-Paneles-Solares/Ahorro-Solar/recibo/cotizaciones";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ configId: string }> }
) {
  const { configId } = await context.params;

  try {
    const id = Number(configId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar acceso
    await requireSolarPanelAccess({ configId: id });

    const formData = await req.formData();
    const clientName = formData.get("client_name") as string;
    const clientEmail = formData.get("client_email") as string;
    const quotationType = formData.get("quotation_type") as "pdf" | "consumption";
    const consumptionKwh = formData.get("consumption_kwh") as string | null;
    const files = formData.getAll("files") as File[];

    // Validaciones básicas
    if (!clientName || !clientEmail || !quotationType) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    // Preparar payload para el webhook
    let payload: Record<string, any> = {
      client_name: clientName,
      client_email: clientEmail,
      quotation_type: quotationType,
      timestamp: new Date().toISOString(),
      config_id: id,
    };

    if (quotationType === "consumption") {
      payload.consumption_kwh = parseFloat(consumptionKwh || "0");
    } else {
      // Para PDF, convertir archivos a base64
      const filesData: Array<{
        name: string;
        type: string;
        data: string;
      }> = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        filesData.push({
          name: file.name,
          type: file.type,
          data: base64,
        });
      }

      payload.files = filesData;
    }

    // Enviar al webhook
    console.log("[SolarQuotation] Enviando al webhook:", WEBHOOK_URL);
    console.log("[SolarQuotation] Payload:", JSON.stringify(payload, null, 2));
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const webhookText = await webhookResponse.text();
    console.log(`[SolarQuotation] Webhook response: ${webhookResponse.status}`, webhookText);

    if (!webhookResponse.ok) {
      console.error(
        `[SolarQuotation] Webhook error: ${webhookResponse.status}`,
        webhookText
      );
      return NextResponse.json(
        { error: `Error al enviar cotización al webhook: ${webhookResponse.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Cotización enviada exitosamente",
    });
  } catch (e: any) {
    console.error("[SolarQuotation] Error:", e);
    return NextResponse.json(
      { error: e.message || "Error al procesar cotización" },
      { status: e.status || 500 }
    );
  }
}
