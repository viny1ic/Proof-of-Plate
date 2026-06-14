# Proof of Plate — Design Spec

Updated: 2026-06-13
Repository: `/home/fresh` · Branch: `main`

---

## Overview

Proof of Plate is a hackathon MVP for verifiable food product labels. Every label claim is anchored on the Sui blockchain as a finalized on-chain object, audited on Hedera HCS, tokenized with Hedera HTS, and (for large evidence) stored on Walrus. A Claude-powered AI agent can answer any question about the product using live on-chain data.

The project was renamed from TraceBite to Proof of Plate. The on-chain Sui module remains `tracebite::tracebite` because the contract was already deployed under that name.

---

## Products

| Product | Batch ID | Evidence model |
|---|---|---|
| Proof of Plate Ultra-Filtered Milk | `TB-MILK-0612` | 5 inline JSON claims |
| Proof of Plate Organic Apple Juice | `POP-JUICE-ORG-APPLE-0613` | 16 Walrus-backed claims |

---

## Technology Roles

### Sui blockchain

Sui is the product identity passport and finalized claim truth layer.

Each product has:
- One `ProductBatch` shared object — batch ID, product name, HCS topic ID, verification score, recall state
- One `Claim` shared object per claim — claim type, label, status, issuer role, evidence URI, evidence hash (SHA-256), HCS topic ID, HCS sequence number

Claim validity is determined by matching the SHA-256 evidence hash stored on the Sui object against the original evidence bytes. The Sui object is the source of truth.

For Walrus-backed products, the Sui claim objects store the Walrus URI (`walrus://blob/...`) as the evidence URI, and the SHA-256 hash of the full Walrus evidence pack as the evidence hash.

### Hedera HCS

Hedera Consensus Service is the ordered intake and audit log. One HCS topic per product batch. One message per claim submission. Each message contains the claim type, issuer, evidence URI, and evidence hash.

HCS provides:
- Tamper-evident ordered message sequences
- Consensus timestamps
- Transaction IDs for each submission

### Hedera HTS

Hedera Token Service tokenizes each product batch as one `NON_FUNGIBLE_UNIQUE` token with max supply 1 and serial `#1`. The token metadata payload is a compact pointer:

```
pop:<batchId>:<sha256-of-canonical-product-metadata>
```

Full metadata is cached in `deployment.hts.productMetadata` / `deployment.juiceHts.productMetadata`. The UI reads from this cache; the `HtsMetadataCard` component verifies the token pointer hash matches the cached metadata before displaying "Token metadata verified".

Authority-issued certification SBTs are separate HTS NFT tokens under `deployment.certifications`. Each represents a third-party certificate or audit badge. They are non-transferable in the MVP (no public transfer path); hard soulbound enforcement in production requires custom controls.

### Walrus

Walrus stores large evidence packs. The Sui Claim objects reference the Walrus blob URI + SHA-256 hash, making Sui the identity anchor even when the bulk data lives in Walrus.

The organic juice evidence pack is currently a deterministic local demo payload at `public/evidence/walrus/organic-juice/raw-data-pack.json`. Real Walrus integration: run `walrus store <file>`, update the blob/object ID and URL in `data/walrus-evidence.json`, and keep the same SHA-256 hash anchored in Sui/HCS.

### Provider Ingestion API

`POST /api/ingest/provider` accepts provider-supplied evidence payloads. It validates, canonicalizes, computes a SHA-256 hash, and appends a demo queue record. Ingestion records are not claim truth until later anchored through HCS/Sui.

### AI Agent

Claude `claude-haiku-4-5` + Hedera Agent Kit v4 + LangGraph ReAct. Tools:

| Tool | Description |
|---|---|
| `get_batch` | Reads ProductBatch hydrated with HTS metadata |
| `get_hts_metadata` | Reads HTS token ID, serial, metadata parse status |
| `get_claims` | Returns all claims for a batch |
| `get_hcs_events` | Returns the HCS audit log for a topic |
| `get_evidence` | Returns an evidence document from the URI |
| `verify_evidence_hash` | SHA-256 hash verification, returns pass/fail |

