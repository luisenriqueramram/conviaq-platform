"use client";

import { useState, useEffect } from "react";
import { LogIn, CheckCircle2, Mail, Lock, Sparkles } from "lucide-react";
import Image from "next/image";

type ValidationStep = "idle" | "validating" | "success" | "error";

const MOTIVATIONAL_PHRASES = [
  "Cada conversación es una oportunidad de crecimiento 🚀",
  "La automatización inteligente impulsa tu negocio 💡",
  "Conecta, convierte, crece con WhatsApp Business ⚡",
  "Transforma mensajes en resultados extraordinarios 🎯",
  "Tu asistente virtual 24/7 nunca descansa 🤖",
  "Construye relaciones, no solo ventas 💬",
  "La eficiencia comienza con la conversación correcta 🔥",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationStep, setValidationStep] = useState<ValidationStep>("idle");
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isEmailValid = email.includes("@") && email.includes(".");

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    setLoading(true);
    setValidationStep("validating");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setValidationStep("error");
        setError(data.error || "Credenciales inválidas. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      setValidationStep("success");
      setTimeout(() => {
        window.location.href = "/portal";
      }, 800);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "No se pudo conectar";
      setValidationStep("error");
      setError("No se pudo conectar. Verifica tu conexión.");
      setLoading(false);
      console.error("Login error:", errorMsg);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="w-full max-w-6xl relative z-10 flex gap-8 items-center">
        {/* Left side - Branding & Motivation */}
        <div className="hidden lg:flex flex-1 flex-col justify-center">
          {/* Bot Image */}
          <div className="mb-8 flex justify-center">
            <div className="relative group">
              {/* Glow effect detrás */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
              
              {/* Contenedor de la imagen */}
              <div className="relative">
                <Image 
                  src="/bot-logo.png" 
                  alt="CONVIAQ Bot" 
                  width={280} 
                  height={280}
                  className="relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Motivational Phrase */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CONVIAQ
            </h2>
            <div className="h-20 flex items-center justify-center">
              <p className="text-xl text-zinc-300 font-medium transition-all duration-500 px-8">
                {MOTIVATIONAL_PHRASES[currentPhrase]}
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full lg:w-[440px]">
          {/* Header for mobile */}
          <div className="text-center mb-8 lg:hidden">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">CONVIAQ</h1>
            <p className="text-sm text-zinc-400">WhatsApp Business Platform</p>
          </div>

          {/* Main card */}
          <div className="bg-gradient-to-b from-zinc-900/90 to-black/90 border border-zinc-800/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Acceso Seguro</h2>
              <p className="text-sm text-zinc-400 mt-1">Ingresa tus credenciales registradas</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="group">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-2">
                <Mail className="w-3 h-3" />
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  className={`w-full px-4 py-3 rounded-lg bg-zinc-800/50 border transition-all focus:outline-none focus:ring-2 text-white placeholder-zinc-600 ${
                    isEmailValid
                      ? "border-green-500/40 focus:border-green-500 focus:ring-green-500/20"
                      : "border-zinc-700 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setValidationStep("idle");
                  }}
                  required
                />
                {isEmailValid && !loading && (
                  <CheckCircle2 className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="group">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-2">
                <Lock className="w-3 h-3" />
                Contraseña
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-zinc-600 transition-all focus:outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationStep("idle");
                }}
                required
              />
            </div>

            {/* Validation Status */}
            {validationStep === "validating" && (
              <div className="p-3 rounded-lg text-xs font-medium flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300">
                <div className="animate-spin">⟳</div>
                <span>Conectando...</span>
              </div>
            )}

            {validationStep === "success" && (
              <div className="p-3 rounded-lg text-xs font-medium flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>¡Bienvenido!</span>
              </div>
            )}

            {/* Error Message */}
            {error && validationStep === "error" && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isEmailValid}
              className="w-full mt-6 py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-lg hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin">⟳</div>
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Acceder</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          © CONVIAQ 2025 · Plataforma WhatsApp Business
        </p>
      </div>
    </div>
    </main>
  );
}
