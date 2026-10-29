import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";

import { ResponsibleAiBanner } from "@/components/responsible-ai-banner";
import { AiErrorAlert, CopyButton, DownloadButton, LoadingPanel, RegenerateButton, ToolPage } from "@/components/tool-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAiTool } from "@/hooks/use-ai-tool";
import { recordActivity } from "@/lib/activity";
import { brainstormCounts, brainstormInputSchema, type BrainstormInput, type BrainstormOutput } from "@/lib/ai/schemas";

export function brainstormToMarkdown(output: BrainstormOutput, topic: string): string {
  const lines = [`# Brainstorm — ${topic}`, ""];
  for (const idea of output.ideas) {
    lines.push(`## ${idea.title}${idea.category ? ` (${idea.category})` : ""}`, idea.description, "");
  }
  if (output.themes.length) lines.push("## Themes", ...output.themes.map((t) => `- ${t}`), "");
  if (output.nextSteps.length) lines.push("## Suggested next steps", ...output.nextSteps.map((n) => `- ${n}`));
  return lines.join("\n");
}

export function BrainstormingTool() {
  const { status, error, output, run, reset, isLoading } = useAiTool<BrainstormOutput>("brainstorm");

  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [ideaCount, setIdeaCount] = useState<string>("9");
  const [formError, setFormError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const parsed = brainstormInputSchema.safeParse({
      topic,
      goal: goal.trim() || null,
      constraints: constraints.trim() || null,
      ideaCount,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setFormError(null);
    const result = await run(parsed.data as BrainstormInput);
    if (result) recordActivity("brainstorm", parsed.data.topic, result.ideas[0]?.description ?? "");
  };

  const handleClear = () => {
    setTopic("");
    setGoal("");
    setConstraints("");
    setIdeaCount("9");
    setFormError(null);
    reset();
  };

  const generated = status === "done" && output && !isLoading;

  return (
    <ToolPage
      icon={<Lightbulb className="size-5" />}
      title="Brainstorming Assistant"
      description="Generate and organize practical ideas around your topic. Ideas are suggestions to evaluate, not commitments."
    >
      <ResponsibleAiBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brainstorm setup</CardTitle>
          <CardDescription>Goal and constraints are optional but improve the ideas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brainstorm-topic">Topic</Label>
            <Input id="brainstorm-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Ways to reduce customer onboarding time" maxLength={500} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brainstorm-goal">Goal (optional)</Label>
            <Textarea id="brainstorm-goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} maxLength={1000} placeholder="What outcome do you want?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brainstorm-constraints">Constraints (optional)</Label>
              <Textarea id="brainstorm-constraints" value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} maxLength={1000} placeholder="Budget, time, tools, policies…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brainstorm-count">Number of ideas</Label>
              <Select value={ideaCount} onValueChange={setIdeaCount}>
                <SelectTrigger id="brainstorm-count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brainstormCounts.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} ideas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : null}
              {isLoading ? "Brainstorming…" : "Generate ideas"}
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={isLoading}>
              Clear inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <AiErrorAlert message={error} onRetry={handleGenerate} />}
      {isLoading && <LoadingPanel label="Generating ideas…" />}

      {generated && output && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ideas</CardTitle>
            {output.themes.length > 0 && (
              <CardDescription className="flex flex-wrap gap-1">
                {output.themes.map((theme, i) => (
                  <Badge key={i} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {output.ideas.map((idea, i) => (
                <div key={i} className="rounded-xl border bg-card p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{idea.title}</h3>
                    {idea.category && <Badge variant="outline">{idea.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{idea.description}</p>
                </div>
              ))}
            </div>

            {output.nextSteps.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Suggested next steps</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {output.nextSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <CopyButton text={brainstormToMarkdown(output, topic)} label="Copy ideas" />
              <DownloadButton filename={`brainstorm-${Date.now()}.md`} content={brainstormToMarkdown(output, topic)} label="Download" />
              <RegenerateButton onClick={handleGenerate} />
            </div>
          </CardContent>
        </Card>
      )}

      {status === "idle" && !isLoading && (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Describe your topic and choose <strong>Generate ideas</strong> to see them here.
        </p>
      )}
    </ToolPage>
  );
}
