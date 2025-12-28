'use client';

import React, { useEffect, useState } from 'react';

type Tenant = { id: number; name: string; slug: string; plan_id?: number | null; status?: string };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [diag, setDiag] = useState<any | null>(null);
  const [dupId, setDupId] = useState<number | null>(null);
  const [isPlan10, setIsPlan10] = useState(false);
  const [myTenantId, setMyTenantId] = useState<number | null>(null);

  async function fetchTenants() {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenants');
      const data = await res.json();
      if (res.status === 401) {
        setUnauthorized(true);
      } else {
        setUnauthorized(false);
        setTenants(data.tenants || []);
      }
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTenants();
    // load session info to know if plan 10
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        const planId = data?.plan?.id ?? null;
        setIsPlan10(planId === 10);
        setMyTenantId(data?.tenant?.id ?? null);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  async function enablePlan10() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/force-plan-10', { method: 'POST' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'force plan 10 failed');
      }
      await fetchTenants();
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  }

  async function runDiagnostics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/superadmin-diagnostics');
      const data = await res.json();
      setDiag(data);
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(id: number) {
    setDupId(id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'duplicate failed');
      await fetchTenants();
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally {
      setDupId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = { tenant: { name, slug: slug || undefined } };
      const res = await fetch('/api/superadmin/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'create failed');
      setName(''); setSlug('');
      await fetchTenants();
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tenant Provisioning (SuperAdmin)</h1>
        {!isPlan10 && (
          <a href="/superadmin/tenants/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Nuevo Tenant
          </a>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Tenants</h2>
        {unauthorized && (
          <div className="mt-3 p-3 border rounded bg-yellow-50 text-yellow-800">
            No autorizado para ver la consola completa. Si es tu tenant de pruebas, puedes activar plan 10 (dev) para tu sesión.
            <div className="mt-2">
              <button onClick={enablePlan10} disabled={loading} className="px-3 py-1 rounded bg-yellow-600 text-white">
                {loading ? 'Aplicando…' : 'Activar plan 10 (dev)'}
              </button>
              <button onClick={runDiagnostics} disabled={loading} className="ml-2 px-3 py-1 rounded border">
                {loading ? 'Cargando…' : 'Ver estado'}
              </button>
            </div>
            {diag && (
              <pre className="mt-3 text-xs overflow-auto max-h-64 bg-white/60 p-2 rounded border text-zinc-800">
{JSON.stringify(diag, null, 2)}
              </pre>
            )}
          </div>
        )}
        {loading && <div className="text-sm">Loading...</div>}
        <ul className="mt-3 space-y-2">
          {tenants.map(t => (
            <li key={t.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.slug} — plan {t.plan_id ?? 'n/a'} — {t.status}</div>
              </div>
              <div>
                <div className="flex gap-2 items-center">
                  <button
                    className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                    disabled={dupId === t.id}
                    onClick={() => handleDuplicate(t.id)}
                  >
                    {dupId === t.id ? 'Duplicando…' : 'Duplicar'}
                  </button>
                  <a href={`/superadmin/tenants/${t.id}`} className="text-sm px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">Detalle</a>
                  {!isPlan10 && (
                    <a href={`/superadmin/tenants/${t.id}/edit`} className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Editar</a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
