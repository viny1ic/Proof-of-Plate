import { NextResponse } from "next/server";
import { getClaims } from "../../../../lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  return NextResponse.json(getClaims(batchId));
}
