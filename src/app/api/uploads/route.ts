import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isUploadCategory, saveUploadedImage } from "@/lib/image-upload";

 async function postHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const categoryRaw = String(formData.get("category") ?? "vehicles");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!isUploadCategory(categoryRaw)) {
      return NextResponse.json({ error: "Invalid upload category" }, { status: 400 });
    }

    const url = await saveUploadedImage(file, categoryRaw);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = observeRoute(postHandler);
