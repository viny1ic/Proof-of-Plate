/**
 * seed-juice-sui.mjs  (ESM — run with: node scripts/seed-juice-sui.mjs)
 *
 * Creates a fresh Ed25519 keypair, funds from faucet, then calls
 * create_batch + add_claim (×16) + update_score on the deployed
 * tracebite package for the Organic Juice product.
 *
 * Sui is the identity passport. Walrus stores the bulk evidence.
 * Each Claim on Sui references the Walrus URI + SHA-256 hash.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

// ── load env files ────────────────────────────────────────────────────────────
function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const eq = s.indexOf("=");
    const k = s.slice(0, eq).trim();
    const v = s.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(".env.local");
loadEnv("apps/web/.env.local");

// ── constants ─────────────────────────────────────────────────────────────────
const PACKAGE_ID     = "0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c";
const CLOCK_ID       = "0x0000000000000000000000000000000000000000000000000000000000000006";
const RPC_URL        = "https://fullnode.testnet.sui.io:443";
const FAUCET_URL     = "https://faucet.testnet.sui.io/v2/gas";

const WALRUS_INDEX   = JSON.parse(readFileSync("data/walrus-evidence.json", "utf8"));
const JUICE_RECORD   = WALRUS_INDEX.records.find(r => r.batchId === "POP-JUICE-ORG-APPLE-0613");
const RAW_PACK       = JSON.parse(readFileSync("public/evidence/walrus/organic-juice/raw-data-pack.json", "utf8"));
if (!JUICE_RECORD) throw new Error("Juice Walrus record not found");

// ── SDK imports ───────────────────────────────────────────────────────────────
const { SuiJsonRpcClient, JsonRpcHTTPTransport, getJsonRpcFullnodeUrl } = await import("@mysten/sui/jsonRpc");
const { Ed25519Keypair }          = await import("@mysten/sui/keypairs/ed25519");
const { Transaction }             = await import("@mysten/sui/transactions");
const { bcs }                     = await import("@mysten/sui/bcs");
const { decodeSuiPrivateKey }     = await import("@mysten/sui/cryptography");

// ── build client ─────────────────────────────────────────────────────────────
const transport = new JsonRpcHTTPTransport({ url: RPC_URL });
const client = new SuiJsonRpcClient({ transport });

// ── keypair ───────────────────────────────────────────────────────────────────
let keypair;
let isNew = false;
if (process.env.SUI_ADMIN_PRIVATE_KEY) {
  console.log("Using existing SUI_ADMIN_PRIVATE_KEY");
  const raw = process.env.SUI_ADMIN_PRIVATE_KEY;
  // Key may be stored as: bech32 string, 0x+bech32-as-hex, or raw 32-byte hex
  const candidates = [
    raw,                                                          // direct bech32 or raw hex
    raw.startsWith("0x") ? Buffer.from(raw.slice(2), "hex").toString("utf8") : null, // hex-encoded bech32
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const decoded = decodeSuiPrivateKey(candidate);
      keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
      break;
    } catch {}
  }
  if (!keypair) {
    // Last resort: treat as raw 32-byte hex seed
    const hex = raw.replace(/^0x/, "").slice(0, 64);
    keypair = Ed25519Keypair.fromSecretKey(Buffer.from(hex, "hex"));
  }
} else {
  console.log("Generating fresh Ed25519 keypair");
  keypair = new Ed25519Keypair();
  isNew = true;
}
const address = keypair.getPublicKey().toSuiAddress();
console.log("Address:", address);

// ── helpers ───────────────────────────────────────────────────────────────────
function hexToUint8(hex) {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const arr = new Uint8Array(h.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

async function faucet(addr) {
  console.log("Requesting faucet for", addr);
  const r = await fetch(FAUCET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ FixedAmountRequest: { recipient: addr } }),
  });
  const b = await r.json().catch(() => ({}));
  console.log("Faucet response:", JSON.stringify(b).slice(0, 200));
}

async function waitGas(addr, tries = 20, delay = 8000) {
  for (let i = 0; i < tries; i++) {
    // retry faucet every 5 attempts
    if (i > 0 && i % 5 === 0) {
      console.log("Re-requesting faucet...");
      await faucet(addr);
    }
    const res = await client.getCoins({ owner: addr });
    const total = (res.data ?? []).reduce((s, c) => s + BigInt(c.balance), 0n);
    if (total > 0n) { console.log(`Balance: ${total} MIST`); return; }
    console.log(`Waiting for gas (${i + 1}/${tries})...`);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error("No gas after faucet — IP may be rate-limited. Retry in a few minutes.");
}

async function execTx(tx, label) {
  console.log(`Executing: ${label}`);
  tx.setSender(address);
  const bytes = await tx.build({ client });
  const { signature } = await keypair.signTransaction(bytes);
  const result = await client.executeTransactionBlock({
    transactionBlock: Array.from(bytes),
    signature,
    options: { showEffects: true, showObjectChanges: true },
  });
  if (result.effects?.status?.status !== "success") {
    throw new Error(`${label} failed: ${JSON.stringify(result.effects?.status)}`);
  }
  await client.waitForTransaction({ digest: result.digest });
  console.log(`  ✓ ${label}  digest: ${result.digest}`);
  return result;
}

function getCreated(result, typeHint) {
  const obj = (result.objectChanges ?? []).find(
    c => c.type === "created" && c.objectType?.includes(typeHint)
  );
  if (!obj) throw new Error(`No created ${typeHint} in ${result.digest}`);
  return obj.objectId;
}

// ── main ──────────────────────────────────────────────────────────────────────
const juiceTopicId = JUICE_RECORD.hcsTopicId ?? "0.0.9226673";

// 1. fund if needed
const coins = await client.getCoins({ owner: address });
const bal = (coins.data ?? []).reduce((s, c) => s + BigInt(c.balance), 0n);
if (bal < 10_000_000n) {
  await faucet(address);
  await waitGas(address);
} else {
  console.log(`Existing balance: ${bal} MIST`);
}

// 2. create_batch
const batchTx = new Transaction();
batchTx.moveCall({
  target: `${PACKAGE_ID}::tracebite::create_batch`,
  arguments: [
    batchTx.pure.string("POP-JUICE-ORG-APPLE-0613"),
    batchTx.pure.string("Proof of Plate Organic Apple Juice"),
    batchTx.pure.string(juiceTopicId),
    batchTx.object(CLOCK_ID),
  ],
});
const batchRes = await execTx(batchTx, "create_batch");
const batchObjectId = getCreated(batchRes, "ProductBatch");
console.log("  ProductBatch:", batchObjectId);

// 3. add_claim ×16
const claims = RAW_PACK.claims;
const claimIds = [];

for (const claim of claims) {
  const statusCode = claim.status === "verified" ? 1 :
                     claim.status === "warning"  ? 2 :
                     claim.status === "failed"   ? 3 : 0;
  const hashBytes = hexToUint8(JUICE_RECORD.evidenceHash);

  const claimTx = new Transaction();
  claimTx.moveCall({
    target: `${PACKAGE_ID}::tracebite::add_claim`,
    arguments: [
      claimTx.pure.string("POP-JUICE-ORG-APPLE-0613"),
      claimTx.pure.string(claim.claimId),
      claimTx.pure.string(claim.label),
      claimTx.pure.u8(statusCode),
      claimTx.pure.string(claim.issuerRole),
      claimTx.pure.string("Proof of Plate Organic Juice"),
      claimTx.pure.string(JUICE_RECORD.evidenceUri),          // walrus://blob/...
      claimTx.pure(bcs.vector(bcs.u8()).serialize(hashBytes).toBytes()),
      claimTx.pure.string(juiceTopicId),
      claimTx.pure.u64(claim.sequence),
      claimTx.object(CLOCK_ID),
    ],
  });
  const claimRes = await execTx(claimTx, `add_claim[${claim.claimId}]`);
  const claimObjId = getCreated(claimRes, "Claim");
  claimIds.push(claimObjId);
  console.log(`  Claim[${claim.sequence}] ${claim.claimId}: ${claimObjId}`);
}

// 4. update_score
const verifiedCount = claims.filter(c => c.status === "verified").length;
const scoreTx = new Transaction();
scoreTx.moveCall({
  target: `${PACKAGE_ID}::tracebite::update_score`,
  arguments: [
    scoreTx.object(batchObjectId),
    scoreTx.pure.u64(verifiedCount),
    scoreTx.pure.u64(claims.length),
  ],
});
await execTx(scoreTx, "update_score");

// 5. Persist results
const deployment = JSON.parse(readFileSync("data/deployment.json", "utf8"));

deployment.juiceBatch = {
  batchId:            "POP-JUICE-ORG-APPLE-0613",
  productName:        "Proof of Plate Organic Apple Juice",
  suiPackageId:       PACKAGE_ID,
  suiBatchObjectId:   batchObjectId,
  hcsTopicId:         juiceTopicId,
  walrusBlobId:       JUICE_RECORD.blobId,
  walrusObjectId:     JUICE_RECORD.objectId,
  walrusEvidenceUri:  JUICE_RECORD.evidenceUri,
  walrusEvidenceHash: JUICE_RECORD.evidenceHash,
  scoreVerified:      verifiedCount,
  scoreTotal:         claims.length,
  createdAt:          new Date().toISOString(),
};

deployment.juiceClaims = claims.map((c, i) => ({
  batchId:         "POP-JUICE-ORG-APPLE-0613",
  claimType:       c.claimId,
  label:           c.label,
  status:          c.status,
  issuerRole:      c.issuerRole,
  issuerName:      "Proof of Plate Organic Juice",
  suiObjectId:     claimIds[i],
  evidenceStorage: "walrus",
  evidenceUri:     JUICE_RECORD.evidenceUri,
  evidenceHash:    JUICE_RECORD.evidenceHash,
  walrus: {
    storage:     "walrus",
    evidenceUri: JUICE_RECORD.evidenceUri,
    blobId:      JUICE_RECORD.blobId,
    objectId:    JUICE_RECORD.objectId,
    url:         JUICE_RECORD.url,
  },
  hcsTopicId:  juiceTopicId,
  hcsSequence: c.sequence,
  createdAt:   new Date().toISOString(),
}));

writeFileSync("data/deployment.json", JSON.stringify(deployment, null, 2) + "\n");
console.log("\n✅ data/deployment.json updated");
console.log("   batch:", batchObjectId);
console.log("   claims:", claimIds.length);

// 6. Save new keypair
if (isNew) {
  const hex = Buffer.from(keypair.getSecretKey()).toString("hex");
  const envPath = "apps/web/.env.local";
  const existing = readFileSync(envPath, "utf8");
  if (!existing.includes("SUI_ADMIN_PRIVATE_KEY")) {
    writeFileSync(envPath, existing + `\nSUI_ADMIN_PRIVATE_KEY=0x${hex}\nSUI_ADMIN_ADDRESS=${address}\n`);
    console.log("\n🔑 New keypair saved to apps/web/.env.local");
    console.log("   Address:", address);
    console.log("   BACK THIS UP — it controls the juice Sui objects");
  }
}

console.log("\n🎉 Done — juice Sui identity passport created");

// ── BCS vector<u8> helper ─────────────────────────────────────────────────────
function bcs_vector_u8(bytes) {
  // In @mysten/sui v2, Transaction.pure() accepts a Uint8Array for vector<u8>
  return bytes;
}
