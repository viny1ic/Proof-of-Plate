import { buildHcsEvents, buildHederaClient, hcsEventsPath, loadDeployment, loadManifest, writeDeployment, writeJson } from "./shared";

async function submitEvents() {
  const manifest = loadManifest();
  const topicId = loadDeployment()?.hcs.topicId || process.env.HEDERA_TOPIC_ID || "0.0.6122026";
  const localEvents = buildHcsEvents(topicId, manifest);

  const hedera = await buildHederaClient();
  if (hedera) {
    const { sdk, client } = hedera;

    try {
      const submitted = [];
      for (const event of localEvents) {
        const tx = await new sdk.TopicMessageSubmitTransaction({
          topicId,
          message: JSON.stringify({
            v: event.v,
            type: event.type,
            batchId: event.batchId,
            claimType: event.claimType,
            issuerRole: event.issuerRole,
            issuerName: event.issuerName,
            evidenceUri: event.evidenceUri,
            evidenceHash: event.evidenceHash,
            createdAt: event.createdAt,
          }),
        }).execute(client);
        const receipt = await tx.getReceipt(client);
        submitted.push({
          ...event,
          transactionId: tx.transactionId?.toString() || event.transactionId,
          sequenceNumber: Number(receipt.topicSequenceNumber || event.sequenceNumber),
        });
      }
      return { topicId, events: submitted };
    } finally {
      client.close();
    }
  }

  return { topicId, events: localEvents };
}

async function main() {
  const result = await submitEvents();
  writeJson(hcsEventsPath, result);
  writeDeployment(result.topicId, loadManifest(), result.events);
  console.log(`Wrote ${hcsEventsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
