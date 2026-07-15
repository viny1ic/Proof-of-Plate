import type { ProductBatch } from "../lib/types";
import { ModeToggle } from "./ModeToggle";

export function ProductHeader({ batch }: { batch: ProductBatch }) {
  const pct = batch.scoreTotal > 0 ? Math.round((batch.scoreVerified / batch.scoreTotal) * 100) : 0;

  return (
    <header className="pp-hero">
      <div className="pp-hero-nav">
        <div className="pp-brand-lockup" aria-label="Proof of Plate">
          <span className="pp-brand-mark" aria-hidden="true">P</span>
          <span className="pp-brand-name">Proof of Plate</span>
        </div>
        <ModeToggle />
      </div>

      <div className="pp-hero-grid">
        <div className="pp-hero-copy">
          <p className="pp-eyebrow">Verifiable food passport · {batch.category}</p>
          <h1 className="pp-product-name">{batch.productName}</h1>
          <p className="pp-product-description">{batch.description}</p>
          <div className="pp-hero-meta">
            <span className="pp-batch-id">Batch {batch.batchId}</span>
            <span className={"pp-recall-badge " + (batch.recalled ? "danger" : "safe")}>
              <span className="pp-recall-dot" />
              {batch.recalled ? "Recall active" : "No active recall"}
            </span>
            <span className="pp-dpp-badge inspector-only">EU DPP structure</span>
          </div>
        </div>

        <div className="pp-hero-score" aria-label={`${batch.scoreVerified} of ${batch.scoreTotal} claims verified`}>
          <div className="pp-score-kicker">Verification score</div>
          <div className="pp-score-number">
            <strong>{pct}</strong><span>%</span>
          </div>
          <div className="pp-score-blocks" aria-hidden="true">
            {Array.from({ length: batch.scoreTotal }, (_, index) => (
              <span className={index < batch.scoreVerified ? "filled" : ""} key={index} />
            ))}
          </div>
          <div className="pp-score-label">{batch.scoreVerified} of {batch.scoreTotal} claims verified</div>
          <div className="pp-score-sub">Evidence checked at page load</div>
        </div>
      </div>
    </header>
  );
}
