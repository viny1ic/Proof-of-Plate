import { AgentChat } from "../../../components/AgentChat";
import { ClaimList } from "../../../components/ClaimList";
import { LifecycleTimeline } from "../../../components/LifecycleTimeline";
import { ProductHeader } from "../../../components/ProductHeader";
import { ProductInfo } from "../../../components/ProductInfo";
import { VerificationScore } from "../../../components/VerificationScore";
import { getBatch, getClaims, getHcsMessages } from "../../../lib/data";

export default async function ProductPassport({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const batch = getBatch(batchId);
  const claims = getClaims(batchId);
  const events = getHcsMessages(batch.hcsTopicId);

  return (
    <main className="shell">
      <div className="passport">
        <div className="stack">
          <ProductHeader batch={batch} />
          <ProductInfo batch={batch} />
          <VerificationScore batch={batch} />
          <ClaimList claims={claims} />
          <LifecycleTimeline events={events} />
        </div>
        <aside className="stack">
          <AgentChat batchId={batch.batchId} />
        </aside>
      </div>
    </main>
  );
}
