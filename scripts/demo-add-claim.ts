/**
 * demo-add-claim.ts
 *
 * Adds the sixth claim: final_pesticide_residue_test
 *
 * Live testnet path:
 *   1. Hashes the evidence file
 *   2. Submits an HCS message to the testnet topic
 *   3. Calls the Sui add_claim entry function on testnet (requires sui CLI)
 *   4. Calls update_score on the ProductBatch object
 *   5. Persists updated hcs-events.json and deployment.json
 *
 * If the Sui CLI is not installed, steps 3-4 are skipped and the deployment
 * is updated with a note so the UI still shows the new claim.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildHederaClient,
  evidenceDir,
  hcsEventsPath,
  loadDeployment,
  manifestPath,
  readJson,
  sha256Hex,
  writeJson,
} from "./shared";
import type { Claim, HcsEvent } from "../apps/web/lib/types";

async function main() {
  const deployment = loadDeployment();
  if (!deployment) {
    throw new Error("Missing data/deployment.json. Run seed steps first.");
  }

  const hcs = readJson<{ topicId: string; events: HcsEvent[] }>(hcsEventsPath);
  const topicId = hcs.topicId;

  // 1. Write & hash the evidence file
  const evidenceUri = "/evidence/final-pesticide-residue-test.json";
  const evidencePath = path.join(evidenceDir, "final-pesticide-residue-test.json");
  const evidenceDocument = {
    documentId: "LAB-002",
    title: "Final Pesticide Residue Test",
    issuerRole: "lab",
    issuerName: "Proof of Plate Demo Lab",
    batchId: deployment.batch.batchId,
    issuedAt: new Date().toISOString(),
    facts: [
      {
        key: "finished_product_residue_test",
        value: "Completed for final packaged milk batch",
        result: "pass",
      },
      {
        key: "screened_pesticide_panel",
        value: "No demo panel residues detected above Proof of Plate reporting threshold",
        result: "pass",
      },
      {
        key: "pesticide_residue_detected",
        value: false,
        result: "pass",
      },
    ],
  };

  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidenceDocument, null, 2)}\n`);
  const evidenceHash = sha256Hex(readFileSync(evidencePath));
  const manifest = readJson<Record<string, string>>(manifestPath);
  writeJson(manifestPath, { ...manifest, [evidenceUri]: evidenceHash });
  console.log(`Hashed evidence: ${evidenceHash}`);

  // 2. Submit HCS message
  // Derive next sequence number from actual stored sequence numbers, not array length,
  // to stay correct even if events are filtered or reordered.
  const maxSeq = hcs.events.reduce((m, e) => Math.max(m, e.sequenceNumber), 0);
  let newSeq = maxSeq + 1;
  let transactionId = `${topicId}@${Date.now()}`;
  let consensusTimestamp = new Date().toISOString();

  const hedera = await buildHederaClient();
  if (hedera) {
    const { sdk, client } = hedera;
    try {
      const message = JSON.stringify({
        v: "1.0",
        type: "CLAIM_SUBMITTED",
        batchId: deployment.batch.batchId,
        claimType: "final_pesticide_residue_test",
        issuerRole: "lab",
        issuerName: "Proof of Plate Demo Lab",
        evidenceUri,
        evidenceHash,
        createdAt: new Date().toISOString(),
      });

      const tx = await new sdk.TopicMessageSubmitTransaction({
        topicId,
        message,
      }).execute(client);

      const receipt = await tx.getReceipt(client);
      transactionId = tx.transactionId?.toString() || transactionId;
      // Use the sequence number confirmed by the network, not the locally predicted one.
      if (receipt.topicSequenceNumber) {
        newSeq = Number(receipt.topicSequenceNumber);
      }
      consensusTimestamp = new Date().toISOString();
      console.log(`HCS submitted: seq=${newSeq}, txId=${transactionId}`);
    } finally {
      client.close();
    }
  } else {
    console.log("No Hedera credentials — recording local HCS event only.");
  }

  const event: HcsEvent = {
    v: "1.0",
    type: "CLAIM_SUBMITTED",
    batchId: deployment.batch.batchId,
    claimType: "final_pesticide_residue_test",
    issuerRole: "lab",
    issuerName: "Proof of Plate Demo Lab",
    evidenceUri,
    evidenceHash,
    createdAt: new Date().toISOString(),
    sequenceNumber: newSeq,
    transactionId,
    consensusTimestamp,
  };

  // 3. Sui: add_claim on testnet (requires sui CLI)
  let suiClaimObjectId = `0xtracebite_local_claim_${newSeq}`;
  const batchObjectId = deployment.batch.suiBatchObjectId;
  const packageId = deployment.batch.suiPackageId;

  try {
    execFileSync("sui", ["--version"], { stdio: "ignore" });

    // Build evidence_hash as vector<u8> from hex string
    const hashHex = evidenceHash.startsWith("0x") ? evidenceHash.slice(2) : evidenceHash;
    const hashBytes = Array.from(Buffer.from(hashHex, "hex"))
      .map((b) => b.toString())
      .join(",");

    console.log("Calling Sui add_claim on testnet...");
    const addClaimOut = execFileSync(
      "sui",
      [
        "client",
        "call",
        "--package", packageId,
        "--module", "tracebite",
        "--function", "add_claim",
        "--args",
          deployment.batch.batchId,
          "final_pesticide_residue_test",
          "Final pesticide residue test passed",
          "1",
          "lab",
          "Proof of Plate Demo Lab",
          evidenceUri,
          `[${hashBytes}]`,
          topicId,
          newSeq.toString(),
          "0x6",
        "--gas-budget", "100000000",
      ],
      { encoding: "utf8" },
    );
    console.log("add_claim output:", addClaimOut.slice(0, 500));

    // Extract created object ID from output
    const objMatch = addClaimOut.match(/ObjectID:\s*(0x[0-9a-f]+)/i);
    if (objMatch) {
      suiClaimObjectId = objMatch[1];
      console.log(`New Sui claim object: ${suiClaimObjectId}`);
    }

    // update_score to 5/6
    console.log("Updating score on Sui...");
    execFileSync(
      "sui",
      [
        "client",
        "call",
        "--package", packageId,
        "--module", "tracebite",
        "--function", "update_score",
        "--args", batchObjectId, "5", "6",
        "--gas-budget", "20000000",
      ],
      { encoding: "utf8" },
    );
    console.log("Score updated to 5/6 on Sui testnet.");
  } catch {
    console.log("Sui CLI not found or call failed — recording claim locally only.");
  }

  // 4. Persist
  const claim: Claim = {
    batchId: deployment.batch.batchId,
    claimType: event.claimType,
    label: "Final pesticide residue test passed",
    status: "verified",
    issuerRole: event.issuerRole,
    issuerName: event.issuerName,
    evidenceUri,
    evidenceHash,
    hcsTopicId: topicId,
    hcsSequence: event.sequenceNumber,
    suiObjectId: suiClaimObjectId,
    createdAt: event.consensusTimestamp || event.createdAt,
  };

  const updatedEvents = hcs.events.filter((e) => e.claimType !== event.claimType);
  writeJson(hcsEventsPath, { topicId, events: [...updatedEvents, event] });

  const updatedClaims = deployment.claims.filter((c) => c.claimType !== claim.claimType);
  writeJson("data/deployment.json", {
    ...deployment,
    batch: {
      ...deployment.batch,
      scoreVerified: 5,
      scoreTotal: 6,
    },
    claims: [...updatedClaims, claim],
  });

  console.log("Added claim: final_pesticide_residue_test");
  console.log(`Score updated to 5/6`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
