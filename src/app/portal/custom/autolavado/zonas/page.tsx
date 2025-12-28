"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Trash2 } from "lucide-react";
import type { Zone } from "@/types/autolavado";

export default function ZonasPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom/autolavado/zones");
      if (res.ok) {
        const data = await res.json();
        setZones(data);
      }
    } catch (error) {
      console.error("Error loading zones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newZoneName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/custom/autolavado/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newZoneName }),
      });

      if (res.ok) {
        setNewZoneName("");
        setShowCreate(false);
        loadZones();
      }
    } catch (error) {
      console.error("Error creating zone:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/custom/autolavado/zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        loadZones();
      }
    } catch (error) {
      console.error("Error toggling zone:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar esta zona?")) return;

    try {
      const res = await fetch(`/api/custom/autolavado/zones/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadZones();
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
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
            <h1 className="text-3xl font-bold text-white">Zonas de Servicio</h1>
            <p className="text-zinc-400 mt-1">Define las áreas de cobertura</p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Zona
          </Button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Nombre de la zona (ej: Caucel)..."
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  disabled={creating}
                />
                <Button onClick={handleCreate} disabled={creating || !newZoneName.trim()}>
                  {creating ? "Creando..." : "Crear"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zones List */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            {zones.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                No hay zonas configuradas
              </div>
            ) : (
              <div className="space-y-3">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium text-white">{zone.name}</div>
                        <div className="text-sm text-zinc-400">Modo: {zone.mode}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={zone.is_active ? "default" : "secondary"}
                        className={zone.is_active ? "" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"}
                      >
                        {zone.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700"
                        onClick={() => handleToggleActive(zone.id, zone.is_active)}
                      >
                        {zone.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(zone.id)}
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
