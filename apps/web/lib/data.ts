import { existsSync } from "node:fs";
import type { Claim, ClaimStatus, Deployment, HcsEvent, HtsDeployment, Ingredient, ProductBatch } from "./types";
import { readJsonFile, resolveProofOfPlatePath } from "./files";
import { suiExplorerLink } from "./explorer-links";
import {
  hashProductTokenMetadata,
  mergeBatchWithHtsMetadata,
  parseHtsMetadataPayload,
  parseProductTokenMetadata,
} from "./hts";
import { getWalrusEvidence, getWalrusEvidenceRecord } from "./walrus";

function deploymentFile() {
  return resolveProofOfPlatePath("data", "deployment.json");
}

function hcsFile() {
  return resolveProofOfPlatePath("data", "hcs-events.json");
}

function hideInvalidSuiClaimLink(claim: Claim): Claim {
  if (suiExplorerLink(claim.suiObjectId)) return claim;
  return { ...claim, suiObjectId: "" };
}

export const PRODUCT_INGREDIENTS: Ingredient[] = [
  {
    slug: "ultra-filtered-lowfat-milk",
    name: "Ultra-filtered lowfat milk",
    role: "Primary dairy base",
    source: "Proof of Plate Demo Dairy Cooperative",
    description:
      "Lowfat milk concentrated through ultra-filtration to increase protein density while reducing lactose and some sugars.",
    verificationNote: "Linked to the ultra-filtration, pasteurization, and lactose-free claims for this batch.",
    relatedClaimTypes: ["ultra_filtered", "pasteurized", "lactose_free"],
  },
  {
    slug: "lactase-enzyme",
    name: "Lactase enzyme",
    role: "Lactose breakdown aid",
    source: "Proof of Plate Demo Ingredient Supplier",
    description:
      "Food-grade lactase enzyme used to break lactose into simpler sugars as part of the lactose-free process.",
    verificationNote: "Supported by the lactose-free lab result evidence for the finished batch.",
    relatedClaimTypes: ["lactose_free"],
  },
  {
    slug: "vitamin-a-palmitate",
    name: "Vitamin A palmitate",
    role: "Vitamin fortification",
    source: "Proof of Plate Demo Nutrient Supplier",
    description:
      "Vitamin A fortificant commonly added to lowfat dairy products to restore vitamin A levels after fat reduction.",
    verificationNote: "Included as product formulation information; not represented as a separate verified label claim.",
    relatedClaimTypes: [],
  },
  {
    slug: "vitamin-d3",
    name: "Vitamin D3",
    role: "Vitamin fortification",
    source: "Proof of Plate Demo Nutrient Supplier",
    description:
      "Vitamin D3 fortificant added to support the product nutrition profile for the demo milk batch.",
    verificationNote: "Included as product formulation information; not represented as a separate verified label claim.",
    relatedClaimTypes: [],
  },
];

export function buildCompleteProductInfo() {
  return {
    description:
      "Ultra-filtered lowfat milk with lactase enzyme and vitamin fortification. Built as a Proof of Plate product passport for label-claim verification.",
    netContents: "52 fl oz (1.54 L)",
    servingSize: "1 cup (240 mL)",
    servingsPerContainer: "About 6",
    nutritionHighlights: ["13g protein per serving", "Lactose-free", "Ultra-filtered", "Pasteurized"],
    allergens: ["Milk"],
    storageInstructions: "Keep refrigerated at or below 40°F. Use within 7 days after opening.",
    ingredients: PRODUCT_INGREDIENTS,
    nutrition: [
      { label: "Calories", amount: "80", bold: true },
      { label: "Total Fat", amount: "2.5g", dailyValue: "3%" },
      { label: "Saturated Fat", amount: "1.5g", dailyValue: "8%", sub: true },
      { label: "Trans Fat", amount: "0g", sub: true },
      { label: "Cholesterol", amount: "15mg", dailyValue: "5%", divider: true },
      { label: "Sodium", amount: "95mg", dailyValue: "4%" },
      { label: "Total Carbohydrate", amount: "6g", dailyValue: "2%" },
      { label: "Dietary Fiber", amount: "0g", dailyValue: "0%", sub: true },
      { label: "Total Sugars", amount: "6g", sub: true },
      { label: "Protein", amount: "13g", dailyValue: "26%", divider: true, bold: true },
      { label: "Calcium", amount: "350mg", dailyValue: "25%" },
      { label: "Vitamin D", amount: "3.7mcg", dailyValue: "20%" },
      { label: "Potassium", amount: "420mg", dailyValue: "10%" },
      { label: "Vitamin A", amount: "150mcg RAE", dailyValue: "15%" },
    ],
  };
}

