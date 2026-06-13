# Proof of Plate

Proof of Plate is a hackathon MVP for verifiable food product labels.

The demo product is `TB-MILK-0612`, a Proof of Plate ultra-filtered milk batch. The app starts with five product claims, links each claim to a Hedera HCS intake event, stores final claim truth in Sui-shaped data, verifies static evidence hashes, and lets a consumer ask an AI verifier questions. The admin demo action adds a sixth final pesticide residue test and updates the score to `5/6`.

## Architecture

- Sui: final product truth layer for batch, claims, evidence hashes, score, and recall state.
- Hedera HCS: ordered intake/audit trail for supplier/facility/lab/auditor claim submissions.
- Static JSON evidence: hackathon-friendly lab, processing, maintenance, and feed records.
- AI verifier: deterministic tool-based explainer over Sui claims, HCS events, and evidence hashes.

ENS is intentionally not part of this version.

## Local Demo Mode

```bash
npm install
npm run demo:seed
npm run build
npm run dev
```

Open:

```txt
http://localhost:3000/p/TB-MILK-0612
http://localhost:3000/admin
```

Local mode needs no Hedera or Sui credentials. The scripts write deterministic local-demo IDs into `data/deployment.json` and `data/hcs-events.json`, and local placeholder IDs remain plain monospace text in the UI instead of explorer links.

## Environment

```bash
SUI_NETWORK=testnet
SUI_PACKAGE_ID=
SUI_ADMIN_PRIVATE_KEY=

HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_TOPIC_ID=

NEXT_PUBLIC_BATCH_ID=TB-MILK-0612
OPENAI_API_KEY=
DEMO_ADMIN_TOKEN=
```

The app runs locally without credentials. When Hedera credentials are present, `create-hcs-topic.ts` and `submit-hcs-events.ts` use the real Hedera SDK. When credentials are missing, they write deterministic local demo data so the passport remains runnable.

The Sui deploy script records a deterministic local package ID unless `SUI_PACKAGE_ID` is provided. If the Sui CLI is installed, build/publish the Move package manually:

```bash
sui move build --path contracts/sui
sui client publish contracts/sui --gas-budget 100000000
```

Then set `SUI_PACKAGE_ID` and rerun:

```bash
npm run sui:deploy
npm run sui:seed
```

## Testnet Mode

Use testnet mode when you have real Hedera and Sui identifiers to show in the passport.

1. Set `HEDERA_NETWORK=testnet`, `HEDERA_ACCOUNT_ID`, and `HEDERA_PRIVATE_KEY`.
2. Run `npm run hedera:create-topic` and keep the resulting `HEDERA_TOPIC_ID`.
3. Run `npm run hedera:submit` to append real HCS intake events.
4. Build and publish the Sui Move package, then set `SUI_PACKAGE_ID`.
5. Run `npm run sui:deploy` and `npm run sui:seed`.
6. Run `npm run build` and open `/p/TB-MILK-0612`.

Non-local Sui package, batch, and claim IDs link to Sui Explorer. Non-local Hedera topic and transaction IDs link to HashScan testnet.

## Current Testnet Deployment

This workspace is currently configured with real testnet artifacts:

- Hedera testnet topic: `0.0.9219010`
- Sui testnet package: `0x4d456546f2254ef39edbacda57b87d0cbb9a808e41d225362c0fa9dca46e100c`
- Sui testnet batch object: `0xd73ce78b97ebe620044ac0e107c536458d228437f2d305305ee77f2093250193`
- Sui publish transaction: `5zLEd68pgwZ1wNHS77py9bWbLhnKk3DnhRjmusgFjEbh`
- Sui batch transaction: `7QbzcngvxTiPY3xkjpE7gdKLmHxyWgE5hk9Xn4LZM4nQ`
- Sui score update transaction: `FtAHAq8d6bbMnFXuTaoVXzLf1ENZ6KCjBGgSUHV823dJ`

The five initial claims in `data/deployment.json` have real Sui object IDs and HCS sequence numbers `1` through `5`.

## Security Notes

- `/api/evidence?uri=` only serves JSON files inside `public/evidence`. Traversal paths, filesystem absolute paths outside `/evidence`, non-JSON files, and paths resolving outside that directory are rejected.
- `/api/demo/add-claim` runs a local script and is intended for the hackathon demo. In production, keep the deployment in `local-demo`, call it from localhost, or set `DEMO_ADMIN_TOKEN` and send it as `Authorization: Bearer <token>` or `x-demo-admin-token`.
- Do not commit `.env` files or private Hedera/Sui keys. The export zip excludes env files and build artifacts.
- ENS is intentionally not part of this version.

## Demo Flow

1. Open `/p/TB-MILK-0612`.
2. Show score `4/5 verified`.
3. Show Sui package/object IDs and Hedera topic ID.
4. Show claim cards and HCS sequence numbers.
5. Ask the AI verifier: `Is this actually lactose-free?`
6. Ask: `Were pesticides used?`
7. The verifier should explain that supplier declaration exists, but no final residue lab test exists.
8. Open `/admin`.
9. Click `Add final residue test`.
10. Refresh the product page and show the added claim, inline hash verification, and updated `5/6` score.

## Finish-Line Testnet Checklist

```bash
npm run demo:seed
npm run typecheck
npm run build
sui move build --path contracts/sui
```

If the Sui CLI is not installed, the Next.js app and scripts can still be verified locally, but the Move package build remains unverified.

## Scripts

```bash
npm run hash:evidence
npm run hedera:create-topic
npm run hedera:submit
npm run sui:deploy
npm run sui:seed
npm run demo:add-claim
```

## Spec Alignment

This implementation follows `../plans/proof-of-plate-mvp-implementation-plan.md`:

- One demo milk batch
- Five initial claims
- One HCS topic
- One Sui Move package
- Static JSON evidence
- Tool-based AI verifier
- No ENS path
