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
    if (!user) {
      console.log("No user, skipping area load");
      setAreas([]);
      setLoading(false);
      return;
    }
    
    // Set loading state but don't block the UI - allow interaction while loading
    setLoading(true);
    
    try {
      console.log("Loading areas for user:", user.uid);
      const userAreas = await getUserAreas(user.uid);
      console.log("Loaded areas:", userAreas.length, userAreas);
      setAreas(userAreas);
    } catch (error: any) {
      console.error("Error loading areas:", error);
      // Don't show alert for timeout errors - just log and continue
      if (!error.message?.includes("timeout") && !error.message?.includes("Timeout")) {
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          stack: error.stack,
        });
      }
      // Always set empty array on error to prevent UI blocking
      setAreas([]);
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
    if (!user) {
      console.error("User not authenticated");
      throw new Error("Debes iniciar sesión para guardar áreas");
    }
    
    try {
      console.log("Creating area:", { ...area, userId: user.uid });
      const areaId = await createArea({ ...area, userId: user.uid });
      console.log("Area created successfully with ID:", areaId);
      await loadAreas();
      setShowForm(false);
      setFormCoordinates(undefined);
      if (onCoordinatesClear) onCoordinatesClear();
    } catch (error: any) {
      console.error("Error creating area:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      // Re-throw the error so it can be caught by AreaForm
      throw error;
    }
  };

  const handleUpdate = async (
    area: Omit<Area, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!editingArea?.id) {
      throw new Error("No hay área seleccionada para actualizar");
    }
    
    try {
      await updateArea(editingArea.id, area);
      await loadAreas();
      setShowForm(false);
      setEditingArea(null);
      setFormCoordinates(undefined);
    } catch (error: any) {
      console.error("Error updating area:", error);
      throw error;
    }
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

  // Don't block the UI while loading - show the form/list with a loading indicator
  // if (loading) {
  //   return <div className="text-center py-4">Cargando áreas...</div>;
  // }

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

      {loading && areas.length === 0 && (
        <div className="text-center py-2 text-sm text-gray-500">
          Cargando áreas...
        </div>
      )}

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

