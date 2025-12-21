export type PlanType = "basic" | "professional" | "enterprise";

export interface UserPlan {
  id: string;
  userId: string;
  planType: PlanType;
  startDate: Date | any;
  endDate: Date | any;
  status: "active" | "expired" | "cancelled";
  feedbackAgreement?: boolean;
  cropType?: string;
  hectares?: number;
  createdAt: Date | any;
  updatedAt: Date | any;
}

