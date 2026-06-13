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

  const trustLabel =
    pct >= 80 ? "High Trust" : pct >= 50 ? "Medium Trust" : "Low Trust";
  const trustColor =
    pct >= 80 ? "#4ADE80" : pct >= 50 ? "#FBBF24" : "#F87171";

  return (
    <div className={"pp-verdict-card " + (batch.recalled ? "danger" : "safe")}>
      <div className="pp-verdict-top">
        <span className="pp-verdict-icon">{batch.recalled ? "🚨" : "✅"}</span>
        <div className="pp-verdict-title">
          {batch.recalled ? "Do Not Consume" : "Safe to Consume"}
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
          {batch.recalled ? "⚠ FDA Recall Active" : "✓ No FDA Recall"}
        </span>
      </div>
    </div>
  );
}
