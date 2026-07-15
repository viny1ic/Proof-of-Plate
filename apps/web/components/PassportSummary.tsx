import type { Claim, ProductBatch } from "../lib/types";

type VerifRow = { claimType: string; label: string; ok: boolean };

type Props = {
  batch: ProductBatch;
  claims: Claim[];
  verifResults: VerifRow[];
};

const STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  warning: "Advisory",
  failed: "Failed",
  pending: "Pending",
  revoked: "Revoked",
};

export function PassportSummary({ batch, claims, verifResults }: Props) {
  const verifiedCount = claims.filter((claim) => claim.status === "verified").length;
  const advisoryCount = claims.filter((claim) => claim.status === "warning" || claim.status === "failed").length;
  const hashPassed = verifResults.filter((result) => result.ok).length;
  const hashTotal = verifResults.length;
  const allHashOk = hashPassed === hashTotal;

  return (
    <section className="pp-summary">
      <div className="pp-summary-head">
        <p className="pp-section-kicker">The answer first</p>
        <h2>What this passport says</h2>
      </div>

      <div className="pp-summary-verdict">
        <span className={"pp-summary-stamp " + (batch.recalled ? "danger" : "safe")} aria-hidden="true">
          {batch.recalled ? "!" : "✓"}
        </span>
        <div>
          <strong>{batch.recalled ? "This batch has an active recall" : `${verifiedCount} of ${claims.length} claims are verified`}</strong>
          <p>
            {batch.recalled
              ? "Do not consume this product. Review the recall record before taking action."
              : advisoryCount > 0
                ? `${advisoryCount} claim${advisoryCount === 1 ? " is" : "s are"} advisory and should be read with care.`
                : "Every listed claim has independent evidence attached to its record."}
          </p>
        </div>
      </div>

      <div className="pp-summary-scores">
        <div className="pp-summary-score-card">
          <strong>{batch.scoreVerified}/{batch.scoreTotal}</strong>
          <span>Claims verified</span>
        </div>
        <div className="pp-summary-score-card">
          <strong>{hashPassed}/{hashTotal}</strong>
          <span>{allHashOk ? "Evidence intact" : "Hash mismatch"}</span>
        </div>
        <div className="pp-summary-score-card">
          <strong>{batch.recalled ? "Yes" : "No"}</strong>
          <span>Active recall</span>
        </div>
      </div>

      <div className="pp-summary-claims">
        <div className="pp-summary-section-label">Claims at a glance</div>
        {claims.map((claim) => (
          <div className="pp-summary-claim-row" key={claim.claimType}>
            <span className={"pp-summary-claim-dot " + claim.status} />
            <span className="pp-summary-claim-name">{claim.label}</span>
            <span className={"pp-summary-claim-status " + claim.status}>
              {STATUS_LABEL[claim.status] ?? claim.status}
            </span>
          </div>
        ))}
      </div>

      <div className="pp-summary-desc">
        <div className="pp-summary-section-label">How to read this</div>
        <p className="pp-summary-desc-text">
          Claims are finalized on Sui, ordered through Hedera HCS, and checked against the original evidence bytes.
          Product identity and ingredients come from the Hedera HTS batch token. A matching hash means the evidence
          has not changed since it was recorded.
        </p>
      </div>
    </section>
  );
}
