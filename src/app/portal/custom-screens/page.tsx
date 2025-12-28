'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Send } from 'lucide-react';

type Workflow = {
  id: number;
  key: string;
  url: string;
  name: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export default function CustomScreensPage() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadWorkflow();
  }, []);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workflows', { cache: 'no-store' });
      const json = await res.json();

      if (json.ok) {
        if (json.workflow) {
          setWorkflow(json.workflow);
          setContent(json.content);
          if (json.error) setError(json.error);
        } else {
          setWorkflow(null);
          setContent(null);
        }
      } else {
        setError(json.error ?? 'Failed to load workflow');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error loading workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPosting(true);

    try {
      const formElements = (e.target as HTMLFormElement).elements;
      const data: Record<string, any> = {};

      for (let i = 0; i < formElements.length; i++) {
        const el = formElements[i] as any;
        if (el.name) {
          data[el.name] = el.value;
        }
      }

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', data }),
      });

      const json = await res.json();
      console.log('Workflow response:', json);

      // Mostrar respuesta o recargar si es necesario
      if (json.ok) {
        alert('Formulario enviado correctamente');
        // Opcionalmente recargar contenido
        loadWorkflow();
      } else {
        alert(`Error: ${json.error ?? 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Error enviando formulario: ${e?.message ?? String(e)}`);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Cargando pantalla personalizada...</p>
      </div>
    );
  }

  if (!workflow || !content) {
    return (
      <div className="p-8 space-y-6">
        <div className="max-w-2xl">
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <span className="text-3xl">🎨</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Pantalla Personalizada</h2>
            <p className="text-slate-400 leading-relaxed">
              Aún no has configurado una pantalla personalizada. Contacta al administrador para registrar un webhook en tu cuenta y desbloquear esta funcionalidad.
            </p>
            <div className="pt-2">
              <button
                onClick={loadWorkflow}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="max-w-2xl">
          <div className="rounded-2xl border border-red-700/50 bg-red-950/30 backdrop-blur p-6 space-y-3">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-200">Error cargando pantalla</h3>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={loadWorkflow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition-colors mt-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">{workflow.name ?? 'Pantalla Personalizada'}</h1>
          {workflow.description && (
            <p className="text-slate-400 mt-2">{workflow.description}</p>
          )}
        </div>
        <button
          onClick={loadWorkflow}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors disabled:opacity-60"
          title="Recargar"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Contenido personalizado */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur overflow-hidden">
        <CustomContentRenderer content={content} onSubmit={handleSubmitForm} isSubmitting={posting} />
      </div>

      {/* Info del webhook */}
      <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
        <p className="text-xs text-slate-500">
          Webhook: <code className="text-slate-300 font-mono">{workflow.url}</code>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Última actualización: {new Date(workflow.updated_at).toLocaleString('es-MX')}
        </p>
      </div>
    </div>
  );
}

function CustomContentRenderer({
  content,
  onSubmit,
  isSubmitting,
}: {
  content: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}) {
  const [sanitized, setSanitized] = useState<string>('');

  useEffect(() => {
    // Envolver HTML personalizado en un formulario si contiene inputs
    let wrapped = content;

    // Si el contenido NO tiene un <form> pero tiene inputs, envolverlo
    if (!wrapped.includes('<form') && (wrapped.includes('input') || wrapped.includes('textarea'))) {
      wrapped = `<form class="custom-form">${wrapped}</form>`;
    }

    setSanitized(wrapped);
  }, [content]);

  return (
    <div className="p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div
          className="prose prose-invert max-w-none custom-html-container"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
        {sanitized.includes('input') && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white transition-colors"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        )}
      </form>

      <style>{`
        .custom-html-container {
          color: inherit;
        }
        .custom-html-container a {
          color: #60a5fa;
          text-decoration: underline;
        }
        .custom-html-container a:hover {
          color: #93c5fd;
        }
        .custom-html-container input,
        .custom-html-container textarea,
        .custom-html-container select {
          background-color: #1e293b;
          border: 1px solid #475569;
          color: white;
          padding: 0.5rem;
          border-radius: 0.375rem;
          width: 100%;
          margin: 0.5rem 0;
        }
        .custom-html-container input:focus,
        .custom-html-container textarea:focus,
        .custom-html-container select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .custom-html-container button {
          background-color: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          border: none;
          cursor: pointer;
          margin: 0.5rem 0;
        }
        .custom-html-container button:hover {
          background-color: #2563eb;
        }
      `}</style>
    </div>
  );
}
