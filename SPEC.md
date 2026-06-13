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
- Is this kosher?

The verifier answers by checking:

- Sui product batch and claim records
- Hedera Consensus Service (HCS) ingestion events
- Hedera Token Service (HTS) batch metadata token
- SHA-256 evidence hashes
- Static evidence JSON records

HTS metadata is used for product-level label information such as product name, batch ID, ingredient list, allergens, nutrition details, and the product page URL. It is not treated as proof of claim validity by itself; claim validity still comes from Sui finalized claims, HCS intake events, and matching evidence hashes.

If no claim exists for a topic (e.g. kosher, vegan, organic), the agent says so clearly and explains what IS verified on-chain. It never refuses to answer.

The project was renamed from TraceBite to Proof of Plate. Branding, package names (`proof-of-plate`, `@proof-of-plate/web`), UI strings, and issuer names use Proof of Plate. The on-chain Sui module remains `tracebite::tracebite` because the contract was already deployed with that module name.

---

## Branch and Feature Status

| Feature | Branch | Status |
|---|---|---|
| Product passport for `TB-MILK-0612` | `main` | Implemented |
| Sui testnet IDs and claim objects | `main` | Implemented via `data/deployment.json` |
| Hedera HCS testnet topic and events | `main` | Implemented via `data/hcs-events.json` |
| Hedera HTS product-batch metadata token | `main` | Implemented via `scripts/create-hts-token.ts`, `Deployment.hts`, and HTS metadata-backed UI fields |
| Authority-issued certificate SBT badges | `main` | Implemented via `Deployment.certifications`, `lib/certifications.ts`, and `CertificationBadges.tsx` |
| Walrus-backed large evidence packs | `main` | Implemented via `lib/walrus.ts`, `data/walrus-evidence.json`, and organic juice demo payload |
| AI verifier with Claude + Hedera Agent Kit tools | `main` | Implemented |
| Server-side evidence hash verification on page load | `main` | Implemented |
| Hash verification banner in left panel | `main` | Implemented |
| Consumer / Inspector dual-mode UI | `main` | Implemented |
| PassportSummary — trust score, claims at a glance | `main` | Implemented |
| Always-visible AI chat in right panel | `main` | Implemented |
| Evidence hash in HCS timeline links to Sui Explorer | `main` | Implemented |
| FDA-style nutrition facts table | `main` | Implemented |
| Ingredient cards with claim tag chips | `main` | Implemented |
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

### Hedera HTS

Hedera Token Service is the tokenized product-batch metadata layer. Each product batch has one HTS `NON_FUNGIBLE_UNIQUE` token with max supply 1 and serial 1. The token metadata payload stores a compact `pop:<batchId>:<metadataHash>` pointer, while `data/deployment.json` caches the parsed metadata used by the UI.

HTS provides:

- Tokenized batch identity
- Product name, category, and product page URL
- Ingredients, allergens, nutrition highlights, storage, and nutrition facts
- Hash of the canonical product metadata payload
- HashScan token page link for inspectors and judges
- Optional third-party certificate/audit badges represented as authority-issued HTS NFT SBT records

HTS does not replace Sui as the finalized claim truth layer. It describes the product batch; Sui claims, HCS audit events, and matching evidence hashes determine whether label claims are verified.

Certificate SBT records are scoped to `deployment.certifications`. They are small UI badges for third-party certificates/audits (for example a lactose-free certificate or facility audit) and link to HashScan token serial pages. The MVP models them as non-transferable / soulbound by recording `nonTransferable: true`, authority-treasury issuance, and no public transfer path. Full HTS hard soulbound enforcement may require custom controls such as custody, pause/freeze/KYC/admin keys, or contract-mediated transfer restrictions; the demo documents that limitation explicitly.

### Evidence Storage: Inline JSON and Walrus

Small evidence records can remain `inline` static JSON under `public/evidence/*.json`. Larger evidence packs can be represented as `walrus` records with a Walrus blob/object reference, aggregator URL, and the SHA-256 hash of the original payload bytes. In both modes the hash is what gets anchored in HCS/Sui claim records and what the UI/API verifies at runtime.

