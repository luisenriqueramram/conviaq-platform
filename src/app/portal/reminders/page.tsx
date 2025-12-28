// src/app/portal/reminders/page.tsx
'use client';

import { useState } from 'react';

export default function RemindersPage() {
  const [reminders] = useState([
    // Mock data - will be populated from API
  ]);

  const filterOptions = ['Pendientes', 'Completados', 'Vencidos', 'Todos'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Recordatorios
            </h1>
            <p className="text-slate-400">
              Gestiona todas tus tareas y recordatorios en un solo lugar
            </p>
          </div>
          <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold transition-all w-fit">
            + Nuevo recordatorio
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all font-medium ${
                filter === 'Pendientes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Reminders List or Empty State */}
        {reminders.length === 0 ? (
          <EmptyReminders />
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder: any) => (
              <ReminderItem key={reminder.id} reminder={reminder} />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Pendientes"
            value="0"
            color="amber"
            icon="⏰"
          />
          <StatCard
            label="Completados hoy"
            value="0"
            color="emerald"
            icon="✓"
          />
          <StatCard
            label="Vencidos"
            value="0"
            color="red"
            icon="⚠️"
          />
        </div>
      </div>
    </div>
  );
}

function EmptyReminders() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-12 text-center backdrop-blur">
      <div className="space-y-3">
        <p className="text-3xl">📋</p>
        <h3 className="text-xl font-semibold text-slate-200">
          No hay recordatorios
        </h3>
        <p className="text-slate-400 max-w-sm mx-auto">
          Crea tu primer recordatorio para empezar a organizar tus tareas
        </p>
        <button className="mt-4 px-6 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors font-medium border border-amber-500/50">
          Crear recordatorio
        </button>
      </div>
    </div>
  );
}

function ReminderItem({ reminder }: { reminder: any }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 backdrop-blur hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-200">{reminder.title}</h4>
          <p className="text-sm text-slate-400 mt-1">{reminder.description}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="px-2 py-1 rounded-md bg-slate-800/50 text-xs text-slate-400">
              {reminder.date}
            </span>
            <span className="px-2 py-1 rounded-md bg-slate-800/50 text-xs text-slate-400">
              {reminder.client}
            </span>
          </div>
        </div>
        <input
          type="checkbox"
          className="w-5 h-5 rounded border-slate-700 cursor-pointer mt-1"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
}) {
  const colorMap = {
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    red: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  return (
    <div
      className={`rounded-lg border ${
        colorMap[color as keyof typeof colorMap]
      } p-4 backdrop-blur`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
