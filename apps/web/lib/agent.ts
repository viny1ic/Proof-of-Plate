import { getClaims, getHcsMessages } from "./data";
import { getEvidence, verifyEvidenceHash } from "./evidence";

export type AgentResponse = {
  answer: string;
  verifiedEvidence: string[];
  caveats: string[];
  sources: string[];
};

function normalize(input: string) {
  return input.toLowerCase();
}

export async function answerQuestion(batchId: string, question: string): Promise<AgentResponse> {
  const claims = getClaims(batchId);
  const topicId = claims[0]?.hcsTopicId || "0.0.6122026";
  const hcs = getHcsMessages(topicId);
  const q = normalize(question);

  const matchingClaims = q.includes("lactose")
    ? claims.filter((claim) => claim.claimType === "lactose_free")
    : q.includes("pesticide")
      ? claims.filter((claim) => claim.claimType.includes("pesticide"))
      : q.includes("processing") || q.includes("filtered") || q.includes("pasteur")
        ? claims.filter((claim) => ["ultra_filtered", "pasteurized"].includes(claim.claimType))
        : q.includes("clean") || q.includes("equipment")
          ? claims.filter((claim) => claim.claimType === "equipment_cleaned")
          : q.includes("missing")
            ? claims.filter((claim) => claim.status === "warning")
            : claims;

  const verifiedEvidence: string[] = [];
  const caveats: string[] = [];
  const sources: string[] = [];

  for (const claim of matchingClaims) {
    const evidence = getEvidence(claim.evidenceUri);
    const verification = verifyEvidenceHash(claim.evidenceUri, claim.evidenceHash);
    const event = hcs.find((candidate) => candidate.claimType === claim.claimType);

    if (verification.ok && claim.status === "verified") {
      verifiedEvidence.push(`${claim.label}: Sui status is verified and ${evidence.documentId} hash matches.`);
    } else if (verification.ok && claim.status === "warning") {
      verifiedEvidence.push(`${claim.label}: evidence hash matches ${evidence.documentId}, but the claim is warning-level.`);
    } else {
      caveats.push(`${claim.label}: evidence hash did not match the Sui claim.`);
    }

    if (claim.reason) caveats.push(claim.reason);
    if (claim.status === "warning" && !claim.reason) caveats.push(`${claim.label} is warning-level, not fully verified.`);

    sources.push(`Sui claim: ${claim.claimType} (${claim.status})`);
    sources.push(`HCS sequence: #${event?.sequenceNumber || claim.hcsSequence}`);
    sources.push(`Evidence file: ${claim.evidenceUri}`);
  }

  let answer = "I checked the product passport, HCS audit trail, and hashed evidence for this batch.";
  if (q.includes("lactose")) {
    answer = "The batch is supported as lactose-free for this demo product.";
  } else if (q.includes("pesticide")) {
    answer = "The batch has a supplier pesticide declaration, but it is not fully final-product residue-tested.";
  } else if (q.includes("processing") || q.includes("filtered") || q.includes("pasteur")) {
    answer = "The batch has verified processing evidence for ultra-filtration and pasteurization.";
  } else if (q.includes("clean") || q.includes("equipment")) {
    answer = "The batch has verified evidence that CIP cleaning was completed before processing.";
  } else if (q.includes("missing")) {
    answer = "The main missing evidence is a final pesticide residue lab test for the finished product.";
  }

  if (verifiedEvidence.length === 0) {
    caveats.push("I did not find a matching claim for that question.");
  }

  return {
    answer,
    verifiedEvidence,
    caveats,
    sources: [...new Set(sources)],
  };
}
