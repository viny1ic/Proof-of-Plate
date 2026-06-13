import { hcsEventsPath, loadDeployment, loadManifest, readJson, writeDeployment } from "./shared";
import type { HcsEvent } from "../apps/web/lib/types";

const deployment = loadDeployment();
if (!deployment) {
  throw new Error("Missing data/deployment.json. Run npm run hedera:create-topic first.");
}

const hcs = readJson<{ topicId: string; events: HcsEvent[] }>(hcsEventsPath);
const seeded = writeDeployment(hcs.topicId, loadManifest(), hcs.events);

console.log(`Seeded local Sui batch ${seeded.batch.batchId}`);
console.log(`Score ${seeded.batch.scoreVerified}/${seeded.batch.scoreTotal}`);
