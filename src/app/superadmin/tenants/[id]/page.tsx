"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Tenant = { id: number; name: string; slug: string; plan_id?: number | null; status?: string };
type Feature = { feature_key: string; enabled: boolean };
type Integration = { id: number; type: string; name: string; is_active: boolean; config?: any };
type Channel = {
  id: number;
  channel_type: string;
  provider: string;
  account_label?: string;
  phone_e164?: string;
  is_active: boolean;
};
type Workflow = { id: number; key: string; name: string; is_active: boolean };
type App = { id: number; key: string; name: string; is_active: boolean };
type User = { id: number; name: string; email: string; role?: string; is_active: boolean };

export default function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // General
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [planId, setPlanId] = useState<number | ''>('');
  const [status, setStatus] = useState('');

  // Features
  const [features, setFeatures] = useState<Feature[]>([]);
  const [newFeatureKey, setNewFeatureKey] = useState('');

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Channels
  const [channels, setChannels] = useState<Channel[]>([]);

  // AI
  const [botProfile, setBotProfile] = useState<any | null>(null);
  const [bpName, setBpName] = useState('');
  const [bpEnabled, setBpEnabled] = useState(true);
  const [bpTone, setBpTone] = useState('');
  const [bpAttitude, setBpAttitude] = useState('');
  const [bpPurpose, setBpPurpose] = useState('');
  const [bpLanguage, setBpLanguage] = useState('es-MX');
  const [bpUsePrompt, setBpUsePrompt] = useState(false);
  const [bpPrompt, setBpPrompt] = useState('');

  // Workflows
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // Apps
  const [apps, setApps] = useState<App[]>([]);

  // Users
  const [users, setUsers] = useState<User[]>([]);

  // Edit mode states
  const [editAccountType, setEditAccountType] = useState<'business' | 'personal'>('business');
  const [editPhoneE164, setEditPhoneE164] = useState('');
  const [editWaBusinessAccountId, setEditWaBusinessAccountId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editBotName, setEditBotName] = useState('');
  const [editBotTone, setEditBotTone] = useState('');
  const [editBotAttitude, setEditBotAttitude] = useState('');
  const [editBotPurpose, setEditBotPurpose] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    await fetchTenant();
    await fetchFeatures();
    await fetchIntegrations();
    await fetchChannels();
    await fetchBotProfile();
    await fetchWorkflows();
    await fetchApps();
    await fetchUsers();
  }

  async function fetchTenant() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'fetch failed');
      setTenant(data.tenant || null);
      setName(data.tenant?.name || '');
      setSlug(data.tenant?.slug || '');
      setPlanId(data.tenant?.plan_id ?? '');
      setStatus(data.tenant?.status || '');
    } catch (e: any) {
      setMessage(e?.message || 'error');
    }
  }

  async function fetchFeatures() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/features`);
      const data = await res.json();
      if (res.ok && data.ok) setFeatures(data.data || []);
    } catch (e) {
      console.error('fetchFeatures', e);
    }
  }

  async function fetchIntegrations() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/integrations`);
      const data = await res.json();
      if (res.ok && data.ok) setIntegrations(data.data || []);
    } catch (e) {
      console.error('fetchIntegrations', e);
    }
  }

  async function fetchChannels() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/channels`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setChannels(data.data || []);
        // Load edit states from first whatsapp channel
        const waChannel = data.data?.find((c: any) => c.channel_type === 'whatsapp');
        if (waChannel) {
          setEditPhoneE164(waChannel.phone_e164 || '');
          setEditAccountType((waChannel.account_type as 'business' | 'personal') || 'business');
          setEditWaBusinessAccountId(waChannel.wa_business_account_id || '');
        }
      }
    } catch (e) {
      console.error('fetchChannels', e);
    }
  }

  async function fetchBotProfile() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/bot-profiles`);
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      const p = data.data?.profile;
      setBotProfile(p);
      setBpName(p?.name || '');
      setBpEnabled(Boolean(p?.ai_enabled));
      setBpTone(p?.tone || '');
      setBpAttitude(p?.attitude || '');
      setBpPurpose(p?.purpose || '');
      setBpLanguage(p?.language || 'es-MX');
      setBpUsePrompt(Boolean(p?.use_custom_prompt));
      setBpPrompt(p?.custom_prompt || '');
      // Load edit states
      setEditBotName(p?.name || '');
      setEditBotTone(p?.tone || '');
      setEditBotAttitude(p?.attitude || '');
      setEditBotPurpose(p?.purpose || '');
    } catch (e) {
      console.error('fetchBotProfile', e);
    }
  }

  async function fetchWorkflows() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/workflows`);
      const data = await res.json();
      if (res.ok && data.ok) setWorkflows(data.data || []);
    } catch (e) {
      console.error('fetchWorkflows', e);
    }
  }

  async function fetchApps() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/apps`);
      const data = await res.json();
      if (res.ok && data.ok) setApps(data.data || []);
    } catch (e) {
      console.error('fetchApps', e);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/users`);
      const data = await res.json();
      if (res.ok && data.ok) {
        const list: User[] = data.data || [];
        setUsers(list);
        // Prefer role 'tenant', fallback to first active or first user
        const tenantUser = list.find((u) => u.role === 'tenant') || list.find((u) => u.is_active) || list[0];
        if (tenantUser) {
          setEditUserName(tenantUser.name || '');
          setEditUserEmail(tenantUser.email || '');
        }
      }
    } catch (e) {
      console.error('fetchUsers', e);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        tenant_name: name,
        plan_id: planId === '' ? 1 : Number(planId),
        account_type: editAccountType,
        phone_e164: editPhoneE164,
        wa_business_account_id: editWaBusinessAccountId,
        user_name: editUserName,
        user_email: editUserEmail,
        user_password: editUserPassword,
        bot_name: editBotName,
        bot_tone: editBotTone,
        bot_attitude: editBotAttitude,
        bot_purpose: editBotPurpose,
        tenant_id: Number(id), // Edit mode
      };

      const res = await fetch('/api/superadmin/tenant-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      setMessage('✓ Tenant actualizado');
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
      await fetchAll();
    } catch (e: any) {
      setMessage('✗ ' + (e?.message || 'error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTenant(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const body = { tenant: { name, slug, plan_id: planId === '' ? null : Number(planId), status } };
      const res = await fetch(`/api/superadmin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'update failed');
      setTenant(data.tenant);
      setMessage('✓ Guardado');
    } catch (e: any) {
      setMessage('✗ ' + (e?.message || 'error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAI() {
    try {
      const body = {
        name: bpName,
        ai_enabled: bpEnabled,
        tone: bpTone,
        attitude: bpAttitude,
        purpose: bpPurpose,
        language: bpLanguage,
        use_custom_prompt: bpUsePrompt,
        custom_prompt: bpPrompt,
      };
      const res = await fetch(`/api/superadmin/tenants/${id}/bot-profiles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBotProfile(data.data?.profile);
        setMessage('✓ AI guardado');
      } else {
        setMessage('✗ ' + (data?.error || 'error'));
      }
    } catch (e: any) {
      setMessage('✗ ' + (e?.message || 'error'));
    }
  }

  // Features handlers
  async function handleAddFeature() {
    if (!newFeatureKey.trim()) return;
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_key: newFeatureKey.trim(), enabled: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchFeatures();
        setNewFeatureKey('');
        setMessage('✓ Feature agregada');
      } else {
        setMessage('✗ ' + (data?.error || 'error'));
      }
    } catch (e: any) {
      setMessage('✗ ' + (e?.message || 'error'));
    }
  }

  async function handleToggleFeature(key: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_key: key, enabled }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchFeatures();
        setMessage(`✓ Feature ${enabled ? 'activada' : 'desactivada'}`);
      } else {
        setMessage('✗ ' + (data?.error || 'error'));
      }
    } catch (e: any) {
      setMessage('✗ ' + (e?.message || 'error'));
    }
  }

  async function handleDeleteFeature(key: string) {
    if (!confirm(`¿Eliminar feature "${key}"?`)) return;
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/features?feature_key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchFeatures();
        setMessage('✓ Feature eliminada');
      } else {
        setMessage('✗ ' + (data?.error || 'error'));
      }
    } catch (e: any) {
      setMessage('✗ ' + (e?.message || 'error'));
    }
  }

  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'edit', label: 'Editar Completo' },
    { key: 'features', label: 'Features' },
    { key: 'integrations', label: 'Integrations' },
    { key: 'channels', label: 'Channels' },
    { key: 'ai', label: 'AI' },
    { key: 'workflows', label: 'Workflows' },
    { key: 'apps', label: 'Apps' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tenant {id}</h1>
        <a href="/superadmin/tenants" className="text-blue-600 hover:underline">
          ← Volver
        </a>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-zinc-100 border rounded text-sm">{message}</div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-medium whitespace-nowrap ${ 
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* General */}
      {activeTab === 'general' && tenant && (
        <form onSubmit={handleSaveTenant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plan ID</label>
              <input
                type="number"
                value={planId}
                onChange={(e) => setPlanId(e.target.value === '' ? '' : Number(e.target.value))}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}

      {/* Edit Complete */}
      {activeTab === 'edit' && tenant && (
        <form onSubmit={handleSaveEdit} className="space-y-6 max-w-2xl">
          {editSuccess && (
            <div className="p-4 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
              ✓ Tenant actualizado correctamente
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">1. Información del Tenant</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan ID</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="border p-2 rounded w-full"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                    <option key={p} value={p}>Plan {p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">2. Canal WhatsApp</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Cuenta</label>
                <select
                  value={editAccountType}
                  onChange={(e) => setEditAccountType(e.target.value as 'business' | 'personal')}
                  className="border p-2 rounded w-full"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono (E.164)</label>
                <input
                  value={editPhoneE164}
                  onChange={(e) => setEditPhoneE164(e.target.value)}
                  className="border p-2 rounded w-full"
                  placeholder="+5215512345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Business Account ID</label>
                <input
                  value={editWaBusinessAccountId}
                  onChange={(e) => setEditWaBusinessAccountId(e.target.value)}
                  className="border p-2 rounded w-full"
                  placeholder="123456789012345"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">3. Usuario Administrador</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                <input
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña (opcional)</label>
                <input
                  type="text"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  className="border p-2 rounded w-full"
                  placeholder="Deja en blanco para no cambiar"
                />
                <p className="text-xs text-zinc-500 mt-1">Si la ingresas, actualizará el password_hash del usuario.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">4. Perfil del Bot</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del Bot</label>
                <input
                  value={editBotName}
                  onChange={(e) => setEditBotName(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tono</label>
                <input
                  value={editBotTone}
                  onChange={(e) => setEditBotTone(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actitud</label>
                <input
                  value={editBotAttitude}
                  onChange={(e) => setEditBotAttitude(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Propósito</label>
                <textarea
                  value={editBotPurpose}
                  onChange={(e) => setEditBotPurpose(e.target.value)}
                  rows={3}
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <p className="font-semibold mb-2">Información de Referencia (No editable):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Tenant ID:</strong> {id}</li>
              <li><strong>Slug:</strong> {slug}</li>
              <li><strong>Status:</strong> {status}</li>
            </ul>
          </div>
        </form>
      )}

      {/* Features */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              placeholder="Nueva feature (ej: leads, ai_chat)"
              value={newFeatureKey}
              onChange={(e) => setNewFeatureKey(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <button
              onClick={handleAddFeature}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Agregar
            </button>
          </div>
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f.feature_key} className="flex items-center justify-between border p-3 rounded">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) => handleToggleFeature(f.feature_key, e.target.checked)}
                  />
                  <span className="font-mono text-sm">{f.feature_key}</span>
                </div>
                <button
                  onClick={() => handleDeleteFeature(f.feature_key)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Eliminar
                </button>
              </div>
            ))}
            {features.length === 0 && <div className="text-zinc-500 text-sm">Sin features</div>}
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-2">
          {integrations.map((i) => (
            <div key={i.id} className="border p-3 rounded">
              <div className="font-medium">{i.name}</div>
              <div className="text-sm text-zinc-600">Type: {i.type} | Active: {i.is_active ? 'Sí' : 'No'}</div>
            </div>
          ))}
          {integrations.length === 0 && <div className="text-zinc-500 text-sm">Sin integraciones</div>}
        </div>
      )}

      {/* Channels */}
      {activeTab === 'channels' && (
        <div className="space-y-2">
          {channels.map((c) => (
            <div key={c.id} className="border p-3 rounded">
              <div className="font-medium">{c.account_label || c.phone_e164 || `Channel ${c.id}`}</div>
              <div className="text-sm text-zinc-600">
                {c.channel_type} / {c.provider} | Active: {c.is_active ? 'Sí' : 'No'}
              </div>
            </div>
          ))}
          {channels.length === 0 && <div className="text-zinc-500 text-sm">Sin canales</div>}
        </div>
      )}

      {/* AI */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={bpEnabled}
              onChange={(e) => setBpEnabled(e.target.checked)}
            />
            <span className="font-medium">AI enabled</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={bpName}
              onChange={(e) => setBpName(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tone</label>
              <input
                value={bpTone}
                onChange={(e) => setBpTone(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Attitude</label>
              <input
                value={bpAttitude}
                onChange={(e) => setBpAttitude(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purpose</label>
              <input
                value={bpPurpose}
                onChange={(e) => setBpPurpose(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <input
                value={bpLanguage}
                onChange={(e) => setBpLanguage(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={bpUsePrompt}
              onChange={(e) => setBpUsePrompt(e.target.checked)}
            />
            <span className="text-sm">Usar prompt personalizado</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Custom Prompt</label>
            <textarea
              value={bpPrompt}
              onChange={(e) => setBpPrompt(e.target.value)}
              rows={5}
              className="border p-2 rounded w-full"
            />
          </div>
          <button
            onClick={handleSaveAI}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
          >
            Guardar AI
          </button>
        </div>
      )}

      {/* Workflows */}
      {activeTab === 'workflows' && (
        <div className="space-y-2">
          {workflows.map((w) => (
            <div key={w.id} className="border p-3 rounded">
              <div className="font-medium">{w.name}</div>
              <div className="text-sm text-zinc-600">Key: {w.key} | Active: {w.is_active ? 'Sí' : 'No'}</div>
            </div>
          ))}
          {workflows.length === 0 && <div className="text-zinc-500 text-sm">Sin workflows</div>}
        </div>
      )}

      {/* Apps */}
      {activeTab === 'apps' && (
        <div className="space-y-2">
          {apps.map((a) => (
            <div key={a.id} className="border p-3 rounded">
              <div className="font-medium">{a.name}</div>
              <div className="text-sm text-zinc-600">Key: {a.key} | Active: {a.is_active ? 'Sí' : 'No'}</div>
            </div>
          ))}
          {apps.length === 0 && <div className="text-zinc-500 text-sm">Sin apps</div>}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="border p-3 rounded">
              <div className="font-medium">{u.name}</div>
              <div className="text-sm text-zinc-600">
                {u.email} | {u.role} | Active: {u.is_active ? 'Sí' : 'No'}
              </div>
            </div>
          ))}
          {users.length === 0 && <div className="text-zinc-500 text-sm">Sin usuarios</div>}
        </div>
      )}
    </div>
  );
}