The second product example is `POP-JUICE-ORG-APPLE-0613` (`Proof of Plate Organic Apple Juice`). Its supplied DOCX extraction is structured into `public/evidence/walrus/organic-juice/raw-data-pack.json` and indexed by `data/walrus-evidence.json` with synthetic demo values:

- Blob URI: `walrus://blob/pop-juice-org-apple-0613-raw-data-pack-v1`
- Object ID: `0xwalrus_demo_organic_juice_raw_pack_0613`
- URL: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/pop-juice-org-apple-0613-raw-data-pack-v1`

Real Walrus integration point: run `walrus store public/evidence/walrus/organic-juice/raw-data-pack.json`, replace the synthetic blob/object ID and URL in `data/walrus-evidence.json`, and keep the same computed `evidenceHash` anchored in HCS/Sui claim records unless the payload bytes change.

### AI Agent

The AI agent is the consumer-facing verifier and explainer. It is powered by:

- Hedera Agent Kit v4
- Claude `claude-haiku-4-5`
- LangGraph ReAct tool-calling loop
- Custom Proof of Plate tools for Sui-shaped data, HCS events, evidence retrieval, and hash verification

This is not keyword matching. The agent uses a real tool-calling loop and is instructed never to answer from model training knowledge. If a topic has no on-chain claim, the agent says so clearly and gives a helpful response rather than refusing.

---

## Live Testnet Deployment

The current workspace is configured with real testnet artifacts.

| Artifact | Value |
|---|---|
| Hedera network | `testnet` |
| Hedera account used in event transaction IDs | `0.0.9185855` |
| HCS topic ID | `0.0.9219010` |
| HTS batch metadata token | local fallback `0.0.tracebite_local_token` until a real token is created or supplied via `HEDERA_TOKEN_ID` |
| Certificate SBT demo tokens | `0.0.9226185/1` lactose-free certificate; `0.0.9226186/1` facility audit badge |
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
- Storage: Keep refrigerated at or below 40°F. Use within 7 days after opening.

### Nutrition Facts (FDA-style table)

| Label | Amount | % Daily Value |
|---|---|---|
| Calories | 80 | — |
| Total Fat | 2.5g | 3% |
| → Saturated Fat | 1.5g | 8% |
| → Trans Fat | 0g | — |
| Cholesterol | 15mg | 5% |
| Sodium | 95mg | 4% |
| Total Carbohydrate | 6g | 2% |
| → Dietary Fiber | 0g | 0% |
| → Total Sugars | 6g | — |
| **Protein** | **13g** | **26%** |
| Calcium | 350mg | 25% |
| Vitamin D | 3.7mcg | 20% |
| Potassium | 420mg | 10% |
| Vitamin A | 150mcg RAE | 15% |

The UI renders this as an FDA-style nutrition facts panel with thick dividers, bolded Calories header, indented sub-rows, and a % Daily Values column. Data is stored as `NutritionFact[]` on `ProductBatch` in `lib/types.ts`.

### Ingredients

| Ingredient | Role | Related claim types |
|---|---|---|
| Ultra-filtered lowfat milk | Primary dairy base | `ultra_filtered`, `pasteurized`, `lactose_free` |
| Lactase enzyme | Lactose breakdown aid | `lactose_free` |
| Vitamin A palmitate | Vitamin fortification | none |
| Vitamin D3 | Vitamin fortification | none |

Ingredients render as cards with claim tag chips. Each chip links to the relevant on-chain claim.

### HTS Tokenized Batch Metadata

The product batch is represented by one Hedera HTS token. The implementation uses a `NON_FUNGIBLE_UNIQUE` token with max supply 1 and serial 1. Because full product metadata can exceed HTS metadata byte limits, the minted NFT metadata payload is compact:

```text
pop:TB-MILK-0612:0x<sha256-of-canonical-product-metadata>
```

The parsed product metadata is cached in `data/deployment.json` under `hts.productMetadata` and mirrored into `batch` by `getBatch()`. The UI uses that HTS-backed batch object for product name, category, ingredients, allergens, nutrition, storage, and the product page URL.

Canonical metadata shape:

```json
{
  "schema": "proof-of-plate.hts-product-batch.v1",
  "batchId": "TB-MILK-0612",
  "productName": "Proof of Plate Ultra-Filtered Milk",
  "category": "Dairy",
  "description": "Ultra-filtered lowfat milk with lactase enzyme and vitamin fortification.",
  "netContents": "52 fl oz (1.54 L)",
  "servingSize": "1 cup (240 mL)",
  "servingsPerContainer": "About 6",
  "nutritionHighlights": ["13g protein per serving", "Lactose-free", "Ultra-filtered", "Pasteurized"],
  "allergens": ["Milk"],
  "ingredients": [
    { "slug": "ultra-filtered-lowfat-milk", "name": "Ultra-filtered lowfat milk", "role": "Primary dairy base" }
  ],
  "productPageUrl": "http://localhost:3000/p/TB-MILK-0612",
  "hcsTopicId": "0.0.9219010",
  "suiBatchObjectId": "0xd73ce78b97ebe620044ac0e107c536458d228437f2d305305ee77f2093250193"
}
```

HTS metadata is descriptive product metadata. It is not sufficient proof that a claim is verified.

### Authority-Issued Certificate SBTs

Third-party certifications/audits are represented as separate `AuthorityCertification` records under `deployment.certifications`, not as provider ingestion inputs and not as Walrus evidence. Each record points at a Hedera HTS NFT serial and renders as a compact sticker/logo badge in the left passport panel.

Current demo badges:

| Badge | Issuer | HTS NFT | Meaning |
|---|---|---|---|
| `LF` / Lactose-Free | Proof of Plate Demo Lab Authority | `0.0.9226185/1` | Certificate of analysis tied to the lactose-free lab evidence hash |
| `QA` / Audit Pass | Proof of Plate Demo Audit Authority | `0.0.9226186/1` | Facility food-safety audit badge tied to maintenance/CIP evidence |

Soulbound/non-transferable semantics:

- The certificate is authority/treasury-issued for the batch.
- The demo exposes no public transfer path for certificate badges.
- The record carries `sbt.nonTransferable: true`, `issuanceMode: "authority_treasury_issued"`, and an enforcement note.
- Production HTS implementations that need hard non-transferability should add custom controls such as custody, pause/freeze/KYC/admin-key policy, or contract-mediated restrictions. Plain HTS NFT identity alone is not claimed to make transfer impossible under every key/control configuration.

`scripts/create-cert-sbt.ts` refreshes these demo records and supports comma-separated `HEDERA_CERT_SBT_TOKEN_IDS` / `CERT_SBT_TOKEN_IDS` overrides for real HashScan token IDs.

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
      |      Explorer: hashscan.io/testnet/topic/{topicId}
      |
      +--> Hedera HTS testnet
      |      One token per product batch
      |      Token metadata: product name, ingredients, nutrition, product page URL
      |      Certificate SBT badges: authority-issued audit/cert NFT serials
      |      Explorer: hashscan.io/testnet/token/{tokenId}
      |
      +--> Inline / Walrus Evidence
      |      Source records and large packs used for hash verification
      |
      +--> AI Agent
             Hedera Agent Kit + Claude + LangGraph ReAct tools
```

