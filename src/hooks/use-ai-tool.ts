import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import type { ToolId } from "@/lib/ai/schemas";
import { generateAiOutput } from "@/lib/server/ai/generate.functions";

export type AiToolStatus = "idle" | "loading" | "error" | "done";

export function useAiTool<TOutput>(tool: ToolId) {
  const generate = useServerFn(generateAiOutput);
  const [status, setStatus] = useState<AiToolStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<TOutput | null>(null);

  const run = useCallback(
    async (input: unknown): Promise<TOutput | null> => {
      setStatus("loading");
      setError(null);
      try {
        const result = await generate({ data: { tool, input } });
        if (result.ok) {
          setOutput(result.output as TOutput);
          setStatus("done");
          return result.output as TOutput;
        }
        setError(result.error);
        setStatus("error");
        return null;
      } catch {
        setError("We couldn't reach the AI service. Please check your connection and try again.");
        setStatus("error");
        return null;
      }
    },
    [generate, tool],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setOutput(null);
  }, []);

  return { status, error, output, run, reset, isLoading: status === "loading" };
}
