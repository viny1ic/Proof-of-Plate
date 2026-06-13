import type { HtsDeployment } from "../lib/types";
import { hederaTokenLink } from "../lib/explorer-links";

type Props = {
  hts?: HtsDeployment;
  ok: boolean;
  errors?: string[];
};

export function HtsMetadataCard({ hts, ok, errors = [] }: Props) {
  if (!hts) {
    return (
      <div className="pp-hts-card warn">
        <div className="pp-hts-head">
          <span className="pp-hts-title">Hedera HTS Metadata</span>
          <span className="pp-hts-pill warn">Not configured</span>
        </div>
        <p className="pp-hts-desc">
          No product-batch token has been recorded yet. Run <code>npm run hedera:create-token</code> to create or record one.
        </p>
      </div>
    );
  }

  const tokenUrl = hederaTokenLink(hts.tokenId);
  const ingredientCount = hts.productMetadata.ingredients.length;

  return (
    <div className={"pp-hts-card" + (ok ? " ok" : " warn")}>
      <div className="pp-hts-head">
        <span className="pp-hts-title">Hedera HTS Batch Token</span>
        <span className={"pp-hts-pill" + (ok ? " ok" : " warn")}>
          {ok ? "Token metadata verified" : "Metadata warning"}
        </span>
      </div>

      <div className="pp-hts-token-row">
        <span className="pp-hts-label">Token</span>
        {tokenUrl ? (
          <a className="pp-hts-token" href={tokenUrl} target="_blank" rel="noopener noreferrer">
            {hts.tokenId}#{hts.serialNumber}
          </a>
        ) : (
          <span className="pp-hts-token local">{hts.tokenId}#{hts.serialNumber}</span>
        )}
      </div>

      <div className="pp-hts-grid">
        <div>
          <span className="pp-hts-label">Product</span>
          <span className="pp-hts-value">{hts.productMetadata.productName}</span>
        </div>
        <div>
          <span className="pp-hts-label">Ingredients</span>
          <span className="pp-hts-value">{ingredientCount} tokenized</span>
        </div>
        <div>
          <span className="pp-hts-label">Source</span>
          <span className="pp-hts-value">{hts.source}</span>
        </div>
        <div>
          <span className="pp-hts-label">Metadata Hash</span>
          <span className="pp-hts-value mono">{hts.metadataHash.slice(0, 14)}…</span>
        </div>
      </div>

      <div className="pp-hts-page-row">
        <span className="pp-hts-label">Token Metadata</span>
        <span className="pp-hts-value mono">{hts.metadataPayload}</span>
      </div>

      <div className="pp-hts-page-row">
        <span className="pp-hts-label">Product URL</span>
        <a className="pp-hts-page" href={hts.productMetadata.productPageUrl}>
          {hts.productMetadata.productPageUrl}
        </a>
      </div>

      {!ok && errors.length > 0 && (
        <div className="pp-hts-errors">
          {errors.join(" ")}
        </div>
      )}
    </div>
  );
}
