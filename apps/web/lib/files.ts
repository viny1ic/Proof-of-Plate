import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Resolve the monorepo root from a given starting directory.
 * Walks up until it finds a directory containing both `apps/` and `data/`.
 */
function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "apps")) && existsSync(path.join(dir, "data"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: use process.cwd() traversal
  let cwd = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(cwd, "data"))) return cwd;
    const parent = path.dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }
  return process.cwd();
}

export const repoRoot = findRepoRoot(__dirname);

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
