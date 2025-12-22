export type LeadStatus = 'lead' | 'snapshot_requested' | 'needs_manual_mapping';

export interface Lead {
  id: string;
  email: string;
  farmName?: string;
  country: string;
  coordinates?: { lat: number; lng: number }[]; // Same format as areas
  status: LeadStatus;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface LeadFormData {
  email: string;
  farmName?: string;
  country: string;
}

