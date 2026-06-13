import type { AuthorityCertification } from "./types";
import { getDeployment } from "./data";

const HEDERA_TOKEN_ID_RE = /^0\.0\.\d+$/;

export function isHederaTokenId(tokenId: string) {
  return HEDERA_TOKEN_ID_RE.test(tokenId);
}

export function certificationExplorerUrl(certification: AuthorityCertification) {
  if (certification.explorerUrl) return certification.explorerUrl;
  if (!isHederaTokenId(certification.tokenId)) return null;

  const network = certification.network === "mainnet" ? "mainnet" : "testnet";
  return `https://hashscan.io/${network}/token/${encodeURIComponent(certification.tokenId)}/${certification.serialNumber}`;
}

export function normalizeCertification(certification: AuthorityCertification): AuthorityCertification {
  return {
    ...certification,
    nftId: certification.nftId || `${certification.tokenId}/${certification.serialNumber}`,
    explorerUrl: certificationExplorerUrl(certification) ?? undefined,
  };
}

export function isCertificationActive(certification: AuthorityCertification, now: Date = new Date()) {
  if (certification.status !== "active") return false;
  if (!certification.expiresAt) return true;

  const expiresAtMs = Date.parse(certification.expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs >= now.getTime();
}

export function getCertificationsForBatch(batchId: string) {
  const deployment = getDeployment();
  if (deployment.batch.batchId !== batchId) {
    return [];
  }

  return (deployment.certifications ?? [])
    .filter((certification) => certification.batchId === batchId)
    .map(normalizeCertification)
    .sort((a, b) => {
      const activeDelta = Number(isCertificationActive(b)) - Number(isCertificationActive(a));
      if (activeDelta !== 0) return activeDelta;
      return a.title.localeCompare(b.title);
    });
}

export function certificationStatusLabel(certification: AuthorityCertification, now: Date = new Date()) {
  if (certification.status === "revoked") return "Revoked";
  if (certification.status === "expired" || !isCertificationActive(certification, now)) return "Expired";
  return "Soulbound certificate";
}

export function certificationSbtDescription(certification: AuthorityCertification) {
  const base =
    "Authority-issued, non-transferable certificate token: the authority treasury issues the HTS NFT to represent this batch certificate, and the demo exposes no public transfer path.";

  if (certification.sbt.enforcement === "custom_controls_required") {
    return `${base} Production-grade HTS soulbound enforcement needs custom controls such as custody, pause/freeze/KYC/admin-key policy, or contract-mediated transfer restrictions.`;
  }

  return `${base} This MVP records the intended soulbound semantics and links the certificate badge to its HashScan token page.`;
}
