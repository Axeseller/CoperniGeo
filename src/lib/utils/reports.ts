import { ReportFrequency } from "@/types/report";

/**
 * Get display label for report frequency
 */
export function getFrequencyLabel(frequency: ReportFrequency): string {
  switch (frequency) {
    case "3days":
      return "Cada 3 días";
    case "5days":
      return "Cada 5 días";
    case "weekly":
      return "Semanal";
    case "monthly":
      return "Mensual";
    default:
      return frequency;
  }
}

