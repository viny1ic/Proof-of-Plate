import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ClaimStatus, EvidenceDocument, HcsEvent } from "./types";
import { resolveProofOfPlatePath } from "./files";
import { stableStringify } from "./hts";

export const PROVIDER_INGESTION_RECORD_TYPE = "provider_ingestion_demo_v1" as const;
export const PROVIDER_INGESTION_TRUTH_LAYER = "demo_ingestion_queue_only" as const;

const CLAIM_STATUSES = new Set<ClaimStatus>(["pending", "verified", "warning", "failed", "revoked"]);
const FACT_RESULTS = new Set(["pass", "warning", "fail", "info"]);

type JsonRecord = Record<string, unknown>;

export type ProviderIngestionPayload = {
  provider: {
    id: string;
    name: string;
    role?: string;
  };
  product: {
    productName: string;
    category?: string;
  };
  batch: {
    batchId: string;
    lotCode?: string;
  };
  claim: {
    claimType: string;
    label: string;
    status?: ClaimStatus;
    issuerRole?: string;
    issuerName?: string;
  };
  evidence: EvidenceDocument;
};

export type ProviderIngestionValidationResult =
  | { ok: true; payload: ProviderIngestionPayload; errors: [] }
  | { ok: false; payload?: undefined; errors: string[] };

export type ProviderIngestionRecord = {
  recordType: typeof PROVIDER_INGESTION_RECORD_TYPE;
  schemaVersion: "1.0";
  truthLayer: typeof PROVIDER_INGESTION_TRUTH_LAYER;
  ingestionId: string;
  receivedAt: string;
  provider: ProviderIngestionPayload["provider"];
  product: ProviderIngestionPayload["product"];
  batch: ProviderIngestionPayload["batch"];
  batchId: string;
  claimType: string;
  claim: Required<Pick<ProviderIngestionPayload["claim"], "claimType" | "label" | "issuerRole" | "issuerName">> & {
    status: ClaimStatus;
  };
  evidenceId: string;
  evidenceHash: string;
  evidenceUri: string;
  canonicalEvidenceJson: string;
  evidence: EvidenceDocument;
  seed: {
    hcsEvent: HcsEvent;
    suiClaim: {
      placeholderId: string;
      batchId: string;
      claimType: string;
      label: string;
      status: ClaimStatus;
      issuerRole: string;
      issuerName: string;
      evidenceHash: string;
      evidenceUri: string;
      createdAt: string;
    };
  };
};

export type ProviderIngestionStore = {
  schemaVersion: "1.0";
  demoOnly: true;
  warning: string;
  ingestions: ProviderIngestionRecord[];
};

export type ProviderIngestionResult = {
  ok: boolean;
  record?: ProviderIngestionRecord;
  errors: string[];
  storage: {
    file: string;
    demoOnly: true;
  };
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function requiredString(record: JsonRecord | undefined, key: string, errors: string[], pathName: string) {
  if (!record || typeof record[key] !== "string" || record[key].trim().length === 0) {
    errors.push(`Missing ${pathName}.`);
    return "";
  }
  return record[key].trim();
}

function validateFacts(value: unknown, errors: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("evidence.facts must be a non-empty array.");
    return;
  }

  value.forEach((fact, index) => {
    if (!isRecord(fact)) {
      errors.push(`evidence.facts[${index}] must be an object.`);
      return;
    }

    if (!optionalString(fact.key)) {
      errors.push(`Missing evidence.facts[${index}].key.`);
    }

    const factValue = fact.value;
    const validValue =
      typeof factValue === "string" || typeof factValue === "number" || typeof factValue === "boolean";
    if (!validValue) {
      errors.push(`evidence.facts[${index}].value must be a string, number, or boolean.`);
    }

    if (fact.unit !== undefined && !optionalString(fact.unit)) {
      errors.push(`evidence.facts[${index}].unit must be a non-empty string when provided.`);
    }

    if (fact.result !== undefined && (typeof fact.result !== "string" || !FACT_RESULTS.has(fact.result))) {
      errors.push(`evidence.facts[${index}].result must be pass, warning, fail, or info when provided.`);
    }
  });
}

