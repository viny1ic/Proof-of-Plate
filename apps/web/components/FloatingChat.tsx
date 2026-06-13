"use client";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; time?: string };

const QUICK_QS = [
  "Is this lactose-free?",
  "Were pesticides used?",
  "Is this batch recalled?",
  "What is the EU DPP status?",
];

function nowStr() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Render assistant text — turn bare URLs into clickable links */
function renderLinks(text: string): ReactNode[] {
  const urlRe = /https?:\/\/[^\s\)\]]+/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[0].replace(/[.,;!?]+$/, "");
    const label = url.includes("suiscan") ? "Sui Explorer"
                : url.includes("hashscan") ? "HashScan"
                : url.includes("hedera") ? "Hedera"
                : "View";
    parts.push(
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="pp-msg-link">
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Props = {
  batchId: string;
  verificationContext?: string;
};

export function FloatingChat({ batchId, verificationContext }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! Ask me anything about this product — ingredients, certifications, traceability, or food safety.",
      time: nowStr(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  async function ask(value: string) {
    const q = value.trim();
    if (!q || loading) return;
    setLoading(true);
    const next: Message[] = [...messages, { role: "user", content: q, time: nowStr() }];
    setMessages(next);
    setQuestion("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          batchId,
          question: q,
          history: next.slice(1, -1),
          context: verificationContext,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "HTTP " + res.status);
      setMessages(c => [...c, { role: "assistant", content: data.answer, time: nowStr() }]);
      if (!open) setUnread(u => u + 1);
    } catch (err) {
      setMessages(c => [...c, { role: "assistant", content: "Something went wrong: " + (err as Error).message, time: nowStr() }]);
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className={"pp-fc" + (open ? " open" : "")}>
      {open && (
        <div className="pp-fc-panel">
          <div className="pp-fc-head">
            <div className="pp-fc-avatar">AI</div>
            <div className="pp-fc-title-col">
              <div className="pp-fc-name">Proof of Plate AI</div>
              <div className="pp-fc-sub">Claude · Sui · Hedera</div>
            </div>
            <button className="pp-fc-close" onClick={() => setOpen(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="pp-fc-qs">
            {QUICK_QS.map(q => (
              <button key={q} className="pp-quick-q" onClick={() => ask(q)} disabled={loading}>
                {q}
              </button>
            ))}
          </div>

          <div className="pp-fc-messages" ref={msgsRef}>
            {messages.map((msg, i) => (
              <div className={"pp-msg " + msg.role} key={i}>
                <div className="pp-msg-bubble">
                  {msg.role === "assistant" ? renderLinks(msg.content) : msg.content}
                </div>
                {msg.time && (
                  <div className="pp-msg-meta">
                    {msg.role === "assistant" ? "AI · " : ""}{msg.time}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="pp-msg assistant">
                <div className="pp-msg-bubble">
                  <span className="pp-typing-dot" />
                  <span className="pp-typing-dot" />
                  <span className="pp-typing-dot" />
                </div>
              </div>
            )}
          </div>

          <form className="pp-chat-input-row" onSubmit={submit}>
            <input
              className="pp-chat-input"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask about this product..."
              disabled={loading}
              autoFocus
            />
            <button
              className="pp-chat-send"
              type="submit"
              disabled={loading || !question.trim()}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button className="pp-fc-btn" onClick={() => setOpen(o => !o)} aria-label="Ask AI about this product">
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        <span>{open ? "Close" : "Ask AI"}</span>
        {!open && unread > 0 && <span className="pp-fc-badge">{unread}</span>}
      </button>
    </div>
  );
}
