import { NextResponse } from "next/server";
import { PROVIDER_INGESTION_TRUTH_LAYER, ingestProviderPayload } from "../../../../lib/ingestion";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
        errors: [(error as Error).message || "Request body must be valid JSON."],
        truthLayer: PROVIDER_INGESTION_TRUTH_LAYER,
      },
      { status: 400 },
    );
  }

  const result = ingestProviderPayload(payload);
  if (!result.ok || !result.record) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid provider ingestion payload.",
        errors: result.errors,
        truthLayer: PROVIDER_INGESTION_TRUTH_LAYER,
        storage: result.storage,
      },
      { status: 400 },
    );
  }

  const record = result.record;
  return NextResponse.json(
    {
      ok: true,
      ingestionId: record.ingestionId,
      batchId: record.batchId,
      claimType: record.claimType,
      evidenceId: record.evidenceId,
      evidenceHash: record.evidenceHash,
      evidenceUri: record.evidenceUri,
      truthLayer: record.truthLayer,
      storage: result.storage,
      seed: record.seed,
    },
    { status: 201 },
  );
}
