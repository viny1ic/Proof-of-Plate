# Proof of Plate — MVP Implementation Plan and Design Spec

Updated: 2026-06-13
Source spec: `C:\Users\vinay\Downloads\proof-of-plate-implementation-plan.pdf`
Repository path: `/home/fresh`
Primary branch documented: `main`
Related feature branch: `feat/tamper-detection`

---

## TL;DR

Proof of Plate is a hackathon MVP for verifiable food product labels. A consumer scans a QR code or opens a product URL for a demo milk batch, views a product passport, and asks an AI verifier questions such as:

- Is this actually lactose-free?
- Were pesticides used?
- What processing happened to this product?
- Was the equipment cleaned?

The verifier answers only by checking:

- Sui product batch and claim records
- Hedera Consensus Service (HCS) ingestion events
- SHA-256 evidence hashes
- Static evidence JSON records

The project was renamed from TraceBite to Proof of Plate. Branding, package names (`proof-of-plate`, `@proof-of-plate/web`), UI strings, and issuer names use Proof of Plate. The on-chain Sui module remains `tracebite::tracebite` because the contract was already deployed with that module name.

---

## Branch and Feature Status

| Feature | Branch | Status |
|---|---|---|
| Product passport for `TB-MILK-0612` | `main` | Implemented |
| Sui testnet IDs and claim objects | `main` | Implemented via `data/deployment.json` |
| Hedera HCS testnet topic and events | `main` | Implemented via `data/hcs-events.json` |
| AI verifier with Claude + Hedera Agent Kit tools | `main` | Implemented |
| Evidence hash verification drawer | `main` | Implemented |
| Admin action to add final pesticide residue claim | `main` | Implemented |
| Tamper detection demo (`/demo/tamper`) | `feat/tamper-detection` | Implemented on separate branch |
| Tamper-check API (`/api/demo/tamper-check`) | `feat/tamper-detection` | Implemented on separate branch |
| Producer integration architecture doc | `feat/tamper-detection` | Implemented as `ARCHITECTURE.md` on separate branch |
| ENS | Not applicable | Intentionally out of scope |

Note: The source PDF describes the tamper demo as a new feature. In this repository, that feature lives on `feat/tamper-detection`, not on `main`.

---

## Key Design Points

### Sui

Sui is the final product truth layer. The consumer-facing passport ultimately trusts Sui for finalized product state.

Stored or represented in Sui-shaped deployment data:

- Product batch object
- Final verified claims, one shared object per claim
- Evidence hashes
- Hedera HCS topic ID
- HCS sequence numbers
- Verification score
- Recall state

### Hedera HCS

Hedera Consensus Service is the ordered ingestion and audit layer. It records supplier, facility, lab, and auditor claim submissions before they are finalized on Sui.

HCS provides:

- Ordered message sequences
- Consensus timestamps
- Transaction IDs
- Pre-finalization audit trail

### Static Evidence JSON

Static JSON files represent lab results, processing logs, maintenance records, feed pesticide declarations, and the final pesticide residue test. Each evidence file is hashed with SHA-256. The hash is included in both the HCS message and the Sui claim.

### AI Agent

The AI agent is the consumer-facing verifier and explainer. It is powered by:

- Hedera Agent Kit v4
- Claude `claude-haiku-4-5`
- LangGraph ReAct tool-calling loop
- Custom Proof of Plate tools for Sui-shaped data, HCS events, evidence retrieval, and hash verification

This is not keyword matching. The agent uses a real tool-calling loop and is instructed never to answer from model training knowledge.

---

## Live Testnet Deployment

The current workspace is configured with real testnet artifacts.

| Artifact | Value |
|---|---|
| Hedera network | `testnet` |
| Hedera account used in event transaction IDs | `0.0.9185855` |
| HCS topic ID | `0.0.9219010` |
| Sui network | `testnet` |
| Sui package ID | `0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c` |
| Sui batch object | `0xd73ce78b97ebe620044ac0e107c536458d228437f2d305305ee77f2093250193` |
| Sui publish tx | `5zLEd68pgwZ1wNHS77py9bWbLhnKk3DnhRjmusgFjEbh` |
| Sui batch tx | `7QbzcngvxTiPY3xkjpE7gdKLmHxyWgE5hk9Xn4LZM4nQ` |
| Sui score update tx | `FtAHAq8d6bbMnFXuTaoVXzLf1ENZ6KCjBGgSUHV823dJ` |