Agent rules:
1. Always call `get_batch` and `get_claims` before answering any product question.
2. For product identity/ingredients/allergens, call `get_hts_metadata` when an HTS token ID is present.
3. For each cited claim, call `verify_evidence_hash` to confirm authenticity.
4. Distinguish ✅ VERIFIED (hash matches, Sui finalized) vs ⚠️ WARNING (advisory only) vs ❌ FAILED.
5. If no claim exists for a topic (kosher, vegan, etc.), say so clearly. Never refuse.
6. Never fabricate facts. Ground every answer in tool call results.

---

## Live Testnet Deployment

### Milk — TB-MILK-0612

| Artifact | Value |
|---|---|
| Sui package | `0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c` |
| Sui batch | `0xd73ce78b97ebe620044ac0e107c536458d228437f2d305305ee77f2093250193` |
| Hedera account | `0.0.9185855` |
| HCS topic | `0.0.9226498` |
| HTS product token | `0.0.9226184/1` |
| Cert SBT — Lactose-Free | `0.0.9226503/1` |
| Cert SBT — Facility Audit | `0.0.9226505/1` |

Claim Sui object IDs:

| Claim | HCS # | Sui object ID |
|---|---|---|
| `lactose_free` | 1 | `0x7a5242b543e7c20e584e8d4045bb277226a826c2cecd95f4f9b8f8083dddf345` |
| `ultra_filtered` | 2 | `0x0a34481f337ecd4e08c001cb8181cd9ddf5bdcd392388c2985d9bfaef42656bb` |
| `pasteurized` | 3 | `0x9512a099b57d0f1990d3716771104975e4e139a58ad41770de0424c5956f0bc4` |
| `equipment_cleaned` | 4 | `0xa29f6bee487ed365782fb49ea8bbf038cdfe76f54ca59f38dc343b85cfe43c40` |
| `feed_pesticide_declaration` | 5 | `0x5866a7de2068d49b625caa2d86e9218d9c998bab5b1bb1d878ccb5030a90bc61` |

### Juice — POP-JUICE-ORG-APPLE-0613

| Artifact | Value |
|---|---|
| Sui batch | `0x09b5439433b64d79eec8792697eda8844807aeccfb017f8c1f3f5970bda4ea8f` |
| Sui claims | 16 objects; each stores Walrus URI + SHA-256 hash |
| Hedera HCS topic | `0.0.9226673` |
| HTS product token | `0.0.9227218/1` |
| Cert SBT — USDA Organic | `0.0.9227817/1` |
| Cert SBT — Food Safe | `0.0.9227818/1` |
| Walrus evidence URI | `walrus://blob/pop-juice-org-apple-0613-raw-data-pack-v1` |
| Walrus evidence hash | `0xb9ce6e52da070241aad977ec212e48c9031489f33bef1c8f030d9c16c153b828` |

---

## Product Scope

### Milk — TB-MILK-0612

- Product name: Proof of Plate Ultra-Filtered Milk
- Net contents: 52 fl oz (1.54 L)
- Serving size: 1 cup (240 mL)
- Allergens: Milk
- Initial score: 4/5 verified (warning on pesticide declaration)
- After admin action: 5/6 verified

Claims:

| # | Claim type | Status |
|---|---|---|
| 1 | `lactose_free` | verified ✅ |
| 2 | `ultra_filtered` | verified ✅ |
| 3 | `pasteurized` | verified ✅ |
| 4 | `equipment_cleaned` | verified ✅ |
| 5 | `feed_pesticide_declaration` | warning ⚠️ |
| 6 | `final_pesticide_residue_test` | verified ✅ (added via admin action) |

### Juice — POP-JUICE-ORG-APPLE-0613

- Product name: Proof of Plate Organic Apple Juice
- 16 lifecycle claims: organic farm, organic processing, 100% juice, no added sugar, pesticide residue, microbial test, pasteurization, equipment material, sanitary design, equipment commissioned, harvest lot, chain of custody, organic receiving, fruit washed, equipment cleaned before batch, distribution chain
- Evidence: Walrus-backed evidence pack

---

## Architecture Diagram

