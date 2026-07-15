"use client";

import { useState } from "react";

type Tab = "claims" | "trace";

type Props = {
  summarySection: React.ReactNode;
  chatSection: React.ReactNode;
  claimsSection: React.ReactNode;
  traceSection: React.ReactNode;
};

export function PassportRight({ summarySection, chatSection, claimsSection, traceSection }: Props) {
  const [tab, setTab] = useState<Tab>("claims");

  return (
    <div className="pp-passport-workspace">
      <section className="pp-overview-grid" id="overview" aria-label="Passport overview">
        <div className="pp-always-top-summary">{summarySection}</div>
        <aside className="pp-always-top-chat" id="ask-ai">{chatSection}</aside>
      </section>

      <section className="pp-records" id="claims">
        <div className="pp-records-intro">
          <div>
            <p className="pp-section-kicker">Proof, not promises</p>
            <h2>Open the verification record</h2>
          </div>
          <p>Review every label claim or follow the ordered audit trail behind it.</p>
        </div>

        <div className="pp-tab-bar-inline" role="tablist" aria-label="Verification record">
          <button
            className={"pp-tab-btn" + (tab === "claims" ? " active" : "")}
            onClick={() => setTab("claims")}
            role="tab"
            aria-selected={tab === "claims"}
          >
            Claims &amp; evidence
          </button>
          <button
            className={"pp-tab-btn" + (tab === "trace" ? " active" : "")}
            onClick={() => setTab("trace")}
            role="tab"
            aria-selected={tab === "trace"}
          >
            Audit trail
          </button>
        </div>

        <div className="pp-tab-panel" role="tabpanel" hidden={tab !== "claims"}>
          {claimsSection}
        </div>
        <div className="pp-tab-panel" role="tabpanel" hidden={tab !== "trace"}>
          {traceSection}
        </div>
      </section>
    </div>
  );
}
