// src/app/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  // headers() ahora es async en tu versión de Next
  const headersList = await headers(); // 👈 importante el await

  const host = headersList.get("host") ?? "";

  const isAccess = host.startsWith("access.");
  const isPortal = host.startsWith("portal.");

  if (isAccess) {
    // aquí pones a dónde quieres mandar access.conviaq.com.mx
    redirect("/login");
  }

  if (isPortal) {
    // aquí pones a dónde quieres mandar portal.conviaq.com.mx
    redirect("/login");
  }

  // Fallback por si alguien entra por el dominio base
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#05070b",
        color: "#f1f5f9",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          CONVIAQ Platform
        </h1>
        <p style={{ color: "#94a3b8" }}>
          Punto de acceso central a tu plataforma.
        </p>
      </div>
    </main>
  );
}