### Live Claim Object IDs

| Claim | HCS sequence | Sui object ID |
|---|---:|---|
| `lactose_free` | #1 | `0x7a5242b543e7c20e584e8d4045bb277226a826c2cecd95f4f9b8f8083dddf345` |
| `ultra_filtered` | #2 | `0x0a34481f337ecd4e08c001cb8181cd9ddf5bdcd392388c2985d9bfaef42656bb` |
| `pasteurized` | #3 | `0x9512a099b57d0f1990d3716771104975e4e139a58ad41770de0424c5956f0bc4` |
| `equipment_cleaned` | #4 | `0xa29f6bee487ed365782fb49ea8bbf038cdfe76f54ca59f38dc343b85cfe43c40` |
| `feed_pesticide_declaration` | #5 | `0x5866a7de2068d49b625caa2d86e9218d9c998bab5b1bb1d878ccb5030a90bc61` |

---

## Product Scope

### Demo Product

- Batch ID: `TB-MILK-0612`
- Product name: Proof of Plate Ultra-Filtered Milk
- Category: Dairy
- Initial score: `4/5 verified`
- Score after admin demo action: `5/6 verified`
- Recall state: not recalled

### Product Information

- Net contents: `52 fl oz (1.54 L)`
- Serving size: `1 cup (240 mL)`
- Servings per container: `About 6`
- Nutrition highlights:
  - 13g protein per serving
  - Lactose-free
  - Ultra-filtered
  - Pasteurized
- Allergen: Milk
- Storage: Keep refrigerated at or below 40 F. Use within 7 days after opening.

### Ingredients

| Ingredient | Role | Related claim types |
|---|---|---|
| Ultra-filtered lowfat milk | Primary dairy base | `ultra_filtered`, `pasteurized`, `lactose_free` |
| Lactase enzyme | Lactose breakdown aid | `lactose_free` |
| Vitamin A palmitate | Vitamin fortification | none |
| Vitamin D3 | Vitamin fortification | none |

---

## Claims

Five initial claims are seeded for the demo batch.

| # | Claim type | Label | Issuer role | Status | Evidence |
|---:|---|---|---|---|---|
| 1 | `lactose_free` | Lactose-free lab test passed | lab | verified | `/evidence/lab-results.json` |
| 2 | `ultra_filtered` | Ultra-filtration completed | facility | verified | `/evidence/processing-log.json` |
| 3 | `pasteurized` | Pasteurization completed | facility | verified | `/evidence/processing-log.json` |
| 4 | `equipment_cleaned` | CIP cleaning completed | facility | verified | `/evidence/maintenance-log.json` |
| 5 | `feed_pesticide_declaration` | Feed pesticide declaration available | supplier | warning | `/evidence/feed-declaration.json` |

The warning claim exists deliberately. Its reason is:

> Supplier declaration exists, but no final pesticide residue lab test exists.

The admin demo action adds a sixth claim:

| # | Claim type | Label | Issuer role | Status | Evidence |
|---:|---|---|---|---|---|
| 6 | `final_pesticide_residue_test` | Final pesticide residue test passed | lab | verified | `/evidence/final-pesticide-residue-test.json` |

---

## Architecture

```text
QR / Product URL
      |
      v
Next.js Frontend (apps/web)
      |
      +--> Sui testnet / Sui-shaped deployment data
      |      Product batch, finalized claims, hashes, score, recall state
      |      Explorer: suiscan.xyz/testnet
      |
      +--> Hedera HCS testnet
      |      Ordered claim intake messages
      |      Explorer: hashscan.io/testnet
      |
      +--> Static Evidence JSON
      |      Source records used for hash verification
      |
      +--> AI Agent
             Hedera Agent Kit + Claude + LangGraph ReAct tools
```

