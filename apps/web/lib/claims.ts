import type { ClaimStatus } from "./types";

export const BATCH_ID = "TB-MILK-0612";

export type ClaimDefinition = {
  claimType: string;
  label: string;
  issuerRole: string;
  issuerName: string;
  evidenceUri: string;
  status: ClaimStatus;
  reason?: string;
};

export const CLAIM_DEFINITIONS: ClaimDefinition[] = [
  {
    claimType: "lactose_free",
    label: "Lactose-free lab test passed",
    issuerRole: "lab",
    issuerName: "Proof of Plate Demo Lab",
    evidenceUri: "/evidence/lab-results.json",
    status: "verified",
  },
  {
    claimType: "ultra_filtered",
    label: "Ultra-filtration completed",
    issuerRole: "facility",
    issuerName: "Proof of Plate Demo Facility",
    evidenceUri: "/evidence/processing-log.json",
    status: "verified",
  },
  {
    claimType: "pasteurized",
    label: "Pasteurization completed",
    issuerRole: "facility",
    issuerName: "Proof of Plate Demo Facility",
    evidenceUri: "/evidence/processing-log.json",
    status: "verified",
  },
  {
    claimType: "equipment_cleaned",
    label: "CIP cleaning completed",
    issuerRole: "facility",
    issuerName: "Proof of Plate Demo Facility",
    evidenceUri: "/evidence/maintenance-log.json",
    status: "verified",
  },
  {
    claimType: "feed_pesticide_declaration",
    label: "Feed pesticide declaration available",
    issuerRole: "supplier",
    issuerName: "Proof of Plate Demo Feed Supplier",
    evidenceUri: "/evidence/feed-declaration.json",
    status: "warning",
    reason: "Supplier declaration exists, but no final pesticide residue lab test exists.",
  },
];

export function statusLabel(status: ClaimStatus) {
  return status.replace("_", " ");
}
