/**
 * tests/page-chain-links.test.ts
 *
 * Verifies BOTH product pages (milk + juice) have real on-chain IDs for:
 *   - Sui Explorer links (batch + per-claim objects on suiscan.xyz)
 *   - HashScan topic links (Hedera HCS)
 *   - HashScan HTS token links (Hedera HTS metadata token)
 *   - Third-party certification SBT badges (real HTS NFT tokens on HashScan)
 *   - Walrus evidence references with verified SHA-256 hash (juice)
 *   - No fake/local placeholder IDs anywhere
 */
import test from "node:test";
import assert from "node:assert/strict";

import { getBatch, getClaims, getHtsMetadata } from "../apps/web/lib/data";
import { getCertificationsForBatch } from "../apps/web/lib/certifications";
import {
  suiExplorerLink,
  hederaTopicLink,
  hederaTokenLink,
  hederaNftLink,
} from "../apps/web/lib/explorer-links";
import { getWalrusEvidenceRecord } from "../apps/web/lib/walrus";

// ── regex constants ──────────────────────────────────────────────────────────
const REAL_SUI_OBJ         = /^0x[0-9a-fA-F]{64}$/;
const REAL_HEDERA_TOPIC    = /^0\.0\.\d+$/;
const REAL_HEDERA_TOKEN    = /^0\.0\.\d+$/;
const REAL_HASHSCAN_TOPIC  = /^https:\/\/hashscan\.io\/testnet\/topic\/0\.0\.\d+/;
const REAL_HASHSCAN_TOKEN  = /^https:\/\/hashscan\.io\/testnet\/token\/0\.0\.\d+/;
const REAL_SUISCAN_OBJ     = /^https:\/\/suiscan\.xyz\/testnet\/object\/0x[0-9a-fA-F]{64}/;
const NO_PLACEHOLDER       = /tracebite_local/;

// ── assertion helpers ────────────────────────────────────────────────────────
function assertRealSuiLink(id: string | undefined, label: string) {
  assert.match(id ?? "", REAL_SUI_OBJ, `${label}: not a real Sui object ID: "${id}"`);
  const link = suiExplorerLink(id!);
  assert.ok(link, `${label}: suiExplorerLink returned null for "${id}"`);
  assert.match(link!, REAL_SUISCAN_OBJ, `${label}: expected suiscan.xyz/testnet/object link`);
}

function assertRealHashScanTopic(topicId: string | undefined, label: string) {
  assert.match(topicId ?? "", REAL_HEDERA_TOPIC, `${label}: not a real HCS topic ID: "${topicId}"`);
  const link = hederaTopicLink(topicId!);
  assert.ok(link, `${label}: hederaTopicLink returned null`);
  assert.match(link!, REAL_HASHSCAN_TOPIC, `${label}: expected hashscan.io topic link`);
}

function assertRealHashScanToken(tokenId: string | undefined, label: string) {
  assert.match(tokenId ?? "", REAL_HEDERA_TOKEN, `${label}: not a real HTS token ID: "${tokenId}"`);
  const link = hederaTokenLink(tokenId!);
  assert.ok(link, `${label}: hederaTokenLink returned null`);
  assert.match(link!, REAL_HASHSCAN_TOKEN, `${label}: expected hashscan.io token link`);
}

// ════════════════════════════════════════════════════════════════════════════
//  MILK PAGE — TB-MILK-0612
// ════════════════════════════════════════════════════════════════════════════

test("milk: batch has real Sui object linking to Suiscan", () => {
  const batch = getBatch("TB-MILK-0612");
  assertRealSuiLink(batch.suiBatchObjectId, "milk.suiBatchObjectId");
});

test("milk: batch HCS topic links to HashScan", () => {
  const batch = getBatch("TB-MILK-0612");
  assertRealHashScanTopic(batch.hcsTopicId, "milk.hcsTopicId");
});

