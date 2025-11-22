import { GeoPoint } from "firebase/firestore";

export interface Area {
  id?: string;
  userId: string;
  name: string;
  coordinates: GeoPoint[] | { lat: number; lng: number }[]; // Polygon coordinates
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface AreaFormData {
  name: string;
  coordinates: { lat: number; lng: number }[];
}

