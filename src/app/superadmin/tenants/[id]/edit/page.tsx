'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import React from 'react';

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  // IDs de referencia
  const [tenantId, setTenantId] = useState('');
  const [channelAccountId, setChannelAccountId] = useState('');
  const [pipelineId, setPipelineId] = useState('');

  // Tenant fields
  const [tenantName, setTenantName] = useState('');
  const [planId, setPlanId] = useState('1');

  // Channel WhatsApp fields
  const [accountType, setAccountType] = useState<'business' | 'personal'>('business');
  const [phoneE164, setPhoneE164] = useState('');
  const [waBusinessAccountId, setWaBusinessAccountId] = useState('');

  // User Owner fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');

  // Bot Profile fields
  const [botName, setBotName] = useState('');
  const [botTone, setBotTone] = useState('');
  const [botAttitude, setBotAttitude] = useState('');
  const [botPurpose, setBotPurpose] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTenantData();
  }, [id]);

  async function loadTenantData() {
    setLoadingData(true);
    try {
      // Fetch tenant info
      const tenantRes = await fetch(`/api/superadmin/tenants/${id}`);
      const tenantData = await tenantRes.json();
      if (tenantRes.ok) {
        setTenantId(id);
        setTenantName(tenantData.tenant?.name || '');
        setPlanId(String(tenantData.tenant?.plan_id || '1'));
      }

      // Fetch channels (to get channel_account_id and phone)
      const channelsRes = await fetch(`/api/superadmin/tenants/${id}/channels`);
      const channelsData = await channelsRes.json();
      if (channelsRes.ok && channelsData.ok) {
        const waChannel = channelsData.data?.find((c: any) => c.channel_type === 'whatsapp');
        if (waChannel) {
          setChannelAccountId(String(waChannel.id));
          setPhoneE164(waChannel.phone_e164 || '');
          setAccountType((waChannel.account_type as 'business' | 'personal') || 'business');
          setWaBusinessAccountId(waChannel.wa_business_account_id || '');
        }
      }

      // Fetch users
      const usersRes = await fetch(`/api/superadmin/tenants/${id}/users`);
      const usersData = await usersRes.json();
      if (usersRes.ok && usersData.ok) {
        const list: any[] = usersData.data || [];
        const tenantUser = list.find((u) => u.role === 'tenant') || list.find((u) => u.is_active) || list[0];
        if (tenantUser) {
          setUserName(tenantUser.name || '');
          setUserEmail(tenantUser.email || '');
          setUserPassword(tenantUser.password_hash || '');
        }
      }

      // Fetch bot profile
      const botRes = await fetch(`/api/superadmin/tenants/${id}/bot-profiles`);
      const botData = await botRes.json();
      if (botRes.ok && botData.ok) {
        const profile = botData.data?.profile;
        if (profile) {
          setBotName(profile.name || '');
          setBotTone(profile.tone || '');
          setBotAttitude(profile.attitude || '');
          setBotPurpose(profile.purpose || '');
        }
      }

      // Fetch pipeline ID
      const pipelinesRes = await fetch(`/api/superadmin/tenants/${id}/pipelines`);
      if (pipelinesRes.ok) {
        const pipelinesData = await pipelinesRes.json();
        const defaultPipeline = pipelinesData.data?.find((p: any) => p.is_default);
        if (defaultPipeline) {
          setPipelineId(String(defaultPipeline.id));
        }
      }
    } catch (err: any) {
      setError('Error cargando datos: ' + (err?.message || 'unknown'));
    } finally {
      setLoadingData(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      const payload: any = {
        tenant_name: tenantName,
        plan_id: parseInt(planId),
        account_type: accountType,
        phone_e164: phoneE164,
        wa_business_account_id: waBusinessAccountId,
        user_name: userName,
        user_email: userEmail,
        user_password: userPassword,
        bot_name: botName,
        bot_tone: botTone,
        bot_attitude: botAttitude,
        bot_purpose: botPurpose,
        tenant_id: parseInt(id), // Edit mode
      };

      const res = await fetch('/api/superadmin/tenant-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar tenant');
      }

      setSuccess(true);
      // Reload data to reflect changes
      await loadTenantData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-lg">Cargando datos del tenant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Editar Tenant - Configuración Completa</h1>
          <Link
            href="/superadmin/tenants"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ← Regresar
          </Link>
        </div>

        {/* IDs de Referencia */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-md rounded-xl p-4 border border-blue-500/30">
            <p className="text-xs text-blue-300 mb-1">Tenant ID</p>
            <p className="text-2xl font-bold font-mono">{tenantId}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-md rounded-xl p-4 border border-green-500/30">
            <p className="text-xs text-green-300 mb-1">Channel Account ID</p>
            <p className="text-2xl font-bold font-mono">{channelAccountId || '—'}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-md rounded-xl p-4 border border-yellow-500/30">
            <p className="text-xs text-yellow-300 mb-1">Pipeline ID</p>
            <p className="text-2xl font-bold font-mono">{pipelineId || '—'}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg">
            <p className="text-green-200">✓ Tenant actualizado correctamente</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Tenant Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-purple-300">1. Información del Tenant</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre del Tenant *</label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ej: Inmobiliaria XYZ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Plan ID *</label>
                <select
                  required
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id => (
                    <option key={id} value={id}>Plan {id}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Channel WhatsApp */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-green-300">2. Canal WhatsApp</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Cuenta *</label>
                <select
                  required
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as 'business' | 'personal')}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono (E.164) *</label>
                <input
                  type="text"
                  required
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+5215512345678 o 5512345678"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Se auto-normalizará a formato E.164 (+521...)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nombre de Instancia Evolution *</label>
                <input
                  type="text"
                  required
                  value={waBusinessAccountId}
                  onChange={(e) => setWaBusinessAccountId(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="cliente-xyz"
                />
                <p className="text-xs text-gray-400 mt-1">
                  La instancia debe existir previamente en Evolution
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: User Owner */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-blue-300">3. Usuario Administrador</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contraseña (opcional)</label>
                <input
                  type="text"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Deja en blanco para no cambiar"
                />
                <p className="text-xs text-gray-400 mt-1">Si la ingresas, actualizará el password_hash del usuario.</p>
              </div>
            </div>
          </div>

          {/* Section 4: Bot Profile */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-yellow-300">4. Perfil del Bot</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre del Bot *</label>
                <input
                  type="text"
                  required
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Asistente Virtual"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tono *</label>
                <input
                  type="text"
                  required
                  value={botTone}
                  onChange={(e) => setBotTone(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Amigable y profesional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Actitud *</label>
                <input
                  type="text"
                  required
                  value={botAttitude}
                  onChange={(e) => setBotAttitude(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Servicial y atento"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Propósito *</label>
                <textarea
                  required
                  value={botPurpose}
                  onChange={(e) => setBotPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Asistir a clientes con consultas sobre propiedades inmobiliarias..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6">
            <Link
              href={`/superadmin/tenants/${id}`}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Ver Detalle
            </Link>
            <Link
              href="/superadmin/tenants"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
