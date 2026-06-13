import type { ProductBatch } from "../lib/types";
import { ModeToggle } from "./ModeToggle";

const CIRCUM = 2 * Math.PI * 18;

export function ProductHeader({ batch }: { batch: ProductBatch }) {
  const pct = batch.scoreTotal > 0 ? batch.scoreVerified / batch.scoreTotal : 0;
  const offset = CIRCUM * (1 - pct);
  const scoreLabel = batch.scoreVerified + "/" + batch.scoreTotal;
  const strokeColor = pct >= 0.8 ? "#22C55E" : pct >= 0.5 ? "#FCD34D" : "#F87171";

  return (
    <div className="pp-hero">
      <div className="pp-hero-top">
        <div className="pp-brand-chip">
          <span className="pp-brand-dot" />
          <span className="pp-brand-name">Proof of Plate</span>
        </div>
        <ModeToggle />
      </div>

      <div className="pp-hero-product">
        <div className="pp-product-category">{batch.category}</div>
        <div className="pp-product-name">{batch.productName}</div>
        <div className="pp-batch-id">{batch.batchId}</div>
        <div className="pp-hero-badges">
          {batch.recalled ? (
            <span className="pp-recalled-badge">PRODUCT RECALLED</span>
          ) : (
            <span className="pp-recall-badge">
              <span className="pp-recall-dot" />
              Active - No Recall
            </span>
          )}
          <span className="pp-dpp-badge inspector-only">EU DPP Ready</span>
        </div>
      </div>

      <div className="pp-score-bar">
        <div className="pp-score-left">
          <div className="pp-score-ring">
            <svg width="46" height="46" viewBox="0 0 46 46">
              <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle
                cx="23" cy="23" r="18" fill="none"
                stroke={strokeColor} strokeWidth="4"
                strokeDasharray={CIRCUM + " " + CIRCUM}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="pp-score-ring-num">{batch.scoreVerified}</div>
          </div>
          <div>
            <div className="pp-score-label">{scoreLabel} Claims Verified</div>
            <div className="pp-score-sub">Sui blockchain - Hedera HCS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
