import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const response = NextResponse.json({
      ok: true,
      message: "Logged out successfully",
    });

    // Clear the session cookie
    response.cookies.set({
      name: "conviaq_session",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("🔥 Error en POST /api/logout:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
