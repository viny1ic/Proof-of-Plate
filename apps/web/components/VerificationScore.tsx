import type { ProductBatch } from "../lib/types";

export function VerificationScore({ batch }: { batch: ProductBatch }) {
  const percent = batch.scoreTotal > 0 ? Math.round((batch.scoreVerified / batch.scoreTotal) * 100) : 0;

  return (
    <section className="panel row">
      <div>
        <h2>Verification score</h2>
        <p className="muted">
          {batch.scoreVerified}/{batch.scoreTotal} claims verified against Sui, HCS, and hashed evidence.
        </p>
      </div>
      <div className="score-ring" style={{ "--score": percent } as React.CSSProperties}>
        <div className="score-inner">
          <strong>{percent}</strong>
          <span>%</span>
        </div>
      </div>
    </section>
  );
}
