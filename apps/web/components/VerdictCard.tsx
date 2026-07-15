import type { Claim, ProductBatch } from "../lib/types";

type Props = {
  batch: ProductBatch;
  claims: Claim[];
};

export function VerdictCard({ batch, claims }: Props) {
  const verifiedCount = claims.filter(c => c.status === "verified").length;
  const total = claims.length;
  const pct =
    batch.scoreTotal > 0
      ? Math.round((batch.scoreVerified / batch.scoreTotal) * 100)
      : 0;

  const trustLabel = pct >= 80 ? "Strong evidence coverage" : pct >= 50 ? "Mixed evidence coverage" : "Limited evidence coverage";
  const trustColor =
    pct >= 80 ? "#4ADE80" : pct >= 50 ? "#FBBF24" : "#F87171";

  return (
    <section className={"pp-verdict-card " + (batch.recalled ? "danger" : "safe")}>
      <div className="pp-verdict-top">
        <span className="pp-verdict-icon" aria-hidden="true">{batch.recalled ? "!" : "✓"}</span>
        <div className="pp-verdict-title">
          {batch.recalled ? "Recall active" : "No recall found for this batch"}
        </div>
      </div>

      <div className="pp-verdict-bar-track">
        <div
          className="pp-verdict-bar-fill"
          style={{ width: pct + "%", background: trustColor }}
        />
      </div>

      <div className="pp-verdict-pills">
        <span className="pp-verdict-pill">
          {verifiedCount}/{total} claims verified
        </span>
        <span className="pp-verdict-pill">{trustLabel}</span>
        <span
          className={
            "pp-verdict-pill " +
            (batch.recalled ? "recall-yes" : "recall-no")
          }
        >
          {batch.recalled ? "Recall active" : "No active recall"}
        </span>
      </div>
    </section>
  );
}
