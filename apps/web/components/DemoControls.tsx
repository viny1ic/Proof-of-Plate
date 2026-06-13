"use client";

import { RefreshCcw } from "lucide-react";
import { useState } from "react";

export function DemoControls() {
  const [state, setState] = useState<string>("Ready");

  async function addClaim() {
    setState("Adding claim...");
    const res = await fetch("/api/demo/add-claim", { method: "POST" });
    const data = await res.json();
    setState(data.ok ? "Added final pesticide residue claim. Refresh the product page." : data.error);
  }

  return (
    <section className="panel">
      <h2>Demo controls</h2>
      <p className="muted">Add a live-style HCS event and final Sui claim using the local demo script.</p>
      <button className="btn primary" onClick={addClaim}>
        <RefreshCcw size={16} />
        Add final residue test
      </button>
      <p className="muted">{state}</p>
    </section>
  );
}
