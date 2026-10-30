import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";

import { ResponsibleAiBanner } from "@/components/responsible-ai-banner";
import { AiErrorAlert, CopyButton, DownloadButton, LoadingPanel, RegenerateButton, ToolPage } from "@/components/tool-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAiTool } from "@/hooks/use-ai-tool";
import { recordActivity } from "@/lib/activity";
import { meetingInputSchema, type MeetingInput, type MeetingOutput } from "@/lib/ai/schemas";

const NOT_SPECIFIED = "Not specified in the meeting notes.";

type ActionItem = MeetingOutput["actionItems"][number];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_STYLES = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
} as const;

export function sortTasks(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function taskLine(a: ActionItem): string {
  const deadline = a.deadline
    ? `${a.deadline} (${a.deadlineSource === "explicit" ? "from notes" : "AI suggested"})`
    : NOT_SPECIFIED;
  return `- [${a.priority.toUpperCase()}] ${a.task} — Owner: ${a.owner ?? NOT_SPECIFIED}; Deadline: ${deadline}`;
}

export function meetingToMarkdown(output: MeetingOutput, title: string): string {
  const lines: string[] = [`# Meeting summary — ${title}`, "", "## Executive summary", output.executiveSummary, ""];
  if (output.discussionPoints.length) {
    lines.push("## Main discussion points", ...output.discussionPoints.map((p) => `- ${p}`), "");
  }
  if (output.decisions.length) {
    lines.push("## Decisions");
    for (const d of output.decisions) lines.push(`- ${d.decision}${d.context ? ` (${d.context})` : ""}`);
    lines.push("");
  }
  if (output.actionItems.length) {
    lines.push("## Actionable tasks", ...sortTasks(output.actionItems).map(taskLine), "");
  }
  if (output.outstandingQuestions.length) {
    lines.push("## Outstanding questions", ...output.outstandingQuestions.map((q) => `- ${q}`), "");
  }
  if (output.followUpTopics.length) {
    lines.push("## Follow-up topics", ...output.followUpTopics.map((t) => `- ${t}`), "");
  }
  if (output.caveats.length) {
    lines.push("## Uncertainty notes", ...output.caveats.map((c) => `- ${c}`), "");
  }
  return lines.join("\n");
}

export function MeetingSummarizerTool() {
  const { status, error, output, run, reset, isLoading } = useAiTool<MeetingOutput>("meeting");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const parsed = meetingInputSchema.safeParse({
      title,
      notes,
      date: date.trim() || null,
      participants: participants.trim() || null,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setFormError(null);
    const result = await run(parsed.data as MeetingInput);
    if (result) recordActivity("meeting", parsed.data.title, result.executiveSummary);
  };

  const handleClear = () => {
    setTitle("");
    setNotes("");
    setDate("");
    setParticipants("");
    setFormError(null);
    reset();
  };

  const generated = status === "done" && output && !isLoading;

  return (
    <ToolPage
      icon={<ClipboardList className="size-5" />}
      title="Meeting Notes Summarizer"
      description="Turn long meeting notes into a structured summary. Only your notes are analyzed — nothing is invented."
    >
      <ResponsibleAiBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meeting notes</CardTitle>
          <CardDescription>Paste the notes or transcript; all fields except the notes are optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Meeting title</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 planning sync"
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Meeting date (optional)</Label>
              <Input id="meeting-date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 29 Oct 2026" maxLength={60} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-participants">Participants (optional)</Label>
            <Input
              id="meeting-participants"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Comma-separated names, when known"
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-notes">Notes or transcript</Label>
            <Textarea
              id="meeting-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste the raw meeting notes here."
              rows={12}
              className="min-h-56"
              maxLength={60000}
            />
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : null}
              {isLoading ? "Summarizing…" : "Summarize notes"}
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={isLoading}>
              Clear notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <AiErrorAlert message={error} onRetry={handleGenerate} />}
      {isLoading && <LoadingPanel label="Analyzing the notes…" />}

      {generated && output && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>Owners or deadlines that never appear in the notes are labeled as not specified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <section>
              <h3 className="mb-1 text-sm font-semibold">Executive summary</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{output.executiveSummary}</p>
            </section>

            {output.discussionPoints.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Main discussion points</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {output.discussionPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </section>
            )}

            {output.decisions.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Decisions</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {output.decisions.map((d, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{d.decision}</span>
                      {d.context && <span> — {d.context}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {output.actionItems.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Actionable tasks</h3>
                <ul className="space-y-2">
                  {sortTasks(output.actionItems).map((a, i) => (
                    <li key={i} className="rounded-lg border bg-card px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={PRIORITY_STYLES[a.priority]}>{a.priority}</Badge>
                        <span className="font-medium text-foreground">{a.task}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Owner: {a.owner ?? NOT_SPECIFIED}</span>
                        <span>
                          Deadline: {a.deadline ?? NOT_SPECIFIED}
                          {a.deadline && (
                            <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">
                              {a.deadlineSource === "explicit" ? "From notes" : "AI suggested"}
                            </Badge>
                          )}
                        </span>
                      </div>
                      {a.rationale && <p className="mt-1 text-xs text-muted-foreground">{a.rationale}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {output.outstandingQuestions.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Outstanding questions</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {output.outstandingQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </section>
            )}

            {output.followUpTopics.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Potential follow-up topics</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {output.followUpTopics.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            {output.caveats.length > 0 && (
              <section className="rounded-lg border bg-muted/40 px-3 py-2">
                <h3 className="mb-1 text-sm font-semibold">Uncertainty notes</h3>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {output.caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <CopyButton text={meetingToMarkdown(output, title)} label="Copy summary" />
              <CopyButton
                text={
                  output.actionItems.length
                    ? output.actionItems
                        .map(
                          (a) =>
                            `- ${a.task} — Owner: ${a.owner ?? NOT_SPECIFIED}; Deadline: ${a.deadline ?? NOT_SPECIFIED}`,
                        )
                        .join("\n")
                    : "No action items were identified in the meeting notes."
                }
                label="Copy action items"
              />
              <DownloadButton filename={`meeting-summary-${Date.now()}.md`} content={meetingToMarkdown(output, title)} label="Download summary" />
              <RegenerateButton onClick={handleGenerate} />
            </div>
          </CardContent>
        </Card>
      )}

      {status === "idle" && !isLoading && (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Paste your meeting notes and choose <strong>Summarize notes</strong> to see the structured summary here.
        </p>
      )}
    </ToolPage>
  );
}
