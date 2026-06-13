const localMarkers = ["tracebite_local", "0xtracebite"];

function isLocalPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return localMarkers.some((marker) => normalized.includes(marker));
}

export function suiExplorerLink(id: string, kind: "object" | "package" = "object") {
  if (!id || isLocalPlaceholder(id)) return null;
  return `https://suiscan.xyz/testnet/${kind}/${encodeURIComponent(id)}`;
}

export function hederaTopicLink(topicId: string) {
  if (!topicId || isLocalPlaceholder(topicId)) return null;
  return `https://hashscan.io/testnet/topic/${encodeURIComponent(topicId)}`;
}

export function hederaTransactionLink(transactionId: string) {
  if (!transactionId || isLocalPlaceholder(transactionId)) return null;
  return `https://hashscan.io/testnet/transaction/${encodeURIComponent(transactionId)}`;
}

export function hederaTokenLink(tokenId: string) {
  if (!tokenId || isLocalPlaceholder(tokenId)) return null;
  return `https://hashscan.io/testnet/token/${encodeURIComponent(tokenId)}`;
}

export function hederaNftLink(tokenId: string, serialNumber?: number) {
  if (!tokenId || isLocalPlaceholder(tokenId)) return null;
  const suffix = typeof serialNumber === "number" ? `/${serialNumber}` : "";
  return `https://hashscan.io/testnet/token/${encodeURIComponent(tokenId)}${suffix}`;
}

/**
 * Returns the best clickable URL for a Walrus evidence reference.
 * - If the claim has a walrus.url (aggregator URL), use it directly.
 * - If blobId looks like a real Walrus hash (64-char hex), build the aggregator URL.
 * - Otherwise fall back to the local public path if a localDemoPath is present.
 */
export function walrusEvidenceLink(walrus?: {
  url?: string;
  blobId?: string;
  localDemoPath?: string;
} | null): string | null {
  if (!walrus) return null;
  // Real aggregator URL already present
  if (walrus.url && walrus.url.startsWith("https://")) return walrus.url;
  // Real 64-char hex blob ID → build aggregator URL
  if (walrus.blobId && /^[0-9a-fA-F]{64}$/.test(walrus.blobId)) {
    return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${walrus.blobId}`;
  }
  // Demo blob — link to local public evidence file if available
  if (walrus.localDemoPath) {
    // localDemoPath is like /evidence/walrus/organic-juice/raw-data-pack.json
    return walrus.localDemoPath.startsWith("/") ? walrus.localDemoPath : `/${walrus.localDemoPath}`;
  }
  return null;
}
