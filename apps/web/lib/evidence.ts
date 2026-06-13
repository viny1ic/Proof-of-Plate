import { readFileSync } from "node:fs";
import path from "node:path";
import type { EvidenceDocument } from "./types";
import { resolveProofOfPlatePath, sha256Hex } from "./files";
import { getWalrusEvidence, getWalrusEvidenceRaw, hashWalrusEvidence, isWalrusReference, verifyWalrusEvidence } from "./walrus";

const evidenceRoot = resolveProofOfPlatePath("public", "evidence");

export function evidencePathFromUri(uri: string) {
  let parsedPath = uri;
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) {
    throw new Error("Evidence URI must be a local /evidence path");
  }

  if (parsedPath.includes("\0")) {
    throw new Error("Invalid evidence URI");
  }

  const clean = parsedPath.startsWith("/") ? parsedPath.slice(1) : parsedPath;
  if (!clean.startsWith("evidence/") || clean.includes("..") || !clean.endsWith(".json")) {
    throw new Error("Evidence URI must point to a JSON file in /evidence");
  }

  const relativePath = clean.slice("evidence/".length);
  if (path.isAbsolute(relativePath) || relativePath.length === 0) {
    throw new Error("Invalid evidence URI");
  }

  const candidate = path.resolve(evidenceRoot, relativePath);
  const relativeToRoot = path.relative(evidenceRoot, candidate);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error("Evidence URI escapes public/evidence");
  }

  return candidate;
}

export function getEvidence(uri: string): EvidenceDocument {
  if (isWalrusReference(uri)) {
    return getWalrusEvidence(uri) as EvidenceDocument;
  }
  const raw = readFileSync(evidencePathFromUri(uri), "utf8");
  return JSON.parse(raw) as EvidenceDocument;
}

export function getEvidenceRaw(uri: string) {
  if (isWalrusReference(uri)) {
    return getWalrusEvidenceRaw(uri);
  }
  return readFileSync(evidencePathFromUri(uri));
}

export function hashEvidence(uri: string) {
  if (isWalrusReference(uri)) {
    return hashWalrusEvidence(uri);
  }
  return sha256Hex(getEvidenceRaw(uri));
}

/**
 * Verify the original evidence JSON bytes against the trusted hash from the
 * stored claim/HCS event. data/evidence-manifest.json is intentionally not read
 * here; it is only a seed/build artifact for creating initial claims.
 */
export function verifyEvidenceHash(uri: string, expectedHash: string) {
  if (isWalrusReference(uri)) {
    return verifyWalrusEvidence(uri, expectedHash);
  }
  const actualHash = hashEvidence(uri);
  return {
    ok: actualHash.toLowerCase() === expectedHash.toLowerCase(),
    actualHash,
    expectedHash,
    file: path.basename(uri),
  };
}