---

## Data Flow

1. Evidence JSON files are created and committed to the repository.
2. `hash-evidence.ts` computes SHA-256 hashes and writes `data/evidence-manifest.json`.
3. `create-hcs-topic.ts` creates or records one HCS topic for the product batch.
4. `submit-hcs-events.ts` submits one HCS message per claim and writes `data/hcs-events.json`.
5. `deploy-sui.ts` records the Sui package ID in `data/deployment.json`.
6. `seed-sui-batch.ts` creates the Sui batch and finalizes claims using evidence hashes and HCS sequence numbers.
7. The product page reads `data/deployment.json` and `data/hcs-events.json`.
8. The AI agent answers questions through tool calls against the batch, claims, HCS events, and evidence hashes.
9. The admin demo action runs `demo-add-claim.ts`, which adds the final pesticide residue claim and updates the score to `5/6`.

Implementation note: the primary configured path is real testnet. Some scripts still retain a credentialless/local fallback so the app remains demoable when Hedera credentials or the Sui CLI are absent.

---

## Hedera HCS Design

One HCS topic is used for the product batch:

- Topic ID: `0.0.9219010`
- Batch: `TB-MILK-0612`

Each claim submission is posted as compact JSON:

```json
{
  "v": "1.0",
  "type": "CLAIM_SUBMITTED",
  "batchId": "TB-MILK-0612",
  "claimType": "lactose_free",
  "issuerRole": "lab",
  "issuerName": "Proof of Plate Demo Lab",
  "evidenceUri": "/evidence/lab-results.json",
  "evidenceHash": "0x...",
  "createdAt": "2026-06-13T00:18:50Z"
}
```

HCS submission results are persisted to `data/hcs-events.json` with sequence numbers, transaction IDs, and consensus timestamps.

---

## Sui Move Contract

File: `contracts/sui/sources/tracebite.move`
Package/module: `tracebite::tracebite`

The module name remains `tracebite` even though the product was rebranded to Proof of Plate.

### Structs

`ProductBatch`:

- `id: UID`
- `batch_id: String`
- `product_name: String`
- `hcs_topic_id: String`
- `score_verified: u64`
- `score_total: u64`
- `recalled: bool`
- `created_at_ms: u64`

`Claim`:

- `id: UID`
- `batch_id: String`
- `claim_type: String`
- `label: String`
- `status: u8`
- `issuer_role: String`
- `issuer_name: String`
- `evidence_uri: String`
- `evidence_hash: vector<u8>`
- `hcs_topic_id: String`
- `hcs_sequence: u64`
- `created_at_ms: u64`

### Claim Status Values

| Numeric status | Meaning |
|---:|---|
| 0 | pending |
| 1 | verified |
| 2 | warning |
| 3 | failed |
| 4 | revoked |

### Events

- `BatchCreated`
- `ClaimAdded`
- `ScoreUpdated`
- `BatchRecalled`

### Entry Functions

- `create_batch(...)`
- `add_claim(...)`
- `update_score(batch, verified, total)`
- `recall_batch(batch)`

On `main`, `ProductBatch` and `Claim` objects are shared objects created through `transfer::share_object`.

---

## AI Agent

File: `apps/web/lib/agent.ts`

### Stack

| Component | Package / Model | Role |
|---|---|---|
| LLM | `@langchain/anthropic`, `claude-haiku-4-5` | Reasoning and answer generation |
| Agent framework | `@langchain/langgraph`, `createReactAgent` | ReAct tool-calling loop |
| Hedera tools | `@hashgraph/hedera-agent-kit-langchain` | Optional live HCS queries |
| Core agent kit | `@hashgraph/hedera-agent-kit` | Plugin system, AgentMode |

### Tools

| Tool | Source | Description |
|---|---|---|
| `get_batch` | Custom | Reads ProductBatch from `deployment.json` |
| `get_claims` | Custom | Reads all finalized Claim objects for a batch |
| `get_hcs_events` | Custom | Reads cached HCS intake events from `hcs-events.json` |
| `get_evidence` | Custom | Fetches a static evidence JSON document by URI |
| `verify_evidence_hash` | Custom | Computes SHA-256 and compares against claim hash |
| `get_topic_messages_query_tool` | Hedera Agent Kit | Optional live HCS topic message query |
| `get_topic_info_query_tool` | Hedera Agent Kit | Optional live HCS topic metadata query |

