import { NextResponse } from "next/server";
import { getEvidence, verifyEvidenceHash } from "../../../lib/evidence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const uri = url.searchParams.get("uri");
  const expectedHash = url.searchParams.get("expectedHash");
  if (!uri) {
    return NextResponse.json({ error: "Missing uri" }, { status: 400 });
  }

  try {
    const evidence = getEvidence(uri);
    return NextResponse.json({
      evidence,
      verification: expectedHash ? verifyEvidenceHash(uri, expectedHash) : null,
    });
  } catch (error) {
    const message = (error as Error).message || "Invalid evidence request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
