import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ensureDataDir, evidenceDir, manifestPath, sha256Hex, writeJson } from "./shared";

ensureDataDir();

const manifest = Object.fromEntries(
  readdirSync(evidenceDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const uri = `/evidence/${file}`;
      const bytes = readFileSync(path.join(evidenceDir, file));
      return [uri, sha256Hex(bytes)];
    }),
);

writeJson(manifestPath, manifest);
console.log(`Wrote ${manifestPath}`);
console.log(manifest);
