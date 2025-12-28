"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutolavadoIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/custom/autolavado/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Redirigiendo...</div>
    </div>
  );
}
