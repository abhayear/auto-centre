import type { Metadata } from "next";
import { WorkBoard } from "@/components/admin/WorkBoard";

export const metadata: Metadata = {
  title: "Work",
};

export default function WorkPage() {
  return <WorkBoard />;
}
