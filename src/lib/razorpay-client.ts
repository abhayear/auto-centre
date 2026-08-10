import Razorpay from "razorpay";
import { getRazorpayKeyId, isRazorpayConfigured } from "@/lib/booking-payment";

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  if (!isRazorpayConfigured()) return null;

  if (!client) {
    client = new Razorpay({
      key_id: getRazorpayKeyId()!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  return client;
}
