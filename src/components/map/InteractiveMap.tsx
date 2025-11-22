"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { Area } from "@/types/area";

const libraries: ("drawing" | "places")[] = ["drawing"];

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const defaultCenter = {
  lat: 20.6597, // Mexico center
  lng: -103.3496,
};

interface InteractiveMapProps {
  onPolygonComplete?: (coordinates: { lat: number; lng: number }[]) => void;
  areas?: Area[];
  selectedAreaId?: string;
  onAreaSelect?: (areaId: string) => void;
}

export default function InteractiveMap({
  onPolygonComplete,
  areas = [],
  selectedAreaId,
  onAreaSelect,
}: InteractiveMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    drawingManagerRef.current = drawingManager;
  }, []);

  const onPolygonCompleteCallback = useCallback(
    (polygon: google.maps.Polygon) => {
      const paths = polygon.getPath();
      const coordinates: { lat: number; lng: number }[] = [];

      paths.forEach((latLng) => {
        coordinates.push({
          lat: latLng.lat(),
          lng: latLng.lng(),
        });
      });

      setDrawnPolygon(coordinates);
      if (onPolygonComplete) {
        onPolygonComplete(coordinates);
      }

      // Clear the drawing after capturing coordinates
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      }
    },
    [onPolygonComplete]
  );

  const clearDrawing = useCallback(() => {
    setDrawnPolygon(null);
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  }, []);

  useEffect(() => {
    if (map && selectedAreaId && areas.length > 0) {
      const selectedArea = areas.find((a) => a.id === selectedAreaId);
      if (selectedArea && selectedArea.coordinates) {
        const bounds = new google.maps.LatLngBounds();
        const coords = selectedArea.coordinates.map((coord: any) => {
          const lat = coord.latitude || coord.lat;
          const lng = coord.longitude || coord.lng;
          const latLng = new google.maps.LatLng(lat, lng);
          bounds.extend(latLng);
          return latLng;
        });
        map.fitBounds(bounds);
      }
    }
  }, [map, selectedAreaId, areas]);

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={6}
        center={defaultCenter}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        <DrawingManager
          onLoad={onDrawingManagerLoad}
          onPolygonComplete={onPolygonCompleteCallback}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
              fillColor: "#16a34a",
              fillOpacity: 0.2,
              strokeWeight: 2,
              strokeColor: "#16a34a",
              clickable: false,
              editable: true,
              zIndex: 1,
            },
          }}
        />

        {/* Render existing areas */}
        {areas.map((area) => {
          if (!area.coordinates || area.coordinates.length === 0) return null;

          const isSelected = area.id === selectedAreaId;
          const coords = area.coordinates.map((coord: any) => ({
            lat: coord.latitude || coord.lat,
            lng: coord.longitude || coord.lng,
          }));

          return (
            <Polygon
              key={area.id}
              paths={coords}
              options={{
                fillColor: isSelected ? "#16a34a" : "#3b82f6",
                fillOpacity: 0.2,
                strokeWeight: isSelected ? 3 : 2,
                strokeColor: isSelected ? "#16a34a" : "#3b82f6",
                clickable: true,
                editable: false,
                zIndex: isSelected ? 2 : 1,
              }}
              onClick={() => {
                if (onAreaSelect && area.id) {
                  onAreaSelect(area.id);
                }
              }}
            />
          );
        })}

        {/* Render drawn polygon */}
        {drawnPolygon && (
          <Polygon
            paths={drawnPolygon}
            options={{
              fillColor: "#16a34a",
              fillOpacity: 0.3,
              strokeWeight: 3,
              strokeColor: "#16a34a",
              clickable: false,
              editable: true,
              zIndex: 3,
            }}
          />
        )}
      </GoogleMap>

      {drawnPolygon && (
        <button
          onClick={clearDrawing}
          className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Limpiar dibujo
        </button>
      )}
    </div>
  );
}

