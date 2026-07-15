import {
  DEFAULT_SERVICE_SCHEDULE_CONTENT,
  DEFAULT_SERVICE_SCHEDULE_SUMMARY,
  DEFAULT_SERVICE_SCHEDULE_TITLE,
} from "@/lib/service-schedule-default";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";

export type ServiceScheduleData = {
  title: string;
  summary: string | null;
  content: string;
  published: boolean;
};

const defaultSchedule: ServiceScheduleData = {
  title: DEFAULT_SERVICE_SCHEDULE_TITLE,
  summary: DEFAULT_SERVICE_SCHEDULE_SUMMARY,
  content: DEFAULT_SERVICE_SCHEDULE_CONTENT,
  published: true,
};

export async function getServiceSchedule(): Promise<ServiceScheduleData> {
  const row = await safeDbQuery(
    () =>
      prisma.serviceScheduleContent.findUnique({
        where: { id: "default" },
      }),
    null
  );

  if (!row) return defaultSchedule;

  return {
    title: row.title,
    summary: row.summary,
    content: row.content,
    published: row.published,
  };
}

export async function getPublishedServiceSchedule(): Promise<ServiceScheduleData | null> {
  const schedule = await getServiceSchedule();
  if (!schedule.published) return null;
  return schedule;
}

export { defaultSchedule };
