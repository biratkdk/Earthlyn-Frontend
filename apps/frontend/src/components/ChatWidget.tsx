"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm Leaf 🌿, your Earthlyn eco-guide. Ask me anything — products, sustainability tips, or help with your account.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    const withThinking: Message[] = [...next, { role: "assistant", content: "" }];
    setMessages(withThinking);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Unknown error");
      }

      setMessages([...next, { role: "assistant", content: data.text ?? "" }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages([
        ...next,
        { role: "assistant", content: `Sorry — ${msg} Please try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open Leaf AI chat"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[var(--accent)] text-white shadow-2xl flex items-center justify-center hover:bg-[var(--accent)]/90 transition-all hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-black/[0.08] bg-white shadow-2xl shadow-black/15 flex flex-col overflow-hidden"
          style={{ height: "480px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--accent)] text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🌿</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-none">Leaf</p>
              <p className="text-[11px] text-white/70 mt-0.5">Earthlyn AI assistant</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" title="Online" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs shrink-0 mt-0.5 mr-2">🌿</div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white rounded-br-sm"
                      : "bg-[var(--muted)] text-[var(--ink)] rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && loading && i === messages.length - 1 && msg.content === "" && (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-black/[0.07] px-3 py-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="Ask me anything…"
              disabled={loading}
              className="flex-1 text-sm rounded-xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-50 bg-white"
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
