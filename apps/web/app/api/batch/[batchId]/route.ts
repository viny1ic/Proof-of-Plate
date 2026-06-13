import { NextResponse } from "next/server";
import { getBatch } from "../../../../lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    return NextResponse.json(getBatch(batchId));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
