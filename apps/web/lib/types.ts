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
  storage?: EvidenceStorage;
  facts: EvidenceFact[];
};

export type EvidenceStorage = "inline" | "walrus";

export type WalrusEvidencePointer = {
  storage: "walrus";
  evidenceUri: string;
  blobId: string;
  objectId?: string;
  url: string;
  localDemoPath?: string;
  storageNote?: string;
};

export type WalrusHcsEvent = {
  v: "1.0";
  type: string;
  batchId: string;
  claimType: string;
  issuerRole: string;
  issuerName: string;
  evidenceStorage: "walrus";
  evidenceUri: string;
  evidenceHash: string;
  walrus: WalrusEvidencePointer;
  createdAt: string;
  sequenceNumber: number;
  transactionId: string;
  consensusTimestamp?: string;
};

export type WalrusEvidenceRecord = WalrusEvidencePointer & {
  batchId: string;
  productName: string;
  title: string;
  claimCount: number;
  hcsTopicId?: string;
  hcsEvents?: WalrusHcsEvent[];
  evidenceHash: string;
  sourceDocxPath?: string;
  extractedTextPath?: string;
};

export type WalrusEvidenceIndex = {
  schema: "proof-of-plate.walrus-evidence-index.v1";
  records: WalrusEvidenceRecord[];
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
  htsTokenId?: string;
  htsSerialNumber?: number;
  htsNftId?: string;
  htsMetadataHash?: string;
  htsMetadataPayload?: string;
  productPageUrl?: string;
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

export type ProductTokenMetadata = {
  schema: "proof-of-plate.hts-product-batch.v1";
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
  productPageUrl: string;
  hcsTopicId: string;
  suiBatchObjectId: string;
};

export type HtsDeployment = {
  network: string;
  tokenId: string;
  serialNumber: number;
  nftId: string;
  tokenType: "NON_FUNGIBLE_UNIQUE";
  supplyType: "FINITE";
  maxSupply: number;
  treasuryAccountId?: string;
  tokenName: string;
  tokenSymbol: string;
  metadataPayload: string;
  metadataHash: string;
  productMetadata: ProductTokenMetadata;
  createTransactionId?: string;
  mintTransactionId?: string;
  updateTransactionId?: string;
  createdAt?: string;
  updatedAt: string;
  source: "hedera" | "local" | "env";
};

export type CertificationStatus = "active" | "expired" | "revoked";

export type CertificationKind =
  | "lab_certificate"
  | "facility_audit"
  | "food_safety_audit"
  | "sustainability_audit"
  | "identity_attestation"
  | "other";

export type CertificationTokenStandard = "HEDERA_HTS_NFT";

export type CertificationSbtSemantics = {
  tokenStandard: CertificationTokenStandard;
  nonTransferable: true;
  issuanceMode: "authority_treasury_issued";
  enforcement: "demo_no_public_transfer_path" | "custom_controls_required";
  note: string;
};

export type AuthorityCertification = {
  certId: string;
  batchId: string;
  kind: CertificationKind;
  title: string;
  shortLabel: string;
  issuerName: string;
  issuerRole: string;
  issuerAccountId?: string;
  status: CertificationStatus;
  issuedAt: string;
  expiresAt?: string;
  network: "testnet" | "mainnet";
  tokenId: string;
  serialNumber: number;
  nftId: string;
  tokenName: string;
  tokenSymbol: string;
  metadataHash?: string;
  metadataPayload?: string;
  evidenceHash?: string;
  createTransactionId?: string;
  mintTransactionId?: string;
  updateTransactionId?: string;
  explorerUrl?: string;
  logoText: string;
  logoAlt: string;
  accentColor?: string;
  sbt: CertificationSbtSemantics;
};

export type Claim = {
  batchId: string;
  claimType: string;
  label: string;
  status: ClaimStatus;
  issuerRole: string;
  issuerName: string;
  evidenceStorage?: EvidenceStorage;
  evidenceUri: string;
  evidenceHash: string;
  walrus?: WalrusEvidencePointer;
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
  evidenceStorage?: EvidenceStorage;
  evidenceUri: string;
  evidenceHash: string;
  walrus?: WalrusEvidencePointer;
  createdAt: string;
  sequenceNumber: number;
  transactionId: string;
  consensusTimestamp?: string;
};

export type Deployment = {
  mode: "testnet";
  batch: ProductBatch;
  claims: Claim[];
  certifications?: AuthorityCertification[];
  hcs: {
    topicId: string;
    network: string;
  };
  hts?: HtsDeployment;
};