```
QR / Product URL
      |
      v
Next.js Frontend (apps/web)
      |
      +--> Sui testnet
      |      ProductBatch + Claim shared objects
      |      Evidence hashes, score, recall state
      |      Explorer: suiscan.xyz/testnet/object/{id}
      |
      +--> Hedera HCS testnet
      |      One topic per batch; one message per claim
      |      Explorer: hashscan.io/testnet/topic/{topicId}
      |
      +--> Hedera HTS testnet
      |      One product token per batch (metadata pointer + hash)
      |      Authority cert SBT NFTs per batch
      |      Explorer: hashscan.io/testnet/token/{tokenId}
      |
      +--> Walrus (demo/local)
      |      Large evidence packs for juice
      |      Sui claims reference Walrus URI + hash
      |
      +--> AI Agent (Claude + Hedera Agent Kit)
             Tools: get_batch, get_hts_metadata, get_claims,
                    get_hcs_events, get_evidence, verify_evidence_hash
```

---

## Frontend Design

### Left panel

- **Hero** — product name, batch ID, score ring (verified/total), Consumer/Inspector toggle, recall badge
- **Stat strip** — claims on-chain, HCS audit events, recall speed
- **Hash verification banner** — server-side SHA-256 check on every page load
- **Certification SBT badges** — sticker logos for each authority cert; click → HashScan NFT serial page
- **Supply chain journey** — Farm → Facility → Lab → Certified with HCS/Walrus sequence labels
- **Product details** — nutrition facts, ingredient cards, allergens, storage; data from HTS token metadata
- **HTS metadata card** — token ID, parse/verify status, metadata hash, HashScan link
- **Footer** — Sui Explorer + HashScan HCS + HashScan HTS links; Walrus evidence link where applicable

### Right panel

- **Summary** — trust score, hash result, recall status, claims-at-a-glance, plain-English explanation
- **AI chat** — always visible; answers grounded in live on-chain tool calls
- **Claims tab** — per-claim Sui Explorer / HashScan / Walrus evidence buttons; "Verify Hash" on demand
- **Trace tab** — HCS audit timeline; each event links evidence hash to Sui claim object

### Consumer / Inspector mode

- **Consumer** — hides blockchain IDs, hashes, technical detail
- **Inspector** — reveals Sui object IDs, HCS sequences, evidence hashes, transaction IDs

---

## Data Flow

1. Evidence JSON files or Walrus evidence packs are created.
2. `hash-evidence.ts` computes SHA-256 hashes for inline evidence.
3. `create-hcs-topic.ts` creates one HCS topic per product batch.
4. `submit-hcs-events.ts` submits one HCS message per claim; writes `data/hcs-events.json`.
5. Sui Move package is deployed; `create-cert-sbt.ts` / `create-cert-sbt-juice.ts` mint certificate SBT NFTs.
6. `seed-sui-batch.ts` / `seed-juice-sui.mjs` create `ProductBatch` + `Claim` objects on Sui. Juice claims store the Walrus URI and hash.
7. `create-hts-token.ts` / `create-hts-token-juice.ts` create HTS product metadata tokens per batch.
8. The product page runs server-side: reads `deployment.json`, verifies all evidence hashes, hydrates product fields from HTS metadata, loads cert SBT badges, builds verification context for the AI.
9. The AI agent answers through live tool calls.

---

## API Routes

| Route | Description |
|---|---|
| `GET /api/batch/[batchId]` | ProductBatch, hydrated with HTS metadata |
| `GET /api/claims/[batchId]` | All Claim objects for a batch |
| `GET /api/hcs/[topicId]` | HCS audit events for a topic |
| `GET /api/hts/[tokenId]` | HTS token metadata record |
| `GET /api/evidence?uri=&expectedHash=` | Fetch + verify evidence by URI and hash |
| `POST /api/chat` | AI agent stream endpoint |
| `POST /api/demo/add-claim` | Add 6th claim (demo/admin action) |
| `POST /api/ingest/provider` | Provider ingestion API (MVP demo queue) |

---

## Sui Move Contract

Module: `tracebite::tracebite`
Package: `0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c`

