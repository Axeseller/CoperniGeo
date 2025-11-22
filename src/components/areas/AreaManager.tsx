"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas, createArea, updateArea, deleteArea } from "@/lib/firestore/areas";
import { Area } from "@/types/area";
import AreaForm from "./AreaForm";
import AreaList from "./AreaList";

interface AreaManagerProps {
  onAreaSelect: (areaId: string) => void;
  selectedAreaId?: string;
  drawnCoordinates?: { lat: number; lng: number }[];
  onCoordinatesClear?: () => void;
}

export default function AreaManager({
  onAreaSelect,
  selectedAreaId,
  drawnCoordinates,
  onCoordinatesClear,
}: AreaManagerProps) {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formCoordinates, setFormCoordinates] = useState<{ lat: number; lng: number }[] | undefined>(
    drawnCoordinates
  );

  const loadAreas = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userAreas = await getUserAreas(user.uid);
      setAreas(userAreas);
    } catch (error) {
      console.error("Error loading areas:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    if (drawnCoordinates) {
      setFormCoordinates(drawnCoordinates);
      setShowForm(true);
    }
  }, [drawnCoordinates]);

  const handleCreate = async (
    area: Omit<Area, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    await createArea({ ...area, userId: user.uid });
    await loadAreas();
    setShowForm(false);
    setFormCoordinates(undefined);
    if (onCoordinatesClear) onCoordinatesClear();
  };

  const handleUpdate = async (
    area: Omit<Area, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!editingArea?.id) return;
    await updateArea(editingArea.id, area);
    await loadAreas();
    setShowForm(false);
    setEditingArea(null);
    setFormCoordinates(undefined);
  };

  const handleDelete = async (areaId: string) => {
    await deleteArea(areaId);
    await loadAreas();
    if (selectedAreaId === areaId) {
      onAreaSelect("");
    }
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormCoordinates(undefined);
    setShowForm(true);
  };

  if (loading) {
    return <div className="text-center py-4">Cargando áreas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Áreas</h3>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingArea(null);
              setFormCoordinates(undefined);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            Nueva Área
          </button>
        )}
      </div>

      {showForm ? (
        <AreaForm
          onSubmit={editingArea ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingArea(null);
            setFormCoordinates(undefined);
            if (onCoordinatesClear) onCoordinatesClear();
          }}
          initialData={editingArea || undefined}
          coordinates={formCoordinates}
        />
      ) : (
        <AreaList
          areas={areas}
          selectedAreaId={selectedAreaId}
          onSelect={onAreaSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

