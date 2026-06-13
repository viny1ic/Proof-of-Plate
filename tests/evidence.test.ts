import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { HcsEvent } from "../apps/web/lib/types";
import { getDeployment } from "../apps/web/lib/data";
import { hashEvidence, verifyEvidenceHash } from "../apps/web/lib/evidence";

const ZERO_HASH = `0x${"0".repeat(64)}`;
const EVENT_HASH = `0x${"a".repeat(64)}`;
const MANIFEST_HASH = `0x${"b".repeat(64)}`;

function baseEvent(overrides: Partial<HcsEvent> = {}): HcsEvent {
  return {
    v: "1.0",
    type: "CLAIM_SUBMITTED",
    batchId: "TB-MILK-0612",
    claimType: "lactose_free",
    issuerRole: "lab",
    issuerName: "Proof of Plate Demo Lab",
    evidenceUri: "/evidence/lab-results.json",
    evidenceHash: EVENT_HASH,
    createdAt: "2026-06-12T21:00:00.000Z",
    sequenceNumber: 1,
    transactionId: "0.0.test@1",
    ...overrides,
  };
}

test("verifyEvidenceHash compares evidence file bytes to the stored claim hash", () => {
  const claim = getDeployment().claims.find((candidate) => candidate.claimType === "lactose_free");
  assert.ok(claim, "expected seeded lactose_free claim");

  const actualHash = hashEvidence(claim.evidenceUri);
  assert.equal(actualHash, claim.evidenceHash);

  assert.deepEqual(verifyEvidenceHash(claim.evidenceUri, claim.evidenceHash), {
    ok: true,
    actualHash,
    expectedHash: claim.evidenceHash,
    file: "lab-results.json",
  });

  const mismatch = verifyEvidenceHash(claim.evidenceUri, ZERO_HASH);
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.actualHash, actualHash);
  assert.equal(mismatch.expectedHash, ZERO_HASH);
});

test("writeDeployment refuses to backfill a missing HCS/stored claim evidence hash from the manifest", async () => {
  const originalCwd = process.cwd();
  const isolatedRoot = mkdtempSync(path.join(tmpdir(), "pop-evidence-"));
  process.chdir(isolatedRoot);
  try {
    const shared = await import(`../scripts/shared.ts?missing-hash=${Date.now()}`);

    assert.throws(
      () =>
        shared.writeDeployment(
          "0.0.test",
          { "/evidence/lab-results.json": MANIFEST_HASH },
          [baseEvent({ evidenceHash: "" })],
        ),
      /missing evidenceHash/i,
    );
  } finally {
    process.chdir(originalCwd);
    await rm(isolatedRoot, { recursive: true, force: true });
  }
});

test("writeDeployment stores the HCS/stored claim evidence hash even when manifest disagrees", async () => {
  const originalCwd = process.cwd();
  const isolatedRoot = mkdtempSync(path.join(tmpdir(), "pop-evidence-"));
  process.chdir(isolatedRoot);
  try {
    const shared = await import(`../scripts/shared.ts?stored-hash=${Date.now()}`);
    const deployment = shared.writeDeployment(
      "0.0.test",
      { "/evidence/lab-results.json": MANIFEST_HASH },
      [baseEvent()],
    );

    assert.equal(deployment.claims[0]?.evidenceHash, EVENT_HASH);
    assert.notEqual(deployment.claims[0]?.evidenceHash, MANIFEST_HASH);
  } finally {
    process.chdir(originalCwd);
    await rm(isolatedRoot, { recursive: true, force: true });
  }
});

test("writeDeployment preserves existing real Sui claim object IDs when HCS data is refreshed", async () => {
  const originalCwd = process.cwd();
  const isolatedRoot = mkdtempSync(path.join(tmpdir(), "pop-evidence-"));
  process.chdir(isolatedRoot);
  try {
    mkdirSync("data", { recursive: true });
    const realSuiClaimId = "0x7a5242b543e7c20e584e8d4045bb277226a826c2cecd95f4f9b8f8083dddf345";
    writeFileSync(
      "data/deployment.json",
      JSON.stringify(
        {
          mode: "testnet",
          batch: { batchId: "TB-MILK-0612", createdAt: "2026-06-13T00:00:00.000Z" },
          claims: [{ batchId: "TB-MILK-0612", claimType: "lactose_free", suiObjectId: realSuiClaimId }],
          hcs: { topicId: "0.0.old", network: "testnet" },
        },
        null,
        2,
      ),
    );

    const shared = await import(`../scripts/shared.ts?preserve-sui=${Date.now()}`);
    const deployment = shared.writeDeployment("0.0.new", { "/evidence/lab-results.json": MANIFEST_HASH }, [baseEvent()]);

    assert.equal(deployment.claims[0]?.suiObjectId, realSuiClaimId);
    assert.equal(deployment.claims[0]?.hcsTopicId, "0.0.new");
  } finally {
    process.chdir(originalCwd);
    await rm(isolatedRoot, { recursive: true, force: true });
  }
});

test("buildHcsEvents requires the manifest to contain every seed evidence hash", async () => {
  const shared = await import(`../scripts/shared.ts?manifest-required=${Date.now()}`);

  assert.throws(
    () => shared.buildHcsEvents("0.0.test", {}),
    /missing evidence hash.*evidence-manifest/i,
  );
});
