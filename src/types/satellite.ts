import { IndexType } from "./report";

export interface SatelliteImageRequest {
  coordinates: { lat: number; lng: number }[];
  indexType: IndexType;
  cloudCoverage: number; // 0-100
  // Date parameters removed - always fetch most recent data
}

export interface SatelliteImageResponse {
  imageUrl?: string;
  tileUrl?: string;
  minValue: number;
  maxValue: number;
  meanValue: number;
  date: string;
  indexType: IndexType;
}

