import type { Claim, ProductBatch } from "../lib/types";

type VerifRow = { claimType: string; label: string; ok: boolean };

type Props = {
  batch: ProductBatch;
  claims: Claim[];
  verifResults: VerifRow[];
};

const STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  warning:  "Advisory",
  failed:   "Failed",
  pending:  "Pending",
  revoked:  "Revoked",
};

export function PassportSummary({ batch, claims, verifResults }: Props) {
  const verifiedCount = claims.filter(c => c.status === "verified").length;
  const warningCount  = claims.filter(c => c.status === "warning" || c.status === "failed").length;
  const hashPassed    = verifResults.filter(r => r.ok).length;
  const hashTotal     = verifResults.length;
  const allHashOk     = hashPassed === hashTotal;
  const pct           = batch.scoreTotal > 0
    ? Math.round((batch.scoreVerified / batch.scoreTotal) * 100)
    : 0;

  // SVG ring params
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const ringColor = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";

  return (
    <div className="pp-summary">
      {/* Header */}
      <div className="pp-summary-head">
        <div className="pp-summary-title">Product Passport</div>
        <div className="pp-summary-sub">{batch.productName}</div>
      </div>

      {/* Trust ring row */}
      <div className="pp-trust-ring-row">
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border2)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray .6s ease" }}
          />
          <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Arial, sans-serif" fill="var(--navy)">
            {pct}%
          </text>
        </svg>
        <div className="pp-trust-ring-info">
          <div className="pp-trust-val">{batch.scoreVerified}/{batch.scoreTotal} verified</div>
          <div className="pp-trust-lbl">Sui blockchain · Hedera HCS</div>
          <div className="pp-trust-sub">
            {warningCount > 0
              ? warningCount + " claim" + (warningCount > 1 ? "s" : "") + " advisory — supplier declaration only"
              : "All claims independently verified"}
          </div>
        </div>
      </div>

      {/* Hash + recall row */}
      <div className="pp-summary-scores">
        <div className="pp-summary-score-card">
          <div className="pp-summary-score-val" style={{ color: allHashOk ? "var(--green)" : "var(--amber)" }}>
            {hashPassed}/{hashTotal}
          </div>
          <div className="pp-summary-score-lbl">Hash Check</div>
          <div className="pp-summary-score-sub">{allHashOk ? "All match on-chain" : "Mismatch detected"}</div>
        </div>
        <div className="pp-summary-score-card" style={{ borderRight: "none" }}>
          <div className="pp-summary-score-val" style={{ color: batch.recalled ? "var(--red)" : "var(--green)" }}>
            {batch.recalled ? "Yes" : "No"}
          </div>
          <div className="pp-summary-score-lbl">Recalled</div>
          <div className="pp-summary-score-sub">{batch.recalled ? "Active recall" : "No active recall"}</div>
        </div>
      </div>

      {/* Claims snapshot */}
      <div className="pp-summary-claims">
        <div className="pp-summary-section-label">Claims at a Glance</div>
        {claims.map(c => (
          <div className="pp-summary-claim-row" key={c.claimType}>
            <span className={"pp-summary-claim-dot " + c.status} />
            <span className="pp-summary-claim-name">{c.label}</span>
            <span className={"pp-summary-claim-status " + c.status}>
              {STATUS_LABEL[c.status] ?? c.status}
            </span>
          </div>
        ))}
      </div>

      {/* What this means */}
      <div className="pp-summary-desc">
        <div className="pp-summary-section-label">What This Means</div>
        <p className="pp-summary-desc-text">
          {verifiedCount} out of {claims.length} label claims on this product have been independently
          verified with cryptographic evidence anchored on the Sui blockchain and logged on Hedera HCS.
          {warningCount > 0
            ? " " + warningCount + " claim" + (warningCount > 1 ? "s are" : " is") + " advisory — based on supplier declarations without independent lab testing."
            : " All claims have independent lab or facility evidence."}
          {" "}Evidence files are tamper-evident: any modification would change the hash and fail verification.
        </p>
      </div>
    </div>
  );
}
