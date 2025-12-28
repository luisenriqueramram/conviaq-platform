// src/app/portal/conversations/page.tsx

export default function ConversationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Conversaciones</h1>
      <p className="text-xs opacity-80">
        Aquí se listarán todas las conversaciones centralizadas (WhatsApp, web,
        etc.), con filtros por cliente, estado, canal y responsable.
      </p>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-xs opacity-70">
        Vista placeholder — más adelante aquí montamos:
        <ul className="mt-1 list-disc list-inside">
          <li>Lista de chats con último mensaje</li>
          <li>Buscador por nombre, número, etiqueta</li>
          <li>Filtro por bot / humano / mixto</li>
          <li>Acceso directo al detalle del lead</li>
        </ul>
      </div>
    </div>
  );
}
