import { ShieldCheck, TriangleAlert } from "lucide-react";
import { hederaTopicLink, suiExplorerLink } from "../lib/explorer-links";
import type { ProductBatch } from "../lib/types";

function ExplorerValue({ href, value }: { href: string | null; value: string }) {
  if (!href) return <strong className="mono">{value}</strong>;
  return (
    <a className="mono explorer-link" href={href} target="_blank" rel="noreferrer">
      {value}
    </a>
  );
}

export function ProductHeader({ batch }: { batch: ProductBatch }) {
  return (
    <section className="panel">
      <div className="row">
        <div>
          <p className="muted">Proof of Plate product passport</p>
          <h1>{batch.productName}</h1>
          <p className="mono">{batch.batchId}</p>
        </div>
        <span className={`badge ${batch.recalled ? "failed" : "verified"}`}>
          {batch.recalled ? <TriangleAlert size={14} /> : <ShieldCheck size={14} />}
          {batch.recalled ? "recalled" : "not recalled"}
        </span>
      </div>
      <div className="grid metadata-grid">
        <div>
          <span className="muted">Category</span>
          <strong>{batch.category}</strong>
        </div>
        <div>
          <span className="muted">Sui package</span>
          <ExplorerValue href={suiExplorerLink(batch.suiPackageId, "package")} value={batch.suiPackageId} />
        </div>
        <div>
          <span className="muted">Sui batch object</span>
          <ExplorerValue href={suiExplorerLink(batch.suiBatchObjectId)} value={batch.suiBatchObjectId} />
        </div>
        <div>
          <span className="muted">Hedera HCS topic</span>
          <ExplorerValue href={hederaTopicLink(batch.hcsTopicId)} value={batch.hcsTopicId} />
        </div>
      </div>
    </section>
  );
}
