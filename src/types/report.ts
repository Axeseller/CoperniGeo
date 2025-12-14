export type IndexType = "NDVI" | "NDRE" | "EVI";
export type ReportFrequency = "3days" | "5days" | "weekly" | "monthly";
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
  email?: string; // Optional - required for email delivery
  phoneNumber?: string; // Optional - required for WhatsApp delivery
  name?: string; // Optional - user-defined report name
  pdfUrl?: string; // Optional - URL to PDF in Firebase Storage
  imageUrls?: Array<{areaName: string; indexType: string; url: string}>; // Optional - URLs to images in Firebase Storage
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
  deliveryMethod: DeliveryMethod;
  email?: string;
  phoneNumber?: string;
  name?: string;
}

