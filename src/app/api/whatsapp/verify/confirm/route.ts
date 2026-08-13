import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, whatsappOtpConfirmSchema } from "@/lib/validators";
import {
  buildAdminNewSubscriberMessage,
  isOtpExpired,
  normalizeSubscriptionPhone,
  sendWelcomeToSubscriber,
} from "@/lib/whatsapp-verification";
import { isWhatsAppConfigured, sendWhatsAppText, formatWhatsAppRecipient } from "@/lib/whatsapp-notify";
import { SITE_PHONES } from "@/lib/constants";

async function notifyAdminsNewSubscriber(input: {
  name: string;
  phone: string;
  email?: string | null;
}) {
  if (!isWhatsAppConfigured()) return;

  const message = buildAdminNewSubscriberMessage(input);
  const recipients =
    process.env.WHATSAPP_NOTIFY_NUMBERS?.split(",").map((entry) =>
      formatWhatsAppRecipient(entry.trim()),
    ) ?? SITE_PHONES.map((phone) => formatWhatsAppRecipient(phone));

  await Promise.all(
    recipients.map(async (recipient) => {
      const result = await sendWhatsAppText(recipient, message);
      if (!result.ok) {
        console.error(`Admin subscriber alert failed for ${recipient}:`, result.error);
      }
    }),
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = whatsappOtpConfirmSchema.parse(body);
    const localPhone = normalizeSubscriptionPhone(data.phone);

    if (!localPhone) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }

    const otp = await prisma.whatsAppOtp.findFirst({
      where: { phone: localPhone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.code !== data.code.trim()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if (isOtpExpired(otp.expiresAt)) {
      return NextResponse.json({ error: "Verification code expired. Request a new one." }, { status: 400 });
    }

    const email = data.email?.trim() || null;

    const subscription = await prisma.updateSubscription.upsert({
      where: { phone: localPhone },
      create: {
        name: data.name.trim(),
        phone: localPhone,
        email,
        whatsappVerified: true,
        verifiedAt: new Date(),
        active: true,
      },
      update: {
        name: data.name.trim(),
        email,
        whatsappVerified: true,
        verifiedAt: new Date(),
        active: true,
      },
    });

    await prisma.whatsAppOtp.deleteMany({ where: { phone: localPhone } });

    if (isWhatsAppConfigured()) {
      sendWelcomeToSubscriber(localPhone, subscription.name).catch((error) => {
        console.error("Welcome WhatsApp failed:", error);
      });
    }

    notifyAdminsNewSubscriber({
      name: subscription.name,
      phone: subscription.phone,
      email: subscription.email,
    }).catch((error) => {
      console.error("Admin subscriber alert failed:", error);
    });

    return NextResponse.json({
      ok: true,
      message: "WhatsApp verified! You'll receive updates from Auto Galaxy.",
      subscription: {
        id: subscription.id,
        name: subscription.name,
        phone: subscription.phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to verify WhatsApp number" }, { status: 500 });
  }
}
