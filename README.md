# Proof of Plate

Proof of Plate is a hackathon MVP for verifiable food product labels — a consumer-facing product passport that anchors every label claim on Sui blockchain and Hedera HCS, tokenizes product-batch metadata with Hedera HTS, verifies evidence hashes cryptographically, and lets a Claude-powered AI agent answer questions about the product in plain English.

The demo product is `TB-MILK-0612`, an ultra-filtered milk batch. It ships with five initial claims, one Hedera HTS metadata token per batch, a Hedera HCS topic, Sui testnet objects, and static JSON evidence files that are SHA-256 hashed and verified on every page load.

---

## Architecture

| Layer | Role |
|---|---|
| **Sui blockchain** | Final claim truth — batch record, claims, evidence hashes, verification score, recall state |
| **Hedera HCS** | Tamper-proof intake/audit log — ordered sequence of claim submission events per topic |
| **Hedera HTS** | Tokenized batch metadata — one token per product batch containing product name, ingredients, batch ID, and product page URL |
| **Static JSON evidence** | Hackathon-friendly lab results, processing logs, maintenance records, feed declarations |
| **Claude AI verifier** | Tool-based agent that looks up HTS metadata, Sui claims, HCS events, and evidence before answering |
| **Next.js 15 (App Router)** | Server-rendered product passport with RSC + client components |

ENS is intentionally not part of this version.

---

## Frontend

The passport UI is a two-column layout (sticky left panel + scrollable right panel on desktop, bottom tab bar on mobile).

### Left panel
- **Dark navy hero** — product name, batch ID, verification score ring, Consumer / Inspector mode toggle, recall badge
- **Stat strip** — claims count, HCS events count, verification speed vs FDA recall window
- **Hash verification banner** — server-side SHA-256 check on every page load; shows `6/6 verified` in green or a warning with which claim mismatched
- **Supply chain journey** — visual step tracker (Farm → Facility → Lab → Certified) with HCS sequence ranges and progress bar
- **Product details** — product name, net contents, serving size, allergens, storage; FDA-style nutrition facts table; ingredient cards with linked claim tags; product-level metadata is parsed from the HTS batch token when available
- **HTS metadata card** — token ID, parsed metadata status, ingredients/product page URL from token metadata, metadata hash, and HashScan token link
- **Footer** — Sui Explorer and HashScan links for the batch object, HCS topic, and HTS token

### Right panel
- **Summary** — trust score percentage, hash check result, recall status, HTS metadata status, claims-at-a-glance table, plain-English explanation of what the verification means
- **AI chat** — always visible below the summary; Claude answers questions about the product using live on-chain data; responses include clickable Sui Explorer / HashScan links; quick-question chips for common queries; verification context injected automatically so the agent knows hash status without being asked
- **Claims tab** — expandable claim rows with status indicators; inspector-only detail grid (HCS sequence, Sui object ID, evidence hash with copy button, hash verification badge); Sui Explorer and HashScan links per claim; "Verify Hash" button fetches and compares evidence on demand
- **Trace tab** — Hedera HCS audit log with timeline dots, evidence hash links (linking to the Sui object that anchors each claim), HTS token reference, HashScan links, and transaction IDs (inspector-only)
- **Tamper detection** — side-by-side hash diff demo showing what a modified evidence file would look like

### Consumer / Inspector mode
Toggle in the hero switches between two views:
- **Consumer** — hides blockchain IDs, transaction hashes, and technical detail
- **Inspector** — reveals Sui object IDs, HCS sequences, evidence hashes, and full transaction IDs

---

## Local Demo Mode

```bash
npm install
npm run demo:seed
npm run dev
```

Open:

```
http://localhost:3000/p/TB-MILK-0612
http://localhost:3000/admin
```

Local mode needs no Hedera or Sui credentials. The scripts write deterministic local-demo IDs into `data/deployment.json` and `data/hcs-events.json`, including a local HTS token metadata reference (`0.0.tracebite_local_token`). Local placeholder IDs render as plain monospace text instead of explorer links.

