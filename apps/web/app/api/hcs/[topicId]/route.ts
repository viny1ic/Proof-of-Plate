import { NextResponse } from "next/server";
import { getHcsMessages } from "../../../../lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return NextResponse.json(getHcsMessages(topicId));
}
