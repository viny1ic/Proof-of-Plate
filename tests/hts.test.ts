import test from "node:test";
import assert from "node:assert/strict";
import type { HtsDeployment, ProductBatch, ProductTokenMetadata } from "../apps/web/lib/types";
import {
  PRODUCT_TOKEN_METADATA_SCHEMA,
  buildHtsMetadataPayload,
  buildProductTokenMetadata,
  hashProductTokenMetadata,
  mergeBatchWithHtsMetadata,
  parseProductTokenMetadata,
} from "../apps/web/lib/hts";
import { hederaTokenLink } from "../apps/web/lib/explorer-links";

const baseBatch: ProductBatch = {
  batchId: "TB-MILK-0612",
  productName: "Fallback Milk",
  category: "Fallback Dairy",
  description: "Fallback description",
  netContents: "1 bottle",
  servingSize: "1 cup",
  servingsPerContainer: "1",
  nutritionHighlights: ["fallback"],
  allergens: ["Milk"],
  storageInstructions: "Keep cold",
  ingredients: [
    {
      slug: "fallback-milk",
      name: "Fallback milk",
      role: "Base",
      source: "Fallback source",
      description: "Fallback ingredient",
      verificationNote: "Fallback note",
      relatedClaimTypes: ["lactose_free"],
    },
  ],
  nutrition: [{ label: "Calories", amount: "80", bold: true }],
  hcsTopicId: "0.0.9219010",
  scoreVerified: 4,
  scoreTotal: 5,
  recalled: false,
  createdAt: "2026-06-13T00:21:10Z",
  suiPackageId: "0xpackage",
  suiBatchObjectId: "0xbatch",
};

test("buildProductTokenMetadata maps product fields and product page URL", () => {
  const metadata = buildProductTokenMetadata(baseBatch, "https://proof.example");

  assert.equal(metadata.schema, PRODUCT_TOKEN_METADATA_SCHEMA);
  assert.equal(metadata.batchId, "TB-MILK-0612");
  assert.equal(metadata.productName, "Fallback Milk");
  assert.equal(metadata.productPageUrl, "https://proof.example/p/TB-MILK-0612");
  assert.equal(metadata.hcsTopicId, "0.0.9219010");
  assert.equal(metadata.suiBatchObjectId, "0xbatch");
  assert.deepEqual(metadata.ingredients.map((ingredient) => ingredient.name), ["Fallback milk"]);
  assert.deepEqual(metadata.nutrition?.map((fact) => fact.label), ["Calories"]);
});

test("parseProductTokenMetadata validates schema and expected batch", () => {
  const metadata = buildProductTokenMetadata(baseBatch, "https://proof.example");
  const parsed = parseProductTokenMetadata(JSON.stringify(metadata), "TB-MILK-0612");

  assert.equal(parsed.ok, true);
  assert.equal(parsed.metadata?.productName, "Fallback Milk");

  const mismatch = parseProductTokenMetadata(JSON.stringify(metadata), "WRONG-BATCH");
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.errors.join(" "), /batchId/i);
});

test("hashProductTokenMetadata is stable regardless of object key insertion order", () => {
  const a = {
    schema: PRODUCT_TOKEN_METADATA_SCHEMA,
    batchId: "TB-MILK-0612",
    productName: "Milk",
    category: "Dairy",
    description: "Desc",
    netContents: "52 fl oz",
    servingSize: "1 cup",
    servingsPerContainer: "6",
    nutritionHighlights: ["protein"],
    allergens: ["Milk"],
    storageInstructions: "Keep cold",
    ingredients: [],
    productPageUrl: "https://proof.example/p/TB-MILK-0612",
    hcsTopicId: "0.0.9219010",
    suiBatchObjectId: "0xbatch",
  } satisfies ProductTokenMetadata;

  const b = {
    suiBatchObjectId: "0xbatch",
    hcsTopicId: "0.0.9219010",
    productPageUrl: "https://proof.example/p/TB-MILK-0612",
    ingredients: [],
    storageInstructions: "Keep cold",
    allergens: ["Milk"],
    nutritionHighlights: ["protein"],
    servingsPerContainer: "6",
    servingSize: "1 cup",
    netContents: "52 fl oz",
    description: "Desc",
    category: "Dairy",
    productName: "Milk",
    batchId: "TB-MILK-0612",
    schema: PRODUCT_TOKEN_METADATA_SCHEMA,
  } satisfies ProductTokenMetadata;

  assert.equal(hashProductTokenMetadata(a), hashProductTokenMetadata(b));
});

test("buildHtsMetadataPayload is compact enough for HTS NFT metadata", () => {
  const metadata = buildProductTokenMetadata(baseBatch, "https://proof.example");
  const hash = hashProductTokenMetadata(metadata);
  const payload = buildHtsMetadataPayload(metadata.batchId, hash);

  assert.equal(payload, `pop:TB-MILK-0612:${hash}`);
  assert.ok(Buffer.byteLength(payload, "utf8") <= 100);
});

test("mergeBatchWithHtsMetadata overlays product fields and mirrors token IDs", () => {
  const tokenMetadata = {
    ...buildProductTokenMetadata(baseBatch, "https://proof.example"),
    productName: "HTS Milk",
    category: "HTS Dairy",
    ingredients: [
      {
        slug: "hts-milk",
        name: "HTS milk",
        role: "Tokenized base",
        source: "HTS metadata",
        description: "Loaded from token metadata",
        verificationNote: "Descriptive token metadata only",
        relatedClaimTypes: [],
      },
    ],
  } satisfies ProductTokenMetadata;

  const hts: HtsDeployment = {
    network: "testnet",
    tokenId: "0.0.123456",
    serialNumber: 1,
    nftId: "0.0.123456/1",
    tokenType: "NON_FUNGIBLE_UNIQUE",
    supplyType: "FINITE",
    maxSupply: 1,
    tokenName: "Proof of Plate TB-MILK-0612",
    tokenSymbol: "POPMLK",
    metadataPayload: buildHtsMetadataPayload(tokenMetadata.batchId, hashProductTokenMetadata(tokenMetadata)),
    metadataHash: hashProductTokenMetadata(tokenMetadata),
    productMetadata: tokenMetadata,
    updatedAt: "2026-06-13T00:00:00.000Z",
    source: "hedera",
  };

  const merged = mergeBatchWithHtsMetadata(baseBatch, hts);

  assert.equal(merged.productName, "HTS Milk");
  assert.equal(merged.category, "HTS Dairy");
  assert.equal(merged.ingredients[0].name, "HTS milk");
  assert.equal(merged.htsTokenId, "0.0.123456");
  assert.equal(merged.htsSerialNumber, 1);
  assert.equal(merged.htsNftId, "0.0.123456/1");
  assert.equal(merged.htsMetadataHash, hts.metadataHash);
});

test("hederaTokenLink links real token IDs and suppresses local placeholders", () => {
  assert.equal(hederaTokenLink("0.0.123456"), "https://hashscan.io/testnet/token/0.0.123456");
  assert.equal(hederaTokenLink("0.0.tracebite_local_token"), null);
});
