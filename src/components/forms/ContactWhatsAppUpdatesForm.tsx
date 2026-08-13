"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SendResponse = {
  ok?: boolean;
  delivery?: "whatsapp" | "manual";
  message?: string;
  code?: string;
  fallbackUrl?: string;
  error?: string;
  details?: { field: string; message: string }[];
};

export function ContactWhatsAppUpdatesForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setSendingCode(true);
    setFallbackUrl(null);

    try {
      const res = await fetch("/api/whatsapp/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data: SendResponse = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Could not send verification code");
        return;
      }

      setCodeSent(true);
      if (data.fallbackUrl) setFallbackUrl(data.fallbackUrl);
      toast.success(data.message ?? "Verification code sent");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setConfirming(true);

    try {
      const res = await fetch("/api/whatsapp/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          code: code.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Verification failed");
        return;
      }

      setVerified(true);
      toast.success(data.message ?? "WhatsApp verified!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  if (verified) {
    return (
      <div className="rounded-xl border border-green-700/40 bg-green-950/20 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
        <h3 className="text-lg font-semibold text-white">WhatsApp verified</h3>
        <p className="mt-2 text-sm text-slate-400">
          You&apos;ll receive offers, new Yakuza models, and service updates on WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-700/30 bg-green-950/10 p-6">
      <div className="mb-4 flex items-start gap-3">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Get updates on WhatsApp</h2>
          <p className="mt-1 text-sm text-slate-400">
            Verify your number to receive offers, launches, and service reminders from us on WhatsApp.
          </p>
        </div>
      </div>

      {!codeSent ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <Input
            id="updates-name"
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="updates-phone"
            label="WhatsApp Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
            required
          />
          <Button type="submit" loading={sendingCode} className="w-full sm:w-auto">
            Send verification code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            id="updates-email"
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="updates-code"
            label="6-digit verification code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter code from WhatsApp"
            required
          />
          {fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300"
            >
              Open WhatsApp to send your code →
            </a>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={confirming}>
              Verify & subscribe
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setFallbackUrl(null);
              }}
            >
              Change number
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
