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
