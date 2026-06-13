import { buildHederaClient, buildLocalTopicId, ensureDataDir, loadDeployment, loadManifest, writeDeployment } from "./shared";

ensureDataDir();

async function createTopic() {
  const hedera = await buildHederaClient();
  if (hedera) {
    const { sdk, client } = hedera;
    try {
      const tx = await new sdk.TopicCreateTransaction()
        .setTopicMemo("Proof of Plate batch topic for TB-MILK-0612")
        .execute(client);
      const receipt = await tx.getReceipt(client);
      const topicId = receipt.topicId?.toString();
      if (!topicId) throw new Error("Hedera topic creation did not return a topic ID.");
      return topicId;
    } finally {
      client.close();
    }
  }

  return buildLocalTopicId();
}

async function main() {
  const topicId = await createTopic();
  const manifest = loadManifest();
  const existing = loadDeployment();
  writeDeployment(topicId, manifest, []);

  console.log(existing ? `Updated HCS topic ID: ${topicId}` : `Created HCS topic ID: ${topicId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