// Cache deployment in memory
let _deployment: Deployment | null = null;

export function getDeployment(): Deployment {
  if (_deployment) return _deployment;
  const file = deploymentFile();
  if (!existsSync(file)) {
    throw new Error("data/deployment.json not found. Run npm run demo:seed or the testnet seed scripts first.");
  }
  _deployment = readJsonFile<Deployment>(file);
  return _deployment;
}

export function invalidateDeploymentCache() {
  _deployment = null;
}

type OrganicJuicePayload = {
  product: {
    productName: string;
    batchId: string;
    category: string;
    productType?: string;
    netContents: string;
    servingSize: string;
    servingsPerContainer: string;
    ingredientStatement: string;
    allergens: string;
    storage: string;
    recallState?: string;
    claimCount: number;
  };
  nutrition?: Array<{ label: string; amount: string; dailyValue?: string; note?: string }>;
  claims?: Array<{
    sequence: number;
    claimId: string;
    label: string;
    issuerRole: string;
    status: ClaimStatus;
    evidenceUri: string;
  }>;
};

function getWalrusOrganicJuicePayload() {
  const record = getWalrusEvidenceRecord("POP-JUICE-ORG-APPLE-0613");
  return {
    record,
    payload: getWalrusEvidence(record) as OrganicJuicePayload,
  };
}

function getWalrusOrganicJuiceBatch(): ProductBatch {
  const { record, payload } = getWalrusOrganicJuicePayload();
  const product = payload.product;
  const claims = payload.claims ?? [];
  const verified = claims.filter((claim) => claim.status === "verified").length;
  // Pull Sui identity passport IDs from deployment.juiceBatch when available
  const dep = (() => { try { return getDeployment(); } catch { return null; } })();
  const juiceBatch = (dep as any)?.juiceBatch;
  return {
    batchId: product.batchId,
    productName: product.productName,
    category: product.category,
    description: product.productType ?? "Walrus-backed organic juice lifecycle evidence pack.",
    netContents: product.netContents,
    servingSize: product.servingSize,
    servingsPerContainer: product.servingsPerContainer,
    nutritionHighlights: ["Organic", "100% apple juice", "Walrus evidence pack", `${record.claimCount} lifecycle claims`],
    allergens: product.allergens === "None declared" ? ["None declared"] : [product.allergens],
    storageInstructions: product.storage,
    ingredients: [
      {
        slug: "organic-apple-juice",
        name: product.ingredientStatement,
        role: "Primary ingredient",
        source: "Green Valley Organic Orchards",
        description: "Ingredient statement from the Walrus-backed organic juice raw data pack.",
        verificationNote: "Organic, harvest, chain-of-custody, processing, lab, and distribution records are included in the Walrus evidence pack.",
        relatedClaimTypes: ["organic_farm_certified", "one_hundred_percent_juice_verified", "chain_of_custody_verified"],
      },
    ],
    nutrition: payload.nutrition?.map((fact) => ({
      label: fact.label,
      amount: fact.amount,
      dailyValue: fact.dailyValue,
    })),
    hcsTopicId: record.hcsTopicId ?? record.evidenceUri,
    scoreVerified: verified,
    scoreTotal: claims.length || record.claimCount,
    recalled: product.recallState === "recalled",
    createdAt: "2026-06-13T00:00:00.000Z",
    suiPackageId: juiceBatch?.suiPackageId ?? "",
    suiBatchObjectId: juiceBatch?.suiBatchObjectId ?? "",
    productPageUrl: `/p/${product.batchId}`,
  };
}

