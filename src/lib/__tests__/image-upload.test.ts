import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  isAllowedVehicleImage,
  isUploadCategory,
  validateImageFile,
  validateTrainingFile,
} from "@/lib/image-upload";

describe("validateImageFile", () => {
  it("accepts allowed image types under size limit", () => {
    const file = new File(["x"], "scooter.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects unsupported types", () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateImageFile(file)).toMatch(/JPEG/);
  });
});

describe("validateTrainingFile", () => {
  it("accepts PDF files under the size limit", () => {
    const file = new File(["x"], "handbook.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateTrainingFile(file)).toBeNull();
  });
});

describe("isUploadCategory", () => {
  it("accepts training uploads", () => {
    expect(isUploadCategory("training")).toBe(true);
  });
});

describe("isAllowedVehicleImage", () => {
  it("accepts uploaded paths and https urls", () => {
    expect(isAllowedVehicleImage("/uploads/vehicles/abc.jpg")).toBe(true);
    expect(isAllowedVehicleImage("https://example.com/a.jpg")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isAllowedVehicleImage("not-a-url")).toBe(false);
  });
});

describe("ALLOWED_IMAGE_TYPES", () => {
  it("includes common web formats", () => {
    expect(ALLOWED_IMAGE_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has("image/webp")).toBe(true);
  });
});