export function validateProviderIngestionPayload(input: unknown): ProviderIngestionValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["Provider ingestion payload must be a JSON object."] };
  }

  const providerInput = isRecord(input.provider) ? input.provider : undefined;
  const productInput = isRecord(input.product) ? input.product : undefined;
  const batchInput = isRecord(input.batch) ? input.batch : undefined;
  const claimInput = isRecord(input.claim) ? input.claim : undefined;
  const evidenceInput = isRecord(input.evidence) ? input.evidence : undefined;

  if (!providerInput) errors.push("Missing provider object.");
  if (!productInput) errors.push("Missing product object.");
  if (!batchInput) errors.push("Missing batch object.");
  if (!claimInput) errors.push("Missing claim object.");
  if (!evidenceInput) errors.push("Missing evidence object.");

  const providerId = requiredString(providerInput, "id", errors, "provider.id");
  const providerName = requiredString(providerInput, "name", errors, "provider.name");
  const productName = requiredString(productInput, "productName", errors, "product.productName");
  const batchId = requiredString(batchInput, "batchId", errors, "batch.batchId");
  const claimType = requiredString(claimInput, "claimType", errors, "claim.claimType");
  const claimLabel = requiredString(claimInput, "label", errors, "claim.label");

  const evidenceDocumentId = requiredString(evidenceInput, "documentId", errors, "evidence.documentId");
  const evidenceTitle = requiredString(evidenceInput, "title", errors, "evidence.title");
  const evidenceIssuerRole = requiredString(evidenceInput, "issuerRole", errors, "evidence.issuerRole");
  const evidenceIssuerName = requiredString(evidenceInput, "issuerName", errors, "evidence.issuerName");
  const evidenceBatchId = requiredString(evidenceInput, "batchId", errors, "evidence.batchId");
  const evidenceIssuedAt = requiredString(evidenceInput, "issuedAt", errors, "evidence.issuedAt");
  validateFacts(evidenceInput?.facts, errors);

  const status = optionalString(claimInput?.status);
  if (status && !CLAIM_STATUSES.has(status as ClaimStatus)) {
    errors.push("claim.status must be pending, verified, warning, failed, or revoked when provided.");
  }

  const issuedAtMs = evidenceIssuedAt ? Date.parse(evidenceIssuedAt) : Number.NaN;
  if (evidenceIssuedAt && Number.isNaN(issuedAtMs)) {
    errors.push("evidence.issuedAt must be an ISO-8601 date string.");
  }

  if (batchId && evidenceBatchId && batchId !== evidenceBatchId) {
    errors.push(`evidence.batchId ${evidenceBatchId} must match batch.batchId ${batchId}.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    payload: {
      provider: {
        id: providerId,
        name: providerName,
        ...(optionalString(providerInput?.role) ? { role: optionalString(providerInput?.role) } : {}),
      },
      product: {
        productName,
        ...(optionalString(productInput?.category) ? { category: optionalString(productInput?.category) } : {}),
      },
      batch: {
        batchId,
        ...(optionalString(batchInput?.lotCode) ? { lotCode: optionalString(batchInput?.lotCode) } : {}),
      },
      claim: {
        claimType,
        label: claimLabel,
        status: (status as ClaimStatus | undefined) ?? "pending",
        issuerRole: optionalString(claimInput?.issuerRole) ?? evidenceIssuerRole,
        issuerName: optionalString(claimInput?.issuerName) ?? evidenceIssuerName,
      },
      evidence: {
        documentId: evidenceDocumentId,
        title: evidenceTitle,
        issuerRole: evidenceIssuerRole,
        issuerName: evidenceIssuerName,
        batchId: evidenceBatchId,
        issuedAt: evidenceIssuedAt,
        facts: (evidenceInput?.facts as EvidenceDocument["facts"]).map((fact) => ({ ...fact })),
      },
    },
  };
}

export function canonicalizeEvidence(evidence: EvidenceDocument) {
  return stableStringify(evidence);
}

export function hashCanonicalEvidence(canonicalEvidenceJson: string) {
  return `0x${createHash("sha256").update(canonicalEvidenceJson).digest("hex")}`;
}

function safeIdFragment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildProviderIngestionRecord(input: unknown, now = new Date().toISOString()): ProviderIngestionRecord {
  const parsed = validateProviderIngestionPayload(input);
  if (!parsed.ok) {
    throw new Error(parsed.errors.join(" "));
  }

  const payload = parsed.payload;
  const canonicalEvidenceJson = canonicalizeEvidence(payload.evidence);
  const evidenceHash = hashCanonicalEvidence(canonicalEvidenceJson);
  const hashFragment = evidenceHash.slice(2, 14);
  const timeFragment = now.replace(/[^0-9a-z]/gi, "").slice(0, 16);
  const ingestionId = `ing_${safeIdFragment(payload.batch.batchId)}_${safeIdFragment(payload.claim.claimType)}_${hashFragment}_${timeFragment}`;
  const evidenceUri = `provider-ingestion://${ingestionId}/${encodeURIComponent(payload.evidence.documentId)}`;
  const issuerRole = payload.claim.issuerRole ?? payload.evidence.issuerRole;
  const issuerName = payload.claim.issuerName ?? payload.evidence.issuerName;
  const status = payload.claim.status ?? "pending";

  return {
    recordType: PROVIDER_INGESTION_RECORD_TYPE,
    schemaVersion: "1.0",
    truthLayer: PROVIDER_INGESTION_TRUTH_LAYER,
    ingestionId,
    receivedAt: now,
    provider: payload.provider,
    product: payload.product,
    batch: payload.batch,
    batchId: payload.batch.batchId,
    claimType: payload.claim.claimType,
    claim: {
      claimType: payload.claim.claimType,
      label: payload.claim.label,
      status,
      issuerRole,
      issuerName,
    },
    evidenceId: payload.evidence.documentId,
    evidenceHash,
    evidenceUri,
    canonicalEvidenceJson,
    evidence: payload.evidence,
    seed: {
      hcsEvent: {
        v: "1.0",
        type: "PROVIDER_CLAIM_INGESTED",
        batchId: payload.batch.batchId,
        claimType: payload.claim.claimType,
        issuerRole,
        issuerName,
        evidenceUri,
        evidenceHash,
        createdAt: now,
        sequenceNumber: 0,
        transactionId: `local-ingestion:${ingestionId}`,
        consensusTimestamp: now,
      },
      suiClaim: {
        placeholderId: `local-ingested-claim:${safeIdFragment(payload.batch.batchId)}:${safeIdFragment(payload.claim.claimType)}:${hashFragment}`,
        batchId: payload.batch.batchId,
        claimType: payload.claim.claimType,
        label: payload.claim.label,
        status,
        issuerRole,
        issuerName,
        evidenceHash,
        evidenceUri,
        createdAt: now,
      },
    },
  };
}

export function providerIngestionStoreFile(storageFile?: string) {
  const configured = storageFile ?? process.env.PROVIDER_INGESTIONS_FILE;
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }

  return path.join(resolveProofOfPlatePath("data"), "provider-ingestions.json");
}

