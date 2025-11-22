"use client";

import { Area } from "@/types/area";

interface AreaListProps {
  areas: Area[];
  selectedAreaId?: string;
  onSelect: (areaId: string) => void;
  onEdit: (area: Area) => void;
  onDelete: (areaId: string) => void;
}

export default function AreaList({
  areas,
  selectedAreaId,
  onSelect,
  onEdit,
  onDelete,
}: AreaListProps) {
  if (areas.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No hay áreas guardadas</p>
        <p className="text-sm mt-2">Dibuja un polígono en el mapa para crear una</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {areas.map((area) => (
        <div
          key={area.id}
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedAreaId === area.id
              ? "border-green-600 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => area.id && onSelect(area.id)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{area.name}</h4>
              <p className="text-sm text-gray-500">
                {area.coordinates?.length || 0} puntos
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(area);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (area.id && confirm("¿Estás seguro de eliminar esta área?")) {
                    onDelete(area.id);
                  }
                }}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

