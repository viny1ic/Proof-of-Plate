import type { ProductBatch } from "../lib/types";

type Props = { batch: ProductBatch; claimCount: number; eventCount: number };

export function StatStrip({ claimCount, eventCount }: Props) {
  return (
    <div className="pp-stat-strip">
      <div className="pp-stat">
        <div className="pp-stat-val" style={{ color: "var(--sui)" }}>
          {claimCount}
        </div>
        <div className="pp-stat-lbl">Claims On-Chain</div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-val" style={{ color: "var(--hedera)" }}>
          {eventCount}
        </div>
        <div className="pp-stat-lbl">HCS Audit Events</div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-val" style={{ color: "var(--green)" }}>
          {"<3s"}
        </div>
        <div className="pp-stat-lbl">vs 48hr FDA Recall</div>
      </div>
    </div>
  );
}
