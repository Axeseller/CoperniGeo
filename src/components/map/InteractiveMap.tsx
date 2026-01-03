"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { Area } from "@/types/area";
import { SatelliteImageResponse } from "@/types/satellite";

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
  imageDataList?: SatelliteImageResponse[];
  disableDrawing?: boolean;
}

export default function InteractiveMap({
  onPolygonComplete,
  areas = [],
  selectedAreaId,
  onAreaSelect,
  imageDataList = [],
  disableDrawing = false,
}: InteractiveMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const overlaysRef = useRef<Map<string, google.maps.ImageMapType>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    // Clean up drawing manager on unmount
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
      drawingManagerRef.current = null;
    }
    setMap(null);
  }, []);

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    // Clean up any existing drawing manager
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
      drawingManagerRef.current = null;
    }
    drawingManagerRef.current = drawingManager;
    
    // Ensure only one drawing control is visible - remove duplicates
    setTimeout(() => {
      // Find all drawing controls by looking for the drawing control container
      const mapContainer = mapContainerRef.current?.querySelector('.relative') || document;
      const allControls = mapContainer.querySelectorAll('.gm-style .gmnoprint');
      const drawingControls: HTMLElement[] = [];
      
      allControls.forEach((control) => {
        const htmlControl = control as HTMLElement;
        // Check if it's a drawing control by looking for polygon/drawing related elements
        const hasPolygonIcon = htmlControl.querySelector('div[title*="Polygon"], div[title*="Drawing"]');
        const title = htmlControl.getAttribute('title') || '';
        const innerHTML = htmlControl.innerHTML || '';
        
        if (hasPolygonIcon || title.includes('Drawing') || title.includes('Polygon') || 
            (innerHTML.includes('polygon') && innerHTML.includes('path'))) {
          drawingControls.push(htmlControl);
        }
      });
      
      // If we have more than one, remove the one on the right (closest to right edge)
      if (drawingControls.length > 1) {
        // Find the control that's positioned on the right side
        let rightmostControl: HTMLElement | null = null;
        let rightmostPosition = -1;
        
        drawingControls.forEach((control) => {
          const rect = control.getBoundingClientRect();
          const rightPosition = rect.right;
          if (rightPosition > rightmostPosition) {
            rightmostPosition = rightPosition;
            rightmostControl = control;
          }
        });
        
        // Remove the rightmost control
        if (rightmostControl) {
          rightmostControl.style.display = 'none';
          rightmostControl.remove();
        }
      }
    }, 300);
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

  const handleAddressSearch = useCallback(async () => {
    if (!map || !searchAddress.trim()) return;

    try {
      // Use Places API (New) via REST
      const autocompleteResponse = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: searchAddress }),
      });

      if (!autocompleteResponse.ok) {
        console.error("Failed to get autocomplete suggestions");
        return;
      }

      const autocompleteData = await autocompleteResponse.json();
      
      // Get the first suggestion
      const firstSuggestion = autocompleteData?.suggestions?.[0]?.placePrediction;
      if (!firstSuggestion?.placeId) {
        return;
      }

      // Get place details
      const detailsResponse = await fetch("/api/places/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ placeId: firstSuggestion.placeId }),
      });

      if (!detailsResponse.ok) {
        console.error("Failed to get place details");
        return;
      }

      const placeData = await detailsResponse.json();
      
      // Center map on the selected place
      if (placeData.location) {
        const lat = placeData.location.latitude;
        const lng = placeData.location.longitude;
        const location = new google.maps.LatLng(lat, lng);
        map.setCenter(location);
        map.setZoom(15);
      }
      
      // If viewport is available, use it
      if (placeData.viewport) {
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(
            placeData.viewport.low.latitude,
            placeData.viewport.low.longitude
          ),
          new google.maps.LatLng(
            placeData.viewport.high.latitude,
            placeData.viewport.high.longitude
          )
        );
        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error("Error searching for address:", error);
    }
  }, [map, searchAddress]);

  const handleCoordinateSearch = useCallback(() => {
    if (!map) return;

    // Parse coordinates (lat, lng) or (lng, lat)
    const coordPattern = /(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)/;
    const match = searchAddress.match(coordPattern);
    
    if (!match) {
      return;
    }

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    const location = new google.maps.LatLng(lat, lng);
    map.setCenter(location);
    map.setZoom(15);
  }, [map, searchAddress]);

  const handleSearch = useCallback(() => {
    // Check if it's coordinates
    if (/^-?\d+\.?\d*\s*[,;]\s*-?\d+\.?\d*/.test(searchAddress.trim())) {
      handleCoordinateSearch();
    } else {
      handleAddressSearch();
    }
  }, [searchAddress, handleCoordinateSearch, handleAddressSearch]);

  const toggleFullscreen = useCallback(() => {
    // Check if we're on mobile (screen width < 768px)
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // On mobile, use CSS-based fullscreen (fixed positioning)
      const newFullscreenState = !isFullscreen;
      setIsFullscreen(newFullscreenState);
      
      // Prevent body scroll and touch events when in fullscreen
      if (newFullscreenState) {
        // Store original values
        const scrollY = window.scrollY;
        
        // Prevent scrolling - use a wrapper approach that doesn't affect positioning
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
        document.body.style.touchAction = 'none';
        
        // Also prevent html scrolling
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100vh';
        document.documentElement.style.touchAction = 'none';
        
        // Store scroll position for restoration
        (document.body as any).__fullscreenScrollY = scrollY;
      } else {
        // Restore scrolling
        const scrollY = (document.body as any).__fullscreenScrollY || 0;
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.touchAction = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
        document.documentElement.style.touchAction = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
        delete (document.body as any).__fullscreenScrollY;
      }
      
      // Trigger map resize after a short delay to ensure proper rendering
      setTimeout(() => {
        if (map) {
          google.maps.event.trigger(map, 'resize');
        }
      }, 100);
    } else {
      // On desktop, use native fullscreen API
      const mapContainer = mapContainerRef.current?.querySelector('.relative') as HTMLElement;
      if (!mapContainer) return;

      // Check current fullscreen state
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        // Enter fullscreen - use the map container div
        const element = mapContainer;
        if (element.requestFullscreen) {
          element.requestFullscreen().catch((err) => {
            console.error("Error entering fullscreen:", err);
          });
        } else if ((element as any).webkitRequestFullscreen) {
          (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          (element as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => {
            console.error("Error exiting fullscreen:", err);
          });
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    }
  }, [isFullscreen, map]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement || !!(document as any).mozFullScreenElement || !!(document as any).msFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      // Cleanup: restore body overflow on unmount
      document.body.style.overflow = '';
    };
  }, []);

  // Cleanup body overflow when fullscreen state changes
  useEffect(() => {
    if (!isFullscreen) {
      const scrollY = (document.body as any).__fullscreenScrollY || 0;
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.touchAction = '';
      window.scrollTo(0, scrollY);
      delete (document.body as any).__fullscreenScrollY;
    }
  }, [isFullscreen]);

  // Toggle visibility of an index
  const toggleIndexVisibility = (indexType: string) => {
    setVisibleIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indexType)) {
        newSet.delete(indexType);
      } else {
        newSet.add(indexType);
      }
      return newSet;
    });
  };

  // Manage satellite tile overlays
  useEffect(() => {
    if (!map) return;

    // Remove all existing overlays
    while (map.overlayMapTypes.getLength() > 0) {
      map.overlayMapTypes.removeAt(0);
    }
    overlaysRef.current.clear();

    // Add overlays for visible indices
    imageDataList.forEach((imageData) => {
      if (visibleIndices.has(imageData.indexType) && imageData.tileUrl) {
        const overlay = new google.maps.ImageMapType({
          getTileUrl: (coord, zoom) => {
            if (!imageData.tileUrl || coord.x < 0 || coord.y < 0) return "";
            const maxCoord = 1 << zoom;
            if (coord.x >= maxCoord || coord.y >= maxCoord) return "";
            
            // Earth Engine tile URL format uses {x}, {y}, {z} or uses base URL with query params
            let url = imageData.tileUrl;
            if (url.includes("{x}") || url.includes("{y}") || url.includes("{z}")) {
              url = url
                .replace(/{x}/g, coord.x.toString())
                .replace(/{y}/g, coord.y.toString())
                .replace(/{z}/g, zoom.toString());
            } else {
              url = `${imageData.tileUrl}&x=${coord.x}&y=${coord.y}&z=${zoom}`;
            }
            
            return url;
          },
          tileSize: new google.maps.Size(256, 256),
          maxZoom: 18,
          minZoom: 0,
          name: imageData.indexType,
          opacity: 0.7,
        });

        map.overlayMapTypes.push(overlay);
        overlaysRef.current.set(imageData.indexType, overlay);
      }
    });

    return () => {
      // Cleanup on unmount
      const currentOverlays = overlaysRef.current;
      if (map) {
        while (map.overlayMapTypes.getLength() > 0) {
          map.overlayMapTypes.removeAt(0);
        }
      }
      currentOverlays.clear();
    };
  }, [map, imageDataList, visibleIndices]);

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

  // Remove duplicate drawing controls and adjust position on mobile
  useEffect(() => {
    if (!map || disableDrawing) return;
    
    // Add CSS to adjust drawing control position - below map type control on both desktop and mobile
    // Map type control is at LEFT_TOP, drawing control should be directly below it
    const styleId = 'drawing-control-mobile-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .gm-style .gmnoprint[title*="Drawing"],
        .gm-style .gmnoprint[title*="Polygon"],
        .gm-style .gmnoprint:has(div[title*="Polygon"]),
        .gm-style .gmnoprint:has(div[title*="Drawing"]) {
          position: absolute !important;
          left: 11px !important;
          top: 80px !important;
          right: auto !important;
          transform: none !important;
          margin: 0 !important;
          z-index: 99 !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    const removeDuplicates = () => {
      // Wait for controls to render
      setTimeout(() => {
        // Find all potential drawing controls
        const allControls = document.querySelectorAll('.gm-style .gmnoprint');
        const drawingControls: HTMLElement[] = [];
        
        allControls.forEach((control) => {
          const htmlControl = control as HTMLElement;
          const innerHTML = htmlControl.innerHTML || '';
          // Drawing controls typically contain path elements for polygon icon
          if (innerHTML.includes('M12 2') || innerHTML.includes('polygon') || 
              htmlControl.querySelector('div[title*="Polygon"]') ||
              htmlControl.querySelector('div[title*="Drawing"]')) {
            drawingControls.push(htmlControl);
          }
        });
        
        // If we have more than one, remove the rightmost one
        if (drawingControls.length > 1) {
          let rightmostControl: HTMLElement | null = null;
          let rightmostPosition = -1;
          
          drawingControls.forEach((control) => {
            const rect = control.getBoundingClientRect();
            if (rect.right > rightmostPosition) {
              rightmostPosition = rect.right;
              rightmostControl = control;
            }
          });
          
          if (rightmostControl) {
            rightmostControl.remove();
          }
        }
      }, 500);
    };
    
    removeDuplicates();
    // Also check after map resize events
    const listener = google.maps.event.addListener(map, 'idle', removeDuplicates);
    
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, disableDrawing]);

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <div className="space-y-4" ref={mapContainerRef}>
      {/* Address/Coordinate Search - Outside map */}
      {!disableDrawing && (
        <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Buscar dirección, coordenadas o código postal"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent text-sm text-[#242424] bg-white placeholder:text-gray-500"
          />
          <button
            onClick={handleSearch}
            className="bg-[#5db815] text-white px-4 py-2 rounded-md hover:bg-[#4a9a11] transition-colors text-sm font-medium"
          >
            Buscar
          </button>
        </div>
      )}

      {/* Map Container */}
      <div 
        className={isFullscreen ? 'fixed z-[9999] bg-white' : 'relative'}
        style={isFullscreen ? { 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0,
          touchAction: 'auto', // Allow touch on map itself
          position: 'fixed', // Explicitly set position
        } : undefined}
        onTouchMove={(e) => {
          // Prevent page scroll when touching the fullscreen map container
          if (isFullscreen) {
            e.stopPropagation();
          }
        }}
      >
        {/* Mobile Fullscreen Button - Top right corner */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="md:hidden absolute top-4 right-4 z-[100] bg-white p-2 rounded-lg shadow-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Pantalla completa"
          type="button"
        >
          {isFullscreen ? (
            <svg className="w-6 h-6 text-[#242424]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-[#242424]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
        <GoogleMap
          mapContainerStyle={isFullscreen ? { width: "100vw", height: "100vh" } : mapContainerStyle}
          zoom={6}
          center={defaultCenter}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          options={{
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: google.maps.ControlPosition.LEFT_TOP,
            },
            streetViewControl: false,
            fullscreenControl: true, // Enable fullscreen control on desktop
            fullscreenControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP,
            },
          }}
        >
        {!disableDrawing && (
        <DrawingManager
          key="drawing-manager"
          onLoad={onDrawingManagerLoad}
          onPolygonComplete={onPolygonCompleteCallback}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.LEFT_TOP,
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
        )}

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

      <div className="absolute top-16 right-4 flex flex-col gap-2">
        {imageDataList.map((imageData) => {
          const isVisible = visibleIndices.has(imageData.indexType);
          return (
            <button
              key={imageData.indexType}
              onClick={() => toggleIndexVisibility(imageData.indexType)}
              className={`px-4 py-2 rounded text-sm font-medium shadow-lg ${
                isVisible
                  ? "bg-[#5db815] text-white"
                  : "bg-white text-[#242424] border border-gray-300"
              } hover:bg-[#4a9a11] hover:text-white transition-colors`}
            >
              {isVisible ? `Ocultar ${imageData.indexType}` : `Mostrar ${imageData.indexType}`}
            </button>
          );
        })}
        {drawnPolygon && (
          <button
            onClick={clearDrawing}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm shadow-lg"
          >
            Limpiar dibujo
          </button>
        )}
      </div>

      {/* Color Legend */}
      {visibleIndices.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <h4 className="text-sm font-semibold text-[#242424] mb-2">
            {visibleIndices.size === 1 ? "Índice Visible" : "Índices Visibles"}
          </h4>
          <div className="space-y-3">
            {imageDataList
              .filter((imageData) => visibleIndices.has(imageData.indexType))
              .map((imageData) => (
                <div key={imageData.indexType} className="border-b border-gray-200 last:border-b-0 pb-2 last:pb-0">
                  <p className="text-xs font-semibold text-[#242424] mb-1">{imageData.indexType}</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-3 rounded flex-1 ${
                        imageData.indexType === "NDVI" || imageData.indexType === "NDRE" || imageData.indexType === "MSAVI"
                          ? "bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                          : imageData.indexType === "NDWI"
                          ? "bg-gradient-to-r from-amber-800 via-yellow-400 via-cyan-400 to-blue-500"
                          : imageData.indexType === "PSRI"
                          ? "bg-gradient-to-r from-green-500 via-yellow-400 via-orange-500 to-red-500"
                          : "bg-gradient-to-r from-blue-500 via-cyan-500 via-yellow-500 via-orange-500 to-red-500"
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#898989] mt-1">
                    <span>{imageData.minValue.toFixed(3)}</span>
                    <span>{imageData.maxValue.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            <p className="text-xs text-[#898989] mt-2 pt-2 border-t border-gray-200">
              <span className="text-red-600">Rojo</span> = Bajo |{" "}
              <span className="text-yellow-600">Amarillo</span> = Medio |{" "}
              <span className="text-[#5db815]">Verde</span> = Alto
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

