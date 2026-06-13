import test from "node:test";
import assert from "node:assert/strict";

import { GET as getEvidenceApi } from "../apps/web/app/api/evidence/route";
import { getBatch, getClaims, getDeployment } from "../apps/web/lib/data";
import { getEvidence, hashEvidence, verifyEvidenceHash } from "../apps/web/lib/evidence";
import {
  getWalrusEvidence,
  getWalrusEvidenceRecord,
  hashWalrusEvidence,
  listWalrusEvidenceRecords,
  parseWalrusReference,
  verifyWalrusEvidence,
} from "../apps/web/lib/walrus";

const ORGANIC_JUICE_BATCH_ID = "POP-JUICE-ORG-APPLE-0613";
const ORGANIC_JUICE_BLOB_ID = "pop-juice-org-apple-0613-raw-data-pack-v1";
const ZERO_HASH = `0x${"0".repeat(64)}`;

test("parseWalrusReference accepts demo Walrus URIs and aggregator blob URLs", () => {
  assert.deepEqual(parseWalrusReference(`walrus://blob/${ORGANIC_JUICE_BLOB_ID}`), {
    kind: "blob",
    blobId: ORGANIC_JUICE_BLOB_ID,
  });

  assert.deepEqual(
    parseWalrusReference(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${ORGANIC_JUICE_BLOB_ID}`),
    {
      kind: "blob",
      blobId: ORGANIC_JUICE_BLOB_ID,
      url: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${ORGANIC_JUICE_BLOB_ID}`,
    },
  );

  assert.deepEqual(parseWalrusReference("walrus://object/0xwalrus_demo_organic_juice_raw_pack_0613"), {
    kind: "object",
    objectId: "0xwalrus_demo_organic_juice_raw_pack_0613",
  });

  assert.throws(() => parseWalrusReference("/evidence/lab-results.json"), /not a Walrus reference/i);
  assert.throws(() => parseWalrusReference("walrus://blob/../../escape"), /invalid Walrus blob ID/i);
});

test("organic juice raw data pack is indexed as Walrus evidence and verifies by SHA-256", () => {
  const records = listWalrusEvidenceRecords();
  assert.equal(records.length, 1);

  const record = getWalrusEvidenceRecord(ORGANIC_JUICE_BATCH_ID);
  assert.equal(record.storage, "walrus");
  assert.equal(record.batchId, ORGANIC_JUICE_BATCH_ID);
  assert.equal(record.productName, "Proof of Plate Organic Apple Juice");
  assert.equal(record.claimCount, 16);
  assert.equal(record.blobId, ORGANIC_JUICE_BLOB_ID);
  assert.equal(record.evidenceUri, `walrus://blob/${ORGANIC_JUICE_BLOB_ID}`);
  assert.match(record.url, /aggregator\.walrus-testnet\.walrus\.space\/v1\/blobs/);
  assert.equal(record.objectId, "0xwalrus_demo_organic_juice_raw_pack_0613");
  assert.match(record.evidenceHash, /^0x[0-9a-f]{64}$/);

  const evidence = getWalrusEvidence(record.evidenceUri) as Record<string, unknown>;
  assert.equal(evidence.batchId, ORGANIC_JUICE_BATCH_ID);
  assert.equal(evidence.title, "Proof of Plate Organic Juice Lifecycle Raw Data Pack");
  assert.equal((evidence.product as { netContents: string }).netContents, "12 fl oz (355 mL)");
  assert.equal((evidence.claims as unknown[]).length, 16);
  assert.match(evidence.rawExtractedText as string, /Proof of Plate Organic Apple Juice/);
  assert.match(evidence.rawExtractedText as string, /Organic handler and label verification/);

  const actualHash = hashWalrusEvidence(record.evidenceUri);
  assert.equal(actualHash, record.evidenceHash);
  assert.deepEqual(verifyWalrusEvidence(record.evidenceUri), {
    ok: true,
    actualHash,
    expectedHash: record.evidenceHash,
    storage: "walrus",
    blobId: ORGANIC_JUICE_BLOB_ID,
    objectId: "0xwalrus_demo_organic_juice_raw_pack_0613",
    url: record.url,
    file: "raw-data-pack.json",
  });

  const mismatch = verifyWalrusEvidence(record.evidenceUri, ZERO_HASH);
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.actualHash, actualHash);
  assert.equal(mismatch.expectedHash, ZERO_HASH);
});

test("generic evidence helpers still verify inline JSON evidence and dispatch Walrus evidence", () => {
  const inlineClaim = getDeployment().claims.find((candidate) => candidate.claimType === "lactose_free");
  assert.ok(inlineClaim, "expected seeded lactose_free claim");
  assert.equal(inlineClaim.evidenceStorage ?? "inline", "inline");
  assert.equal(hashEvidence(inlineClaim.evidenceUri), inlineClaim.evidenceHash);
  assert.equal(verifyEvidenceHash(inlineClaim.evidenceUri, inlineClaim.evidenceHash).ok, true);

  const walrusRecord = getWalrusEvidenceRecord(ORGANIC_JUICE_BATCH_ID);
  assert.equal(hashEvidence(walrusRecord.evidenceUri), walrusRecord.evidenceHash);
  assert.equal(verifyEvidenceHash(walrusRecord.evidenceUri, walrusRecord.evidenceHash).ok, true);

  const evidence = getEvidence(walrusRecord.evidenceUri) as unknown as { storage: string; batchId: string };
  assert.equal(evidence.storage, "walrus");
  assert.equal(evidence.batchId, ORGANIC_JUICE_BATCH_ID);
});

test("organic juice product page data is derived from the Walrus evidence pack", () => {
  const batch = getBatch(ORGANIC_JUICE_BATCH_ID);
  const claims = getClaims(ORGANIC_JUICE_BATCH_ID);
  const record = getWalrusEvidenceRecord(ORGANIC_JUICE_BATCH_ID);

  assert.equal(batch.batchId, ORGANIC_JUICE_BATCH_ID);
  assert.equal(batch.productName, "Proof of Plate Organic Apple Juice");
  assert.equal(batch.netContents, "12 fl oz (355 mL)");
  assert.equal(batch.scoreTotal, 16);
  assert.equal(batch.scoreVerified, 16);
  assert.equal(batch.hcsTopicId, record.hcsTopicId);
  assert.equal(claims.length, 16);
  assert.equal(claims[0].evidenceStorage, "walrus");
  assert.equal(claims[0].evidenceHash, record.evidenceHash);
  assert.equal(claims[0].walrus?.blobId, ORGANIC_JUICE_BLOB_ID);
});

test("GET /api/evidence verifies a Walrus evidence reference through the same hash API", async () => {
  const record = getWalrusEvidenceRecord(ORGANIC_JUICE_BATCH_ID);
  const params = new URLSearchParams({ uri: record.evidenceUri, expectedHash: record.evidenceHash });

  const response = await getEvidenceApi(new Request(`http://localhost/api/evidence?${params}`));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.evidence.batchId, ORGANIC_JUICE_BATCH_ID);
  assert.equal(body.evidence.storage, "walrus");
  assert.equal(body.evidence.claims.length, 16);
  assert.equal(body.verification.ok, true);
  assert.equal(body.verification.storage, "walrus");
  assert.equal(body.verification.blobId, ORGANIC_JUICE_BLOB_ID);
});
