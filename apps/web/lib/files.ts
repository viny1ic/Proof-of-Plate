import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(process.cwd(), "../..");

export function resolveProofOfPlatePath(...parts: string[]) {
  const cwd = process.cwd();
  const fromWorkspace = path.resolve(cwd, ...parts);
  if (existsSync(fromWorkspace)) return fromWorkspace;
  return path.resolve(repoRoot, ...parts);
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function sha256Hex(bytes: Buffer | string) {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}
