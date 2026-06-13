import { createHash } from "node:crypto";
import type { AuthorityCertification, CertificationKind } from "../apps/web/lib/types";
import { stableStringify } from "../apps/web/lib/hts";
import { buildHederaClient, deploymentPath, loadDeployment, writeJson } from "./shared";

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
  claimType?: string;
  enforcement: AuthorityCertification["sbt"]["enforcement"];
};

const CERTIFICATE_SEEDS: CertificateSeed[] = [
  {
    certId: "cert-lab-lactose-free-2026",
    kind: "lab_certificate",
    title: "Lactose-Free Certificate of Analysis",
    shortLabel: "Lactose-Free",
    issuerName: "Proof of Plate Demo Lab Authority",
    issuerRole: "independent_lab",
    tokenNamePrefix: "PoP Lactose-Free Certificate",
    tokenSymbol: "POPLCERT",
    logoText: "LF",
    logoAlt: "Lactose-free certificate badge",
    accentColor: "#34D399",
    claimType: "lactose_free",
    enforcement: "demo_no_public_transfer_path",
  },
  {
    certId: "cert-facility-audit-2026",
    kind: "food_safety_audit",
    title: "Food Safety Facility Audit",
    shortLabel: "Audit Pass",
    issuerName: "Proof of Plate Demo Audit Authority",
    issuerRole: "third_party_auditor",
    tokenNamePrefix: "PoP Facility Audit Certificate",
    tokenSymbol: "POPAUDIT",
    logoText: "QA",
    logoAlt: "Food safety audit badge",
    accentColor: "#60A5FA",
    claimType: "equipment_cleaned",
    enforcement: "custom_controls_required",
  },
];

function sha256Hex(value: unknown) {
  return `0x${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function tokenIdsFromEnv() {
  const raw = process.env.HEDERA_CERT_SBT_TOKEN_IDS || process.env.CERT_SBT_TOKEN_IDS || "";
  return raw.split(",").map((tokenId) => tokenId.trim()).filter(Boolean);
}

function metadataFor(certification: AuthorityCertification) {
  return {
    schema: "proof-of-plate.certification-sbt.v1",
    certId: certification.certId,
    batchId: certification.batchId,
    title: certification.title,
    shortLabel: certification.shortLabel,
    issuerName: certification.issuerName,
    issuerRole: certification.issuerRole,
    issuedAt: certification.issuedAt,
    expiresAt: certification.expiresAt,
    evidenceHash: certification.evidenceHash,
    tokenId: certification.tokenId,
    serialNumber: certification.serialNumber,
    sbt: certification.sbt,
  };
}

function payloadFor(certification: AuthorityCertification) {
  const metadataHash = sha256Hex(metadataFor(certification));
  const shortCertId = certification.certId
    .replace(/^cert-/, "")
    .split("-")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 12) || "cert";
  return {
    metadataHash,
    metadataPayload: `pc:${shortCertId}:${metadataHash.replace(/^0x/, "")}`,
  };
}

function certificateForSeed(
  seed: CertificateSeed,
  tokenId: string,
  serialNumber: number,
  txs: Pick<AuthorityCertification, "createTransactionId" | "mintTransactionId" | "updateTransactionId"> = {}
): AuthorityCertification {
  const deployment = loadDeployment();
  if (!deployment) {
    throw new Error("Missing data/deployment.json. Run npm run demo:seed first.");
  }

  const claim = seed.claimType ? deployment.claims.find((candidate) => candidate.claimType === seed.claimType) : undefined;
  const issuedAt = claim?.createdAt ?? new Date().toISOString();
  const expiresAt = new Date(Date.parse(issuedAt) + 365 * 24 * 60 * 60 * 1000).toISOString();
  const issuerAccountId = process.env.CERT_SBT_AUTHORITY_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID || deployment.hts?.treasuryAccountId;

  const certification: AuthorityCertification = {
    certId: seed.certId,
    batchId: deployment.batch.batchId,
    kind: seed.kind,
    title: seed.title,
    shortLabel: seed.shortLabel,
    issuerName: seed.issuerName,
    issuerRole: seed.issuerRole,
    issuerAccountId,
    status: "active",
    issuedAt,
    expiresAt,
    network: deployment.mode,
    tokenId,
    serialNumber,
    nftId: `${tokenId}/${serialNumber}`,
    tokenName: `${seed.tokenNamePrefix} ${deployment.batch.batchId}`,
    tokenSymbol: seed.tokenSymbol,
    evidenceHash: claim?.evidenceHash,
    logoText: seed.logoText,
    logoAlt: seed.logoAlt,
    accentColor: seed.accentColor,
    sbt: {
      tokenStandard: "HEDERA_HTS_NFT",
      nonTransferable: true,
      issuanceMode: "authority_treasury_issued",
      enforcement: seed.enforcement,
      note:
        seed.enforcement === "demo_no_public_transfer_path"
          ? "Issued by the authority treasury for this product batch. The MVP does not expose a public transfer action for certificate badges."
          : "Modeled as a soulbound certificate. Hard HTS non-transferability requires custom custody, pause/freeze/KYC/admin-key, or contract-mediated transfer controls.",
    },
    ...txs,
  };

  const payload = payloadFor(certification);
  certification.metadataHash = payload.metadataHash;
  certification.metadataPayload = payload.metadataPayload;
  certification.explorerUrl = `https://hashscan.io/${certification.network}/token/${certification.tokenId}/${certification.serialNumber}`;
  return certification;
}

