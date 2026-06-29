import { DevDbBanner } from "@/components/layout/DevDbBanner";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { NoticeBanner } from "@/components/layout/NoticeBanner";
import { SiteAnalyticsRecorder } from "@/components/analytics/SiteAnalyticsRecorder";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteAnalyticsRecorder />
      <Navbar />
      <DevDbBanner />
      <NoticeBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
