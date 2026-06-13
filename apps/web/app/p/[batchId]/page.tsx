import { notFound } from "next/navigation";
import { AgentChat } from "../../../components/AgentChat";
import { ClaimList } from "../../../components/ClaimList";
import { HtsMetadataCard } from "../../../components/HtsMetadataCard";
import { LifecycleTimeline } from "../../../components/LifecycleTimeline";
import { PassportRight } from "../../../components/PassportRight";
import { PassportSummary } from "../../../components/PassportSummary";
import { ProductHeader } from "../../../components/ProductHeader";
import { ProductInfo } from "../../../components/ProductInfo";
import { StatStrip } from "../../../components/StatStrip";
import { SupplyChainJourney } from "../../../components/SupplyChainJourney";
import { TamperDetection } from "../../../components/TamperDetection";
import { hederaTokenLink, hederaTopicLink, suiExplorerLink } from "../../../lib/explorer-links";
import { getBatch, getClaims, getHcsMessages, getHtsMetadata } from "../../../lib/data";
import { verifyEvidenceHash } from "../../../lib/evidence";

type VerifRow = { claimType: string; label: string; ok: boolean };

function HashVerificationBanner({ results }: { results: VerifRow[] }) {
  const passed = results.filter(r => r.ok).length;
  const total  = results.length;
  const allOk  = passed === total;
  return (
    <div className={"pp-hash-banner" + (allOk ? " ok" : " warn")}>
      <div className="pp-hash-banner-icon">
        {allOk ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )}
      </div>
      <div className="pp-hash-banner-text">
        <span className="pp-hash-banner-title">
          {allOk ? "All evidence hashes verified" : passed + "/" + total + " hashes verified"}
        </span>
        <span className="pp-hash-banner-sub">
          {allOk
            ? "On-chain hashes match local evidence files"
            : results.filter(r => !r.ok).map(r => r.label).join(", ") + " mismatch"}
        </span>
      </div>
      <div className={"pp-hash-banner-pill" + (allOk ? " ok" : " warn")}>
        {passed}/{total}
      </div>
    </div>
  );
}

function RecallBanner({ recalled, batchId }: { recalled: boolean; batchId: string }) {
  return (
    <div className={"pp-recall-banner " + (recalled ? "danger" : "safe")}>
      <span className="pp-recall-banner-icon">{recalled ? "🚨" : "🛡️"}</span>
      <div className="pp-recall-banner-body">
        <div className="pp-recall-banner-title">
          {recalled ? "Active FDA Recall — Do Not Consume" : "No Active FDA Recall"}
        </div>
        <div className="pp-recall-banner-sub">
          {recalled
            ? "This batch has been recalled. Check FDA.gov for details."
            : "Batch " + batchId + " · verified against openFDA database"}
        </div>
      </div>
    </div>
  );
}

export default async function ProductPassport({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;

  let batch: Awaited<ReturnType<typeof getBatch>>;
  try {
    batch = getBatch(batchId);
  } catch {
    notFound();
  }

  const claims = getClaims(batchId);
  const events = getHcsMessages(batch.hcsTopicId);
  const htsStatus = getHtsMetadata(batchId);
  const hts = htsStatus.hts;

  const verifResults: VerifRow[] = claims.map(claim => {
    try {
      const r = verifyEvidenceHash(claim.evidenceUri, claim.evidenceHash);
      return { claimType: claim.claimType, label: claim.label, ok: r.ok };
    } catch {
      return { claimType: claim.claimType, label: claim.label, ok: false };
    }
  });

  const verifContext =
    "Evidence hash verification (auto-checked on page load):\n" +
    verifResults.map(r => "- " + r.label + ": " + (r.ok ? "VERIFIED" : "MISMATCH")).join("\n") +
    "\nTotal: " + verifResults.filter(r => r.ok).length + "/" + verifResults.length + " verified." +
    "\nHTS product metadata: " +
    (hts ? `${htsStatus.ok ? "PARSED" : "WARNING"} token ${hts.tokenId} serial ${hts.serialNumber}, metadata hash ${hts.metadataHash}, product URL ${hts.productMetadata.productPageUrl}.` : "not configured.");

  return (
    <main className="pp-shell">
      <div className="pp-mobile-bar">
        <div className="pp-mbar-left">
          <span className="pp-mbar-dot" />
          <div className="pp-mbar-info">
            <span className="pp-mbar-brand">Proof of Plate</span>
            <span className="pp-mbar-prod">{batch.productName}</span>
          </div>
        </div>
        <div className="pp-mbar-score">
          <span>{batch.scoreVerified + "/" + batch.scoreTotal}</span>
          <small>verified</small>
        </div>
      </div>

      <div className="pp-layout">
        <div className="pp-left">
          <ProductHeader batch={batch} />
          <StatStrip batch={batch} claimCount={claims.length} eventCount={events.length} />
          <RecallBanner recalled={batch.recalled} batchId={batch.batchId} />
          <HashVerificationBanner results={verifResults} />
          <SupplyChainJourney claims={claims} />
          <ProductInfo batch={batch} />
          <HtsMetadataCard hts={hts} ok={htsStatus.ok} errors={htsStatus.errors} />

          <div className="pp-footer">
            <div className="pp-footer-chain">
              <a
                className="pp-footer-chip sui"
                href={suiExplorerLink(batch.suiBatchObjectId) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                Sui Blockchain
              </a>
              <a
                className="pp-footer-chip hedera"
                href={hederaTopicLink(batch.hcsTopicId) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                Hedera HCS
              </a>
              {hts && (
                <a
                  className="pp-footer-chip hedera"
                  href={hederaTokenLink(hts.tokenId) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hedera HTS
                </a>
              )}
            </div>
            <div className="pp-footer-note">
              Product metadata is tokenized with HTS; claims are verified with Sui, HCS, and evidence hashes.
            </div>
            <div className="pp-footer-dpp inspector-only">
              EU Digital Product Passport (DPP) - ESPR compliant structure
            </div>
          </div>
        </div>

        <div className="pp-right">
          <PassportRight
            summarySection={
              <PassportSummary batch={batch} claims={claims} verifResults={verifResults} />
            }
            chatSection={<AgentChat batchId={batch.batchId} verificationContext={verifContext} />}
            claimsSection={<ClaimList claims={claims} />}
            tamperSection={<TamperDetection />}
            traceSection={<LifecycleTimeline events={events} claims={claims} />}
          />
        </div>
      </div>
    </main>
  );
}