---

## Frontend

The passport UI is a two-column layout: sticky left panel + scrollable right panel on desktop, bottom tab bar on mobile.

### Left Panel

- **Dark navy hero** — product name, batch ID, verification score ring, Consumer / Inspector mode toggle, recall badge
- **Stat strip** — claims count, HCS events count, verification speed vs FDA recall window
- **Hash verification banner** — auto-runs server-side SHA-256 check on every page load; shows `N/N hashes verified` in green or a warning listing which claim mismatched
- **Certification SBT badges** — small third-party certificate/audit stickers that link to HashScan HTS NFT serial pages; inspector mode shows the SBT non-transferability limitation note
- **Supply chain journey** — visual step tracker (Farm → Facility → Lab → Certified) with HCS sequence ranges, progress bar, larger icons (38px), thicker connector line (3px)
- **Product details** — product name, net contents, serving size, allergens, storage; FDA-style nutrition facts table; ingredient cards with claim tag chips; core product metadata is parsed from the HTS batch token cache/reference when available
- **HTS metadata card** — token ID, serial, metadata parse status, metadata hash, product page URL, and HashScan token link
- **Footer** — Sui Explorer and HashScan links for the batch object, HCS topic, and HTS token

### Right Panel

The right panel has a fixed top section that is always visible, followed by two tabs.

