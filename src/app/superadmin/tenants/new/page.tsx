'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewTenantPage() {
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

  // Bot Profile fields
  const [botName, setBotName] = useState('');
  const [botTone, setBotTone] = useState('');
  const [botAttitude, setBotAttitude] = useState('');
  const [botPurpose, setBotPurpose] = useState('');

  // Workflows (optional)
  const [workflows, setWorkflows] = useState<Array<{ key: string; name: string; description: string }>>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ tenant_id: number; channel_account_id: number; pipeline_id: number } | null>(null);

  const handleAddWorkflow = () => {
    setWorkflows([...workflows, { key: '', name: '', description: '' }]);
  };

  const handleRemoveWorkflow = (index: number) => {
    setWorkflows(workflows.filter((_, i) => i !== index));
  };

  const handleWorkflowChange = (index: number, field: 'key' | 'name' | 'description', value: string) => {
    const updated = [...workflows];
    updated[index][field] = value;
    setWorkflows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        tenant_name: tenantName,
        plan_id: parseInt(planId),
        account_type: accountType,
        phone_e164: phoneE164,
        wa_business_account_id: waBusinessAccountId,
        user_name: userName,
        user_email: userEmail,
        bot_name: botName,
        bot_tone: botTone,
        bot_attitude: botAttitude,
        bot_purpose: botPurpose,
      };

      // Only include workflows if any are defined
      if (workflows.length > 0) {
        payload.workflows = workflows.filter(w => w.key && w.name);
      }

      const res = await fetch('/api/superadmin/tenant-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear tenant');
      }

      // Show success modal with data
      setSuccess({
        tenant_id: data.data.tenant_id,
        channel_account_id: data.data.channel_account_id,
        pipeline_id: data.data.pipeline_id,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-white/20 p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-green-300">✓ Tenant Creado</h2>
            <div className="space-y-3 mb-6 text-sm">
              <div className="bg-white/5 p-3 rounded border border-white/10">
                <p className="text-gray-400">Tenant ID</p>
                <p className="font-mono text-white text-lg">{success.tenant_id}</p>
              </div>
              <div className="bg-white/5 p-3 rounded border border-white/10">
                <p className="text-gray-400">Channel Account ID</p>
                <p className="font-mono text-white text-lg">{success.channel_account_id}</p>
              </div>
              <div className="bg-white/5 p-3 rounded border border-white/10">
                <p className="text-gray-400">Pipeline ID</p>
                <p className="font-mono text-white text-lg">{success.pipeline_id}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/superadmin/tenants'}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Volver al Listado
              </button>
              <button
                onClick={() => window.location.href = `/superadmin/tenants/${success.tenant_id}`}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-colors font-semibold"
              >
                Ver Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Nuevo Tenant - Alta Completa</h1>
          <Link
            href="/superadmin/tenants"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ← Regresar
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-200">{error}</p>
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
                <label className="block text-sm font-medium mb-2">WhatsApp Business Account ID *</label>
                <input
                  type="text"
                  required
                  value={waBusinessAccountId}
                  onChange={(e) => setWaBusinessAccountId(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="123456789012345"
                />
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

          {/* Section 5: Workflows (Optional) */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-pink-300">5. Workflows (Opcional)</h2>
              <button
                type="button"
                onClick={handleAddWorkflow}
                className="px-3 py-1 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm transition-colors"
              >
                + Agregar Workflow
              </button>
            </div>
            {workflows.length === 0 ? (
              <p className="text-gray-400 text-sm">
                No hay workflows configurados. Puedes agregar workflows opcionales.
              </p>
            ) : (
              <div className="space-y-4">
                {workflows.map((workflow, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Workflow {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkflow(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Clave (key)</label>
                        <input
                          type="text"
                          value={workflow.key}
                          onChange={(e) => handleWorkflowChange(index, 'key', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="qualification_flow"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Nombre</label>
                        <input
                          type="text"
                          value={workflow.name}
                          onChange={(e) => handleWorkflowChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Calificación de Leads"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Descripción</label>
                        <textarea
                          value={workflow.description}
                          onChange={(e) => handleWorkflowChange(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Workflow para calificar leads automáticamente..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6">
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
              {loading ? 'Creando...' : 'Crear Tenant Completo'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
