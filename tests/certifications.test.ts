import test from "node:test";
import assert from "node:assert/strict";
import type { AuthorityCertification } from "../apps/web/lib/types";
import {
  certificationExplorerUrl,
  certificationSbtDescription,
  certificationStatusLabel,
  getCertificationsForBatch,
  isCertificationActive,
} from "../apps/web/lib/certifications";

function cert(overrides: Partial<AuthorityCertification> = {}): AuthorityCertification {
  return {
    certId: "cert-test",
    batchId: "TB-MILK-0612",
    kind: "lab_certificate",
    title: "Test Certificate",
    shortLabel: "Test",
    issuerName: "Test Authority",
    issuerRole: "auditor",
    status: "active",
    issuedAt: "2026-06-12T21:00:00.000Z",
    expiresAt: "2027-06-12T21:00:00.000Z",
    network: "testnet",
    tokenId: "0.0.123456",
    serialNumber: 7,
    nftId: "0.0.123456/7",
    tokenName: "Test Certificate Token",
    tokenSymbol: "TSTCERT",
    logoText: "T",
    logoAlt: "Test badge",
    sbt: {
      tokenStandard: "HEDERA_HTS_NFT",
      nonTransferable: true,
      issuanceMode: "authority_treasury_issued",
      enforcement: "demo_no_public_transfer_path",
      note: "No public transfer path in the demo.",
    },
    ...overrides,
  };
}

test("certificationExplorerUrl links Hedera HTS NFT serial pages", () => {
  assert.equal(
    certificationExplorerUrl(cert()),
    "https://hashscan.io/testnet/token/0.0.123456/7"
  );
  assert.equal(
    certificationExplorerUrl(cert({ network: "mainnet" })),
    "https://hashscan.io/mainnet/token/0.0.123456/7"
  );
  assert.equal(certificationExplorerUrl(cert({ tokenId: "0.0.tracebite_local_cert" })), null);
});

test("isCertificationActive respects status and expiration", () => {
  const now = new Date("2026-07-01T00:00:00.000Z");

  assert.equal(isCertificationActive(cert(), now), true);
  assert.equal(isCertificationActive(cert({ status: "revoked" }), now), false);
  assert.equal(isCertificationActive(cert({ expiresAt: "2025-01-01T00:00:00.000Z" }), now), false);
  assert.equal(certificationStatusLabel(cert({ expiresAt: "2025-01-01T00:00:00.000Z" }), now), "Expired");
});

test("certificationSbtDescription documents demo and custom-control soulbound semantics", () => {
  assert.match(certificationSbtDescription(cert()), /authority treasury/i);
  assert.match(certificationSbtDescription(cert()), /no public transfer path/i);

  const custom = certificationSbtDescription(
    cert({
      sbt: {
        tokenStandard: "HEDERA_HTS_NFT",
        nonTransferable: true,
        issuanceMode: "authority_treasury_issued",
        enforcement: "custom_controls_required",
        note: "Hard enforcement needs controls.",
      },
    })
  );

  assert.match(custom, /custom controls/i);
  assert.match(custom, /pause\/freeze\/KYC\/admin-key/i);
});

test("getCertificationsForBatch reads demo deployment certificates and normalizes explorer URLs", () => {
  const certifications = getCertificationsForBatch("TB-MILK-0612");

  assert.equal(certifications.length, 2);
  assert.deepEqual(
    certifications.map((candidate) => candidate.shortLabel).sort(),
    ["Audit Pass", "Lactose-Free"]
  );
  for (const candidate of certifications) {
    assert.equal(candidate.sbt.nonTransferable, true);
    assert.equal(candidate.sbt.issuanceMode, "authority_treasury_issued");
    assert.match(candidate.explorerUrl ?? "", /^https:\/\/hashscan\.io\/testnet\/token\/0\.0\.\d+\/1$/);
    assert.doesNotMatch(candidate.explorerUrl ?? "", /tracebite_local|922618[56]/);
  }
});
