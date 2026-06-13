import { NextResponse } from "next/server";
import { answerQuestion } from "../../../lib/agent";

export async function POST(request: Request) {
  const body = await request.json();
  const batchId = body.batchId || "TB-MILK-0612";
  const question = body.question || "";

  if (!question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  return NextResponse.json(await answerQuestion(batchId, question));
}
