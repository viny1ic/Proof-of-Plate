"use client";

import { X } from "lucide-react";
import type { EvidenceDocument } from "../lib/types";

type Props = {
  evidence: EvidenceDocument | null;
  verification: { ok: boolean; actualHash: string; expectedHash: string } | null;
  onClose: () => void;
};

export function EvidenceDrawer({ evidence, verification, onClose }: Props) {
  if (!evidence) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true">
      <div className="drawer-panel">
        <div className="row">
          <div>
            <p className="muted">Evidence document</p>
            <h2>{evidence.title}</h2>
          </div>
          <button className="btn" onClick={onClose} title="Close evidence">
            <X size={18} />
          </button>
        </div>
        <div className="grid">
          <p>
            <strong>{evidence.documentId}</strong> issued by {evidence.issuerName} for batch{" "}
            <span className="mono">{evidence.batchId}</span>.
          </p>
          {verification ? (
            <span className={`badge ${verification.ok ? "verified" : "failed"}`}>
              {verification.ok ? "hash verified" : "hash mismatch"}
            </span>
          ) : null}
          <pre>{JSON.stringify(evidence, null, 2)}</pre>
          {verification ? (
            <pre>{JSON.stringify(verification, null, 2)}</pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
