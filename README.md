# Proof of Plate

Proof of Plate is a hackathon MVP for verifiable food product labels. A consumer scans a QR code or opens a product URL, sees a product passport, and asks a Claude-powered AI agent questions about the product. Every label claim is anchored on Sui blockchain, audited via Hedera HCS, tokenized with Hedera HTS, and (for large evidence packs) stored on Walrus — all verified by SHA-256 hashes at runtime.

Two demo products are live on testnet:

| Product | Batch ID | Evidence storage |
|---|---|---|
| Proof of Plate Ultra-Filtered Milk | `TB-MILK-0612` | Inline JSON |
| Proof of Plate Organic Apple Juice | `POP-JUICE-ORG-APPLE-0613` | Walrus evidence pack |

---

## Architecture

| Layer | Role |
|---|---|
| **Sui blockchain** | Identity passport — `ProductBatch` and `Claim` shared objects, evidence hashes, verification score, recall state |
| **Hedera HCS** | Ordered audit log — one topic per product batch, one message per claim submission |
| **Hedera HTS** | Tokenized product-batch metadata — one `NON_FUNGIBLE_UNIQUE` NFT per batch; authority-issued certificate SBT NFTs for third-party audits/certifications |
| **Walrus** | Large evidence storage — blob/object references with SHA-256 anchoring; Sui objects reference the Walrus URI |
| **Claude AI** | Tool-based verifier — LangGraph ReAct loop reads Sui, HCS, HTS, and evidence before answering |
| **Next.js 15** | Server-rendered product passport with RSC + client components |

---

## Live Testnet Artifacts

### Milk — TB-MILK-0612

| Artifact | Value |
|---|---|
| Sui package | `0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c` |
| Sui batch object | `0xd73ce78b97ebe620044ac0e107c536458d228437f2d305305ee77f2093250193` |
| Sui claim: lactose_free | `0x7a5242b543e7c20e584e8d4045bb277226a826c2cecd95f4f9b8f8083dddf345` |
| Sui claim: ultra_filtered | `0x0a34481f337ecd4e08c001cb8181cd9ddf5bdcd392388c2985d9bfaef42656bb` |
| Sui claim: pasteurized | `0x9512a099b57d0f1990d3716771104975e4e139a58ad41770de0424c5956f0bc4` |
| Sui claim: equipment_cleaned | `0xa29f6bee487ed365782fb49ea8bbf038cdfe76f54ca59f38dc343b85cfe43c40` |
| Sui claim: feed_pesticide_declaration | `0x5866a7de2068d49b625caa2d86e9218d9c998bab5b1bb1d878ccb5030a90bc61` |
| Hedera HCS topic | `0.0.9226498` |
| Hedera HTS product token | `0.0.9226184` serial `#1` |
| Cert SBT — Lactose-Free | `0.0.9226503/1` |
| Cert SBT — Facility Audit | `0.0.9226505/1` |
| Hedera account | `0.0.9185855` |

### Juice — POP-JUICE-ORG-APPLE-0613

| Artifact | Value |
|---|---|
| Sui batch object | `0x09b5439433b64d79eec8792697eda8844807aeccfb017f8c1f3f5970bda4ea8f` |
| Sui claims | 16 objects on testnet; each stores `walrus://blob/pop-juice-org-apple-0613-raw-data-pack-v1` + SHA-256 hash |
| Hedera HCS topic | `0.0.9226673` (16 messages) |
| Hedera HTS product token | `0.0.9227218` serial `#1` |
| Cert SBT — USDA Organic | `0.0.9227817/1` |
| Cert SBT — Food Safe | `0.0.9227818/1` |
| Walrus evidence URI | `walrus://blob/pop-juice-org-apple-0613-raw-data-pack-v1` |
| Walrus evidence hash | `0xb9ce6e52da070241aad977ec212e48c9031489f33bef1c8f030d9c16c153b828` |

---

## Frontend

The passport UI is a two-column layout (sticky left panel + scrollable right panel on desktop, bottom tab bar on mobile).