---

## Environment

```bash
# Anthropic (required for AI chat)
ANTHROPIC_API_KEY=

# Sui testnet
SUI_NETWORK=testnet
SUI_PACKAGE_ID=
SUI_ADMIN_PRIVATE_KEY=

# Hedera testnet
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_TOPIC_ID=
HEDERA_TOKEN_ID=
HEDERA_HTS_TOKEN_SYMBOL=

# App
NEXT_PUBLIC_BATCH_ID=TB-MILK-0612
NEXT_PUBLIC_PRODUCT_BASE_URL=http://localhost:3000
DEMO_ADMIN_TOKEN=
```

The app runs locally without credentials. When Hedera credentials are present, the seed scripts use the real Hedera SDK to create or reuse the HCS topic, submit HCS events, and create or reuse the HTS batch metadata token. When missing, they write deterministic local demo data so the passport remains runnable without any accounts.

---

## Testnet Mode

Use testnet mode when you have real Hedera and Sui identifiers to show in the passport.

1. Set `HEDERA_NETWORK=testnet`, `HEDERA_ACCOUNT_ID`, and `HEDERA_PRIVATE_KEY`.
2. Run `npm run hedera:create-topic` and keep the resulting `HEDERA_TOPIC_ID`.
3. Run `npm run hedera:submit` to append real HCS intake events.
4. Build and publish the Sui Move package, then set `SUI_PACKAGE_ID`.
5. Run `npm run sui:deploy` and `npm run sui:seed`.
6. Run `npm run hedera:create-token` to create one HTS metadata token for the product batch, or set `HEDERA_TOKEN_ID` to reuse an existing token.
7. Run `npm run dev` and open `/p/TB-MILK-0612`.

Non-local Sui object IDs link to Sui Explorer. Non-local Hedera topic, transaction, and HTS token IDs link to HashScan testnet. Evidence hashes in the HCS log link to the Sui claim object that anchors them.

---

## Current Testnet Deployment

| Artifact | Value |
|---|---|
| Hedera testnet topic | `0.0.9219010` |
| Hedera HTS metadata token | local fallback `0.0.tracebite_local_token` until a real HTS token is created or supplied via `HEDERA_TOKEN_ID` |
| Sui testnet package | `0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c` |
| Sui testnet batch object | `0xd73ce78b97ebe620044ac0e107c536458d228437f2d305305ee77f2093250193` |
| Sui publish tx | `5zLEd68pgwZ1wNHS77py9bWbLhnKk3DnhRjmusgFjEbh` |
| Sui batch tx | `7QbzcngvxTiPY3xkjpE7gdKLmHxyWgE5hk9Xn4LZM4nQ` |
| Sui score update tx | `FtAHAq8d6bbMnFXuTaoVXzLf1ENZ6KCjBGgSUHV823dJ` |

The five initial claims in `data/deployment.json` have Sui object IDs and HCS sequence numbers 1–5. The batch record also includes the HTS token ID and parsed token metadata when available.

---

## Demo Flow

1. Open `/p/TB-MILK-0612`.
2. Show the HTS metadata card — product name, batch ID, ingredients, metadata hash, and product page URL parsed from the Hedera token metadata cache/reference.
3. Click the HashScan token link when using a real HTS token; local placeholders render as text.
4. Note the hash verification banner — **5/5 hashes verified** initially or **6/6 verified** after the admin-added claim.
5. Check the summary panel — trust score, claims-at-a-glance, plain-English explanation.
6. Ask the AI (chat is always visible): **"Is this lactose-free?"** — agent cites Sui claim + HCS sequence + evidence hash, and can also reference the HTS token as the product metadata source.
7. Ask: **"Were pesticides used?"** — agent distinguishes between the supplier declaration (advisory ⚠️) and the final residue lab test (verified ✅).
8. Ask: **"Is this kosher?"** — agent correctly states no kosher certification claim exists on-chain.
9. Switch to **Inspector mode** — Sui object IDs, HCS sequences, and evidence hashes appear.
10. Expand a claim row to see the full hash detail and "Verify Hash" button.
11. Click the **Trace** tab to see the Hedera HCS audit log — each event shows the evidence hash as a link to the Sui claim object.
12. Open `/admin` and click **Add final residue test** — refreshing `/p/TB-MILK-0612` shows the new claim and updated score.

