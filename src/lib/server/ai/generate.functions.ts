// Client-importable server function for all AI tool generations.
// Only the handler body stays on the server; the registry (prompts, gateway,
// API key) is loaded dynamically inside the handler so nothing server-only
// ships to the browser.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { toolIds, toolInputSchemas, type ToolId } from "@/lib/ai/schemas";

export type GenerateResult =
  | { ok: true; output: unknown }
  | { ok: false; error: string };

export const generateAiOutput = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }): Promise<GenerateResult> => {
    const requestSchema = z.object({ tool: z.enum(toolIds), input: z.unknown() });
    const request = requestSchema.safeParse(data);
    if (!request.success) {
      return { ok: false, error: "Invalid request. Please check your inputs and try again." };
    }

    const tool = request.data.tool as ToolId;
    const parsedInput = toolInputSchemas[tool].safeParse(request.data.input);
    if (!parsedInput.success) {
      const issue = parsedInput.error.issues[0];
      return { ok: false, error: issue?.message ?? "Please check your inputs and try again." };
    }

    try {
      const { runTool } = await import("./registry");
      const output = await runTool(tool, parsedInput.data);
      return { ok: true, output };
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Generation failed. Please try again.";
      return { ok: false, error: message };
    }
  },
);