### Left panel
- **Dark hero** — product name, batch ID, verification score ring, Consumer / Inspector mode toggle, recall badge
- **Stat strip** — claims count, HCS audit events count, recall speed vs FDA window
- **Hash verification banner** — server-side SHA-256 check on every page load; all hashes verified or mismatch warning
- **Certification SBT badges** — third-party certificate/audit stickers; click to open HashScan HTS NFT serial page
- **Supply chain journey** — Farm → Facility → Lab → Certified tracker with HCS/Walrus sequence labels
- **Product details** — product name, net contents, serving size, allergens, storage; FDA-style nutrition facts; ingredient cards with claim tag chips; data from HTS token metadata
- **HTS metadata card** — token ID, serial, metadata parse/verify status, metadata hash, HashScan link
- **Footer** — Sui Explorer, HashScan HCS, and HashScan HTS links

### Right panel
- **Summary** — trust score, hash check result, recall badge, claims-at-a-glance, plain-English explanation
- **AI chat** — always visible; Claude answers using live Sui + HCS + HTS + evidence data; clickable explorer links in responses
- **Claims tab** — expandable rows; Sui Explorer + HashScan + Walrus evidence buttons per claim; "Verify Hash" on demand
- **Trace tab** — Hedera HCS audit log timeline; evidence hash links to Sui claim objects

### Consumer / Inspector mode
- **Consumer** — hides blockchain IDs and technical detail
- **Inspector** — reveals Sui object IDs, HCS sequences, evidence hashes, full transaction IDs, SBT non-transferability notes

---

## Quick Start (Local)

```bash
npm install
npm run demo:seed
npm run dev
```

Pages:
```
http://localhost:3000/p/TB-MILK-0612
http://localhost:3000/p/POP-JUICE-ORG-APPLE-0613
http://localhost:3000/admin
```

Local mode needs no credentials. Scripts write deterministic local-demo IDs. Local placeholder IDs render as plain text, not explorer links.

---

## Environment Variables

```bash
# Anthropic (required for AI chat)
ANTHROPIC_API_KEY=

# Sui testnet
SUI_ADMIN_PRIVATE_KEY=
SUI_ADMIN_ADDRESS=

# Hedera testnet
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=

# App
NEXT_PUBLIC_PRODUCT_BASE_URL=http://localhost:3000
DEMO_ADMIN_TOKEN=
```

The app runs without credentials in local mode. All seed scripts fall back to deterministic local-demo values when credentials are absent.

---

## Testnet Setup

1. Set Hedera credentials (`HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_NETWORK=testnet`)
2. `npm run hedera:create-topic` — create milk HCS topic
3. `npm run hedera:submit` — submit milk HCS claim events
4. `npm run hedera:create-token` — create milk HTS product token
5. `npm run hedera:create-cert-sbt` — mint milk certification SBT NFTs
6. Set Sui private key (`SUI_ADMIN_PRIVATE_KEY`) and fund address
7. `npm run sui:seed-juice` — create juice Sui identity passport (ProductBatch + 16 Claim objects)
8. `npm run hedera:create-topic-juice` (if needed) — create juice HCS topic
9. `npm run hedera:create-token-juice` — create juice HTS product token
10. `npm run hedera:create-cert-sbt-juice` — mint juice certification SBT NFTs
11. `npm run dev`

---

## Scripts

```bash
npm run dev                       # Next.js dev server
npm run build                     # production build
npm run typecheck                 # TypeScript check only

npm run hash:evidence             # hash inline evidence files
npm run hedera:create-topic       # create milk HCS topic
npm run hedera:submit             # submit milk HCS events
npm run hedera:create-token       # create milk HTS product token
npm run hedera:create-token-juice # create juice HTS product token
npm run hedera:create-cert-sbt    # mint milk cert SBT NFTs
npm run hedera:create-cert-sbt-juice  # mint juice cert SBT NFTs
npm run sui:seed                  # seed milk Sui objects (requires sui CLI)
npm run sui:seed-juice            # seed juice Sui objects (uses @mysten/sui SDK)
npm run demo:seed                 # run all milk seed steps in sequence
npm run demo:add-claim            # add 6th claim (pesticide residue test)
```

---

## Evidence Storage Model

Two modes:

