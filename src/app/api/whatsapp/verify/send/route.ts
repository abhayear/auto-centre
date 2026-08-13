import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, whatsappOtpSendSchema } from "@/lib/validators";
import {
  OTP_EXPIRY_MINUTES,
  generateOtpCode,
  normalizeSubscriptionPhone,
  sendOtpToPhone,
  buildWhatsAppFallbackLink,
} from "@/lib/whatsapp-verification";
import { isWhatsAppConfigured } from "@/lib/whatsapp-notify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = whatsappOtpSendSchema.parse(body);
    const localPhone = normalizeSubscriptionPhone(data.phone);

    if (!localPhone) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }

    const phoneKey = localPhone;
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.whatsAppOtp.deleteMany({ where: { phone: phoneKey } });
    await prisma.whatsAppOtp.create({
      data: { phone: phoneKey, code, expiresAt },
    });

    if (isWhatsAppConfigured()) {
      const result = await sendOtpToPhone(phoneKey, code);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error ?? "Failed to send WhatsApp verification code" },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        delivery: "whatsapp",
        message: "Verification code sent to your WhatsApp.",
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      });
    }

    return NextResponse.json({
      ok: true,
      delivery: "manual",
      message:
        "WhatsApp auto-send is not configured yet. Use the button below to send us your code on WhatsApp.",
      code,
      fallbackUrl: buildWhatsAppFallbackLink(code),
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
