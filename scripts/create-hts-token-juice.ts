/**
 * create-hts-token-juice.ts
 *
 * Creates a Hedera HTS NFT product-batch metadata token for the Organic Juice
 * product, storing a compact pointer to the Walrus evidence pack.
 * Saves the result as deployment.juiceHts in data/deployment.json.
 */
import {
  buildHederaClient,
  buildLocalHtsTokenId,
  loadDeployment,
  writeJson,
} from "./shared";
import type { Deployment, HtsDeployment } from "../apps/web/lib/types";
import {
  buildHtsMetadataPayload,
  hashProductTokenMetadata,
  stableStringify,
} from "../apps/web/lib/hts";
import { getWalrusEvidenceRecord } from "../apps/web/lib/walrus";
import { readFileSync } from "node:fs";

const JUICE_BATCH_ID  = "POP-JUICE-ORG-APPLE-0613";
const DEPLOYMENT_PATH = "data/deployment.json";

function buildJuiceProductMetadata(deployment: Deployment, baseUrl?: string) {
  const jb = (deployment as any).juiceBatch;
  if (!jb) throw new Error("No juiceBatch in deployment.json — run npm run sui:seed-juice first.");
  const record = getWalrusEvidenceRecord(JUICE_BATCH_ID);
  const raw = JSON.parse(readFileSync("public/evidence/walrus/organic-juice/raw-data-pack.json", "utf8"));
  const product = raw.product;

  return {
    schema:              "proof-of-plate.product-token-metadata.v1" as const,
    batchId:             JUICE_BATCH_ID,
    productName:         product.productName,
    category:            product.category,
    description:         product.productType ?? "Walrus-backed organic juice lifecycle evidence pack.",
    netContents:         product.netContents,
    servingSize:         product.servingSize,
    servingsPerContainer: product.servingsPerContainer,
    nutritionHighlights: ["Organic", "100% apple juice", `${record.claimCount} lifecycle claims verified`],
    allergens:           product.allergens === "None declared" ? ["None declared"] : [product.allergens],
    storageInstructions: product.storage,
    ingredients:         [{ slug: "organic-apple-juice", name: product.ingredientStatement, role: "Primary ingredient" }],
    nutrition:           (raw.nutrition ?? []).map((f: any) => ({ label: f.label, amount: f.amount, dailyValue: f.dailyValue })),
    productPageUrl:      `${(baseUrl ?? "").replace(/\/$/, "")}/p/${JUICE_BATCH_ID}`,
    hcsTopicId:          jb.hcsTopicId,
    suiBatchObjectId:    jb.suiBatchObjectId,
    walrusEvidenceUri:   record.evidenceUri,
    walrusEvidenceHash:  record.evidenceHash,
  };
}

