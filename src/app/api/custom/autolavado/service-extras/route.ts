// Este endpoint ha sido desactivado porque la tabla service_extras ya no existe.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Este endpoint ya no está disponible. Usa /services." }, { status: 410 });
}
