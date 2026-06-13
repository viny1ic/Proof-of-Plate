import {
  buildHederaClient,
  buildLocalHtsTokenId,
  deploymentPath,
  loadDeployment,
  writeJson,
} from "./shared";
import type { Deployment, HtsDeployment, ProductBatch } from "../apps/web/lib/types";
import {
  buildHtsMetadataPayload,
  buildProductTokenMetadata,
  hashProductTokenMetadata,
  stableStringify,
} from "../apps/web/lib/hts";

function tokenSymbolForBatch(batchId: string) {
  return process.env.HEDERA_HTS_TOKEN_SYMBOL || batchId.replace(/[^A-Z0-9]/gi, "").slice(0, 10).toUpperCase() || "POPBATCH";
}

function tokenNameForBatch(batch: ProductBatch) {
  return process.env.HEDERA_HTS_TOKEN_NAME || `Proof of Plate ${batch.batchId}`;
}

function metadataCandidates(deployment: Deployment) {
  const productMetadata = buildProductTokenMetadata(deployment.batch, process.env.NEXT_PUBLIC_PRODUCT_BASE_URL);
  const metadataHash = hashProductTokenMetadata(productMetadata);
  const fullJson = stableStringify(productMetadata);
  const compactPointer = buildHtsMetadataPayload(productMetadata.batchId, metadataHash);
  return { productMetadata, metadataHash, fullJson, compactPointer };
}

function buildHtsRecord(
  deployment: Deployment,
  overrides: {
    tokenId: string;
    serialNumber?: number;
    createTransactionId?: string;
    mintTransactionId?: string;
    updateTransactionId?: string;
    treasuryAccountId?: string;
    source: HtsDeployment["source"];
    metadataPayload?: string;
  }
): HtsDeployment {
  const serialNumber = overrides.serialNumber ?? Number(process.env.HEDERA_HTS_SERIAL_NUMBER || "1");
  const { productMetadata, metadataHash, fullJson } = metadataCandidates(deployment);
  const metadataPayload = overrides.metadataPayload ?? fullJson;

  return {
    network: process.env.HEDERA_NETWORK || deployment.hts?.network || deployment.hcs.network || "testnet",
    tokenId: overrides.tokenId,
    serialNumber,
    nftId: `${overrides.tokenId}/${serialNumber}`,
    tokenType: "NON_FUNGIBLE_UNIQUE",
    supplyType: "FINITE",
    maxSupply: 1,
    treasuryAccountId: overrides.treasuryAccountId,
    tokenName: tokenNameForBatch(deployment.batch),
    tokenSymbol: tokenSymbolForBatch(deployment.batch.batchId),
    metadataPayload,
    metadataHash,
    productMetadata,
    createTransactionId: overrides.createTransactionId,
    mintTransactionId: overrides.mintTransactionId,
    updateTransactionId: overrides.updateTransactionId,
    createdAt: deployment.hts?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: overrides.source,
  };
}

function writeHtsDeployment(deployment: Deployment, hts: HtsDeployment) {
  const nextDeployment: Deployment = {
    ...deployment,
    batch: {
      ...deployment.batch,
      productName: hts.productMetadata.productName,
      category: hts.productMetadata.category,
      description: hts.productMetadata.description,
      netContents: hts.productMetadata.netContents,
      servingSize: hts.productMetadata.servingSize,
      servingsPerContainer: hts.productMetadata.servingsPerContainer,
      nutritionHighlights: hts.productMetadata.nutritionHighlights,
      allergens: hts.productMetadata.allergens,
      storageInstructions: hts.productMetadata.storageInstructions,
      ingredients: hts.productMetadata.ingredients,
      nutrition: hts.productMetadata.nutrition,
      productPageUrl: hts.productMetadata.productPageUrl,
      hcsTopicId: hts.productMetadata.hcsTopicId,
      suiBatchObjectId: hts.productMetadata.suiBatchObjectId,
      htsTokenId: hts.tokenId,
      htsSerialNumber: hts.serialNumber,
      htsNftId: hts.nftId,
      htsMetadataHash: hts.metadataHash,
      htsMetadataPayload: hts.metadataPayload,
    },
    hts,
  };
  writeJson(deploymentPath, nextDeployment);
  return nextDeployment;
}

async function executeWithMetadataFallback<T>(
  label: string,
  fullJson: string,
  compactPointer: string,
  run: (payload: string) => Promise<T>
): Promise<{ result: T; payload: string; usedFallback: boolean }> {
  try {
    return { result: await run(fullJson), payload: fullJson, usedFallback: false };
  } catch (error) {
    const message = (error as Error).message || String(error);
    if (!/metadata|memo|bytes|size|length|too_long|too long/i.test(message)) throw error;
    console.warn(`${label}: full product JSON metadata was rejected (${message}). Falling back to compact pointer ${compactPointer}.`);
    return { result: await run(compactPointer), payload: compactPointer, usedFallback: true };
  }
}

