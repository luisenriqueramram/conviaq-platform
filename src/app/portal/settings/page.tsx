// src/app/portal/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Mail, Lock, LogOut, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({ name: '', email: '' });
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [successModal, setSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) throw new Error('Failed to load user');
        const json = await res.json();
        setUserData({ name: json.user?.name ?? '', email: json.user?.email ?? '' });
        setFormData({ name: json.user?.name ?? '', email: json.user?.email ?? '', password: '' });
      } catch (e) {
        console.error('Error loading user', e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (successModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setSuccessModal(false);
      setCountdown(3);
    }
    return () => clearTimeout(timer);
  }, [successModal, countdown]);

  const handleSave = async () => {
    // Validaciones con mensajes profesionales y específicos
    if (formData.name.trim().length < 5) {
      setMessage({ 
        type: 'error', 
        text: 'El nombre debe contener al menos 5 caracteres. Ingresa tu nombre completo.' 
      });
      return;
    }
    if (formData.email.trim().length < 10) {
      setMessage({ 
        type: 'error', 
        text: 'El usuario debe tener mínimo 10 caracteres. Ejemplo: nombre@conviaq.com' 
      });
      return;
    }
    if (formData.password && formData.password.length < 8) {
      setMessage({ 
        type: 'error', 
        text: 'La contraseña debe tener al menos 8 caracteres para garantizar seguridad.' 
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const payload: any = { name: formData.name, email: formData.email };
      if (formData.password) payload.password = formData.password;

      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar');
      }
      
      setMessage({ type: 'success', text: '✓ Cambios guardados exitosamente' });
      setUserData({ name: formData.name, email: formData.email });
      setFormData({ ...formData, password: '' });
      setSuccessModal(true);
      setCountdown(3);
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage({ 
        type: 'error', 
        text: e.message || 'No se pudieron guardar los cambios. Intenta nuevamente.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-zinc-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {successModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 shadow-2xl animate-in fade-in scale-in duration-300 flex flex-col items-center gap-4">
            <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
              <Check className="h-12 w-12 text-white" strokeWidth={3} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">¡Cambio Exitoso!</h2>
              <p className="text-emerald-100 text-sm">Tus datos han sido actualizados correctamente</p>
            </div>
            <div className="text-5xl font-bold text-white mt-4">{countdown}</div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2 border-b border-white/5 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Configuración de Cuenta
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            Administra tu información personal y credenciales de acceso
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}>
            <div className="shrink-0 mt-0.5">
              {message.type === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-lg">⚠</span>
              )}
            </div>
            <p className="text-sm leading-relaxed">{message.text}</p>
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <User className="h-4 w-4 text-zinc-500" />
              Nombre completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Pérez García"
              className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
              minLength={5}
            />
            <p className="text-xs text-zinc-600">
              <span className="text-zinc-500">•</span> Mínimo 5 caracteres · Usa tu nombre real para identificación
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Mail className="h-4 w-4 text-zinc-500" />
              Usuario de acceso
            </label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@conviaq.com"
              className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
              minLength={10}
            />
            <p className="text-xs text-zinc-600">
              <span className="text-zinc-500">•</span> Mínimo 10 caracteres · Puede ser tu email corporativo o nombre completo
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Lock className="h-4 w-4 text-zinc-500" />
              Nueva contraseña <span className="text-xs text-zinc-600 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Dejar vacío para mantener la actual"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-black/20 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              <span className="text-zinc-500">•</span> Mínimo 8 caracteres · Combina letras, números y caracteres especiales para mayor seguridad
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Guardando cambios...
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-300">Finalizar sesión</h3>
              <p className="text-xs text-zinc-600">Cerrarás tu sesión actual en este dispositivo de forma segura</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-all shadow-lg shadow-red-500/20 shrink-0"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
