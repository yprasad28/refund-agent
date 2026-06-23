import { streamText, convertToModelMessages, stepCountIs, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import {
  lookupCustomer,
  checkRefundPolicy,
  approveRefund,
  denyRefund,
} from "@/lib/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  let modelMessages: ModelMessage[];
  if (messages?.[0]?.parts) {
    modelMessages = await convertToModelMessages(messages);
  } else {
    modelMessages = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  }

  const google = createGoogleGenerativeAI({ apiKey });

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    maxRetries: 2,
    stopWhen: stepCountIs(10),
    system: `You are a refund agent. You MUST follow these exact steps for EVERY refund request. Do NOT skip any step.

STEP 1: Call lookup_customer with the customer_id the user provides.
STEP 2: If lookup_customer returns found: false, tell the user the ID is invalid and STOP.
STEP 3: If lookup_customer succeeds, IMMEDIATELY call check_refund_policy with the order_id from the customer data.
STEP 4: If check_refund_policy returns eligible: false, tell the user why and STOP.
STEP 5: If check_refund_policy returns eligible: true, IMMEDIATELY call approve_refund with the order_id.
STEP 6: Tell the user the refund was approved and the amount.

You MUST call all required tools in sequence. Do NOT respond with text between tool calls. Do NOT explain what you are doing — just call the tools.

Valid customer IDs: C001, C002, C003, C004, C005, C006, C007, C008, C009, C010, C011, C012, C013, C014, C015
Valid order IDs: ORD-1001, ORD-1002, ORD-1003, ORD-1004, ORD-1005, ORD-1006, ORD-1007, ORD-1008, ORD-1009, ORD-1010, ORD-1011, ORD-1012, ORD-1013, ORD-1014, ORD-1015`,
    messages: modelMessages,
    tools: {
      lookup_customer: lookupCustomer,
      check_refund_policy: checkRefundPolicy,
      approve_refund: approveRefund,
      deny_refund: denyRefund,
    },
    onError: (error) => {
      console.error("[chat] Stream error:", JSON.stringify(error, null, 2));
    },
  });

  return result.toUIMessageStreamResponse();
}
