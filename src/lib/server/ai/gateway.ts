// Server-only AI gateway helper. Never import this module from client code.
// Reads LOVABLE_API_KEY inside the request handler, streams the model call,
// and consumes the structured output server-side.
import { APICallError, jsonSchema, Output, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { createLovableAiGatewayRunIdFetch } from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL_ID = "openai/gpt-6-astra";

export class AiToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiToolError";
  }
}

function formatGatewayError(error: unknown): AiToolError {
  if (error instanceof APICallError) {
    const status = error.statusCode;
    let upstreamMessage = error.message;
    try {
      const body = JSON.parse(error.responseBody ?? "{}") as { message?: unknown; error?: { message?: unknown } };
      if (typeof body.message === "string") upstreamMessage = body.message;
      else if (typeof body.error?.message === "string") upstreamMessage = body.error.message;
    } catch {
      // Keep the SDK-provided message.
    }

    if (status === 402) {
      return new AiToolError(
        upstreamMessage ||
          "The AI credits for this workspace have run out. Top up credits or upgrade the AI plan to keep using the tools.",
      );
    }
    if (status === 403) {
      return new AiToolError(
        upstreamMessage ||
          "The AI request was not allowed for this workspace. An administrator may need to enable this AI model in the workspace settings.",
      );
    }
    if (status === 401) {
      return new AiToolError(
        "The AI service is not configured correctly. An administrator needs to check the server's AI credentials.",
      );
    }
    if (status === 429) {
      return new AiToolError("The AI service is busy right now. Please wait a moment and try again.");
    }
    if (status >= 500) {
      return new AiToolError("The AI service is temporarily unavailable. Please try again in a moment.");
    }
    return new AiToolError(upstreamMessage || "The AI request could not be completed. Please try again.");
  }
  return new AiToolError("Something went wrong while generating the output. Please try again.");
}

export async function generateStructuredOutput<T>(args: {
  system: string;
  user: string;
  schemaName: string;
  wireSchema: unknown;
  parse: (value: unknown) => T;
}): Promise<T> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new AiToolError(
      "AI is not configured in this environment. An administrator needs to set the LOVABLE_API_KEY server secret.",
    );
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    strictJsonSchema: true,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL_ID),
      messages: [
        { role: "system" as const, content: args.system },
        { role: "user" as const, content: args.user },
      ],
      output: Output.object({
        schema: jsonSchema(args.wireSchema as Parameters<typeof jsonSchema>[0]),
        name: args.schemaName,
      }),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    // Consumes the stream server-side; `output` is the parsed structured result.
    const raw: unknown = await result.output;
    return args.parse(raw);
  } catch (error) {
    if (error instanceof AiToolError) throw error;
    throw formatGatewayError(error);
  }
}