- **`inline`** — small JSON files under `public/evidence/*.json`. SHA-256 hash of the exact file bytes is compared to the claim/HCS event hash at runtime.
- **`walrus`** — large evidence packs addressed by a Walrus blob URI + SHA-256 hash. The Sui claim objects store the Walrus URI and hash on-chain. The demo index is `data/walrus-evidence.json`; the juice evidence pack is at `public/evidence/walrus/organic-juice/raw-data-pack.json`.

For real Walrus integration: run `walrus store <file>`, replace the synthetic blob/object ID and URL in `data/walrus-evidence.json` with the real values, and keep the same `evidenceHash` anchored in Sui/HCS.

---

## Security Notes

- Evidence hash verification hashes the original file bytes and compares to the hash stored on the claim/HCS event. `data/evidence-manifest.json` is a seed-time build artifact only — not a second verification truth source.
- HTS token metadata is descriptive product metadata, not standalone claim proof.
- Certificate SBT badges are authority-issued HTS NFT records marked `nonTransferable: true`. Hard soulbound enforcement in production requires custom controls (custody, pause/freeze/KYC/admin-key, or contract-mediated transfer restrictions).
- `/api/evidence` serves inline evidence only from `public/evidence/` and Walrus demo payloads only from `public/evidence/walrus/`; paths outside those scopes are rejected.
- `/api/demo/add-claim` is for hackathon demo use. In production, protect with `DEMO_ADMIN_TOKEN`.
- Never commit `.env` files or private keys.

---

## Key Files

```
apps/web/
  app/
    p/[batchId]/page.tsx          # product passport server component
    globals.css                   # all styles
  components/
    ProductHeader.tsx             # hero, score ring, mode toggle
    CertificationBadges.tsx       # SBT cert stickers with HashScan links
    StatStrip.tsx                 # stats bar
    SupplyChainJourney.tsx        # Farm → Facility → Lab → Certified
    ProductInfo.tsx               # nutrition facts, ingredients
    HtsMetadataCard.tsx           # HTS token metadata + HashScan link
    PassportSummary.tsx           # trust score, claims summary
    AgentChat.tsx                 # AI chat with live on-chain context
    ClaimList.tsx                 # expandable claims, Sui/HCS/Walrus links
    LifecycleTimeline.tsx         # HCS/Walrus audit log timeline
    PassportRight.tsx             # summary + chat + tabs
  lib/
    agent.ts                      # Claude ReAct agent with tool loop
    data.ts                       # data readers, HTS overlay, Walrus dispatch
    certifications.ts             # SBT cert readers, HashScan links
    hts.ts                        # HTS metadata schema, hash, parser
    evidence.ts                   # SHA-256 hash verification
    walrus.ts                     # Walrus reference parsing, demo payloads
    explorer-links.ts             # Sui Explorer + HashScan URL builders
    files.ts                      # monorepo root resolution
    types.ts                      # all TypeScript types
data/
  deployment.json                 # live Sui/HCS/HTS/cert deployment state
  hcs-events.json                 # milk HCS event log
  walrus-evidence.json            # Walrus evidence index
  evidence-manifest.json          # seed-time evidence hashes (build artifact)
public/evidence/
  *.json                          # inline evidence files
  walrus/organic-juice/
    raw-data-pack.json            # juice Walrus evidence pack (local demo)
scripts/
  create-hts-token.ts             # milk HTS token
  create-hts-token-juice.ts       # juice HTS token
  create-cert-sbt.ts              # milk cert SBT NFTs
  create-cert-sbt-juice.ts        # juice cert SBT NFTs
  seed-juice-sui.mjs              # juice Sui passport (ProductBatch + Claims)
  submit-hcs-events.ts            # submit HCS events
  shared.ts                       # shared Hedera/Sui helpers, env loading
tests/
  page-chain-links.test.ts        # on-chain explorer link verification (milk + juice)
  hts.test.ts                     # HTS metadata helpers
  certifications.test.ts          # cert SBT helpers
  ingestion.test.ts               # provider ingestion API
  walrus.test.ts                  # Walrus evidence helpers
  evidence.test.ts                # SHA-256 verification, writeDeployment guards
```
