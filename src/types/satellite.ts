import { IndexType } from "./report";

export interface SatelliteImageRequest {
  coordinates: { lat: number; lng: number }[];
  indexType: IndexType;
  cloudCoverage: number; // 0-100
  startDate: string; // ISO date string
  endDate: string; // ISO date string
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

