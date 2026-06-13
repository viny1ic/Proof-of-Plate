"use client";
import { useState } from "react";

type Tab = "claims" | "trace";

type Props = {
  summarySection: React.ReactNode;
  chatSection: React.ReactNode;
  claimsSection: React.ReactNode;
  tamperSection: React.ReactNode;
  traceSection: React.ReactNode;
};

export function PassportRight({ summarySection, chatSection, claimsSection, tamperSection, traceSection }: Props) {
  const [tab, setTab] = useState<Tab>("claims");

  return (
    <>
      {/* Summary + AI always visible at top — each in its own div to avoid key warnings */}
      <div className="pp-always-top">
        <div className="pp-always-top-summary">{summarySection}</div>
        <div className="pp-always-top-chat">{chatSection}</div>
      </div>

      {/* Inline tab bar — desktop only */}
      <div className="pp-tab-bar-inline">
        <button
          className={"pp-tab-btn" + (tab === "claims" ? " active" : "")}
          onClick={() => setTab("claims")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Claims
        </button>
        <button
          className={"pp-tab-btn" + (tab === "trace" ? " active" : "")}
          onClick={() => setTab("trace")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Trace
        </button>
      </div>

      {/* Mobile tab bar (3 tabs: claims, trace — chat hidden on mobile since it's in always-top) */}
      <div className="pp-tab-bar">
        <button
          className={"pp-tab-btn" + (tab === "claims" ? " active" : "")}
          onClick={() => setTab("claims")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Claims
        </button>
        <button
          className={"pp-tab-btn" + (tab === "trace" ? " active" : "")}
          onClick={() => setTab("trace")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Trace
        </button>
      </div>

      <div style={{ display: tab === "claims" ? "block" : "none" }}>
        <div>{claimsSection}</div>
        <div>{tamperSection}</div>
      </div>
      <div style={{ display: tab === "trace" ? "block" : "none" }}>
        <div>{traceSection}</div>
      </div>

      <div className="pp-tab-spacer" />
    </>
  );
}
