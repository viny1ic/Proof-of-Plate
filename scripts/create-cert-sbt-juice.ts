/**
 * create-cert-sbt-juice.ts
 *
 * Mints real Hedera HTS NFT soulbound certification badges for the
 * Organic Juice product batch (POP-JUICE-ORG-APPLE-0613).
 *
 * Adds the certs to deployment.certifications alongside the milk certs,
 * keyed by the juice batchId so getCertificationsForBatch() serves them.
 */
import { createHash } from "node:crypto";
import type { AuthorityCertification, CertificationKind } from "../apps/web/lib/types";
import { stableStringify } from "../apps/web/lib/hts";
import { buildHederaClient, deploymentPath, loadDeployment, writeJson } from "./shared";
import { getWalrusEvidenceRecord } from "../apps/web/lib/walrus";

const JUICE_BATCH_ID = "POP-JUICE-ORG-APPLE-0613";

type CertificateSeed = {
  certId: string;
  kind: CertificationKind;
  title: string;
  shortLabel: string;
  issuerName: string;
  issuerRole: string;
  tokenNamePrefix: string;
  tokenSymbol: string;
  logoText: string;
  logoAlt: string;
  accentColor: string;
  enforcement: AuthorityCertification["sbt"]["enforcement"];
};

const JUICE_CERT_SEEDS: CertificateSeed[] = [
  {
    certId: "cert-juice-usda-organic-2026",
    kind: "organic_certification",
    title: "USDA Organic Certification",
    shortLabel: "USDA Organic",
    issuerName: "Proof of Plate Demo Organic Certifier",
    issuerRole: "certifying_agent",
    tokenNamePrefix: "PoP USDA Organic Cert",
    tokenSymbol: "POPORGCERT",
    logoText: "OG",
    logoAlt: "USDA Organic certification badge",
    accentColor: "#34D399",
    enforcement: "demo_no_public_transfer_path",
  },
  {
    certId: "cert-juice-food-safety-2026",
    kind: "food_safety_audit",
    title: "Food Safety Processing Audit",
    shortLabel: "Food Safe",
    issuerName: "Proof of Plate Demo Food Safety Authority",
    issuerRole: "third_party_auditor",
    tokenNamePrefix: "PoP Food Safety Cert",
    tokenSymbol: "POPFSCERT",
    logoText: "FS",
    logoAlt: "Food safety audit badge",
    accentColor: "#60A5FA",
    enforcement: "custom_controls_required",
  },
];

function sha256Hex(value: unknown) {
  return `0x${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function buildJuiceCert(
  seed: CertificateSeed,
  tokenId: string,
  serialNumber: number,
  txs: Pick<AuthorityCertification, "createTransactionId" | "mintTransactionId" | "updateTransactionId"> = {}
): AuthorityCertification {
  const deployment = loadDeployment();
  if (!deployment) throw new Error("Missing data/deployment.json");

  const walrusRecord = getWalrusEvidenceRecord(JUICE_BATCH_ID);
  const juiceBatch = (deployment as any).juiceBatch;
  const issuedAt   = new Date().toISOString();
  const expiresAt  = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const issuerAccountId = process.env.CERT_SBT_AUTHORITY_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID;

  const cert: AuthorityCertification = {
    certId:         seed.certId,
    batchId:        JUICE_BATCH_ID,
    kind:           seed.kind,
    title:          seed.title,
    shortLabel:     seed.shortLabel,
    issuerName:     seed.issuerName,
    issuerRole:     seed.issuerRole,
    issuerAccountId,
    status:         "active",
    issuedAt,
    expiresAt,
    network:        (process.env.HEDERA_NETWORK ?? "testnet") as "testnet" | "mainnet",
    tokenId,
    serialNumber,
    nftId:          `${tokenId}/${serialNumber}`,
    tokenName:      `${seed.tokenNamePrefix} ${JUICE_BATCH_ID}`,
    tokenSymbol:    seed.tokenSymbol,
    evidenceHash:   walrusRecord.evidenceHash,
    logoText:       seed.logoText,
    logoAlt:        seed.logoAlt,
    accentColor:    seed.accentColor,
    sbt: {
      tokenStandard: "HEDERA_HTS_NFT",
      nonTransferable: true,
      issuanceMode:  "authority_treasury_issued",
      enforcement:   seed.enforcement,
      note: seed.enforcement === "demo_no_public_transfer_path"
        ? "Issued by the authority treasury for this organic juice batch. The MVP does not expose a public transfer action."
        : "Modeled as a soulbound certificate. Hard HTS non-transferability requires custom custody or admin-key controls.",
    },
    ...txs,
  };

  const metadataHash    = sha256Hex({ certId: cert.certId, batchId: cert.batchId, title: cert.title, issuedAt: cert.issuedAt });
  const shortId         = seed.certId.replace(/^cert-/, "").split("-").map((p: string) => p[0] || "").join("").slice(0, 12) || "cert";
  cert.metadataHash     = metadataHash;
  cert.metadataPayload  = `pc:${shortId}:${metadataHash.replace(/^0x/, "")}`;
  cert.explorerUrl      = `https://hashscan.io/${cert.network}/token/${cert.tokenId}/${cert.serialNumber}`;
  return cert;
}

