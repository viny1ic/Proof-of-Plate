export type ClaimStatus = "pending" | "verified" | "warning" | "failed" | "revoked";

export type NutritionFact = {
  label: string;
  amount: string;
  dailyValue?: string;
  sub?: boolean;
  bold?: boolean;
  divider?: boolean;
};

export type EvidenceFact = {
  key: string;
  value: string | number | boolean;
  unit?: string;
  result?: "pass" | "warning" | "fail" | "info";
};

export type EvidenceDocument = {
  documentId: string;
  title: string;
  issuerRole: string;
  issuerName: string;
  batchId: string;
  issuedAt: string;
  facts: EvidenceFact[];
};

export type ProductBatch = {
  batchId: string;
  productName: string;
  category: string;
  description: string;
  netContents: string;
  servingSize: string;
  servingsPerContainer: string;
  nutritionHighlights: string[];
  allergens: string[];
  storageInstructions: string;
  ingredients: Ingredient[];
  nutrition?: NutritionFact[];
  hcsTopicId: string;
  scoreVerified: number;
  scoreTotal: number;
  recalled: boolean;
  createdAt: string;
  suiPackageId: string;
  suiBatchObjectId: string;
};

export type Ingredient = {
  slug: string;
  name: string;
  role: string;
  source: string;
  description: string;
  verificationNote: string;
  relatedClaimTypes: string[];
};

export type Claim = {
  batchId: string;
  claimType: string;
  label: string;
  status: ClaimStatus;
  issuerRole: string;
  issuerName: string;
  evidenceUri: string;
  evidenceHash: string;
  hcsTopicId: string;
  hcsSequence: number;
  suiObjectId: string;
  createdAt: string;
  reason?: string;
};

export type HcsEvent = {
  v: "1.0";
  type: "CLAIM_SUBMITTED" | string;
  batchId: string;
  claimType: string;
  issuerRole: string;
  issuerName: string;
  evidenceUri: string;
  evidenceHash: string;
  createdAt: string;
  sequenceNumber: number;
  transactionId: string;
  consensusTimestamp?: string;
};

export type Deployment = {
  mode: "testnet";
  batch: ProductBatch;
  claims: Claim[];
  hcs: {
    topicId: string;
    network: string;
  };
};
