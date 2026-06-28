import { revalidatePath } from "next/cache";

export function revalidatePublicServicePages() {
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/book-service");
}

export function revalidatePublicVehiclePages() {
  revalidatePath("/");
  revalidatePath("/vehicles");
}

export function revalidatePublicCareerPages() {
  revalidatePath("/careers");
}

export function revalidatePublicSitePages() {
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/about");
}
