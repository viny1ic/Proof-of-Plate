import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ensureDataDir, evidenceDir, manifestPath, sha256Hex, writeJson } from "./shared";

ensureDataDir();

// Build-time seed artifact only. These hashes are copied into initial HCS/Sui
// claim records during seeding; runtime verification compares evidence bytes to
// the stored claim hash, not back to data/evidence-manifest.json.
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
console.log(`Wrote seed evidence manifest ${manifestPath}`);
console.log(manifest);