test("milk: HTS product-batch token exists and links to HashScan", () => {
  const result = getHtsMetadata("TB-MILK-0612");
  assert.ok(result.hts, "milk: HTS record missing — run npm run hedera:create-token");
  assert.ok(result.ok, `milk: HTS metadata not verified — errors: ${JSON.stringify(result.errors)}`);
  assertRealHashScanToken(result.hts!.tokenId, "milk.hts.tokenId");
  const nftLink = hederaNftLink(result.hts!.tokenId, result.hts!.serialNumber);
  assert.ok(nftLink, "milk: HTS NFT link must not be null");
  assert.match(nftLink!, /hashscan\.io\/testnet\/token\/0\.0\.\d+\/\d+/, "milk: HTS NFT serial link must go to hashscan");
});

test("milk: every claim has a real Sui object linking to Suiscan", () => {
  const claims = getClaims("TB-MILK-0612");
  assert.ok(claims.length > 0, "milk: must have at least one claim");
  for (const claim of claims) {
    assertRealSuiLink(claim.suiObjectId, `milk.claim[${claim.claimType}].suiObjectId`);
  }
});

test("milk: every claim HCS topic links to HashScan", () => {
  const claims = getClaims("TB-MILK-0612");
  for (const claim of claims) {
    assertRealHashScanTopic(claim.hcsTopicId, `milk.claim[${claim.claimType}].hcsTopicId`);
  }
});

test("milk: has active third-party certification SBTs with real HTS tokens on HashScan", () => {
  const certs = getCertificationsForBatch("TB-MILK-0612");
  assert.ok(certs.length > 0, "milk: must have at least one certification SBT");
  const active = certs.filter(c => c.status === "active");
  assert.ok(active.length > 0, "milk: must have at least one active certification");
  for (const cert of active) {
    assertRealHashScanToken(cert.tokenId, `milk.cert[${cert.certId}].tokenId`);
    assert.ok(cert.explorerUrl, `milk.cert[${cert.certId}] must have an explorerUrl`);
    assert.match(cert.explorerUrl!, REAL_HASHSCAN_TOKEN, `milk.cert[${cert.certId}].explorerUrl must link to hashscan token`);
  }
});

test("milk: certification SBTs are soulbound (HEDERA_HTS_NFT, non-transferable, authority-issued)", () => {
  const certs = getCertificationsForBatch("TB-MILK-0612");
  for (const cert of certs) {
    assert.equal(cert.sbt.tokenStandard, "HEDERA_HTS_NFT",            `milk.cert[${cert.certId}] must use HEDERA_HTS_NFT`);
    assert.equal(cert.sbt.nonTransferable, true,                      `milk.cert[${cert.certId}] must be non-transferable`);
    assert.equal(cert.sbt.issuanceMode, "authority_treasury_issued",  `milk.cert[${cert.certId}] must be authority-issued`);
    assert.ok(cert.serialNumber > 0, `milk.cert[${cert.certId}] must have a minted serial number`);
  }
});

test("milk: no fake/local placeholder IDs in deployment data", () => {
  const batch   = getBatch("TB-MILK-0612");
  const claims  = getClaims("TB-MILK-0612");
  const { hts } = getHtsMetadata("TB-MILK-0612");
  const certs   = getCertificationsForBatch("TB-MILK-0612");

  assert.doesNotMatch(batch.suiBatchObjectId, NO_PLACEHOLDER, "milk batch.suiBatchObjectId must not be a placeholder");
  assert.doesNotMatch(batch.hcsTopicId,       NO_PLACEHOLDER, "milk batch.hcsTopicId must not be a placeholder");
  assert.doesNotMatch(hts?.tokenId ?? "",     NO_PLACEHOLDER, "milk hts.tokenId must not be a placeholder");
  for (const claim of claims)
    assert.doesNotMatch(claim.suiObjectId ?? "", NO_PLACEHOLDER, `milk claim[${claim.claimType}].suiObjectId must not be a placeholder`);
  for (const cert of certs)
    assert.doesNotMatch(cert.tokenId, NO_PLACEHOLDER, `milk cert[${cert.certId}].tokenId must not be a placeholder`);
});

// ════════════════════════════════════════════════════════════════════════════
//  JUICE PAGE — POP-JUICE-ORG-APPLE-0613
// ════════════════════════════════════════════════════════════════════════════

