import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { POST } from "../apps/web/app/api/ingest/provider/route";
import {
  buildProviderIngestionRecord,
  ingestProviderPayload,
  validateProviderIngestionPayload,
} from "../apps/web/lib/ingestion";

const validPayload = {
  provider: {
    id: "demo-lab-1",
    name: "Demo Lab",
  },
  product: {
    productName: "Ultra-filtered Milk",
    category: "Dairy",
  },
  batch: {
    batchId: "TB-MILK-0612",
  },
  claim: {
    claimType: "lactose_free",
    label: "Lactose-free",
    issuerRole: "Laboratory",
    issuerName: "Demo Lab",
  },
  evidence: {
    documentId: "LAB-LACTOSE-0612",
    title: "Finished product lactose screen",
    issuerRole: "Laboratory",
    issuerName: "Demo Lab",
    batchId: "TB-MILK-0612",
    issuedAt: "2026-06-12T17:30:00Z",
    facts: [{ key: "lactose", value: 0.01, unit: "g/serving", result: "pass" }],
  },
};

function tempStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "pop-ingestion-test-"));
  return {
    dir,
    file: path.join(dir, "provider-ingestions.json"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("validateProviderIngestionPayload accepts the narrow MVP provider payload", () => {
  const parsed = validateProviderIngestionPayload(validPayload);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload?.provider.id, "demo-lab-1");
  assert.equal(parsed.payload?.batch.batchId, "TB-MILK-0612");
  assert.equal(parsed.payload?.claim.claimType, "lactose_free");
  assert.equal(parsed.payload?.evidence.documentId, "LAB-LACTOSE-0612");
});

test("validateProviderIngestionPayload rejects missing required fields and evidence/batch mismatches", () => {
  const parsed = validateProviderIngestionPayload({
    ...validPayload,
    batch: { batchId: "OTHER-BATCH" },
    claim: { claimType: "lactose_free" },
  });

  assert.equal(parsed.ok, false);
  assert.match(parsed.errors.join(" "), /claim\.label/);
  assert.match(parsed.errors.join(" "), /evidence\.batchId/);
});

test("buildProviderIngestionRecord computes stable canonical evidence hashes without making truth-layer IDs", () => {
  const first = buildProviderIngestionRecord(validPayload, "2026-06-13T12:00:00.000Z");
  const reordered = buildProviderIngestionRecord(
    {
      ...validPayload,
      evidence: {
        facts: [{ result: "pass", unit: "g/serving", value: 0.01, key: "lactose" }],
        issuedAt: "2026-06-12T17:30:00Z",
        batchId: "TB-MILK-0612",
        issuerName: "Demo Lab",
        issuerRole: "Laboratory",
        title: "Finished product lactose screen",
        documentId: "LAB-LACTOSE-0612",
      },
    },
    "2026-06-13T12:00:00.000Z",
  );

  assert.equal(first.evidenceHash, reordered.evidenceHash);
  assert.match(first.evidenceHash, /^0x[0-9a-f]{64}$/);
  assert.equal(first.recordType, "provider_ingestion_demo_v1");
  assert.equal(first.truthLayer, "demo_ingestion_queue_only");
  assert.equal(first.seed.hcsEvent.evidenceHash, first.evidenceHash);
  assert.equal(first.seed.suiClaim.evidenceHash, first.evidenceHash);
  assert.match(first.seed.suiClaim.placeholderId, /^local-ingested-claim:/);
});

test("ingestProviderPayload appends demo records to the configured store", () => {
  const store = tempStore();
  try {
    const result = ingestProviderPayload(validPayload, {
      storageFile: store.file,
      now: "2026-06-13T12:00:00.000Z",
    });

    assert.equal(result.ok, true);
    assert.equal(result.record?.batchId, "TB-MILK-0612");
    assert.equal(result.storage.file, store.file);
    assert.equal(result.storage.demoOnly, true);

    const stored = JSON.parse(readFileSync(store.file, "utf8")) as { ingestions: unknown[] };
    assert.equal(stored.ingestions.length, 1);
    assert.deepEqual(stored.ingestions[0], result.record);
  } finally {
    store.cleanup();
  }
});

test("POST /api/ingest/provider returns IDs and hashes and writes only the demo ingestion queue", async () => {
  const store = tempStore();
  const previous = process.env.PROVIDER_INGESTIONS_FILE;
  process.env.PROVIDER_INGESTIONS_FILE = store.file;
  try {
    const response = await POST(
      new Request("http://localhost/api/ingest/provider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.ok, true);
    assert.equal(body.batchId, "TB-MILK-0612");
    assert.equal(body.claimType, "lactose_free");
    assert.match(body.ingestionId, /^ing_/);
    assert.match(body.evidenceHash, /^0x[0-9a-f]{64}$/);
    assert.equal(body.truthLayer, "demo_ingestion_queue_only");
    assert.equal(body.storage.demoOnly, true);
    assert.ok(existsSync(store.file));
  } finally {
    if (previous === undefined) delete process.env.PROVIDER_INGESTIONS_FILE;
    else process.env.PROVIDER_INGESTIONS_FILE = previous;
    store.cleanup();
  }
});

test("POST /api/ingest/provider returns 400 for invalid payloads", async () => {
  const response = await POST(
    new Request("http://localhost/api/ingest/provider", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validPayload, evidence: { documentId: "DOC" } }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.match(body.errors.join(" "), /evidence\.title/);
});
