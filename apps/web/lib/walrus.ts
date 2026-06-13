import { readFileSync } from "node:fs";
import path from "node:path";
import type { WalrusEvidenceIndex, WalrusEvidenceRecord } from "./types";
import { readJsonFile, resolveProofOfPlatePath, sha256Hex } from "./files";

export type ParsedWalrusReference =
  | { kind: "blob"; blobId: string; url?: string }
  | { kind: "object"; objectId: string; url?: string };

export type WalrusVerificationResult = {
  ok: boolean;
  actualHash: string;
  expectedHash: string;
  storage: "walrus";
  blobId: string;
  objectId?: string;
  url: string;
  file: string;
};

const WALRUS_BLOB_ID_RE = /^[A-Za-z0-9_-]+$/;
const WALRUS_OBJECT_ID_RE = /^0x[A-Za-z0-9_]+$/;
const walrusIndexFile = resolveProofOfPlatePath("data", "walrus-evidence.json");
const publicRoot = resolveProofOfPlatePath("public");

let walrusIndexCache: WalrusEvidenceIndex | null = null;

function assertValidBlobId(blobId: string) {
  if (!WALRUS_BLOB_ID_RE.test(blobId)) {
    throw new Error(`Invalid Walrus blob ID: ${blobId}`);
  }
  return blobId;
}

function assertValidObjectId(objectId: string) {
  if (!WALRUS_OBJECT_ID_RE.test(objectId)) {
    throw new Error(`Invalid Walrus object ID: ${objectId}`);
  }
  return objectId;
}

export function parseWalrusReference(reference: string): ParsedWalrusReference {
  const value = reference.trim();
  if (!value) throw new Error("Missing Walrus reference");

  if (value.startsWith("walrus://")) {
    const match = value.match(/^walrus:\/\/(blob|object)\/([^/?#]+)$/);
    if (!match?.[1] || !match[2]) {
      if (value.startsWith("walrus://blob/")) throw new Error(`Invalid Walrus blob ID: ${reference}`);
      if (value.startsWith("walrus://object/")) throw new Error(`Invalid Walrus object ID: ${reference}`);
      throw new Error(`Invalid Walrus URI: ${reference}`);
    }
    const id = decodeURIComponent(match[2]);
    if (match[1] === "blob") {
      return { kind: "blob", blobId: assertValidBlobId(id) };
    }
    if (match[1] === "object") {
      return { kind: "object", objectId: assertValidObjectId(id) };
    }
  }

  if (/^https?:\/\//i.test(value)) {
    const parsed = new URL(value);
    const blobMatch = parsed.pathname.match(/^\/v1\/blobs\/([^/?#]+)$/);
    if (blobMatch?.[1]) {
      return { kind: "blob", blobId: assertValidBlobId(decodeURIComponent(blobMatch[1])), url: value };
    }
    const objectMatch = parsed.pathname.match(/^\/v1\/blobs\/by-object-id\/([^/?#]+)$/);
    if (objectMatch?.[1]) {
      return { kind: "object", objectId: assertValidObjectId(decodeURIComponent(objectMatch[1])), url: value };
    }
  }

  throw new Error(`Not a Walrus reference: ${reference}`);
}

export function isWalrusReference(reference: string) {
  try {
    parseWalrusReference(reference);
    return true;
  } catch {
    return false;
  }
}

export function loadWalrusEvidenceIndex(): WalrusEvidenceIndex {
  if (walrusIndexCache) return walrusIndexCache;
  const index = readJsonFile<WalrusEvidenceIndex>(walrusIndexFile);
  if (index.schema !== "proof-of-plate.walrus-evidence-index.v1" || !Array.isArray(index.records)) {
    throw new Error("Invalid data/walrus-evidence.json schema");
  }
  walrusIndexCache = index;
  return index;
}

export function invalidateWalrusEvidenceIndexCache() {
  walrusIndexCache = null;
}

export function listWalrusEvidenceRecords() {
  return loadWalrusEvidenceIndex().records;
}

function resolveRecord(recordOrReference: WalrusEvidenceRecord | string): WalrusEvidenceRecord {
  if (typeof recordOrReference !== "string") return recordOrReference;
  return getWalrusEvidenceRecord(recordOrReference);
}

export function getWalrusEvidenceRecord(reference: string): WalrusEvidenceRecord {
  const records = listWalrusEvidenceRecords();
  const direct = records.find(
    (record) =>
      record.batchId === reference ||
      record.evidenceUri === reference ||
      record.blobId === reference ||
      record.objectId === reference ||
      record.url === reference,
  );
  if (direct) return direct;

  const parsed = parseWalrusReference(reference);
  const matched = records.find((record) =>
    parsed.kind === "blob" ? record.blobId === parsed.blobId : record.objectId === parsed.objectId,
  );
  if (!matched) {
    throw new Error(`Unknown Walrus evidence reference: ${reference}`);
  }
  return matched;
}

export function walrusDemoPayloadPath(recordOrReference: WalrusEvidenceRecord | string) {
  const record = resolveRecord(recordOrReference);
  if (!record.localDemoPath) {
    throw new Error(
      `Walrus evidence ${record.evidenceUri} has no local demo payload; fetch via walrus client/aggregator in production.`,
    );
  }
  const clean = record.localDemoPath.startsWith("/") ? record.localDemoPath.slice(1) : record.localDemoPath;
  if (!clean.startsWith("evidence/walrus/") || clean.includes("..") || !clean.endsWith(".json")) {
    throw new Error("Walrus local demo payload must point to JSON under /evidence/walrus");
  }
  const candidate = path.resolve(publicRoot, clean);
  const relativeToPublic = path.relative(publicRoot, candidate);
  if (relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    throw new Error("Walrus local demo payload escapes public/");
  }
  return candidate;
}

export function getWalrusEvidenceRaw(recordOrReference: WalrusEvidenceRecord | string) {
  return readFileSync(walrusDemoPayloadPath(recordOrReference));
}

export function getWalrusEvidence(recordOrReference: WalrusEvidenceRecord | string) {
  return JSON.parse(getWalrusEvidenceRaw(recordOrReference).toString("utf8")) as unknown;
}

export function hashWalrusEvidence(recordOrReference: WalrusEvidenceRecord | string) {
  return sha256Hex(getWalrusEvidenceRaw(recordOrReference));
}

export function verifyWalrusEvidence(
  recordOrReference: WalrusEvidenceRecord | string,
  expectedHash?: string,
): WalrusVerificationResult {
  const record = resolveRecord(recordOrReference);
  const actualHash = hashWalrusEvidence(record);
  const trustedHash = expectedHash ?? record.evidenceHash;
  return {
    ok: actualHash.toLowerCase() === trustedHash.toLowerCase(),
    actualHash,
    expectedHash: trustedHash,
    storage: "walrus",
    blobId: record.blobId,
    objectId: record.objectId,
    url: record.url,
    file: path.basename(record.localDemoPath ?? record.evidenceUri),
  };
}
