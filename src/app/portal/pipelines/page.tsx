'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type PipelineSummary = {
  id: number;
  name: string;
};

export default function PipelinesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/pipelines');
        if (!res.ok) throw new Error('No pudimos cargar tus pipelines');
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Respuesta inválida del servidor');

        const items: PipelineSummary[] = json.data?.items ?? [];
        if (items.length === 0) {
          setError('Aún no tienes pipelines configurados. Crea uno desde el panel de administración.');
          return;
        }

        router.replace(`/portal/pipelines/${items[0].id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchAndRedirect();
  }, [router]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {loading && (
        <>
          <div className="h-12 w-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-white text-lg font-semibold">Abriendo pipeline</p>
            <p className="text-slate-400 text-sm">Espera un momento...</p>
          </div>
        </>
      )}

      {!loading && error && (
        <div className="max-w-lg space-y-3">
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
