import { existsSync } from "node:fs";
import type { Claim, Deployment, HcsEvent, Ingredient, ProductBatch } from "./types";
import { readJsonFile, resolveProofOfPlatePath } from "./files";

function deploymentFile() {
  return resolveProofOfPlatePath("data", "deployment.json");
}

function hcsFile() {
  return resolveProofOfPlatePath("data", "hcs-events.json");
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
    storageInstructions: "Keep refrigerated at or below 40 F. Use within 7 days after opening.",
    ingredients: PRODUCT_INGREDIENTS,
  };
}

export function getDeployment(): Deployment {
  const file = deploymentFile();
  if (!existsSync(file)) {
    throw new Error("data/deployment.json not found. Run npm run demo:seed or the testnet seed scripts first.");
  }
  return readJsonFile<Deployment>(file);
}

export function getBatch(batchId: string): ProductBatch {
  const deployment = getDeployment();
  if (deployment.batch.batchId !== batchId) {
    throw new Error(`Unknown batch ${batchId}`);
  }
  return deployment.batch;
}

export function getClaims(batchId: string): Claim[] {
  return getDeployment().claims.filter((claim) => claim.batchId === batchId);
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
  const file = hcsFile();
  if (existsSync(file)) {
    const hcs = readJsonFile<{ topicId: string; events: HcsEvent[] }>(file);
    if (hcs.topicId === topicId) return hcs.events;
  }
  // fallback: reconstruct from deployment claims (ensures UI always has event data)
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