Hedera Agent Kit tools are attached only when Hedera credentials are present.

### Agent Rules

The system prompt enforces these rules:

1. Never answer from model training knowledge. Always call the appropriate tool first.
2. Always call `get_batch` and `get_claims` before answering any product question.
3. For any cited claim, call `verify_evidence_hash` to confirm authenticity.
4. Clearly distinguish verified facts, warning claims, and missing evidence.
5. Always cite sources: Sui claim object ID, HCS sequence number, and evidence file.
6. If a claim is warning-level, explain exactly why it is not fully verified.
7. Keep answers consumer-readable.

### Chat API

`POST /api/chat`

Request body:

```json
{
  "batchId": "TB-MILK-0612",
  "question": "Is this actually lactose-free?",
  "history": []
}
```

The API reconstructs prior turns as LangChain messages, injects the batch ID into the question, invokes the agent, and returns `{ "answer": "..." }`.

---

## Evidence and Hash Verification

Evidence files live in `public/evidence/`.

Current files on `main`:

- `lab-results.json`
- `processing-log.json`
- `maintenance-log.json`
- `feed-declaration.json`
- `final-pesticide-residue-test.json`

Additional file on `feat/tamper-detection`:

- `tampered-lab-results.json`

### Hashing

SHA-256 is computed over raw file bytes. Hashes are formatted as:

```text
0x<lowercase hex digest>
```

Each claim stores the expected evidence hash. The UI can recompute the actual hash and show whether the file still matches the claim.

### Evidence Path Guard

`apps/web/lib/evidence.ts` rejects:

- Absolute URLs or URI schemes
- Null bytes
- Paths that do not start with `/evidence/`
- `..` traversal segments
- Non-JSON files
- Paths that resolve outside `public/evidence/`

---

## Tamper Detection Demo (`feat/tamper-detection` branch)

The source PDF describes a tamper detection feature. It exists on the separate local branch `feat/tamper-detection`.

### Purpose

Demonstrate that modifying an evidence file after claim finalization is detected by a SHA-256 hash mismatch against the on-chain/stored claim hash.

### Scenario

A fraudulent version of `lab-results.json` changes the lactose result from a passing value to a failing value and adds failing pathogen-style evidence while keeping document metadata similar. The system recomputes the hash and compares it to the stored lactose-free claim hash.

### Branch Files

- `public/evidence/tampered-lab-results.json`
- `apps/web/app/api/demo/tamper-check/route.ts`
- `apps/web/app/demo/tamper/page.tsx`
- `ARCHITECTURE.md`

### Routes on the branch

| Route | Description |
|---|---|
| `GET /demo/tamper` | Interactive UI for running original vs tampered hash checks |
| `GET /api/demo/tamper-check?file=original|tampered` | Computes hash, compares with stored claim hash, returns `{ file, content, computedHash, onChainHash, tampered, diff }` |

---

## Frontend Routes

### `main`

| Route | Description |
|---|---|
| `/` | Redirects to `/p/${NEXT_PUBLIC_BATCH_ID || "TB-MILK-0612"}` |
| `/p/[batchId]` | Consumer product passport |
| `/p/[batchId]/ingredients/[slug]` | Batch-scoped ingredient detail page |
| `/ingredients/[slug]` | Ingredient detail page |
| `/admin` | Demo controls for adding the sixth final residue claim |

### `feat/tamper-detection`

| Route | Description |
|---|---|
| `/demo/tamper` | Interactive tamper detection demo |

---

## API Routes

### `main`