async function main() {
  const deployment = loadDeployment();
  if (!deployment) throw new Error("Missing data/deployment.json.");

  const jb = (deployment as any).juiceBatch;
  if (!jb) throw new Error("No juiceBatch found — run npm run sui:seed-juice first.");

  // Check if juice HTS token already exists and is real
  const existingJuiceHts = (deployment as any).juiceHts as HtsDeployment | undefined;
  const existingTokenId = existingJuiceHts?.source === "hedera" && /^0\.0\.\d+$/.test(existingJuiceHts.tokenId)
    ? existingJuiceHts.tokenId : undefined;

  const baseUrl = process.env.NEXT_PUBLIC_PRODUCT_BASE_URL ?? "http://localhost:3000";
  const productMetadata = buildJuiceProductMetadata(deployment, baseUrl);
  const metadataHash   = hashProductTokenMetadata(productMetadata);
  const fullJson       = stableStringify(productMetadata);
  const compactPointer = buildHtsMetadataPayload(JUICE_BATCH_ID, metadataHash);

  let juiceHts: HtsDeployment | null = null;
  const hedera = await buildHederaClient();

  if (hedera) {
    const { sdk, client, accountId, privateKey } = hedera;
    const tokenName   = `Proof of Plate ${JUICE_BATCH_ID}`;
    const tokenSymbol = "PJUICE0613";
    const memo        = `Proof of Plate batch passport for ${JUICE_BATCH_ID}`;
    const treasuryAccountId = process.env.HEDERA_HTS_TREASURY_ACCOUNT_ID || accountId;
    const publicKey   = privateKey.publicKey;

    try {
      let tokenId = existingTokenId;
      let createTxId: string | undefined;
      let mintTxId: string | undefined;
      let serialNumber = existingJuiceHts?.serialNumber ?? 1;
      let metadataPayload = compactPointer;

      if (!tokenId) {
        // Create new token
        console.log("Creating juice HTS token...");
        for (const payload of [fullJson, compactPointer]) {
          try {
            const tx = await new sdk.TokenCreateTransaction()
              .setTokenName(tokenName).setTokenSymbol(tokenSymbol).setTokenMemo(memo)
              .setMetadata(Buffer.from(payload, "utf8"))
              .setTokenType(sdk.TokenType.NonFungibleUnique)
              .setSupplyType(sdk.TokenSupplyType.Finite).setMaxSupply(1)
              .setTreasuryAccountId(treasuryAccountId)
              .setAdminKey(publicKey).setSupplyKey(publicKey).setMetadataKey(publicKey)
              .freezeWith(client).sign(privateKey);
            const resp    = await tx.execute(client);
            const receipt = await resp.getReceipt(client);
            tokenId      = receipt.tokenId?.toString();
            createTxId   = resp.transactionId?.toString();
            metadataPayload = payload;
            if (!tokenId) throw new Error("No token ID returned.");
            console.log(`Token created: ${tokenId}`);
            break;
          } catch (e: any) {
            if (!/metadata|size|too.long|bytes/i.test(e.message ?? "")) throw e;
            console.warn("Full JSON metadata rejected, falling back to compact pointer.");
          }
        }
      } else {
        // Update existing
        console.log(`Updating existing juice HTS token ${tokenId}...`);
        for (const payload of [fullJson, compactPointer]) {
          try {
            const tx = await new sdk.TokenUpdateTransaction()
              .setTokenId(tokenId!).setMetadata(Buffer.from(payload, "utf8"))
              .freezeWith(client).sign(privateKey);
            const resp  = await tx.execute(client);
            await resp.getReceipt(client);
            metadataPayload = payload;
            console.log(`Token metadata updated: ${tokenId}`);
            break;
          } catch (e: any) {
            if (!/metadata|size|too.long|bytes/i.test(e.message ?? "")) throw e;
            console.warn("Full JSON rejected, falling back to compact pointer.");
          }
        }
        serialNumber = existingJuiceHts?.serialNumber ?? 1;
      }

      if (!tokenId) throw new Error("Failed to create or find juice HTS token.");

      // Mint serial if new
      if (!mintTxId && !existingTokenId) {
        const mintResp = await new sdk.TokenMintTransaction()
          .setTokenId(tokenId).setMetadata([Buffer.from(metadataPayload, "utf8")])
          .freezeWith(client).sign(privateKey)
          .then((tx: any) => tx.execute(client));
        const mintReceipt = await (mintResp as any).getReceipt(client);
        serialNumber = mintReceipt.serials?.[0]?.toNumber?.() ?? 1;
        mintTxId     = (mintResp as any).transactionId?.toString();
        console.log(`Minted serial #${serialNumber}`);
      }

      juiceHts = {
        network:              process.env.HEDERA_NETWORK ?? "testnet",
        tokenId:              tokenId!,
        serialNumber,
        nftId:                `${tokenId}/${serialNumber}`,
        tokenType:            "NON_FUNGIBLE_UNIQUE",
        supplyType:           "FINITE",
        maxSupply:            1,
        treasuryAccountId,
        tokenName,
        tokenSymbol,
        metadataPayload,
        metadataHash,
        productMetadata:      productMetadata as any,
        createTransactionId:  createTxId,
        mintTransactionId:    mintTxId,
        createdAt:            existingJuiceHts?.createdAt ?? new Date().toISOString(),
        updatedAt:            new Date().toISOString(),
        source:               "hedera",
      };
    } finally {
      client.close();
    }
  }

  if (!juiceHts) {
    // Local fallback
    const tokenId = buildLocalHtsTokenId().replace("local_token", "local_juice_token");
    juiceHts = {
      network:         "testnet",
      tokenId,
      serialNumber:    1,
      nftId:           `${tokenId}/1`,
      tokenType:       "NON_FUNGIBLE_UNIQUE",
      supplyType:      "FINITE",
      maxSupply:       1,
      tokenName:       `Proof of Plate ${JUICE_BATCH_ID}`,
      tokenSymbol:     "PJUICE0613",
      metadataPayload: compactPointer,
      metadataHash,
      productMetadata: productMetadata as any,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
      source:          "local",
    };
    console.log("No Hedera credentials — recording local juice HTS token metadata only.");
  }

  const updated = { ...deployment, juiceHts };
  writeJson(DEPLOYMENT_PATH, updated);
  console.log(`Juice HTS token: ${juiceHts.tokenId} serial ${juiceHts.serialNumber}`);
  console.log(`Metadata hash:   ${juiceHts.metadataHash}`);
  console.log(`Source:          ${juiceHts.source}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