test("juice: batch has real Sui object linking to Suiscan", () => {
  const batch = getBatch("POP-JUICE-ORG-APPLE-0613");
  assertRealSuiLink(batch.suiBatchObjectId, "juice.suiBatchObjectId");
});

test("juice: batch HCS topic links to HashScan", () => {
  const batch = getBatch("POP-JUICE-ORG-APPLE-0613");
  assertRealHashScanTopic(batch.hcsTopicId, "juice.hcsTopicId");
});

test("juice: HTS product-batch token exists and links to HashScan", () => {
  const result = getHtsMetadata("POP-JUICE-ORG-APPLE-0613");
  assert.ok(result.hts, "juice: HTS record missing — run npm run hedera:create-token for juice");
  assert.ok(result.ok, `juice: HTS metadata not verified — errors: ${JSON.stringify(result.errors)}`);
  assertRealHashScanToken(result.hts!.tokenId, "juice.hts.tokenId");
});

test("juice: every claim has a real Sui object linking to Suiscan", () => {
  const claims = getClaims("POP-JUICE-ORG-APPLE-0613");
  assert.ok(claims.length > 0, "juice: must have at least one claim");
  for (const claim of claims) {
    assertRealSuiLink(claim.suiObjectId, `juice.claim[${claim.claimType}].suiObjectId`);
  }
});

test("juice: every claim HCS topic links to HashScan", () => {
  const claims = getClaims("POP-JUICE-ORG-APPLE-0613");
  for (const claim of claims) {
    assertRealHashScanTopic(claim.hcsTopicId, `juice.claim[${claim.claimType}].hcsTopicId`);
  }
});

test("juice: all claims are Walrus-backed with a consistent verified SHA-256 hash", () => {
  const record = getWalrusEvidenceRecord("POP-JUICE-ORG-APPLE-0613");
  assert.match(record.evidenceHash, /^0x[0-9a-fA-F]{64}$/, "juice: Walrus evidenceHash must be a valid SHA-256 hex");
  assert.match(record.evidenceUri,  /^walrus:\/\//,         "juice: evidenceUri must start with walrus://");

  const claims = getClaims("POP-JUICE-ORG-APPLE-0613");
  assert.ok(claims.length > 0, "juice: must have at least one claim");
  for (const claim of claims) {
    assert.equal(claim.evidenceStorage, "walrus", `juice.claim[${claim.claimType}] must use walrus storage`);
    assert.ok(claim.walrus,                        `juice.claim[${claim.claimType}] must have a walrus evidence pointer`);
    assert.equal(claim.evidenceHash, record.evidenceHash, `juice.claim[${claim.claimType}] evidenceHash must match Walrus record`);
  }
});

test("juice: Walrus evidence is anchored on a real Hedera HCS topic", () => {
  const record = getWalrusEvidenceRecord("POP-JUICE-ORG-APPLE-0613");
  assert.ok(record.hcsTopicId, "juice: Walrus record must have a hcsTopicId");
  assertRealHashScanTopic(record.hcsTopicId!, "juice.walrusRecord.hcsTopicId");
  assert.ok(Array.isArray(record.hcsEvents) && record.hcsEvents.length > 0, "juice: Walrus record must have submitted HCS events");
});

test("juice: no fake/local placeholder IDs in deployment data", () => {
  const batch  = getBatch("POP-JUICE-ORG-APPLE-0613");
  const claims = getClaims("POP-JUICE-ORG-APPLE-0613");

  assert.doesNotMatch(batch.suiBatchObjectId, NO_PLACEHOLDER, "juice batch.suiBatchObjectId must not be a placeholder");
  assert.doesNotMatch(batch.hcsTopicId,       NO_PLACEHOLDER, "juice batch.hcsTopicId must not be a placeholder");
  for (const claim of claims)
    assert.doesNotMatch(claim.suiObjectId ?? "", NO_PLACEHOLDER, `juice claim[${claim.claimType}].suiObjectId must not be a placeholder`);
});
