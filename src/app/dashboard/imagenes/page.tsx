"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas } from "@/lib/firestore/areas";
import InteractiveMap from "@/components/map/InteractiveMap";
import MapControls from "@/components/map/MapControls";
import AreaManager from "@/components/areas/AreaManager";
import PlanRequired from "@/components/PlanRequired";
import { Area } from "@/types/area";
import { IndexType } from "@/types/report";
import { SatelliteImageResponse } from "@/types/satellite";

export default function ImagenesPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [drawnCoordinates, setDrawnCoordinates] = useState<
    { lat: number; lng: number }[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [imageDataList, setImageDataList] = useState<SatelliteImageResponse[]>([]);

  const loadAreas = useCallback(async () => {
    if (!user) {
      setAreas([]);
      return;
    }
    
    try {
      const userAreas = await getUserAreas(user.uid);
      setAreas(userAreas);
    } catch (error) {
      console.error("Error loading areas:", error);
      // Set empty array on error to prevent UI blocking
      setAreas([]);
    }
  }, [user]);

  useEffect(() => {
    // Load areas in background without blocking
    loadAreas();
  }, [loadAreas]);

  const handlePolygonComplete = (coordinates: { lat: number; lng: number }[]) => {
    setDrawnCoordinates(coordinates);
  };

  const handleLoadImage = async (params: {
    areaId?: string;
    coordinates?: { lat: number; lng: number }[];
    indexType: IndexType;
    cloudCoverage: number;
  }) => {
    setLoading(true);

    try {
      const coordinates = params.coordinates || [];
      if (coordinates.length < 3) {
        alert("Se requieren al menos 3 puntos para un polígono");
        setLoading(false);
        return;
      }

      console.log("Cargando imagen satelital más reciente con parámetros:", {
        coordinates: coordinates.length,
        indexType: params.indexType,
        cloudCoverage: params.cloudCoverage,
      });

      const response = await fetch("/api/satellite/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates,
          indexType: params.indexType,
          cloudCoverage: params.cloudCoverage,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Error del servidor:", responseData);
        throw new Error(responseData.error || `Error al procesar la imagen (${response.status})`);
      }

      console.log("Imagen cargada exitosamente:", responseData);
      
      // Check if this index type already exists, if so replace it
      setImageDataList((prev) => {
        const existingIndex = prev.findIndex((img) => img.indexType === responseData.indexType);
        if (existingIndex !== -1) {
          // Replace existing
          const newList = [...prev];
          newList[existingIndex] = responseData;
          return newList;
        } else {
          // Add new
          return [...prev, responseData];
        }
      });
    } catch (error: any) {
      console.error("Error loading image:", error);
      alert(error.message || "Error al cargar la imagen satelital. Revisa la consola para más detalles.");
    } finally {
      setLoading(false);
    }
  };

  const handleCoordinatesClear = () => {
    setDrawnCoordinates(null);
  };

  return (
    <PlanRequired>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[#242424]">Imágenes Satelitales</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map and Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <InteractiveMap
              onPolygonComplete={handlePolygonComplete}
              areas={areas}
              selectedAreaId={selectedAreaId}
              onAreaSelect={setSelectedAreaId}
              imageDataList={imageDataList}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <MapControls
              onLoadImage={handleLoadImage}
              areas={areas}
              selectedAreaId={selectedAreaId}
              onAreaSelect={setSelectedAreaId}
              loading={loading}
              drawnCoordinates={drawnCoordinates || undefined}
            />
          </div>

          {imageDataList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-[#242424] mb-3">
                Estadísticas de Imágenes
              </h3>
              <div className="space-y-4">
                {imageDataList.map((imageData, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                    <h4 className="font-medium text-[#242424] mb-2">{imageData.indexType}</h4>
                    <div className="space-y-1 text-sm text-[#898989]">
                      <p>
                        <strong className="text-[#242424]">Valor mínimo:</strong> {imageData.minValue.toFixed(3)}
                      </p>
                      <p>
                        <strong className="text-[#242424]">Valor máximo:</strong> {imageData.maxValue.toFixed(3)}
                      </p>
                      <p>
                        <strong className="text-[#242424]">Valor promedio:</strong> {imageData.meanValue.toFixed(3)}
                      </p>
                      <p>
                        <strong className="text-[#242424]">Fecha:</strong> {new Date(imageData.date).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Area Manager Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-4 border border-gray-200">
            <AreaManager
              onAreaSelect={setSelectedAreaId}
              selectedAreaId={selectedAreaId}
              drawnCoordinates={drawnCoordinates || undefined}
              onCoordinatesClear={handleCoordinatesClear}
              onAreaCreated={loadAreas}
            />
          </div>
        </div>
      </div>
      </div>
    </PlanRequired>
  );
}