function getWalrusOrganicJuiceClaims(): Claim[] {
  const { record, payload } = getWalrusOrganicJuicePayload();
  // Pull per-claim Sui object IDs from deployment.juiceClaims when available
  const dep = (() => { try { return getDeployment(); } catch { return null; } })();
  const juiceClaims: Record<string, string> = {};
  if (Array.isArray((dep as any)?.juiceClaims)) {
    for (const c of (dep as any).juiceClaims) {
      if (c.claimType && c.suiObjectId) juiceClaims[c.claimType] = c.suiObjectId;
    }
  }
  return (payload.claims ?? []).map((claim) => ({
    batchId: payload.product.batchId,
    claimType: claim.claimId,
    label: claim.label,
    status: claim.status,
    issuerRole: claim.issuerRole,
    issuerName: "Walrus evidence pack",
    evidenceStorage: "walrus",
    evidenceUri: record.evidenceUri,
    evidenceHash: record.evidenceHash,
    walrus: {
      storage: "walrus",
      evidenceUri: record.evidenceUri,
      blobId: record.blobId,
      objectId: record.objectId,
      url: record.url,
      localDemoPath: record.localDemoPath,
    },
    hcsTopicId: record.hcsTopicId ?? record.evidenceUri,
    hcsSequence: claim.sequence,
    suiObjectId: juiceClaims[claim.claimId] ?? "",
    createdAt: "2026-06-13T00:00:00.000Z",
  }));
}

function getWalrusOrganicJuiceEvents(topicId: string): HcsEvent[] {
  const { record, payload } = getWalrusOrganicJuicePayload();
  const expectedTopic = record.hcsTopicId ?? record.evidenceUri;
  if (topicId !== expectedTopic && topicId !== record.evidenceUri && topicId !== payload.product.batchId) return [];
  if (record.hcsEvents?.length) return record.hcsEvents;
  return (payload.claims ?? []).map((claim) => ({
    v: "1.0",
    type: "WALRUS_EVIDENCE_CLAIM",
    batchId: payload.product.batchId,
    claimType: claim.claimId,
    issuerRole: claim.issuerRole,
    issuerName: "Walrus evidence pack",
    evidenceStorage: "walrus",
    evidenceUri: record.evidenceUri,
    evidenceHash: record.evidenceHash,
    walrus: {
      storage: "walrus",
      evidenceUri: record.evidenceUri,
      blobId: record.blobId,
      objectId: record.objectId,
      url: record.url,
    },
    createdAt: "2026-06-13T00:00:00.000Z",
    sequenceNumber: claim.sequence,
    transactionId: record.evidenceUri,
    consensusTimestamp: "2026-06-13T00:00:00.000Z",
  }));
}

export function getBatch(batchId: string): ProductBatch {
  if (batchId === "POP-JUICE-ORG-APPLE-0613") {
    return getWalrusOrganicJuiceBatch();
  }

  const deployment = getDeployment();
  if (deployment.batch.batchId !== batchId) {
    throw new Error(`Unknown batch ${batchId}`);
  }
  return mergeBatchWithHtsMetadata(deployment.batch, deployment.hts);
}