**Always-visible top section:**

- **PassportSummary** — trust score percentage, hash check result (N/N), recall status badge, claims-at-a-glance table (dot + name + status per claim), plain-English "What This Means" paragraph
- **AI chat** — always visible directly below the summary; Claude answers questions about the product using live on-chain data; responses include clickable Sui Explorer / HashScan links (rendered by `renderLinks()`); quick-question chips for common queries; verification context injected automatically so the agent already knows hash status

**Tab: Claims**

- Expandable claim rows with status indicators (✅ / ⚠️ / ❌)
- Inspector-only detail grid: HCS sequence, Sui object ID, evidence hash with copy button, hash verification badge
- Sui Explorer and HashScan links per claim
- "Verify Hash" button fetches and compares evidence on demand
- Tamper detection panel below claims

**Tab: Trace**

- Hedera HCS audit log with timeline dots
- Each event shows: claim type, issuer role, timestamp (inspector-only: transaction ID)
- Evidence hash displayed as a short hash link (`0xABCD…`) that links to the Sui claim object anchoring that hash

### Consumer / Inspector Mode

Toggle in the hero switches between two CSS classes on `<body>`:

- **Consumer** — hides blockchain IDs, transaction hashes, and technical detail (`.inspector-only` elements hidden)
- **Inspector** — reveals Sui object IDs, HCS sequences, evidence hashes, and full transaction IDs

### Tab Implementation Note

Tab show/hide uses inline `style={{ display: tab === X ? "block" : "none" }}` instead of CSS class toggling. This avoids `!important` conflicts from responsive stylesheets that would otherwise force all panels visible on desktop.

---

## Data Flow

1. Evidence JSON files or Walrus evidence packs are created and committed to the repository for the demo.
2. Inline seed evidence uses `hash-evidence.ts` to compute SHA-256 hashes and write `data/evidence-manifest.json`; Walrus demo packs use `data/walrus-evidence.json` to bind a Walrus pointer to the original payload hash.
3. `create-hcs-topic.ts` creates or records one HCS topic for the product batch.
4. `submit-hcs-events.ts` submits one HCS message per claim and writes `data/hcs-events.json`.
5. `deploy-sui.ts` records the Sui package ID in `data/deployment.json`.
6. `seed-sui-batch.ts` creates the Sui batch and finalizes claims using evidence hashes and HCS sequence numbers.
7. `create-hts-token.ts` creates or records one HTS batch metadata token, computes the canonical product metadata hash, stores a compact `pop:<batchId>:<hash>` metadata payload, and writes parsed product metadata to `deployment.hts`.
8. `create-cert-sbt.ts` records authority-issued certificate/audit SBT badge entries under `deployment.certifications` with HashScan token links and explicit non-transferability semantics.
9. The product page (`app/p/[batchId]/page.tsx`) runs server-side:
   - reads `deployment.json`, `hcs-events.json`, and `deployment.hts`
   - hydrates product display fields from HTS metadata through `getBatch()`
   - reads certificate SBT badge records with `getCertificationsForBatch()`
   - runs `verifyEvidenceHash()` for every claim (SHA-256 against the on-chain hash)
   - builds a `verifContext` string with pass/fail per claim and HTS token status
   - passes the context to `AgentChat` so every AI response is hash-aware and token-aware
9. The UI displays product metadata from the HTS token cache/reference with a HashScan token link when available.
10. The UI displays certificate/audit SBT badges with HashScan NFT serial links when `deployment.certifications` is configured.
11. The AI agent answers questions through tool calls against the batch, HTS metadata, claims, HCS events, and evidence hashes.
12. The admin demo action runs `demo-add-claim.ts`, which adds the final pesticide residue claim and updates the score to `5/6`.

Implementation note: the primary configured path is real testnet. Some scripts still retain a credentialless/local fallback so the app remains demoable when Hedera credentials or the Sui CLI are absent.

---

## Provider Ingestion API MVP

`POST /api/ingest/provider` accepts a narrow provider-supplied JSON payload for MVP demos so new claim/evidence inputs do not have to start as manually-authored static files.