| Route | Description |
|---|---|
| `GET /api/batch/[batchId]` | Returns ProductBatch from `deployment.json` |
| `GET /api/claims/[batchId]` | Returns all claims for a batch |
| `GET /api/hcs/[topicId]` | Returns HCS events from `hcs-events.json` |
| `GET /api/evidence?uri=&expectedHash=` | Returns evidence document and hash verification result |
| `POST /api/chat` | Runs the Hedera Agent Kit + Claude ReAct verifier |
| `POST /api/demo/add-claim` | Runs `demo-add-claim.ts` |

### `feat/tamper-detection`

| Route | Description |
|---|---|
| `GET /api/demo/tamper-check?file=original|tampered` | Computes original/tampered hash verification and diff |

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `hash-evidence.ts` | `npm run hash:evidence` | SHA-256 hash all evidence files and write `data/evidence-manifest.json` |
| `create-hcs-topic.ts` | `npm run hedera:create-topic` | Create or record Hedera HCS topic |
| `submit-hcs-events.ts` | `npm run hedera:submit` | Submit one HCS message per claim and write results |
| `deploy-sui.ts` | `npm run sui:deploy` | Record Sui package ID / deployment metadata |
| `seed-sui-batch.ts` | `npm run sui:seed` | Create batch and claims using evidence hashes and HCS sequence numbers |
| `demo-add-claim.ts` | `npm run demo:add-claim` | Add sixth final pesticide residue claim and update score to `5/6` |
| Full seed chain | `npm run demo:seed` | Runs evidence hash, Hedera topic/event steps, Sui deploy, and Sui seed |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HEDERA_NETWORK` | testnet path | `testnet` |
| `HEDERA_ACCOUNT_ID` | testnet path | Hedera account ID, e.g. `0.0.9185855` |
| `HEDERA_PRIVATE_KEY` | testnet path | ECDSA key, `0x`-prefixed or raw hex |
| `HEDERA_TOPIC_ID` | optional | Existing topic ID override |
| `SUI_NETWORK` | testnet path | `testnet` |
| `SUI_PACKAGE_ID` | seed/deploy | Sui package ID used by seed scripts |
| `SUI_ADMIN_PRIVATE_KEY` | optional/currently not primary | Admin key placeholder for Sui workflows |
| `NEXT_PUBLIC_BATCH_ID` | yes | Defaults to `TB-MILK-0612` if absent |
| `ANTHROPIC_API_KEY` | AI verifier | Required for Claude agent responses |
| `OPENAI_API_KEY` | no | Present in older env templates but not used by current Claude agent |
| `DEMO_ADMIN_TOKEN` | production admin | Protects `/api/demo/add-claim` outside local/non-production contexts |

Note from source PDF: `.env.local` should be placed in `apps/web/` for Next.js runtime env loading.

---

## Key Dependencies

| Package | Version | Purpose |
|---|---:|---|
| `next` | `^15.3.4` | Frontend framework |
| `react` / `react-dom` | `^19.1.0` | UI runtime |
| `typescript` | `^5.8.3` | Type checking |
| `@hashgraph/hedera-agent-kit` | `^4.0.0` | Hedera Agent Kit core |
| `@hashgraph/hedera-agent-kit-langchain` | `^1.0.0` | LangChain adapter for Hedera Agent Kit |
| `@langchain/anthropic` | `^1.4.1` | Claude LLM client |
| `@langchain/core` | `^1.1.49` | LangChain primitives |
| `@langchain/langgraph` | `^1.4.2` | ReAct agent loop |
| `langchain` | `^1.4.5` | LangChain umbrella package |
| `@hiero-ledger/sdk` | direct app dependency | Hedera client used by agent setup |
| `lucide-react` | `^0.468.0` | UI icons |
| `tsx` | `^4.20.3` | TypeScript script runner |

---

## Project Structure

```text
proof-of-plate/
  apps/
    web/
      app/
        page.tsx                         Redirects to /p/TB-MILK-0612
        p/[batchId]/page.tsx             Consumer product passport
        p/[batchId]/ingredients/[slug]/page.tsx
        ingredients/[slug]/page.tsx
        admin/page.tsx                   Demo controls
        api/
          batch/[batchId]/route.ts
          claims/[batchId]/route.ts
          hcs/[topicId]/route.ts
          evidence/route.ts
          chat/route.ts                  Hedera Agent Kit + Claude
          demo/add-claim/route.ts
      components/
        AgentChat.tsx
        ClaimList.tsx
        DemoControls.tsx
        EvidenceDrawer.tsx
        LifecycleTimeline.tsx
        ProductHeader.tsx
        ProductInfo.tsx
        VerificationScore.tsx
      lib/
        agent.ts
        claims.ts
        data.ts
        evidence.ts
        explorer-links.ts
        files.ts
        hedera.ts
        sui.ts
        types.ts
  contracts/
    sui/
      Move.toml
      sources/tracebite.move
  public/
    evidence/
      lab-results.json
      processing-log.json
      maintenance-log.json
      feed-declaration.json
      final-pesticide-residue-test.json
  scripts/
    hash-evidence.ts
    create-hcs-topic.ts
    submit-hcs-events.ts
    deploy-sui.ts
    seed-sui-batch.ts
    demo-add-claim.ts
    shared.ts
  data/
    deployment.json
    hcs-events.json
    evidence-manifest.json
  README.md
  SPEC.md
