import { Client, PrivateKey } from "@hiero-ledger/sdk";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { allCorePlugins } from "@hashgraph/hedera-agent-kit/plugins";
import { HederaLangchainToolkit } from "@hashgraph/hedera-agent-kit-langchain";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { getClaims, getHcsMessages, getBatch } from "./data";
import { getEvidence, verifyEvidenceHash } from "./evidence";

// ─── Hedera client (singleton per process) ───────────────────────────────────
let _toolkit: HederaLangchainToolkit | null = null;

function getHederaToolkit() {
  if (_toolkit) return _toolkit;
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  if (!accountId || !privateKey) return null;
  try {
    const raw = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    const client = Client.forTestnet().setOperator(
      accountId,
      PrivateKey.fromStringECDSA(raw)
    );
    _toolkit = new HederaLangchainToolkit({
      client,
      configuration: {
        plugins: allCorePlugins,
        context: { mode: AgentMode.AUTONOMOUS },
      },
    });
  } catch (err) {
    console.error("Hedera toolkit init failed — live HCS tools disabled:", err);
    return null;
  }
  return _toolkit;
}

// ─── Custom Proof of Plate tools ─────────────────────────────────────────────

const getBatchTool = tool(
  async ({ batchId }: { batchId: string }) => {
    try {
      const batch = getBatch(batchId);
      return JSON.stringify(batch);
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_batch",
    description:
      "Get the product batch record from Sui. Returns batchId, productName, hcsTopicId, scoreVerified, scoreTotal, recalled, suiPackageId, suiBatchObjectId.",
    schema: z.object({ batchId: z.string().describe("The product batch ID, e.g. TB-MILK-0612") }),
  }
);

const getClaimsTool = tool(
  async ({ batchId }: { batchId: string }) => {
    try {
      const claims = getClaims(batchId);
      return JSON.stringify(claims);
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_claims",
    description:
      "Get all finalized product claims stored on Sui for a batch. Each claim has claimType, label, status (verified/warning/failed), issuerRole, evidenceUri, evidenceHash, hcsSequence, suiObjectId.",
    schema: z.object({ batchId: z.string().describe("The product batch ID") }),
  }
);

const getLocalHcsEventsTool = tool(
  async ({ batchId }: { batchId: string }) => {
    try {
      const claims = getClaims(batchId);
      const topicId = claims[0]?.hcsTopicId;
      if (!topicId) return "No HCS topic found for this batch.";
      const events = getHcsMessages(topicId);
      return JSON.stringify(events);
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_hcs_events",
    description:
      "Get the local cached Hedera HCS intake events for a batch. Shows sequenceNumber, claimType, issuerRole, evidenceHash, consensusTimestamp, transactionId for each submitted claim event.",
    schema: z.object({ batchId: z.string().describe("The product batch ID") }),
  }
);

const getEvidenceTool = tool(
  async ({ uri }: { uri: string }) => {
    try {
      const doc = getEvidence(uri);
      return JSON.stringify(doc);
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }
  },
  {
    name: "get_evidence",
    description:
      "Fetch a static evidence document by URI (e.g. /evidence/lab-results.json). Returns the full document including all measured facts.",
    schema: z.object({ uri: z.string().describe("Evidence URI like /evidence/lab-results.json") }),
  }
);

const verifyHashTool = tool(
  async ({ uri, expectedHash }: { uri: string; expectedHash: string }) => {
    try {
      const result = verifyEvidenceHash(uri, expectedHash);
      return JSON.stringify(result);
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }
  },
  {
    name: "verify_evidence_hash",
    description:
      "Verify a SHA-256 hash of an evidence file against the expected hash stored on-chain. Returns { ok, actualHash, expectedHash, file }. ok=true means the evidence is authentic and unmodified.",
    schema: z.object({
      uri: z.string().describe("Evidence URI"),
      expectedHash: z.string().describe("Expected hash from the Sui claim"),
    }),
  }
);

// ─── Agent factory ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Proof of Plate AI — a friendly food transparency assistant that helps everyday consumers understand what's in their food and how it was verified.

You have access to tools to look up:
- Sui blockchain: final verified claims, evidence hashes, verification score
- Hedera HCS: tamper-proof audit trail of every claim submission
- Evidence documents: lab results, processing logs, maintenance records

RULES:
1. Always call get_batch and get_claims before answering anything about a product.
2. For claims you cite, call verify_evidence_hash to confirm authenticity.
3. Distinguish clearly: ✅ VERIFIED (hash match + Sui verified), ⚠️ ADVISORY (declaration only, no lab proof), ❌ NOT CERTIFIED (no claim exists).
4. If a question is about something NOT in the claims (e.g. kosher, vegan, organic), say clearly "This product has no certified claim for that on-chain" and explain what IS verified. Never refuse to answer.
5. Write like you're talking to a shopper, not an engineer. Plain English. No blockchain jargon unless the user asks.
6. When you reference a Sui object or Hedera topic, include the full explorer URL so it renders as a clickable link (e.g. https://suiscan.xyz/testnet/object/OBJECT_ID or https://hashscan.io/testnet/topic/TOPIC_ID).
7. Keep answers concise — 3–6 sentences for simple questions, bullet points for multi-part answers.

Answer format (adapt as needed):
[Direct yes/no or short answer in plain English]

[1–3 bullet points of key verified facts, each with ✅ or ⚠️]

[1 line: where to verify — include the explorer URL]

If the question is conversational or about a topic with no claim, just answer helpfully in 2–3 sentences.`;

export function createProofOfPlateAgent() {
  const llm = new ChatAnthropic({
    model: "claude-haiku-4-5",
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0,
  });

  // Start with our custom tools
  const customTools = [
    getBatchTool,
    getClaimsTool,
    getLocalHcsEventsTool,
    getEvidenceTool,
    verifyHashTool,
  ];

  // Add Hedera Agent Kit tools — specifically consensus query tools for live HCS
  const hederaToolkit = getHederaToolkit();
  const hederaTools = hederaToolkit
    ? hederaToolkit.getTools().filter((t) =>
        ["get_topic_messages_query_tool", "get_topic_info_query_tool"].includes(t.name)
      )
    : [];

  const allTools = [...customTools, ...hederaTools] as StructuredToolInterface[];

  return createReactAgent({
    llm,
    tools: allTools,
    prompt: SYSTEM_PROMPT,
  });
}