Required top-level objects:

- `provider`: `id`, `name`, optional `role`
- `product`: `productName`, optional `category`
- `batch`: `batchId`, optional `lotCode`
- `claim`: `claimType`, `label`, optional `status`, `issuerRole`, `issuerName`
- `evidence`: evidence JSON with `documentId`, `title`, `issuerRole`, `issuerName`, `batchId`, `issuedAt`, and non-empty `facts[]`

The endpoint validates required fields, requires `evidence.batchId` to match `batch.batchId`, canonicalizes the evidence JSON, computes a SHA-256 evidence hash, appends a demo queue record to `data/provider-ingestions.json` (or `PROVIDER_INGESTIONS_FILE` when set), and returns ingestion IDs, evidence hash/URI, plus HCS/Sui-shaped seed objects.

Boundary: provider ingestion records are explicitly marked `demo_ingestion_queue_only`. They are not final claim truth and should not be rendered as verified claims until a later flow explicitly anchors/finalizes them through HCS/Sui and verifies hashes there.

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

## Hedera HTS Product Metadata Design

One HTS token is used for each product batch.

For `TB-MILK-0612`:

- Token type: `NON_FUNGIBLE_UNIQUE`
- Max supply: `1`
- Serial number: `1`
- Local fallback token ID: `0.0.tracebite_local_token`
- Real token source: `npm run hedera:create-token` with Hedera credentials, or `HEDERA_TOKEN_ID` to reuse an existing token
- Explorer: `https://hashscan.io/testnet/token/{tokenId}`

### Token Purpose

The HTS token is the product metadata handle for the batch. It gives the product passport a Hedera-native token representing the batch itself, separate from:

- HCS topic: ordered claim intake events
- Sui batch/claim objects: finalized claim truth and claim state
- Static JSON evidence: source records used for SHA-256 verification

### Metadata Rules

The canonical product metadata is stable-stringified and SHA-256 hashed by `apps/web/lib/hts.ts`. The minted NFT metadata payload is compact so it fits HTS metadata constraints:

```text
pop:<batchId>:<metadataHash>
```

The full parsed metadata is cached in `data/deployment.json`:

```json
{
  "hts": {
    "tokenId": "0.0.tracebite_local_token",
    "serialNumber": 1,
    "nftId": "0.0.tracebite_local_token/1",
    "metadataPayload": "pop:TB-MILK-0612:0x...",
    "metadataHash": "0x...",
    "productMetadata": {
      "schema": "proof-of-plate.hts-product-batch.v1",
      "batchId": "TB-MILK-0612",
      "productName": "Proof of Plate Ultra-Filtered Milk",
      "ingredients": []
    }
  }
}
```

Invalid or unavailable token metadata does not block claim verification. The UI shows a warning while still rendering Sui claims, HCS events, and evidence hash results.

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
| `get_batch` | Custom | Reads ProductBatch from `deployment.json`, hydrated with HTS product metadata when present |
| `get_hts_metadata` | Custom | Reads the batch HTS token ID, parsed product metadata, metadata hash, and HashScan token URL |
| `get_claims` | Custom | Reads all finalized Claim objects for a batch |
| `get_hcs_events` | Custom | Reads cached HCS intake events from `hcs-events.json` |
| `get_evidence` | Custom | Fetches a static evidence JSON document by URI |
| `verify_evidence_hash` | Custom | Computes SHA-256 and compares against claim hash |
| `get_topic_messages_query_tool` | Hedera Agent Kit | Optional live HCS topic message query |
| `get_topic_info_query_tool` | Hedera Agent Kit | Optional live HCS topic metadata query |

Hedera Agent Kit tools are attached only when Hedera credentials are present. The agent is stateless per-request — a new instance is created on each API call. Conversation history is reconstructed from the client-sent `history` array.

### Agent Rules

The system prompt enforces these rules:

1. Always call `get_batch` and `get_claims` before answering any product question.
2. For product identity, ingredient, allergen, or product-page questions, call `get_hts_metadata` when an HTS token ID is available.
3. For any cited claim, call `verify_evidence_hash` to confirm authenticity.
4. Distinguish clearly: ✅ VERIFIED (hash match + Sui verified), ⚠️ ADVISORY (declaration only, no lab proof), ❌ NOT CERTIFIED (no claim exists on-chain).
5. Do not treat HTS metadata alone as proof that a label claim is verified. HTS metadata may describe ingredients and product identity, but claims such as lactose-free, pesticide-free, kosher, vegan, or organic still require Sui claims and evidence hash verification.
6. If a question is about something NOT in the claims (e.g. kosher, vegan, organic), say clearly "This product has no certified claim for that on-chain" and explain what IS verified. Never refuse to answer.
7. Write like talking to a shopper, not an engineer. Plain English. No blockchain jargon unless the user asks.
8. When referencing a Sui object, Hedera HCS topic, Hedera transaction, or Hedera HTS token, include the full explorer URL so it renders as a clickable link (e.g. `https://suiscan.xyz/testnet/object/OBJECT_ID`, `https://hashscan.io/testnet/topic/TOPIC_ID`, or `https://hashscan.io/testnet/token/TOKEN_ID`).
9. Keep answers concise — 3–6 sentences for simple questions, bullet points for multi-part answers.

Answer format (adapted as needed):

```
[Direct yes/no or short answer in plain English]

[1–3 bullet points of key verified facts, each with ✅ or ⚠️]

[1 line: where to verify — include the explorer URL]
```

If the question is conversational or about a topic with no claim, answer helpfully in 2–3 sentences.

### Chat API

`POST /api/chat`

Request body:

```json
{
  "batchId": "TB-MILK-0612",
  "question": "Is this actually lactose-free?",
  "history": [],
  "context": "Evidence hash verification (auto-checked on page load):\n- Lactose-free lab test passed: VERIFIED\n..."
}
```

The `context` field is optional. When present, it is prepended to the question as a system-level note (not repeated verbatim in the answer). It carries the server-side hash verification results so the agent can answer hash-related questions without re-running verification. The API reconstructs prior turns as LangChain messages, injects the batch ID and context into the question, invokes the agent, and returns `{ "answer": "..." }`.

### Link Rendering

`AgentChat` and any future chat surfaces use a `renderLinks()` function that converts bare URLs in agent answers into labelled `<a>` tags:

- `suiscan.xyz` → "Sui Explorer"
- `hashscan.io` → "HashScan"
- Other URLs → the hostname as label

Links open in a new tab and carry `rel="noopener noreferrer"`.

---

## Evidence and Hash Verification

Evidence records support two storage modes:

- `inline`: small JSON evidence files live in `public/evidence/*.json` and are addressed by local `/evidence/...` URIs.
- `walrus`: large payloads are addressed by Walrus blob/object references in `data/walrus-evidence.json`. The demo keeps a local deterministic copy under `public/evidence/walrus/...` so tests and offline demos can verify the exact bytes without requiring Walrus CLI/network access.

Current files on `main`:

- `lab-results.json`
- `processing-log.json`
- `maintenance-log.json`
- `feed-declaration.json`
- `final-pesticide-residue-test.json`

Current Walrus demo pack on `main`:

- `data/walrus-evidence.json` indexes `POP-JUICE-ORG-APPLE-0613` with `storage: "walrus"`, synthetic blob/object IDs, and the trusted SHA-256 hash.
- `public/evidence/walrus/organic-juice/raw-data-pack.json` contains the structured organic apple juice DOCX extraction: master product fields (`12 fl oz (355 mL)`, storage instructions, actors), 16 lifecycle stages, 16 claim rows, and the full raw extracted text.

Additional file on `feat/tamper-detection`:

- `tampered-lab-results.json`

### Hashing

SHA-256 is computed over raw file bytes. Hashes are formatted as:

```text
0x<lowercase hex digest>
```

Each claim or Walrus evidence record stores the expected evidence hash. The page server component recomputes claim hashes on every page load via `verifyEvidenceHash()` in `lib/evidence.ts` and displays the result in the hash verification banner. For Walrus references, `lib/evidence.ts` dispatches to `lib/walrus.ts`, which parses the Walrus URI/URL, loads the deterministic demo payload, and verifies its bytes against the trusted hash.

### Server-Side Auto-Verification

`app/p/[batchId]/page.tsx` runs server-side hash verification for every claim before rendering:

