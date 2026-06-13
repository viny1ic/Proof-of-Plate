import { createHash } from "node:crypto";
import type { HtsDeployment, ProductBatch, ProductTokenMetadata } from "./types";

export const PRODUCT_TOKEN_METADATA_SCHEMA = "proof-of-plate.hts-product-batch.v1" as const;

type ParseResult = {
  ok: boolean;
  metadata?: ProductTokenMetadata;
  errors: string[];
};

function normalizeBaseUrl(baseUrl?: string) {
  const raw = baseUrl || process.env.NEXT_PUBLIC_PRODUCT_BASE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function buildProductTokenMetadata(batch: ProductBatch, baseUrl?: string): ProductTokenMetadata {
  return {
    schema: PRODUCT_TOKEN_METADATA_SCHEMA,
    batchId: batch.batchId,
    productName: batch.productName,
    category: batch.category,
    description: batch.description,
    netContents: batch.netContents,
    servingSize: batch.servingSize,
    servingsPerContainer: batch.servingsPerContainer,
    nutritionHighlights: [...batch.nutritionHighlights],
    allergens: [...batch.allergens],
    storageInstructions: batch.storageInstructions,
    ingredients: batch.ingredients.map((ingredient) => ({
      ...ingredient,
      relatedClaimTypes: [...ingredient.relatedClaimTypes],
    })),
    nutrition: batch.nutrition ? batch.nutrition.map((fact) => ({ ...fact })) : undefined,
    productPageUrl: `${normalizeBaseUrl(baseUrl)}/p/${encodeURIComponent(batch.batchId)}`,
    hcsTopicId: batch.hcsTopicId,
    suiBatchObjectId: batch.suiBatchObjectId,
  };
}

export function hashProductTokenMetadata(metadata: ProductTokenMetadata): string {
  return `0x${createHash("sha256").update(stableStringify(metadata)).digest("hex")}`;
}

export function buildHtsMetadataPayload(batchId: string, metadataHash: string): string {
  return `pop:${batchId}:${metadataHash}`;
}

export function parseHtsMetadataPayload(payload: string): { ok: boolean; batchId?: string; metadataHash?: string; errors: string[] } {
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "pop") {
    return { ok: false, errors: ["HTS token metadata payload must be pop:<batchId>:<metadataHash>."] };
  }
  const [, batchId, metadataHash] = parts;
  const errors: string[] = [];
  if (!batchId) errors.push("HTS token metadata payload missing batchId.");
  if (!/^0x[0-9a-f]{64}$/i.test(metadataHash)) errors.push("HTS token metadata payload has invalid metadataHash.");
  return { ok: errors.length === 0, batchId, metadataHash, errors };
}

function coerceMetadata(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
    if (decoded.startsWith("{") && decoded.endsWith("}")) {
      return JSON.parse(decoded);
    }
  } catch {
    // Ignore; caller receives a validation error below.
  }

  return value;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseProductTokenMetadata(value: unknown, expectedBatchId?: string): ParseResult {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = coerceMetadata(value);
  } catch (error) {
    return { ok: false, errors: [`Invalid JSON metadata: ${(error as Error).message}`] };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["HTS product metadata must be a JSON object."] };
  }

  const metadata = parsed as Partial<ProductTokenMetadata>;

  if (metadata.schema !== PRODUCT_TOKEN_METADATA_SCHEMA) {
    errors.push(`Unsupported schema: ${String(metadata.schema)}`);
  }
  if (!metadata.batchId || typeof metadata.batchId !== "string") errors.push("Missing batchId.");
  if (expectedBatchId && metadata.batchId !== expectedBatchId) {
    errors.push(`Metadata batchId ${String(metadata.batchId)} does not match expected batchId ${expectedBatchId}.`);
  }
  if (!metadata.productName || typeof metadata.productName !== "string") errors.push("Missing productName.");
  if (!metadata.category || typeof metadata.category !== "string") errors.push("Missing category.");
  if (!metadata.description || typeof metadata.description !== "string") errors.push("Missing description.");
  if (!metadata.netContents || typeof metadata.netContents !== "string") errors.push("Missing netContents.");
  if (!metadata.servingSize || typeof metadata.servingSize !== "string") errors.push("Missing servingSize.");
  if (!metadata.servingsPerContainer || typeof metadata.servingsPerContainer !== "string") {
    errors.push("Missing servingsPerContainer.");
  }
  if (!isStringArray(metadata.nutritionHighlights)) errors.push("nutritionHighlights must be a string array.");
  if (!isStringArray(metadata.allergens)) errors.push("allergens must be a string array.");
  if (!metadata.storageInstructions || typeof metadata.storageInstructions !== "string") {
    errors.push("Missing storageInstructions.");
  }
  if (!Array.isArray(metadata.ingredients)) errors.push("ingredients must be an array.");
  if (!metadata.productPageUrl || typeof metadata.productPageUrl !== "string") errors.push("Missing productPageUrl.");
  if (!metadata.hcsTopicId || typeof metadata.hcsTopicId !== "string") errors.push("Missing hcsTopicId.");
  if (!metadata.suiBatchObjectId || typeof metadata.suiBatchObjectId !== "string") errors.push("Missing suiBatchObjectId.");

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, metadata: metadata as ProductTokenMetadata, errors: [] };
}

export function mergeBatchWithHtsMetadata(batch: ProductBatch, hts?: HtsDeployment): ProductBatch {
  if (!hts?.productMetadata) return batch;

  const parsed = parseProductTokenMetadata(hts.productMetadata, batch.batchId);
  if (!parsed.ok || !parsed.metadata) {
    return {
      ...batch,
      htsTokenId: hts.tokenId,
      htsSerialNumber: hts.serialNumber,
      htsNftId: hts.nftId,
      htsMetadataHash: hts.metadataHash,
      htsMetadataPayload: hts.metadataPayload,
    };
  }

  const metadata = parsed.metadata;
  return {
    ...batch,
    productName: metadata.productName,
    category: metadata.category,
    description: metadata.description,
    netContents: metadata.netContents,
    servingSize: metadata.servingSize,
    servingsPerContainer: metadata.servingsPerContainer,
    nutritionHighlights: metadata.nutritionHighlights,
    allergens: metadata.allergens,
    storageInstructions: metadata.storageInstructions,
    ingredients: metadata.ingredients,
    nutrition: metadata.nutrition,
    productPageUrl: metadata.productPageUrl,
    hcsTopicId: metadata.hcsTopicId,
    suiBatchObjectId: metadata.suiBatchObjectId,
    htsTokenId: hts.tokenId,
    htsSerialNumber: hts.serialNumber,
    htsNftId: hts.nftId,
    htsMetadataHash: hts.metadataHash,
    htsMetadataPayload: hts.metadataPayload,
  };
}
