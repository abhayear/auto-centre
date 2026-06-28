import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { NoticeBanner } from "@/components/layout/NoticeBanner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <NoticeBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
