import { NextResponse } from "next/server";
import { getHcsMessages } from "../../../../lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    return NextResponse.json(getHcsMessages(topicId));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