Entry functions:
- `create_batch(batch_id, product_name, hcs_topic_id, clock, ctx)`
- `add_claim(batch_id, claim_type, label, status, issuer_role, issuer_name, evidence_uri, evidence_hash, hcs_topic_id, hcs_sequence, clock, ctx)`
- `update_score(batch, verified, total)`
- `recall_batch(batch)`

Both `ProductBatch` and `Claim` are shared objects (`transfer::share_object`). Status codes: 0=pending, 1=verified, 2=warning, 3=failed, 4=revoked.

---

## HTS Metadata Schema

```json
{
  "schema": "proof-of-plate.hts-product-batch.v1",
  "batchId": "TB-MILK-0612",
  "productName": "Proof of Plate Ultra-Filtered Milk",
  "category": "Dairy",
  "description": "...",
  "netContents": "52 fl oz (1.54 L)",
  "servingSize": "1 cup (240 mL)",
  "servingsPerContainer": "About 6",
  "nutritionHighlights": ["13g protein per serving", "Lactose-free", ...],
  "allergens": ["Milk"],
  "storageInstructions": "Keep refrigerated at or below 40°F.",
  "ingredients": [{ "slug": "...", "name": "...", "role": "..." }],
  "nutrition": [{ "label": "Calories", "amount": "80" }, ...],
  "productPageUrl": "https://.../p/TB-MILK-0612",
  "hcsTopicId": "0.0.9226498",
  "suiBatchObjectId": "0xd73ce78b97..."
}
```

The minted NFT metadata payload is compact (fits HTS byte limits):

```
pop:TB-MILK-0612:0x<sha256-of-canonical-metadata>
```

---

## Certificate SBT Design

Each third-party certification/audit is a Hedera HTS `NON_FUNGIBLE_UNIQUE` token (max supply 1, serial 1), authority-treasury-issued.

Fields in `AuthorityCertification`:
- `certId`, `batchId`, `kind`, `title`, `shortLabel`
- `issuerName`, `issuerRole`, `issuerAccountId`
- `status`, `issuedAt`, `expiresAt`
- `network`, `tokenId`, `serialNumber`, `nftId`
- `evidenceHash` — links the cert to the relevant on-chain evidence hash
- `logoText`, `logoAlt`, `accentColor` — UI sticker appearance
- `sbt.tokenStandard`, `sbt.nonTransferable`, `sbt.issuanceMode`, `sbt.enforcement`
- `explorerUrl` — `https://hashscan.io/testnet/token/{tokenId}/{serial}`

Soulbound enforcement note: the demo records `nonTransferable: true` and exposes no public transfer path. Hard HTS soulbound enforcement (making transfer cryptographically impossible under every key configuration) requires custom controls such as custody, pause/freeze/KYC/admin-key policy, or contract-mediated restrictions.

---

## Tests

42 tests across 6 files. Run: `npx tsx --test tests/*.test.ts`

| File | Coverage |
|---|---|
| `page-chain-links.test.ts` | Milk + juice: Sui objects, HCS topics, HTS tokens, cert SBTs, Walrus, no placeholders |
| `hts.test.ts` | HTS metadata schema, hash, parser, merge helpers |
| `certifications.test.ts` | Cert SBT readers, HashScan links, soulbound semantics |
| `ingestion.test.ts` | Provider ingestion API validation and hash computation |
| `walrus.test.ts` | Walrus reference parsing, evidence hash verification |
| `evidence.test.ts` | SHA-256 hash verification, writeDeployment Sui-ID preservation |

---

## Security

- Evidence hash verification hashes original file bytes and compares to the claim/HCS-stored hash. `data/evidence-manifest.json` is a seed-time build artifact only.
- HTS metadata is descriptive product metadata, not standalone claim proof.
- Certificate SBT badges are authority-issued HTS NFTs; hard soulbound enforcement requires custom controls.
- `/api/evidence` restricts access to `public/evidence/` only; path traversal and unexpected schemes are rejected.
- `/api/demo/add-claim` is demo-only; protect with `DEMO_ADMIN_TOKEN` in production.
- Never commit `.env` files or private keys to the repository.
- ENS is intentionally out of scope for this version.