```

Additional files on `feat/tamper-detection`:

```text
  ARCHITECTURE.md
  apps/web/app/demo/tamper/page.tsx
  apps/web/app/api/demo/tamper-check/route.ts
  public/evidence/tampered-lab-results.json
```

---

## Explorer Links

Sui explorer links use Suiscan, not the defunct Sui Explorer URL:

```text
https://suiscan.xyz/testnet/object/{objectId}
```

Hedera links use HashScan:

```text
https://hashscan.io/testnet/topic/{topicId}
https://hashscan.io/testnet/transaction/{transactionId}
```

Local-placeholder IDs are rendered as plain monospace text instead of external links.

---

## Success Criteria

The final demo should prove:

1. A product batch exists on Sui testnet with real object IDs.
2. Product claims exist with evidence hashes and are inspectable on Suiscan.
3. Each claim has a corresponding HCS ingestion event on Hedera testnet, visible on HashScan.
4. The UI displays real HCS sequence numbers and Sui object IDs with working explorer links.
5. The AI agent uses Hedera Agent Kit tools and Claude to answer through tool calls, not keyword matching.
6. The AI agent correctly surfaces the pesticide warning: supplier declaration exists, but no final lab test exists yet.
7. A live-style claim can be added through the admin demo action and finalized into local deployment data, with Sui/Hedera testnet calls used when credentials and CLI support are present.
8. On `feat/tamper-detection`, the tamper detection demo catches modified evidence by hash mismatch and shows the diff.

---

## Demo Script

### Main branch demo

1. Open `/p/TB-MILK-0612`.
2. Show the score: `4/5 verified`.
3. Show the Sui batch and claim links on `suiscan.xyz/testnet`.
4. Show the Hedera HCS topic and timeline on `hashscan.io/testnet`.
5. Ask the AI agent: "Is this actually lactose-free?"
   - Expected behavior: agent calls `get_batch`, `get_claims`, `get_evidence`, and `verify_evidence_hash`, then returns a verified answer with Sui claim object ID and HCS sequence #1.
6. Ask: "Were pesticides used?"
   - Expected behavior: agent explains the supplier declaration exists at HCS sequence #5 but the claim is only warning-level because no final residue lab test exists in the initial state.
7. Open `/admin`.
8. Click "Add final residue test".
9. Refresh the product page.
10. Show the added claim and updated score `5/6`.

### Tamper branch demo

1. Checkout `feat/tamper-detection`.
2. Open `/demo/tamper`.
3. Click "Run Tamper Detection".
4. Show original evidence passing and tampered evidence failing with field-level diff.

---

## Final Pitch

Proof of Plate makes food labels verifiable.

Hedera HCS records the ordered intake trail for supply-chain claims. Sui stores the finalized product passport and evidence hashes. The AI agent — powered by Hedera Agent Kit and Claude — explains the product to consumers, but only using verified claims, HCS audit events, and hashed evidence. Any modification to an evidence document after certification is detected instantly by hash mismatch.