async function createRealJuiceCert(seed: CertificateSeed): Promise<AuthorityCertification | null> {
  const deployment = loadDeployment();
  const hedera     = await buildHederaClient();
  if (!deployment || !hedera) return null;

  const { sdk, client, accountId, privateKey } = hedera;
  const treasuryAccountId = process.env.CERT_SBT_AUTHORITY_ACCOUNT_ID || process.env.HEDERA_HTS_TREASURY_ACCOUNT_ID || accountId;
  const publicKey         = privateKey.publicKey;

  try {
    const tokenName = `${seed.tokenNamePrefix} ${JUICE_BATCH_ID}`;
    const createTx = await new sdk.TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(seed.tokenSymbol)
      .setTokenMemo(`${seed.title} for ${JUICE_BATCH_ID}`.slice(0, 100))
      .setTokenType(sdk.TokenType.NonFungibleUnique)
      .setSupplyType(sdk.TokenSupplyType.Finite)
      .setMaxSupply(1)
      .setTreasuryAccountId(treasuryAccountId)
      .setAdminKey(publicKey).setSupplyKey(publicKey).setMetadataKey(publicKey)
      .freezeWith(client).sign(privateKey);

    const createResp    = await createTx.execute(client);
    const createReceipt = await createResp.getReceipt(client);
    const tokenId       = createReceipt.tokenId?.toString();
    if (!tokenId) throw new Error(`No token ID returned for ${seed.certId}`);
    console.log(`  Created token: ${tokenId}`);

    const draft = buildJuiceCert(seed, tokenId, 1, { createTransactionId: createResp.transactionId?.toString() });
    const payload = draft.metadataPayload!;

    const updateTx = await new sdk.TokenUpdateTransaction()
      .setTokenId(tokenId).setMetadata(Buffer.from(payload, "utf8"))
      .freezeWith(client).sign(privateKey);
    const updateResp = await updateTx.execute(client);
    await updateResp.getReceipt(client);

    const mintTx = await new sdk.TokenMintTransaction()
      .setTokenId(tokenId).setMetadata([Buffer.from(payload, "utf8")])
      .freezeWith(client).sign(privateKey);
    const mintResp    = await mintTx.execute(client);
    const mintReceipt = await mintResp.getReceipt(client);
    const serialNumber = mintReceipt.serials?.[0]?.toNumber?.() ?? 1;
    console.log(`  Minted serial #${serialNumber}`);

    return buildJuiceCert(seed, tokenId, serialNumber, {
      createTransactionId: createResp.transactionId?.toString(),
      updateTransactionId: updateResp.transactionId?.toString(),
      mintTransactionId:   mintResp.transactionId?.toString(),
    });
  } finally {
    client.close();
  }
}

async function main() {
  const deployment = loadDeployment();
  if (!deployment) throw new Error("Missing data/deployment.json.");

  const juiceBatch = (deployment as any).juiceBatch;
  if (!juiceBatch) throw new Error("No juiceBatch found — run npm run sui:seed-juice first.");

  const newCerts: AuthorityCertification[] = [];

  for (const seed of JUICE_CERT_SEEDS) {
    console.log(`Creating cert: ${seed.certId}...`);
    const real = await createRealJuiceCert(seed);
    if (real) {
      newCerts.push(real);
      console.log(`  ${real.shortLabel}: ${real.tokenId}/${real.serialNumber}`);
      console.log(`  ${real.explorerUrl}`);
    } else {
      throw new Error(
        `Cannot create real certificate SBT for ${seed.certId}: Hedera credentials missing. ` +
        "Refusing to write fake token IDs."
      );
    }
  }

  // Merge into existing certifications (preserve milk certs, add/update juice certs)
  const existing = deployment.certifications ?? [];
  const nextById  = new Map(existing.map((c) => [c.certId, c]));
  for (const cert of newCerts) nextById.set(cert.certId, cert);

  const nextDeployment = { ...deployment, certifications: Array.from(nextById.values()) };
  writeJson(deploymentPath, nextDeployment);

  console.log(`\nRecorded ${newCerts.length} juice certification SBTs.`);
  console.log("SBT semantics: authority-issued HTS NFTs, non-transferable in this app.");
}

main().catch((e) => { console.error(e); process.exit(1); });