```typescript
const verifResults: VerifRow[] = claims.map(claim => {
  try {
    const r = verifyEvidenceHash(claim.evidenceUri, claim.evidenceHash);
    return { claimType: claim.claimType, label: claim.label, ok: r.ok };
  } catch {
    return { claimType: claim.claimType, label: claim.label, ok: false };
  }
});
```

Results are shown in the `HashVerificationBanner` (left panel) and passed as `verifContext` to `AgentChat`.

### Evidence Path / Reference Guard

For inline evidence, `apps/web/lib/evidence.ts` rejects:

- Absolute URLs or URI schemes
- Null bytes
- Paths that do not start with `/evidence/`
- `..` traversal segments
- Non-JSON files
- Paths that resolve outside `public/evidence/`

For Walrus evidence, `apps/web/lib/walrus.ts` accepts only scoped `walrus://blob/<blobId>`, `walrus://object/<objectId>`, or Walrus aggregator `/v1/blobs/...` references with safe demo blob/object ID characters. The local demo payload path must remain under `/evidence/walrus/*.json`.

### Evidence Hash in HCS Timeline

`LifecycleTimeline` displays each HCS event's evidence hash as a short clickable link (`0xABCD…`) that points to the Sui claim object anchoring that hash. The mapping is built from `claims` by matching `claimType`:

```typescript
const claimSuiMap = new Map(claims.map(c => [c.claimType, c.suiObjectId]));
```

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
| `GET /api/batch/[batchId]` | Returns ProductBatch from `deployment.json`, hydrated with HTS product metadata when available |
| `GET /api/hts/[tokenId]` | Returns parsed HTS token metadata, metadata hash, and HashScan token URL |
| `GET /api/claims/[batchId]` | Returns all claims for a batch |
| `GET /api/hcs/[topicId]` | Returns HCS events from `hcs-events.json` |
| `GET /api/evidence?uri=&expectedHash=` | Returns evidence document and hash verification result |
| `POST /api/chat` | Runs the Hedera Agent Kit + Claude ReAct verifier; accepts optional `context` field |
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
| `create-hts-token.ts` | `npm run hedera:create-token` | Create or record Hedera HTS product-batch metadata token |
| `create-cert-sbt.ts` | `npm run hedera:create-cert-sbt` | Record authority-issued certificate/audit SBT badge entries |
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
| `HEDERA_TOKEN_ID` / `HEDERA_HTS_TOKEN_ID` | optional | Existing HTS product metadata token override |
| `HEDERA_CERT_SBT_TOKEN_IDS` / `CERT_SBT_TOKEN_IDS` | optional | Comma-separated HTS NFT token IDs for certificate badge records |
| `CERT_SBT_AUTHORITY_ACCOUNT_ID` | optional | Authority/treasury account shown on certificate SBT records |
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
        globals.css                      Design tokens + all component styles
        p/[batchId]/page.tsx             Consumer product passport (RSC, runs hash verification)
        p/[batchId]/ingredients/[slug]/page.tsx
        ingredients/[slug]/page.tsx
        admin/page.tsx                   Demo controls
        api/
          batch/[batchId]/route.ts
          claims/[batchId]/route.ts
          hcs/[topicId]/route.ts
          evidence/route.ts
          chat/route.ts                  Hedera Agent Kit + Claude; accepts context field
          demo/add-claim/route.ts
      components/
        AgentChat.tsx                    AI chat with link rendering + verification context
        CertificationBadges.tsx          Third-party certificate/audit SBT stickers with HashScan links
        ClaimList.tsx                    Expandable claims with hash verification
        DemoControls.tsx                 Admin demo button
        EvidenceDrawer.tsx               Evidence document viewer
        LifecycleTimeline.tsx            HCS audit log; evidence hash links to Sui claim object
        ModeToggle.tsx                   Consumer / Inspector toggle
        PassportRight.tsx                Right panel: summary+chat always-on, Claims/Trace tabs
        PassportSummary.tsx              Trust score, hash check, recall, claims at a glance
        ProductHeader.tsx                Dark navy hero, score ring, mode toggle
        ProductInfo.tsx                  FDA nutrition facts table, ingredient cards with claim tags
        StatStrip.tsx                    3-stat bar (claims, HCS events, speed)
        SupplyChainJourney.tsx           Farm → Facility → Lab → Certified tracker
        TamperDetection.tsx              Hash diff demo
        VerificationScore.tsx            Score ring component
      lib/
        agent.ts                         Claude ReAct agent with Sui + Hedera + evidence tools
        claims.ts                        Claim helpers
        certifications.ts                Certificate SBT loading, HashScan links, SBT semantics copy
        data.ts                          deployment.json + hcs-events.json readers; nutrition data
        evidence.ts                      SHA-256 hash verification + path guard
        explorer-links.ts                Sui Explorer + HashScan URL builders
        files.ts                         File read utilities
        hedera.ts                        Hedera client setup
        sui.ts                           Sui helpers
        types.ts                         ProductBatch, Claim, HcsEvent, NutritionFact
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
    create-hts-token.ts
    create-cert-sbt.ts
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

