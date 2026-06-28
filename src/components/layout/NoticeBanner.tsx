import { Bell } from "lucide-react";
import { getActiveNotice, getSiteSettings } from "@/lib/site-settings";

export async function NoticeBanner() {
  const settings = await getSiteSettings();
  const notice = getActiveNotice(settings);

  if (!notice) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-600/30 bg-amber-950/80 px-4 py-2.5 text-center text-sm text-amber-100"
    >
      <p className="mx-auto flex max-w-4xl items-center justify-center gap-2">
        <Bell className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <span>{notice}</span>
      </p>
    </div>
  );
}
