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
  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/about");
  revalidatePath("/service-schedule");
  revalidatePath("/vehicles");
  revalidatePath("/services");
  revalidatePath("/book-service");
}
