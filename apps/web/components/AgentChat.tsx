"use client";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; time?: string };

const QUICK_QS = [
  "Is this safe for my lactose-intolerant child?",
  "Were any pesticides used on this product?",
  "Is this batch recalled?",
  "Where was this product made?",
  "Is it safe during pregnancy?",
  "What does 'verified' mean here?",
];

function nowStr() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Render assistant message text — turn bare URLs into clickable links */
function renderLinks(text: string) {
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

type Props = { batchId: string; verificationContext?: string };

export function AgentChat({ batchId, verificationContext }: Props) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask me anything about this product. I verify claims on Sui, check Hedera HCS events, and inspect evidence hashes before answering.",
      time: nowStr(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

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
    <div className="pp-chat">
      <div className="pp-chat-head">
        <div className="pp-chat-avatar">AI</div>
        <div>
          <div className="pp-chat-name">Proof of Plate AI</div>
          <div className="pp-chat-sub">Powered by Claude - Sui - Hedera</div>
        </div>
      </div>

      <div className="pp-quick-qs">
        {QUICK_QS.map(q => (
          <button key={q} className="pp-quick-q" onClick={() => ask(q)} disabled={loading}>
            {q}
          </button>
        ))}
      </div>

      <div className="pp-chat-messages" ref={msgsRef}>
        {messages.map((msg, i) => (
          <div className={"pp-msg " + msg.role} key={i}>
            <div className="pp-msg-bubble">
              {msg.role === "assistant" ? renderLinks(msg.content) : msg.content}
            </div>
            {msg.time && (
              <div className="pp-msg-meta">
                {msg.role === "assistant" ? "AI - " : ""}{msg.time}
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
  );
}
