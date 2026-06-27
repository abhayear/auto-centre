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