async function updateExistingTokenMetadata(deployment: Deployment, tokenId: string, source: HtsDeployment["source"] = "hedera") {
  const hedera = await buildHederaClient();
  if (!hedera) return null;
  const { sdk, client, accountId, privateKey } = hedera;
  const { fullJson, compactPointer } = metadataCandidates(deployment);
  try {
    const updated = await executeWithMetadataFallback(
      "Token metadata update",
      fullJson,
      compactPointer,
      async (payload) => {
        const tx = await new sdk.TokenUpdateTransaction()
          .setTokenId(tokenId)
          .setMetadata(Buffer.from(payload, "utf8"))
          .freezeWith(client)
          .sign(privateKey);
        const response = await tx.execute(client);
        await response.getReceipt(client);
        return response;
      }
    );

    return buildHtsRecord(deployment, {
      tokenId,
      serialNumber: deployment.hts?.serialNumber ?? Number(process.env.HEDERA_HTS_SERIAL_NUMBER || "1"),
      createTransactionId: deployment.hts?.createTransactionId,
      mintTransactionId: deployment.hts?.mintTransactionId,
      updateTransactionId: updated.result.transactionId?.toString(),
      treasuryAccountId: deployment.hts?.treasuryAccountId || process.env.HEDERA_HTS_TREASURY_ACCOUNT_ID || accountId,
      source,
      metadataPayload: updated.payload,
    });
  } finally {
    client.close();
  }
}

async function createRealHtsToken(deployment: Deployment) {
  const hedera = await buildHederaClient();
  if (!hedera) return null;

  const { sdk, client, accountId, privateKey } = hedera;
  const { fullJson, compactPointer } = metadataCandidates(deployment);

  try {
    const treasuryAccountId = process.env.HEDERA_HTS_TREASURY_ACCOUNT_ID || accountId;
    const publicKey = privateKey.publicKey;

    const created = await executeWithMetadataFallback(
      "Token creation",
      fullJson,
      compactPointer,
      async (payload) => {
        const tx = await new sdk.TokenCreateTransaction()
          .setTokenName(tokenNameForBatch(deployment.batch))
          .setTokenSymbol(tokenSymbolForBatch(deployment.batch.batchId))
          .setTokenMemo(process.env.HEDERA_HTS_TOKEN_MEMO || `Proof of Plate batch passport for ${deployment.batch.batchId}`)
          .setMetadata(Buffer.from(payload, "utf8"))
          .setTokenType(sdk.TokenType.NonFungibleUnique)
          .setSupplyType(sdk.TokenSupplyType.Finite)
          .setMaxSupply(1)
          .setTreasuryAccountId(treasuryAccountId)
          .setAdminKey(publicKey)
          .setSupplyKey(publicKey)
          .setMetadataKey(publicKey)
          .freezeWith(client)
          .sign(privateKey);
        const response = await tx.execute(client);
        const receipt = await response.getReceipt(client);
        const tokenId = receipt.tokenId?.toString();
        if (!tokenId) throw new Error("HTS token creation did not return a token ID.");
        return { response, tokenId };
      }
    );

    const tokenId = created.result.tokenId;
    const mintResponse = await new sdk.TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([Buffer.from(created.payload, "utf8")])
      .freezeWith(client)
      .sign(privateKey)
      .then((tx: unknown) => (tx as { execute(c: unknown): Promise<unknown> }).execute(client));

    const mintReceipt = await (mintResponse as { getReceipt(c: unknown): Promise<{ serials?: { toNumber(): number }[] }> }).getReceipt(client);
    const serialNumber = mintReceipt.serials?.[0]?.toNumber?.() ?? 1;

    return buildHtsRecord(deployment, {
      tokenId,
      serialNumber,
      createTransactionId: created.result.response.transactionId?.toString(),
      mintTransactionId: (mintResponse as { transactionId?: { toString(): string } }).transactionId?.toString(),
      treasuryAccountId,
      source: "hedera",
      metadataPayload: created.payload,
    });
  } finally {
    client.close();
  }
}

async function main() {
  const deployment = loadDeployment();
  if (!deployment) {
    throw new Error("Missing data/deployment.json. Run npm run demo:seed or prior seed steps first.");
  }

  const envTokenId = process.env.HEDERA_TOKEN_ID || process.env.HEDERA_HTS_TOKEN_ID;
  const existingRealTokenId = deployment.hts?.source === "hedera" && /^0\.0\.\d+$/.test(deployment.hts.tokenId)
    ? deployment.hts.tokenId
    : undefined;

  let hts: HtsDeployment | null = null;

  if (envTokenId || existingRealTokenId) {
    const tokenId = envTokenId || existingRealTokenId!;
    hts = await updateExistingTokenMetadata(deployment, tokenId, envTokenId ? "env" : "hedera");
    if (!hts) {
      hts = buildHtsRecord(deployment, {
        tokenId,
        serialNumber: Number(process.env.HEDERA_HTS_SERIAL_NUMBER || deployment.hts?.serialNumber || "1"),
        treasuryAccountId: process.env.HEDERA_HTS_TREASURY_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID,
        source: envTokenId ? "env" : "hedera",
      });
    }
    console.log(`Using existing HTS token ID: ${tokenId}`);
  } else {
    hts = await createRealHtsToken(deployment);
  }

  if (!hts) {
    const tokenId = buildLocalHtsTokenId();
    hts = buildHtsRecord(deployment, {
      tokenId,
      serialNumber: 1,
      createTransactionId: `${tokenId}@create`,
      mintTransactionId: `${tokenId}@mint`,
      source: "local",
    });
    console.log("No Hedera credentials — recording local HTS token metadata only.");
  }

  writeHtsDeployment(deployment, hts);
  console.log(`HTS batch token: ${hts.tokenId} serial ${hts.serialNumber}`);
  console.log(`Metadata hash: ${hts.metadataHash}`);
  console.log(`Metadata payload bytes: ${Buffer.byteLength(hts.metadataPayload, "utf8")}`);
  console.log(`Metadata payload preview: ${hts.metadataPayload.slice(0, 240)}${hts.metadataPayload.length > 240 ? "..." : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
