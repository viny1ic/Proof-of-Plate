"use client";

import { FileSearch } from "lucide-react";
import { useState } from "react";
import { hederaTopicLink, suiExplorerLink } from "../lib/explorer-links";
import type { Claim, EvidenceDocument } from "../lib/types";
import { EvidenceDrawer } from "./EvidenceDrawer";

type Verification = { ok: boolean; actualHash: string; expectedHash: string };

function ExplorerValue({ href, value }: { href: string | null; value: string }) {
  if (!href) return <span className="mono">{value}</span>;
  return (
    <a className="mono explorer-link" href={href} target="_blank" rel="noreferrer">
      {value}
    </a>
  );
}

export function ClaimList({ claims }: { claims: Claim[] }) {
  const [evidence, setEvidence] = useState<EvidenceDocument | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [claimVerifications, setClaimVerifications] = useState<Record<string, Verification>>({});

  async function openEvidence(claim: Claim) {
    const params = new URLSearchParams({ uri: claim.evidenceUri, expectedHash: claim.evidenceHash });
    const res = await fetch(`/api/evidence?${params}`);
    const data = await res.json();
    setEvidence(data.evidence);
    setVerification(data.verification);
    if (data.verification) {
      setClaimVerifications((current) => ({ ...current, [claim.claimType]: data.verification }));
    }
  }

  return (
    <section className="panel">
      <div className="row">
        <div>
          <h2>Claims</h2>
          <p className="muted">Final product claims stored as Sui truth and linked to HCS intake events.</p>
        </div>
      </div>
      <div className="grid claim-grid">
        {claims.map((claim) => {
          const hashVerification = claimVerifications[claim.claimType];
          return (
            <article className="panel claim-card" key={claim.claimType}>
              <div className="row">
                <h3>{claim.label}</h3>
                <span className={`badge ${claim.status}`}>{claim.status}</span>
              </div>
              <p className="muted">{claim.reason || `${claim.issuerName} issued this claim.`}</p>
              <dl>
                <dt>Issuer name</dt>
                <dd>{claim.issuerName}</dd>
                <dt>Issuer role</dt>
                <dd>{claim.issuerRole}</dd>
                <dt>Sui claim object</dt>
                <dd>
                  <ExplorerValue href={suiExplorerLink(claim.suiObjectId)} value={claim.suiObjectId} />
                </dd>
                <dt>Evidence</dt>
                <dd className="mono">{claim.evidenceUri}</dd>
                <dt>Evidence hash</dt>
                <dd className="mono">{claim.evidenceHash}</dd>
                <dt>Hash verification</dt>
                <dd>
                  {hashVerification ? (
                    <span className={`badge ${hashVerification.ok ? "verified" : "failed"}`}>
                      {hashVerification.ok ? "hash verified" : "hash mismatch"}
                    </span>
                  ) : (
                    <span className="badge pending">not checked</span>
                  )}
                </dd>
                <dt>HCS topic</dt>
                <dd>
                  <ExplorerValue href={hederaTopicLink(claim.hcsTopicId)} value={claim.hcsTopicId} />
                </dd>
                <dt>HCS sequence</dt>
                <dd>#{claim.hcsSequence}</dd>
              </dl>
              <button className="btn" onClick={() => openEvidence(claim)}>
                <FileSearch size={16} />
                Verify hash
              </button>
            </article>
          );
        })}
      </div>
      <EvidenceDrawer evidence={evidence} verification={verification} onClose={() => setEvidence(null)} />
    </section>
  );
}
