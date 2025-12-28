// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CONVIAQ Platform",
  description: "Acceso y panel de control para clientes CONVIAQ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
