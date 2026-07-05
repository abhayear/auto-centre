export const DEFAULT_VEHICLE_IMAGE = "/images/placeholder-scooter.svg";

export function isLocalUpload(url: string): boolean {
  return url.startsWith("/uploads/") || url.startsWith("/images/");
}
