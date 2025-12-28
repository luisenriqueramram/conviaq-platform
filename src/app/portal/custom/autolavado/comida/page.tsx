'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface MealPolicy {
  id: number;
  base_start_local: string;
  base_end_local: string;
  duration_min: number;
  flex_before_min: number;
  flex_after_min: number;
  is_enabled: boolean;
}

export default function ComidaPage() {
  const [policy, setPolicy] = useState<MealPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [duration, setDuration] = useState(60);
  const [flexBefore, setFlexBefore] = useState(15);
  const [flexAfter, setFlexAfter] = useState(15);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  async function loadPolicy() {
    try {
      setLoading(true);
      const res = await fetch('/api/custom/autolavado/config/meal-policy');
      if (!res.ok) throw new Error('Error al cargar política de comida');
      const data = await res.json();
      
      if (data) {
        setPolicy(data);
        setStartTime(data.base_start_local?.slice(0, 5) || '14:00');
        setEndTime(data.base_end_local?.slice(0, 5) || '15:00');
        setDuration(data.duration_min || 60);
        setFlexBefore(data.flex_before_min || 15);
        setFlexAfter(data.flex_after_min || 15);
        setIsEnabled(data.is_enabled ?? true);
      }
    } catch (err) {
      console.error(err);
      alert('Error al cargar política de comida');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      
      const res = await fetch('/api/custom/autolavado/config/meal-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_start_local: startTime,
          base_end_local: endTime,
          duration_min: duration,
          flex_before_min: flexBefore,
          flex_after_min: flexAfter,
          is_enabled: isEnabled,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');
      
      await loadPolicy();
      alert('✅ Política de comida guardada');
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar política de comida');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          🍽️ Política de Comida
        </h1>
        <p className="text-sm text-zinc-400">
          Define el horario de comida para los trabajadores
        </p>
      </div>

      {/* Main Card */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-6">
        <div className="space-y-6">
          {/* Toggle Habilitado */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Horario de Comida
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {isEnabled 
                  ? 'Durante este horario no se inician servicios nuevos' 
                  : 'Desactivado - no se aplica restricción de comida'}
              </p>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Hora de Inicio
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Hora de Fin
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Duración (minutos)
            </label>
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Tiempo total asignado para la comida
            </p>
          </div>

          {/* Flexibilidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Flex Antes (min)
              </label>
              <input
                type="number"
                min="0"
                value={flexBefore}
                onChange={(e) => setFlexBefore(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Minutos antes permitidos
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Flex Después (min)
              </label>
              <input
                type="number"
                min="0"
                value={flexAfter}
                onChange={(e) => setFlexAfter(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Minutos después permitidos
              </p>
            </div>
          </div>

          {/* Vista Previa */}
          {isEnabled && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-2">
                Vista Previa
              </h4>
              <div className="text-sm text-zinc-300 space-y-1">
                <p>🍽️ Horario base: {startTime} - {endTime}</p>
                <p>⏱️ Duración: {duration} minutos</p>
                <p>🔄 Flexibilidad: {flexBefore} min antes / {flexAfter} min después</p>
                <p className="text-zinc-400 text-xs mt-2">
                  Los trabajadores pueden tomar su comida entre{' '}
                  {(() => {
                    const [h, m] = startTime.split(':').map(Number);
                    const start = new Date(2024, 0, 1, h, m - flexBefore);
                    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                  })()}
                  {' y '}
                  {(() => {
                    const [h, m] = endTime.split(':').map(Number);
                    const end = new Date(2024, 0, 1, h, m + flexAfter);
                    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Botón Guardar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Guardando...' : '💾 Guardar Política de Comida'}
          </button>
        </div>
      </Card>
    </div>
  );
}
