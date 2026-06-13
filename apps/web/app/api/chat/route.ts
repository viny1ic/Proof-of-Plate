import { NextResponse } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createProofOfPlateAgent } from "../../../lib/agent";

type MessageInput = { role: "user" | "assistant"; content: string };

// Agent is stateless per-request — conversation history passed in from client
export async function POST(request: Request) {
  let body: { batchId?: string; question?: string; history?: MessageInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const batchId = body.batchId || "TB-MILK-0612";
  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  try {
    const agent = createProofOfPlateAgent();

    // Reconstruct message history for context
    const priorMessages = (body.history || []).map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );

    // Inject batchId into the question so the agent always knows what to look up
    const augmentedQuestion = `[Batch ID: ${batchId}] ${question}`;

    const result = await agent.invoke({
      messages: [...priorMessages, new HumanMessage(augmentedQuestion)],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const answer =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: `Agent error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