---

## Security Notes

- `/api/evidence?uri=` only serves JSON files inside `public/evidence`. Traversal paths, absolute paths, non-JSON files, and paths resolving outside that directory are rejected.
- `/api/demo/add-claim` is intended for the hackathon demo. In production, set `DEMO_ADMIN_TOKEN` and send it as `Authorization: Bearer ...` or `x-demo-admin-token`.
- HTS token metadata is product metadata, not standalone claim proof. Claims are only treated as verified when backed by Sui claim state and matching evidence hashes.
- If token metadata points to an external metadata URI in a future production version, verify the referenced document hash before trusting parsed fields.
- Do not commit `.env` files or private Hedera/Sui keys.
- ENS is intentionally not part of this version.

---

## Scripts

```bash
npm run dev                  # start Next.js dev server
npm run build                # production build
npm run typecheck            # TypeScript check only

npm run hash:evidence        # SHA-256 hash all public/evidence/*.json files
npm run hedera:create-topic  # create Hedera HCS topic
npm run hedera:create-token  # create Hedera HTS product-batch metadata token
npm run hedera:submit        # submit claim events to HCS
npm run sui:deploy           # deploy Move package (or write local placeholder)
npm run sui:seed             # seed batch + claim objects on Sui
npm run demo:seed            # run all of the above in sequence
npm run demo:add-claim       # add the sixth pesticide residue test claim
```

---

## Spec Alignment

This implementation follows `../plans/proof-of-plate-mvp-implementation-plan.md`:

- One demo milk batch (`TB-MILK-0612`)
- Five initial claims + one admin-added claim
- One Hedera HCS topic per batch
- One Hedera HTS metadata token per product batch
- One Sui Move package with batch and claim objects
- Static JSON evidence with SHA-256 hashes
- Tool-based Claude AI verifier (get_batch, get_hts_metadata, get_claims, get_hcs_events, get_evidence, verify_evidence_hash)
- Server-side hash verification on every page load
- Consumer / Inspector dual-mode UI
- No ENS path

## Key Files

```
apps/web/
  app/
    p/[batchId]/page.tsx       # product passport page (server component, runs hash verification)
    globals.css                # design tokens + all component styles
  components/
    ProductHeader.tsx          # dark navy hero, score ring, mode toggle
    StatStrip.tsx              # 3-stat bar (claims, HCS events, speed)
    SupplyChainJourney.tsx     # Farm → Facility → Lab → Certified tracker
    ProductInfo.tsx            # nutrition facts, ingredients loaded from HTS metadata-backed batch
    HtsMetadataCard.tsx        # parsed HTS token metadata + HashScan token link
    PassportSummary.tsx        # right-panel summary card
    AgentChat.tsx              # AI chat with link rendering + verification context
    ClaimList.tsx              # expandable claims with hash verification
    LifecycleTimeline.tsx      # HCS audit log with evidence hash links
    TamperDetection.tsx        # hash diff demo
    PassportRight.tsx          # summary + chat always-on, Claims/Trace tabs
    ModeToggle.tsx             # consumer / inspector toggle
  lib/
    agent.ts                   # Claude ReAct agent with Sui + Hedera + evidence tools
    data.ts                    # deployment.json + hcs-events.json readers; overlays HTS product metadata
    hts.ts                     # HTS token metadata schema, hash, parser, merge helpers
    evidence.ts                # SHA-256 hash verification
    explorer-links.ts          # Sui Explorer + HashScan URL builders
    types.ts                   # ProductBatch, Claim, HcsEvent, NutritionFact
```