function emptyStore(): ProviderIngestionStore {
  return {
    schemaVersion: "1.0",
    demoOnly: true,
    warning:
      "Provider ingestions are an MVP demo queue only. They are not the final claim truth layer until explicitly seeded to HCS/Sui and verified there.",
    ingestions: [],
  };
}

export function readProviderIngestionStore(storageFile?: string): ProviderIngestionStore {
  const file = providerIngestionStoreFile(storageFile);
  if (!existsSync(file)) {
    return emptyStore();
  }

  const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<ProviderIngestionStore> | ProviderIngestionRecord[];
  if (Array.isArray(parsed)) {
    return { ...emptyStore(), ingestions: parsed };
  }

  return {
    ...emptyStore(),
    ...parsed,
    demoOnly: true,
    ingestions: Array.isArray(parsed.ingestions) ? parsed.ingestions : [],
  };
}

export function appendProviderIngestionRecord(record: ProviderIngestionRecord, storageFile?: string) {
  const file = providerIngestionStoreFile(storageFile);
  const store = readProviderIngestionStore(file);
  store.ingestions.push(record);

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return { file, store };
}

export function ingestProviderPayload(
  input: unknown,
  options: { storageFile?: string; now?: string } = {},
): ProviderIngestionResult {
  const storageFile = providerIngestionStoreFile(options.storageFile);
  const parsed = validateProviderIngestionPayload(input);
  if (!parsed.ok) {
    return {
      ok: false,
      errors: parsed.errors,
      storage: { file: storageFile, demoOnly: true },
    };
  }

  const record = buildProviderIngestionRecord(parsed.payload, options.now);
  const { file } = appendProviderIngestionRecord(record, storageFile);
  return {
    ok: true,
    record,
    errors: [],
    storage: { file, demoOnly: true },
  };
}
