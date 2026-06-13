"use client";

import { Send } from "lucide-react";
import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starters = [
  "Is this actually lactose-free?",
  "Were pesticides used?",
  "What processing happened to this milk?",
  "Was the equipment cleaned?",
  "What data is missing?",
];

export function AgentChat({ batchId }: { batchId: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask about this batch. I will check Sui claims, Hedera HCS events, and evidence hashes before answering.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ batchId, question: trimmed }),
    });
    const data = await res.json();
    const content = [
      data.answer,
      "",
      "Verified evidence:",
      ...(data.verifiedEvidence || []).map((line: string) => `- ${line}`),
      "",
      "Caveats:",
      ...((data.caveats || []).length ? data.caveats : ["None."]).map((line: string) => `- ${line}`),
      "",
      "Sources:",
      ...(data.sources || []).map((line: string) => `- ${line}`),
    ].join("\n");
    setMessages((current) => [...current, { role: "assistant", content }]);
    setLoading(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="panel">
      <h2>AI verifier</h2>
      <p className="muted">Tool-based answers over Sui, HCS, and hashed evidence.</p>
      <div className="starter-grid">
        {starters.map((starter) => (
          <button className="btn" key={starter} onClick={() => ask(starter)} disabled={loading}>
            {starter}
          </button>
        ))}
      </div>
      <div className="chat-log">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the product" />
        <button className="btn primary" disabled={loading} title="Ask verifier">
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
