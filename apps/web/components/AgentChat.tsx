"use client";

import { Send } from "lucide-react";
import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starters = [
  "Is this actually lactose-free?",
  "Were pesticides used?",
  "What processing happened to this milk?",
  "Was the equipment cleaned?",
  "What data is missing from this passport?",
];

export function AgentChat({ batchId }: { batchId: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me anything about this product. I will check Sui claims, Hedera HCS events, and evidence hashes before answering — I never guess.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setQuestion("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          batchId,
          question: trimmed,
          // Send prior turns (excluding the initial assistant greeting) as history
          history: nextMessages.slice(1, -1),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Something went wrong: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="panel">
      <h2>AI verifier</h2>
      <p className="muted">
        Powered by Hedera Agent Kit + Claude. Tool-based answers over Sui claims,
        HCS events, and hashed evidence.
      </p>
      <div className="starter-grid">
        {starters.map((starter) => (
          <button
            className="btn"
            key={starter}
            onClick={() => ask(starter)}
            disabled={loading}
          >
            {starter}
          </button>
        ))}
      </div>
      <div className="chat-log">
        {messages.map((message, index) => (
          <div
            className={`message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="message assistant muted">Checking chain data…</div>
        )}
      </div>
      {error && (
        <p className="muted" style={{ color: "var(--red)", fontSize: 13 }}>
          {error}
        </p>
      )}
      <form className="chat-form" onSubmit={submit}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this product"
          disabled={loading}
        />
        <button className="btn primary" disabled={loading} title="Ask verifier">
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
