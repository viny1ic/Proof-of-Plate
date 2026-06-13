import { readFileSync } from "node:fs";
import path from "node:path";
import type { EvidenceDocument } from "./types";
import { resolveProofOfPlatePath, sha256Hex } from "./files";

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
  const raw = readFileSync(evidencePathFromUri(uri), "utf8");
  return JSON.parse(raw) as EvidenceDocument;
}

export function getEvidenceRaw(uri: string) {
  return readFileSync(evidencePathFromUri(uri));
}

export function hashEvidence(uri: string) {
  return sha256Hex(getEvidenceRaw(uri));
}

export function verifyEvidenceHash(uri: string, expectedHash: string) {
  const actualHash = hashEvidence(uri);
  return {
    ok: actualHash.toLowerCase() === expectedHash.toLowerCase(),
    actualHash,
    expectedHash,
    file: path.basename(uri),
  };
}
