import { BUSINESS_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type BusinessHour = {
  day: string;
  hours: string;
};

export type SiteSettingsData = {
  businessHours: BusinessHour[];
  noticeText: string | null;
  noticeActive: boolean;
};

const defaultSettings: SiteSettingsData = {
  businessHours: BUSINESS_HOURS,
  noticeText: null,
  noticeActive: false,
};

export function parseBusinessHours(raw: string): BusinessHour[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultSettings.businessHours;

    const hours = parsed
      .filter(
        (item): item is BusinessHour =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as BusinessHour).day === "string" &&
          typeof (item as BusinessHour).hours === "string" &&
          (item as BusinessHour).day.trim().length > 0 &&
          (item as BusinessHour).hours.trim().length > 0
      )
      .map((item) => ({ day: item.day.trim(), hours: item.hours.trim() }));

    return hours.length > 0 ? hours : defaultSettings.businessHours;
  } catch {
    return defaultSettings.businessHours;
  }
}

export function serializeBusinessHours(hours: BusinessHour[]): string {
  return JSON.stringify(hours);
}

export async function getSiteSettings(): Promise<SiteSettingsData> {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) return defaultSettings;

  return {
    businessHours: parseBusinessHours(row.businessHours),
    noticeText: row.noticeText,
    noticeActive: row.noticeActive,
  };
}

export function getActiveNotice(settings: SiteSettingsData): string | null {
  if (!settings.noticeActive) return null;
  const text = settings.noticeText?.trim();
  return text ? text : null;
}
