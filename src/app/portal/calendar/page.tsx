// src/app/portal/calendar/page.tsx
'use client';

import { useState } from 'react';

export default function CalendarPage() {
  const [currentMonth] = useState(new Date());

  const monthName = currentMonth.toLocaleString('es', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Calendario
            </h1>
            <p className="text-slate-400">
              Visualiza citas agendadas y recordatorios por fecha
            </p>
          </div>
          <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-semibold transition-all w-fit">
            + Agendar cita
          </button>
        </div>

        {/* Calendar Container */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Widget */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur lg:col-span-2">
            <div className="space-y-6">
              {/* Month Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-200 capitalize">
                  {monthName}
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                    ←
                  </button>
                  <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                    →
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {emptyDays.map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {days.map((day) => (
                  <div
                    key={day}
                    className="aspect-square rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center hover:bg-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
                  >
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white">
                      {day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur space-y-4 h-fit">
            <h3 className="text-lg font-semibold text-slate-200">
              Próximos eventos
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-800/50 border-l-2 border-indigo-500">
                <p className="text-sm font-semibold text-slate-200">Reunión con cliente</p>
                <p className="text-xs text-slate-400 mt-1">Hoy, 3:00 PM</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border-l-2 border-emerald-500">
                <p className="text-sm font-semibold text-slate-200">Cita agendada</p>
                <p className="text-xs text-slate-400 mt-1">Mañana, 10:00 AM</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border-l-2 border-amber-500">
                <p className="text-sm font-semibold text-slate-200">Recordatorio importante</p>
                <p className="text-xs text-slate-400 mt-1">En 3 días, 2:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Info */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
          <div className="flex gap-3">
            <span className="text-2xl">🔗</span>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-200">
                Conecta tu calendario
              </h3>
              <p className="text-sm text-slate-400">
                Integra Google Calendar, Microsoft Outlook u otro servicio para sincronizar automáticamente
                citas y recordatorios desde CONVIAQ.
              </p>
              <button className="mt-3 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors font-medium">
                Conectar calendario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
