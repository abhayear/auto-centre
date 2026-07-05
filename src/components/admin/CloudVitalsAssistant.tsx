"use client";

import { useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  suggestedPrompts: string[];
};

function renderMarkdownLite(text: string) {
  return text.split("\n").map((line, index) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={index} className={line === "" ? "h-2" : "text-sm leading-relaxed text-slate-300"}>
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

export function CloudVitalsAssistant({ suggestedPrompts }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your **Cloud Vitals advisor**. Ask about scaling Vercel or Neon, handling traffic spikes, or improving performance. I use your live metrics to tailor answers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>(suggestedPrompts);
  const [usedAi, setUsedAi] = useState<boolean | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/cloud-vitals/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.filter((m) => m.role === "user" || m.role === "assistant"),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error ?? "Could not get a recommendation. Try again.",
          },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (Array.isArray(data.followUps)) {
        setFollowUps(data.followUps);
      }
      setUsedAi(Boolean(data.usedAi));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — check your connection and retry." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <div className="flex h-[min(720px,calc(100vh-8rem))] flex-col rounded-xl border border-slate-700/50 bg-slate-950/80 shadow-xl">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <div className="rounded-lg bg-red-600/20 p-2 text-red-400">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">AI advisor</p>
          <p className="truncate text-xs text-slate-500">
            {usedAi === true
              ? "Powered by OpenAI + live vitals"
              : usedAi === false
                ? "Smart recommendations from live vitals"
                : "Scale, load & performance guidance"}
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" ? (
              <div className="mt-0.5 shrink-0 rounded-md bg-slate-800 p-1.5 text-red-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
            ) : null}
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 ${
                message.role === "user"
                  ? "bg-red-600/25 text-white"
                  : "border border-slate-800 bg-slate-900/80"
              }`}
            >
              {message.role === "assistant" ? (
                renderMarkdownLite(message.content)
              ) : (
                <p className="text-sm text-white">{message.content}</p>
              )}
            </div>
            {message.role === "user" ? (
              <div className="mt-0.5 shrink-0 rounded-md bg-slate-800 p-1.5 text-slate-400">
                <User className="h-3.5 w-3.5" />
              </div>
            ) : null}
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing vitals…
          </div>
        ) : null}
      </div>

      {followUps.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-800/80 px-3 py-2">
          {followUps.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => void sendMessage(prompt)}
              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-red-500/40 hover:text-white disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex gap-2 border-t border-slate-800 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about scaling, load, or performance…"
          disabled={loading}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none disabled:opacity-50"
        />
        <Button type="submit" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
