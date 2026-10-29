// Server-only tool registry: maps a tool ID to its prompt, schemas, and the
// validated generation call. Imported dynamically from the server-function
// module so none of this enters the client bundle.
import { toJSONSchema, type ZodType } from "zod/v4";

import { toolInputSchemas, toolOutputSchemas, type ToolId } from "@/lib/ai/schemas";

import { AiToolError, generateStructuredOutput } from "./gateway";
import { buildSystemPrompt } from "./prompts";

// Simple concurrency cap so bursts of requests cannot pile up on the gateway.
const MAX_CONCURRENT = 4;
let active = 0;
const waiters: Array<() => void> = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

function toStrictWireSchema(schema: ZodType): Record<string, unknown> {
  const wire = toJSONSchema(schema, {
    io: "output",
    target: "draft-2020-12",
    unrepresentable: "any",
    override: (ctx) => {
      const node = ctx.jsonSchema as Record<string, unknown> | null;
      if (node && typeof node === "object") {
        if (node["type"] === "object") node["additionalProperties"] = false;
        delete node["$schema"];
      }
    },
  }) as Record<string, unknown>;
  delete wire["$schema"];
  return wire;
}

export async function runTool(tool: ToolId, input: unknown): Promise<unknown> {
  const inputSchema = toolInputSchemas[tool];
  const outputSchema = toolOutputSchemas[tool];
  const parsedInput = inputSchema.parse(input);

  return withSlot(() =>
    generateStructuredOutput({
      system: buildSystemPrompt(tool),
      user: `User request data (JSON):\n${JSON.stringify(parsedInput)}`,
      schemaName: `${tool}_result`,
      wireSchema: toStrictWireSchema(outputSchema),
      parse: (value) => {
        const parsed = outputSchema.safeParse(value);
        if (!parsed.success) {
          throw new AiToolError("The AI returned an unexpected response format. Please try regenerating.");
        }
        return parsed.data;
      },
    }),
  );
}
