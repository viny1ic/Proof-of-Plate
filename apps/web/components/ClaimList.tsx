"use client";
import { useState } from "react";
import { hederaTopicLink, suiExplorerLink } from "../lib/explorer-links";
import type { Claim, EvidenceDocument } from "../lib/types";
import { EvidenceDrawer } from "./EvidenceDrawer";

const ICONS: Record<string, string> = {
  lactose_free: "🧪",
  ultra_filtered: "🔬",
  pasteurized: "🌡",
  equipment_cleaned: "🧹",
  feed_pesticide_declaration: "🌾",
  final_pesticide_residue_test: "⚗️",
};

function shortHash(h: string) {
  if (!h || h.length < 14) return h;
  return h.slice(0, 6) + "…" + h.slice(-6);
}

type Verification = { ok: boolean; actualHash: string; expectedHash: string };

export function ClaimList({ claims }: { claims: Claim[] }) {
  const [openClaim, setOpenClaim] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDocument | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [claimVers, setClaimVers] = useState<Record<string, Verification>>({});
  const [evidenceErr, setEvidenceErr] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  function toggle(ct: string) {
    setOpenClaim(prev => prev === ct ? null : ct);
  }

  async function openEvidence(claim: Claim, e: React.MouseEvent) {
    e.stopPropagation();
    setEvidenceErr(null);
    try {
      const p = new URLSearchParams({ uri: claim.evidenceUri, expectedHash: claim.evidenceHash });
      const res = await fetch("/api/evidence?" + p);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "HTTP " + res.status);
      setEvidence(data.evidence);
      setVerification(data.verification);
      if (data.verification) {
        setClaimVers(c => ({ ...c, [claim.claimType]: data.verification }));
      }
    } catch (err) {
      setEvidenceErr((err as Error).message);
    }
  }

  async function copyHash(hash: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
    } catch {}
  }

  const warnCount = claims.filter(c => c.status === "warning" || c.status === "failed").length;
  const verCount  = claims.filter(c => c.status === "verified").length;

  return (
    <>
      <div className="pp-section pp-section-claims">
        <div className="pp-section-head">
          <span className="pp-section-title">Verified Claims</span>
          <span className="pp-section-meta">
            {warnCount > 0 ? warnCount + " advisory" : verCount + " verified"}
          </span>
        </div>

        {claims.map(claim => {
          const isOpen = openClaim === claim.claimType;
          const hv = claimVers[claim.claimType];
          const icon = ICONS[claim.claimType] ?? "📋";
          return (
            <div className={"pp-claim-row" + (isOpen ? " open" : "")} key={claim.claimType}>
              <div className="pp-claim-main" onClick={() => toggle(claim.claimType)}>
                <div className={"pp-claim-icon " + claim.status} style={{ fontSize: 18 }}>
                  {icon}
                </div>
                <div className="pp-claim-text">
                  <div className="pp-claim-name">{claim.label}</div>
                  <div className="pp-claim-issuer">{claim.issuerName}</div>
                  <div className="pp-claim-hash">{shortHash(claim.evidenceHash)}</div>
                </div>
                <div className="pp-claim-right">
                  <span className={"pp-status-dot " + claim.status} />
                  <span className={"pp-status-text " + claim.status}>
                    {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                  </span>
                  <span className="pp-chevron">v</span>
                </div>
              </div>

              {isOpen && (
                <div className="pp-claim-detail">
                  {claim.reason && (
                    <div className="pp-warning-reason">{claim.reason}</div>
                  )}
                  <div className="pp-detail-grid inspector-only">
                    <div className="pp-detail-item">
                      <div className="pp-detail-label">HCS Sequence</div>
                      <div className="pp-detail-val">{"#" + claim.hcsSequence}</div>
                    </div>
                    <div className="pp-detail-item">
                      <div className="pp-detail-label">Issuer Role</div>
                      <div className="pp-detail-val">{claim.issuerRole}</div>
                    </div>
                    <div className="pp-detail-item pp-detail-full">
                      <div className="pp-detail-label">Sui Object ID</div>
                      <div className="pp-detail-val mono">{claim.suiObjectId}</div>
                    </div>
                    <div className="pp-detail-item pp-detail-full">
                      <div className="pp-detail-label">
                        Evidence Hash
                        <button className="pp-copy-btn" onClick={e => copyHash(claim.evidenceHash, e)}>
                          {copiedHash === claim.evidenceHash ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="pp-detail-val mono">{claim.evidenceHash}</div>
                      {hv && (
                        <div style={{ marginTop: 6 }}>
                          <span className={"badge " + (hv.ok ? "verified" : "failed")}>
                            {hv.ok ? "Hash Verified" : "Hash Mismatch"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pp-chain-links">
                    <a className="pp-chain-link sui" href={suiExplorerLink(claim.suiObjectId) ?? undefined} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      Sui Explorer ↗
                    </a>
                    <a className="pp-chain-link hedera" href={hederaTopicLink(claim.hcsTopicId) ?? undefined} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      HashScan ↗
                    </a>
                    <button className="pp-verify-btn inspector-only" onClick={e => openEvidence(claim, e)}>
                      Verify Hash
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {evidenceErr && (
          <div style={{ padding: "10px 16px", fontSize: 12, color: "var(--red)" }}>
            Failed to load evidence: {evidenceErr}
          </div>
        )}
      </div>

      <EvidenceDrawer
        evidence={evidence}
        verification={verification}
        onClose={() => { setEvidence(null); setEvidenceErr(null); }}
      />
    </>
  );
}
