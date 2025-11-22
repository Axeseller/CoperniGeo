export type IndexType = "NDVI" | "NDRE" | "EVI";
export type ReportFrequency = "daily" | "weekly" | "monthly";
export type ReportStatus = "active" | "paused";
export type DeliveryMethod = "email" | "whatsapp";

export interface Report {
  id?: string;
  userId: string;
  areaIds: string[];
  indices: IndexType[];
  cloudCoverage: number; // 0-100
  frequency: ReportFrequency;
  deliveryMethod: DeliveryMethod;
  email: string;
  status: ReportStatus;
  lastGenerated?: Date | any;
  nextRun: Date | any;
  createdAt: Date | any;
}

export interface ReportFormData {
  areaIds: string[];
  indices: IndexType[];
  cloudCoverage: number;
  frequency: ReportFrequency;
  email: string;
}