Evidence hash links in the HCS timeline (`LifecycleTimeline`) point to the Sui claim object for that claim type:

```text
https://suiscan.xyz/testnet/object/{claimSuiObjectId}
```

---

## Success Criteria

The final demo should prove:

1. A product batch exists on Sui testnet with real object IDs.
2. Product claims exist with evidence hashes and are inspectable on Suiscan.
3. Each claim has a corresponding HCS ingestion event on Hedera testnet, visible on HashScan.
4. The UI displays real HCS sequence numbers and Sui object IDs with working explorer links.
5. The AI agent uses Hedera Agent Kit tools and Claude to answer through tool calls, not keyword matching.
6. The AI agent correctly surfaces the pesticide warning: supplier declaration exists, but no final lab test exists yet.
7. The AI agent handles off-topic questions gracefully (e.g. "Is this kosher?") by stating no on-chain claim exists and describing what IS verified.
8. Server-side hash verification runs on every page load; the banner shows `N/N hashes verified` without any client-side JS.
9. Evidence hashes in the HCS timeline link to the Sui claim object that anchors them.
10. A live-style claim can be added through the admin demo action and finalized into local deployment data.
11. On `feat/tamper-detection`, the tamper detection demo catches modified evidence by hash mismatch and shows the diff.

---

## Demo Script

### Main branch demo

1. Open `/p/TB-MILK-0612`.
2. Note the hash verification banner — **5/5 hashes verified** (or 6/6 after admin action) loaded server-side.
3. Check the **PassportSummary** at the top of the right panel — trust score %, hash check, recall status, claims at a glance.
4. Ask the AI (chat visible directly below summary): **"Is this lactose-free?"**
   - Expected: agent calls `get_batch`, `get_claims`, `get_evidence`, `verify_evidence_hash`, returns verified answer with Sui claim object link and HCS sequence #1.
5. Ask: **"Were pesticides used?"**
   - Expected: agent explains supplier declaration exists at HCS sequence #5 but claim is only ⚠️ advisory because no final residue lab test exists in the initial state.
6. Ask: **"Is this kosher?"**
   - Expected: agent says no kosher certification claim exists on-chain, explains what IS verified.
7. Show the score: **4/5 verified**.
8. Click the **Trace** tab — HCS audit log with evidence hash links to Sui claim objects.
9. Switch to **Inspector mode** — Sui object IDs, HCS sequences, and evidence hashes appear throughout.
10. Click **Claims** tab — expand a claim to see full hash detail and "Verify Hash" button.
11. Open `/admin`.
12. Click **Add final residue test**.
13. Refresh `/p/TB-MILK-0612` — new claim and updated score **5/6** visible.

### Tamper branch demo

1. Checkout `feat/tamper-detection`.
2. Open `/demo/tamper`.
3. Click "Run Tamper Detection".
4. Show original evidence passing and tampered evidence failing with field-level diff.

---

## Final Pitch

Proof of Plate makes food labels verifiable.

Hedera HCS records the ordered intake trail for supply-chain claims. Sui stores the finalized product passport and evidence hashes. The AI agent — powered by Hedera Agent Kit and Claude — explains the product to consumers, but only using verified claims, HCS audit events, and hashed evidence. Any modification to an evidence document after certification is detected instantly by hash mismatch.
