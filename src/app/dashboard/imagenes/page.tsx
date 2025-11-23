"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas } from "@/lib/firestore/areas";
import InteractiveMap from "@/components/map/InteractiveMap";
import MapControls from "@/components/map/MapControls";
import AreaManager from "@/components/areas/AreaManager";
import FirestoreTest from "@/components/debug/FirestoreTest";
import FirestoreConnectionTest from "@/components/debug/FirestoreConnectionTest";
import FirestoreSetupChecker from "@/components/debug/FirestoreSetupChecker";
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
  const [imageData, setImageData] = useState<SatelliteImageResponse | null>(null);

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
    startDate: string;
    endDate: string;
  }) => {
    setLoading(true);
    setImageData(null);

    try {
      const coordinates = params.coordinates || [];
      if (coordinates.length < 3) {
        alert("Se requieren al menos 3 puntos para un polígono");
        setLoading(false);
        return;
      }

      console.log("Cargando imagen satelital con parámetros:", {
        coordinates: coordinates.length,
        indexType: params.indexType,
        cloudCoverage: params.cloudCoverage,
        startDate: params.startDate,
        endDate: params.endDate,
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
          startDate: params.startDate,
          endDate: params.endDate,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Error del servidor:", responseData);
        throw new Error(responseData.error || `Error al procesar la imagen (${response.status})`);
      }

      console.log("Imagen cargada exitosamente:", responseData);
      setImageData(responseData);
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Imágenes Satelitales</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map and Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <InteractiveMap
              onPolygonComplete={handlePolygonComplete}
              areas={areas}
              selectedAreaId={selectedAreaId}
              onAreaSelect={setSelectedAreaId}
              tileUrl={imageData?.tileUrl}
              indexType={imageData?.indexType}
              minValue={imageData?.minValue}
              maxValue={imageData?.maxValue}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <MapControls
              onLoadImage={handleLoadImage}
              areas={areas}
              selectedAreaId={selectedAreaId}
              onAreaSelect={setSelectedAreaId}
              loading={loading}
              drawnCoordinates={drawnCoordinates || undefined}
            />
          </div>

          {imageData && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Estadísticas de la Imagen
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Valor mínimo:</strong> {imageData.minValue.toFixed(3)}
                </p>
                <p>
                  <strong>Valor máximo:</strong> {imageData.maxValue.toFixed(3)}
                </p>
                <p>
                  <strong>Valor promedio:</strong> {imageData.meanValue.toFixed(3)}
                </p>
                <p>
                  <strong>Fecha:</strong> {new Date(imageData.date).toLocaleDateString("es-MX")}
                </p>
              </div>
            </div>
          )}

          {/* Temporary Firestore Debug Component */}
          <div className="space-y-4">
        <FirestoreSetupChecker />
        <FirestoreConnectionTest />
        <FirestoreTest />
      </div>
        </div>

        {/* Area Manager Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
            <AreaManager
              onAreaSelect={setSelectedAreaId}
              selectedAreaId={selectedAreaId}
              drawnCoordinates={drawnCoordinates || undefined}
              onCoordinatesClear={handleCoordinatesClear}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
