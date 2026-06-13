import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { deploymentPath, loadDeployment, writeJson } from "./shared";

const deployment = loadDeployment();
if (!deployment) {
  throw new Error("Missing data/deployment.json. Run npm run demo:seed or prior seed steps first.");
}

let packageId = process.env.SUI_PACKAGE_ID || deployment.batch.suiPackageId;

try {
  execFileSync("sui", ["--version"], { stdio: "ignore" });
  if (existsSync("contracts/sui/Move.toml")) {
    console.log("Sui CLI detected. Build this package with: sui move build --path contracts/sui");
    console.log("Publish manually with: sui client publish contracts/sui --gas-budget 100000000");
  }
} catch {
  console.log("Sui CLI not found. Keeping deterministic local package ID.");
}

const nextDeployment = {
  ...deployment,
  batch: {
    ...deployment.batch,
    suiPackageId: packageId,
  },
};
writeJson(deploymentPath, nextDeployment);
console.log(`Sui package ID: ${packageId}`);
