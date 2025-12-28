"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User } from "lucide-react";
import type { Worker } from "@/types/autolavado";

export default function TrabajadoresPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom/autolavado/workers");
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error("Error loading workers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newWorkerName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/custom/autolavado/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkerName }),
      });

      if (res.ok) {
        setNewWorkerName("");
        setShowCreate(false);
        loadWorkers();
      }
    } catch (error) {
      console.error("Error creating worker:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/custom/autolavado/workers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        loadWorkers();
      }
    } catch (error) {
      console.error("Error toggling worker:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este trabajador?")) return;

    try {
      const res = await fetch(`/api/custom/autolavado/workers/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadWorkers();
      }
    } catch (error) {
      console.error("Error deleting worker:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Trabajadores</h1>
            <p className="text-zinc-400 mt-1">Gestiona el equipo de lavadores</p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Trabajador
          </Button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Nombre del trabajador..."
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  disabled={creating}
                />
                <Button onClick={handleCreate} disabled={creating || !newWorkerName.trim()}>
                  {creating ? "Creando..." : "Crear"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workers List */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">{workers.length} trabajadores</CardTitle>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                No hay trabajadores registrados
              </div>
            ) : (
              <div className="space-y-2">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50 hover:bg-zinc-800/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{worker.name}</div>
                        <div className="text-xs text-zinc-500">ID: {worker.id}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={worker.is_active ? "default" : "secondary"}
                        className={worker.is_active ? "" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"}
                      >
                        {worker.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700"
                        onClick={() => handleToggleActive(worker.id, worker.is_active)}
                      >
                        {worker.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(worker.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
