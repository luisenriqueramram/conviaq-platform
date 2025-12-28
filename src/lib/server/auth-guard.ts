import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";

export async function withSession<T>(
  handler: (session: { userId: number; tenantId: number; email?: string; role?: string | null }) => Promise<T>
) {
  try {
    const session = await requireSession();
    return await handler(session);
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any;
    }
    throw err;
  }
}
