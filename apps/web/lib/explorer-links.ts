const localMarkers = ["tracebite_local", "0xtracebite"];

function isLocalPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return localMarkers.some((marker) => normalized.includes(marker));
}

export function suiExplorerLink(id: string, kind: "object" | "package" = "object") {
  if (!id || isLocalPlaceholder(id)) return null;
  const path = kind === "package" ? "object" : kind;
  return `https://suiexplorer.com/${path}/${encodeURIComponent(id)}?network=testnet`;
}

export function hederaTopicLink(topicId: string) {
  if (!topicId || isLocalPlaceholder(topicId)) return null;
  return `https://hashscan.io/testnet/topic/${encodeURIComponent(topicId)}`;
}

export function hederaTransactionLink(transactionId: string) {
  if (!transactionId || isLocalPlaceholder(transactionId)) return null;
  return `https://hashscan.io/testnet/transaction/${encodeURIComponent(transactionId)}`;
}
