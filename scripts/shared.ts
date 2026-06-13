import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Claim, ClaimStatus, Deployment, HcsEvent, ProductBatch } from "../apps/web/lib/types";

export const root = path.resolve(process.cwd());
export const dataDir = path.join(root, "data");
export const evidenceDir = path.join(root, "public", "evidence");
export const deploymentPath = path.join(dataDir, "deployment.json");
export const manifestPath = path.join(dataDir, "evidence-manifest.json");
export const hcsEventsPath = path.join(dataDir, "hcs-events.json");

function parseEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    let value = line.slice(line.indexOf("=") + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/**
 * Standalone tsx scripts do not get Next.js env loading for free. Load the root
 * and app env files so Hedera/Sui scripts see the same credentials as Next.js.
 */
export function loadScriptEnv() {
  for (const envPath of [
    path.join(root, ".env"),
    path.join(root, ".env.local"),
    path.join(root, "apps", "web", ".env"),
    path.join(root, "apps", "web", ".env.local"),
  ]) {
    parseEnvFile(envPath);
  }
}

loadScriptEnv();

export function ensureDataDir() {
  mkdirSync(dataDir, { recursive: true });
}

export function sha256Hex(bytes: Buffer | string) {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function writeJson<T>(filePath: string, value: T) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function loadDeployment(): Deployment | null {
  if (!existsSync(deploymentPath)) return null;
  return readJson<Deployment>(deploymentPath);
}

export function evidenceFilePath(uri: string) {
  return path.join(root, "public", uri.startsWith("/") ? uri.slice(1) : uri);
}

/**
 * Load the seed/build manifest used to create initial HCS claim events.
 * Runtime evidence verification must compare evidence bytes to the hash stored
 * on the claim/HCS event, not to this generated manifest.
 */
export function loadManifest(): Record<string, string> {
  if (!existsSync(manifestPath)) {
    throw new Error("Missing data/evidence-manifest.json. Run npm run hash:evidence first.");
  }
  return readJson<Record<string, string>>(manifestPath);
}

// ─── Local placeholder IDs ────────────────────────────────────────────────────

/** Returns a deterministic local topic ID used when Hedera credentials are absent.
 *  The "tracebite_local" marker is recognised by explorer-links.ts and rendered
 *  as plain text rather than a clickable explorer link. */
export function buildLocalTopicId(): string {
  return "0.0.tracebite_local";
}

/** Deterministic local HTS token ID used when Hedera credentials are absent. */
export function buildLocalHtsTokenId(): string {
  return "0.0.tracebite_local_token";
}

// ─── Claim metadata (label, status, reason) keyed by claimType ───────────────

type ClaimMeta = { label: string; status: ClaimStatus; reason?: string };

const CLAIM_META: Record<string, ClaimMeta> = {
  lactose_free: { label: "Lactose-free lab test passed", status: "verified" },
  ultra_filtered: { label: "Ultra-filtration completed", status: "verified" },
  pasteurized: { label: "Pasteurization completed", status: "verified" },
  equipment_cleaned: { label: "CIP cleaning completed", status: "verified" },
  feed_pesticide_declaration: {
    label: "Feed pesticide declaration available",
    status: "warning",
    reason: "Supplier declaration exists, but no final pesticide residue lab test exists.",
  },
  final_pesticide_residue_test: {
    label: "Final pesticide residue test passed",
    status: "verified",
  },
};

// ─── Initial HCS event seed definitions ──────────────────────────────────────

const INITIAL_CLAIM_DEFS = [
  {
    claimType: "lactose_free",
    issuerRole: "lab",
    issuerName: "Proof of Plate Demo Lab",
    evidenceUri: "/evidence/lab-results.json",
    createdAt: "2026-06-12T21:00:00.000Z",
  },
  {
    claimType: "ultra_filtered",
    issuerRole: "facility",
    issuerName: "Proof of Plate Demo Facility",
    evidenceUri: "/evidence/processing-log.json",
    createdAt: "2026-06-12T21:01:00.000Z",
  },
  {
    claimType: "pasteurized",
    issuerRole: "facility",
    issuerName: "Proof of Plate Demo Facility",
    evidenceUri: "/evidence/processing-log.json",
    createdAt: "2026-06-12T21:02:00.000Z",
  },
  {
    claimType: "equipment_cleaned",
    issuerRole: "facility",
    issuerName: "Proof of Plate Demo Facility",
    evidenceUri: "/evidence/maintenance-log.json",
    createdAt: "2026-06-12T21:03:00.000Z",
  },
  {
    claimType: "feed_pesticide_declaration",
    issuerRole: "supplier",
    issuerName: "Proof of Plate Demo Feed Supplier",
    evidenceUri: "/evidence/feed-declaration.json",
    createdAt: "2026-06-12T21:04:00.000Z",
  },
];

function requireManifestHash(manifest: Record<string, string>, evidenceUri: string) {
  const evidenceHash = manifest[evidenceUri];
  if (!evidenceHash) {
    throw new Error(
      `Missing evidence hash for ${evidenceUri} in data/evidence-manifest.json. ` +
        "Run npm run hash:evidence before seeding HCS events."
    );
  }
  return evidenceHash;
}

/**
 * Build the five initial HCS intake events using hashes from the seed manifest.
 * The manifest is only an input to event creation; once a claim/HCS event exists,
 * its evidenceHash is the stored source of truth for verification.
 */
export function buildHcsEvents(
  topicId: string,
  manifest: Record<string, string>
): HcsEvent[] {
  return INITIAL_CLAIM_DEFS.map((def, i) => {
    const seq = i + 1;
    return {
      v: "1.0" as const,
      type: "CLAIM_SUBMITTED",
      batchId: "TB-MILK-0612",
      claimType: def.claimType,
      issuerRole: def.issuerRole,
      issuerName: def.issuerName,
      evidenceUri: def.evidenceUri,
      evidenceHash: requireManifestHash(manifest, def.evidenceUri),
      createdAt: def.createdAt,
      sequenceNumber: seq,
      transactionId: `${topicId}@${seq}`,
    };
  });
}

// ─── Product batch builder ────────────────────────────────────────────────────

function buildBatch(
  topicId: string,
  claims: Claim[],
  existing?: ProductBatch
): ProductBatch {
  const scoreTotal = claims.length;
  const scoreVerified = claims.filter((c) => c.status === "verified").length;

  return {
    batchId: "TB-MILK-0612",
    productName: "Proof of Plate Ultra-Filtered Milk",
    category: "Dairy",
    description:
      "Ultra-filtered lowfat milk with lactase enzyme and vitamin fortification. Built as a Proof of Plate product passport for label-claim verification.",
    netContents: "52 fl oz (1.54 L)",
    servingSize: "1 cup (240 mL)",
    servingsPerContainer: "About 6",
    nutritionHighlights: ["13g protein per serving", "Lactose-free", "Ultra-filtered", "Pasteurized"],
    allergens: ["Milk"],
    storageInstructions: "Keep refrigerated at or below 40 F. Use within 7 days after opening.",
    ingredients: [
      {
        slug: "ultra-filtered-lowfat-milk",
        name: "Ultra-filtered lowfat milk",
        role: "Primary dairy base",
        source: "Proof of Plate Demo Dairy Cooperative",
        description:
          "Lowfat milk concentrated through ultra-filtration to increase protein density while reducing lactose and some sugars.",
        verificationNote:
          "Linked to the ultra-filtration, pasteurization, and lactose-free claims for this batch.",
        relatedClaimTypes: ["ultra_filtered", "pasteurized", "lactose_free"],
      },
      {
        slug: "lactase-enzyme",
        name: "Lactase enzyme",
        role: "Lactose breakdown aid",
        source: "Proof of Plate Demo Ingredient Supplier",
        description:
          "Food-grade lactase enzyme used to break lactose into simpler sugars as part of the lactose-free process.",
        verificationNote:
          "Supported by the lactose-free lab result evidence for the finished batch.",
        relatedClaimTypes: ["lactose_free"],
      },
      {
        slug: "vitamin-a-palmitate",
        name: "Vitamin A palmitate",
        role: "Vitamin fortification",
        source: "Proof of Plate Demo Nutrient Supplier",
        description:
          "Vitamin A fortificant commonly added to lowfat dairy products to restore vitamin A levels after fat reduction.",
        verificationNote:
          "Included as product formulation information; not represented as a separate verified label claim.",
        relatedClaimTypes: [],
      },
      {
        slug: "vitamin-d3",
        name: "Vitamin D3",
        role: "Vitamin fortification",
        source: "Proof of Plate Demo Nutrient Supplier",
        description:
          "Vitamin D3 fortificant added to support the product nutrition profile for the demo milk batch.",
        verificationNote:
          "Included as product formulation information; not represented as a separate verified label claim.",
        relatedClaimTypes: [],
      },
    ],
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
    hcsTopicId: topicId,
    scoreVerified,
    scoreTotal,
    recalled: false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    // Preserve Sui IDs written by sui:deploy / sui:seed if already present
    suiPackageId: existing?.suiPackageId ?? "0xtracebite_local_package",
    suiBatchObjectId: existing?.suiBatchObjectId ?? "0xtracebite_local_batch",
    // Preserve HTS token metadata references written by hedera:create-token.
    htsTokenId: existing?.htsTokenId,
    htsSerialNumber: existing?.htsSerialNumber,
    htsNftId: existing?.htsNftId,
    htsMetadataHash: existing?.htsMetadataHash,
    htsMetadataPayload: existing?.htsMetadataPayload,
    productPageUrl: existing?.productPageUrl,
  };
}

// ─── writeDeployment ──────────────────────────────────────────────────────────

function isRealSuiObjectId(value?: string) {
  return !!value && /^0x[0-9a-fA-F]{64}$/.test(value) && !value.toLowerCase().includes("tracebite_local");
}

/** Build and persist deployment.json from a topic ID and HCS/stored claim events.
 *  The manifest parameter is retained for existing seed script call sites, but
 *  is not a verification truth source and is never used to backfill claim hashes.
 *  Preserves existing Sui package / batch IDs so sui:deploy output is not overwritten.
 *  Returns the written Deployment for callers that need to inspect it. */
export function writeDeployment(
  topicId: string,
  _manifest: Record<string, string>,
  events: HcsEvent[]
): Deployment {
  // Resolve paths at call time so tests that chdir to an isolated tmpdir
  // see their own data/deployment.json rather than the module-init snapshot.
  const localDeploymentPath = path.join(process.cwd(), "data", "deployment.json");
  const existing: Deployment | null = existsSync(localDeploymentPath)
    ? readJson<Deployment>(localDeploymentPath)
    : null;

  const claims: Claim[] = events.map((event) => {
    if (!event.evidenceHash?.trim()) {
      throw new Error(
        `HCS/stored claim event ${event.claimType} (${event.evidenceUri}) is missing evidenceHash; ` +
          "refusing to backfill it from data/evidence-manifest.json."
      );
    }

    const meta = CLAIM_META[event.claimType];
    const existingClaim = existing?.claims.find((candidate) => candidate.claimType === event.claimType);
    const claim: Claim = {
      batchId: event.batchId,
      claimType: event.claimType,
      label: meta?.label ?? event.claimType,
      status: meta?.status ?? "pending",
      issuerRole: event.issuerRole,
      issuerName: event.issuerName,
      evidenceUri: event.evidenceUri,
      evidenceHash: event.evidenceHash,
      hcsTopicId: topicId,
      hcsSequence: event.sequenceNumber,
      suiObjectId: isRealSuiObjectId(existingClaim?.suiObjectId)
        ? existingClaim!.suiObjectId
        : `0xtracebite_local_claim_${event.sequenceNumber}`,
      createdAt: event.consensusTimestamp ?? event.createdAt,
    };
    if (meta?.reason) claim.reason = meta.reason;
    return claim;
  });

  const batch = buildBatch(topicId, claims, existing?.batch);

  const deployment: Deployment = {
    mode: "testnet",
    batch,
    claims,
    hcs: { topicId, network: process.env.HEDERA_NETWORK ?? "testnet" },
    hts: existing?.hts,
    certifications: existing?.certifications,
  };

  writeJson(localDeploymentPath, deployment);
  return deployment;
}

// ─── Hedera client builder ────────────────────────────────────────────────────

export async function buildHederaClient() {
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
    return null;
  }

  const sdk = await import("@hashgraph/sdk");
  const network = process.env.HEDERA_NETWORK || "testnet";
  const client = network === "mainnet" ? sdk.Client.forMainnet() : sdk.Client.forTestnet();
  const rawKey = process.env.HEDERA_PRIVATE_KEY.trim();
  const hexKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
  const privateKey =
    /^[0-9a-fA-F]{64}$/.test(hexKey)
      ? sdk.PrivateKey.fromStringECDSA(hexKey)
      : sdk.PrivateKey.fromString(rawKey);

  client.setOperator(process.env.HEDERA_ACCOUNT_ID, privateKey);
  return { sdk, client, accountId: process.env.HEDERA_ACCOUNT_ID, privateKey };
}
