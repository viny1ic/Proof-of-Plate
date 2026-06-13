import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Claim, Deployment, HcsEvent, ProductBatch } from "../apps/web/lib/types";

export const root = path.resolve(process.cwd());
export const dataDir = path.join(root, "data");
export const evidenceDir = path.join(root, "public", "evidence");
export const deploymentPath = path.join(dataDir, "deployment.json");
export const manifestPath = path.join(dataDir, "evidence-manifest.json");
export const hcsEventsPath = path.join(dataDir, "hcs-events.json");

export function ensureDataDir() {
  mkdirSync(dataDir, { recursive: true });
}

export function sha256Hex(bytes: Buffer | string) {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function writeJson(filePath: string, value: unknown) {
  ensureDataDir();
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function loadDeployment(): Deployment | null {
  if (!existsSync(deploymentPath)) return null;
  return readJson<Deployment>(deploymentPath);
}

export function evidenceFilePath(uri: string) {
  return path.join(root, "public", uri.startsWith("/") ? uri.slice(1) : uri);
}

export function loadManifest(): Record<string, string> {
  if (!existsSync(manifestPath)) {
    throw new Error("Missing data/evidence-manifest.json. Run npm run hash:evidence first.");
  }
  return readJson<Record<string, string>>(manifestPath);
}

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
  return { sdk, client };
}
