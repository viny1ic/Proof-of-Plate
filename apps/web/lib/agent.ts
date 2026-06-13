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
  return _toolkit;
}

// ─── Custom Proof of Plate tools ─────────────────────────────────────────────

const getBatchTool = tool(
  async ({ batchId }) => {
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
  async ({ batchId }) => {
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
  async ({ batchId }) => {
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
  async ({ uri }) => {
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
  async ({ uri, expectedHash }) => {
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

const SYSTEM_PROMPT = `You are the Proof of Plate AI verifier — a consumer-facing agent that answers questions about food product authenticity.

You have access to tools that let you inspect:
- Sui blockchain: final product truth (batch, claims, evidence hashes, verification score)
- Hedera HCS: ordered intake and audit trail (claim submission events, sequence numbers, timestamps)
- Evidence documents: static JSON files with lab results, processing logs, maintenance records

RULES — follow these strictly:
1. Never answer from your training knowledge. Always call the appropriate tool first.
2. Always call get_batch and get_claims before answering any question about a product.
3. For any claim you cite, call verify_evidence_hash to confirm the evidence is authentic.
4. Clearly distinguish: VERIFIED facts (hash matches + Sui status verified), WARNING claims (declaration only, no lab test), and MISSING evidence.
5. Always cite your sources: Sui claim object, HCS sequence number, and evidence file.
6. If a claim has status "warning", explain exactly why it is not fully verified.
7. Keep answers consumer-readable — plain language, no blockchain jargon unless explaining it.

Answer format:
Short direct answer.

Verified evidence:
- ...

Caveats:
- ...

Sources:
- Sui claim: ...
- HCS sequence: #...
- Evidence: ...`;

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