async function createRealCertificate(seed: CertificateSeed) {
  const deployment = loadDeployment();
  const hedera = await buildHederaClient();
  if (!deployment || !hedera) return null;

  const { sdk, client, accountId, privateKey } = hedera;
  const treasuryAccountId = process.env.CERT_SBT_AUTHORITY_ACCOUNT_ID || process.env.HEDERA_HTS_TREASURY_ACCOUNT_ID || accountId;
  const publicKey = privateKey.publicKey;

  try {
    const tokenName = `${seed.tokenNamePrefix} ${deployment.batch.batchId}`;
    const createTx = await new sdk.TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(seed.tokenSymbol)
      .setTokenMemo(`${seed.title} for ${deployment.batch.batchId}`.slice(0, 100))
      .setTokenType(sdk.TokenType.NonFungibleUnique)
      .setSupplyType(sdk.TokenSupplyType.Finite)
      .setMaxSupply(1)
      .setTreasuryAccountId(treasuryAccountId)
      .setAdminKey(publicKey)
      .setSupplyKey(publicKey)
      .setMetadataKey(publicKey)
      .freezeWith(client)
      .sign(privateKey);

    const createResponse = await createTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const tokenId = createReceipt.tokenId?.toString();
    if (!tokenId) throw new Error(`Certificate token creation failed for ${seed.certId}: no token ID.`);

    const draft = certificateForSeed(seed, tokenId, 1, {
      createTransactionId: createResponse.transactionId?.toString(),
    });
    const payload = draft.metadataPayload || payloadFor(draft).metadataPayload;

    const updateTx = await new sdk.TokenUpdateTransaction()
      .setTokenId(tokenId)
      .setMetadata(Buffer.from(payload, "utf8"))
      .freezeWith(client)
      .sign(privateKey);
    const updateResponse = await updateTx.execute(client);
    await updateResponse.getReceipt(client);

    const mintTx = await new sdk.TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([Buffer.from(payload, "utf8")])
      .freezeWith(client)
      .sign(privateKey);
    const mintResponse = await mintTx.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);
    const serialNumber = mintReceipt.serials?.[0]?.toNumber?.() ?? 1;

    return certificateForSeed(seed, tokenId, serialNumber, {
      createTransactionId: createResponse.transactionId?.toString(),
      updateTransactionId: updateResponse.transactionId?.toString(),
      mintTransactionId: mintResponse.transactionId?.toString(),
    });
  } finally {
    client.close();
  }
}

async function main() {
  const deployment = loadDeployment();
  if (!deployment) {
    throw new Error("Missing data/deployment.json. Run npm run demo:seed first.");
  }

  const envTokenIds = tokenIdsFromEnv();
  const nextCertifications: AuthorityCertification[] = [];

  for (let i = 0; i < CERTIFICATE_SEEDS.length; i += 1) {
    const seed = CERTIFICATE_SEEDS[i];
    const envTokenId = envTokenIds[i];
    if (envTokenId) {
      nextCertifications.push(certificateForSeed(seed, envTokenId, 1));
      continue;
    }

    const real = await createRealCertificate(seed);
    if (real) {
      nextCertifications.push(real);
      continue;
    }

    throw new Error(
      `Cannot create real certificate SBT for ${seed.certId}: Hedera credentials are missing. ` +
        "Refusing to write fake explorer token IDs."
    );
  }

  const existing = deployment.certifications ?? [];
  const nextById = new Map(existing.map((certification) => [certification.certId, certification]));

  for (const certification of nextCertifications) {
    nextById.set(certification.certId, certification);
  }

  const nextDeployment = {
    ...deployment,
    certifications: Array.from(nextById.values()),
  };

  writeJson(deploymentPath, nextDeployment);

  console.log(`Recorded ${nextCertifications.length} real authority-issued certificate SBT entries.`);
  for (const certification of nextCertifications) {
    console.log(`- ${certification.shortLabel}: ${certification.tokenId}/${certification.serialNumber} (${certification.metadataPayload})`);
    console.log(`  ${certification.explorerUrl}`);
  }
  console.log("SBT semantics: authority-issued certificate NFTs with no public transfer path in this app. Hard non-transferability on HTS requires custom controls/custody.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
