import { NextResponse } from "next/server";

export function handleAutolavadoError(error: any, operation: string) {
  console.error(`[Autolavado Error] ${operation}:`, error);
  
  const errorMessage = error?.message || "Error desconocido";
  const isTimeout = errorMessage.includes("timeout");
  const isConnection = errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED");
  
  let userMessage = "Error al conectar con la base de datos de Autolavado.";
  let statusCode = 500;
  
  if (isTimeout) {
    userMessage = "La conexión con Autolavado está tardando más de lo esperado. Por favor intenta de nuevo.";
    statusCode = 504;
  } else if (isConnection) {
    userMessage = "No se puede conectar a la base de datos de Autolavado. Servicio temporalmente no disponible.";
    statusCode = 503;
  }
  
  return NextResponse.json(
    {
      error: userMessage,
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      code: statusCode,
      retryable: isTimeout || isConnection,
    },
    { status: statusCode }
  );
}

export function isAutolavadoError(error: any): boolean {
  if (!error) return false;
  const msg = error?.message?.toLowerCase() || "";
  return msg.includes("autolavado") || msg.includes("timeout") || msg.includes("connect");
}