export function getHtsMetadata(batchId: string): {
  hts?: HtsDeployment;
  ok: boolean;
  errors: string[];
} {
  if (batchId === "POP-JUICE-ORG-APPLE-0613") {
    // Juice uses deployment.juiceHts
    const dep = (() => { try { return getDeployment(); } catch { return null; } })();
    const juiceHts = (dep as any)?.juiceHts as HtsDeployment | undefined;
    if (!juiceHts) {
      return { ok: false, errors: ["No HTS product token found for juice — run npm run hedera:create-token-juice."] };
    }
    // Basic validation: real tokenId
    if (!/^0\.0\.\d+$/.test(juiceHts.tokenId)) {
      return { hts: juiceHts, ok: false, errors: ["Juice HTS token ID is not a real Hedera token ID."] };
    }
    return { hts: juiceHts, ok: true, errors: [] };
  }

  const deployment = getDeployment();
  if (deployment.batch.batchId !== batchId) {
    throw new Error(`Unknown batch ${batchId}`);
  }
  if (!deployment.hts) {
    return { ok: false, errors: ["No HTS token metadata configured for this batch."] };
  }
  const parsed = parseProductTokenMetadata(deployment.hts.productMetadata, batchId);
  const payload = parseHtsMetadataPayload(deployment.hts.metadataPayload);
  const errors = [...parsed.errors, ...payload.errors];

  if (payload.ok && payload.batchId !== batchId) {
    errors.push(`HTS token metadata batchId ${payload.batchId} does not match expected batchId ${batchId}.`);
  }
  if (parsed.ok && parsed.metadata && payload.ok) {
    const computedHash = hashProductTokenMetadata(parsed.metadata);
    if (computedHash !== payload.metadataHash) {
      errors.push(`HTS token metadata hash mismatch: token has ${payload.metadataHash}, computed ${computedHash}.`);
    }
    if (computedHash !== deployment.hts.metadataHash) {
      errors.push(`Cached HTS metadata hash mismatch: deployment has ${deployment.hts.metadataHash}, computed ${computedHash}.`);
    }
  }

  return {
    hts: deployment.hts,
    ok: errors.length === 0,
    errors,
  };
}

export function getHtsMetadataByToken(tokenId: string): {
  hts?: HtsDeployment;
  ok: boolean;
  errors: string[];
} {
  const deployment = getDeployment();
  if (deployment.hts?.tokenId !== tokenId) {
    return { ok: false, errors: [`Unknown HTS token ${tokenId}.`] };
  }
  return getHtsMetadata(deployment.batch.batchId);
}

export function getClaims(batchId: string): Claim[] {
  if (batchId === "POP-JUICE-ORG-APPLE-0613") {
    return getWalrusOrganicJuiceClaims();
  }
  return getDeployment().claims.filter((claim) => claim.batchId === batchId).map(hideInvalidSuiClaimLink);
}

export function getIngredients(batchId: string): Ingredient[] {
  return getBatch(batchId).ingredients;
}

export function getIngredient(batchId: string, slug: string): Ingredient {
  const ingredient = getIngredients(batchId).find((candidate) => candidate.slug === slug);
  if (!ingredient) {
    throw new Error(`Unknown ingredient ${slug}`);
  }
  return ingredient;
}

export function getHcsMessages(topicId: string): HcsEvent[] {
  if (topicId === "POP-JUICE-ORG-APPLE-0613" || topicId === "walrus://blob/pop-juice-org-apple-0613-raw-data-pack-v1" || topicId === "0.0.9226673") {
    return getWalrusOrganicJuiceEvents(topicId);
  }

  const file = hcsFile();
  if (existsSync(file)) {
    const hcs = readJsonFile<{ topicId: string; events: HcsEvent[] }>(file);
    if (hcs.topicId === topicId) return hcs.events;
  }
  // fallback: reconstruct from deployment claims
  return getDeployment().claims.map((claim) => ({
    v: "1.0",
    type: "CLAIM_SUBMITTED",
    batchId: claim.batchId,
    claimType: claim.claimType,
    issuerRole: claim.issuerRole,
    issuerName: claim.issuerName,
    evidenceUri: claim.evidenceUri,
    evidenceHash: claim.evidenceHash,
    createdAt: claim.createdAt,
    sequenceNumber: claim.hcsSequence,
    transactionId: `${topicId}@${claim.hcsSequence}`,
    consensusTimestamp: claim.createdAt,
  }));
}
