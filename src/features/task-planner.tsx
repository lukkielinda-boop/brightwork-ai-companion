import { useState } from "react";
import { CalendarCheck, Loader2, RefreshCw } from "lucide-react";

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
import { plannerInputSchema, plannerScopes, type PlannerInput, type PlannerOutput } from "@/lib/ai/schemas";

const SCOPE_LABELS: Record<(typeof plannerScopes)[number], string> = {
  daily: "Daily plan",
  weekly: "Weekly plan",
  both: "Daily + weekly",
};

export function plannerToMarkdown(output: PlannerOutput): string {
  const lines: string[] = ["# Proposed schedule", "", output.summary, ""];
  if (output.conflicts.length) lines.push("## Conflicts", ...output.conflicts.map((c) => `- ${c}`), "");
  lines.push("## Priorities", ...output.priorities.map((p) => `- ${p.task} (${p.priority}) — ${p.reason}`), "");
  lines.push("## Schedule");
  for (const day of output.schedule) {
    lines.push(`### ${day.day}`);
    for (const slot of day.slots) lines.push(`- ${slot.start}–${slot.end}: ${slot.task}${slot.note ? ` (${slot.note})` : ""}`);
  }
  if (output.breaks.length) lines.push("", "## Breaks", ...output.breaks.map((b) => `- ${b}`));
  if (output.recommendations.length) lines.push("", "## Recommendations", ...output.recommendations.map((r) => `- ${r}`));
  lines.push("", "_This schedule is an AI-generated recommendation you can modify. Nothing has been scheduled in any calendar._");
  return lines.join("\n");
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-secondary text-secondary-foreground",
    low: "bg-muted text-muted-foreground",
  } as const;
  return <Badge className={styles[priority]}>{priority}</Badge>;
}

export function TaskPlannerTool() {
  const { status, error, output, run, reset, isLoading } = useAiTool<PlannerOutput>("planner");

  const [tasks, setTasks] = useState("");
  const [scope, setScope] = useState<string>("both");
  const [workdayStart, setWorkdayStart] = useState("");
  const [workdayEnd, setWorkdayEnd] = useState("");
  const [availableHours, setAvailableHours] = useState("");
  const [commitments, setCommitments] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const parsed = plannerInputSchema.safeParse({
      tasks,
      scope,
      workdayStart: workdayStart.trim() || null,
      workdayEnd: workdayEnd.trim() || null,
      availableHoursPerDay: availableHours.trim() || null,
      commitments: commitments.trim() || null,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setFormError(null);
    const result = await run(parsed.data as PlannerInput);
    if (result) recordActivity("planner", parsed.data.tasks.slice(0, 60), result.summary);
  };

  const [changes, setChanges] = useState("");
  const [replanError, setReplanError] = useState<string | null>(null);

  const handleReplan = async () => {
    if (!output) return;
    if (!changes.trim()) {
      setReplanError("Describe what changed in your schedule first.");
      return;
    }
    const now = new Date();
    const parsed = plannerInputSchema.safeParse({
      tasks,
      scope: "daily",
      workdayStart: workdayStart.trim() || null,
      workdayEnd: workdayEnd.trim() || null,
      availableHoursPerDay: availableHours.trim() || null,
      commitments: commitments.trim() || null,
      scheduleChanges: changes.trim(),
      currentPlan: plannerToMarkdown(output),
      currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    });
    if (!parsed.success) {
      setReplanError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setReplanError(null);
    const result = await run(parsed.data as PlannerInput);
    if (result) {
      recordActivity("planner", `Replanned: ${changes.trim().slice(0, 50)}`, result.summary);
      setChanges("");
    }
  };

  const handleClear = () => {
    setTasks("");
    setScope("both");
    setWorkdayStart("");
    setWorkdayEnd("");
    setAvailableHours("");
    setCommitments("");
    setFormError(null);
    reset();
  };

  const generated = status === "done" && output && !isLoading;

  return (
    <ToolPage
      icon={<CalendarCheck className="size-5" />}
      title="AI Task Planner"
      description="Turn your task list into a realistic daily or weekly schedule. The plan is a recommendation — nothing is created in any calendar."
    >
      <ResponsibleAiBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your tasks and availability</CardTitle>
          <CardDescription>List one task per line with any priority, deadline, or duration details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planner-tasks">Task list</Label>
            <Textarea
              id="planner-tasks"
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder={"e.g.\nPrepare client report — high priority, due Friday\nAnswer support emails — 1 hour\nBook team offsite venue — 30 minutes"}
              rows={8}
              className="min-h-40"
              maxLength={10000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planner-scope">Plan type</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="planner-scope" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plannerScopes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SCOPE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="planner-start">Workday start (optional)</Label>
              <Input id="planner-start" type="time" value={workdayStart} onChange={(e) => setWorkdayStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-end">Workday end (optional)</Label>
              <Input id="planner-end" type="time" value={workdayEnd} onChange={(e) => setWorkdayEnd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-hours">Available hours/day (optional)</Label>
              <Input id="planner-hours" value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} placeholder="e.g. 6" maxLength={100} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planner-commitments">Existing commitments or breaks (optional)</Label>
            <Textarea
              id="planner-commitments"
              value={commitments}
              onChange={(e) => setCommitments(e.target.value)}
              placeholder="e.g. Team stand-up 09:30–10:00, lunch 12:00–13:00"
              rows={2}
              maxLength={3000}
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
              {isLoading ? "Planning…" : "Generate plan"}
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={isLoading}>
              Clear inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <AiErrorAlert message={error} onRetry={handleGenerate} />}
      {isLoading && <LoadingPanel label="Building your schedule…" />}

      {generated && output && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposed schedule</CardTitle>
            <CardDescription>A recommendation you can modify — nothing has been completed or booked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">{output.summary}</p>

            {(output.insufficientTime || output.conflicts.length > 0) && (
              <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">Scheduling conflicts or tight time</p>
                <ul className="mt-1 list-disc pl-4">
                  {output.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                  {output.insufficientTime && output.conflicts.length === 0 && (
                    <li>The available time does not fit all tasks. See the recommendations below.</li>
                  )}
                </ul>
              </div>
            )}

            {output.priorities.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Priorities and reasoning</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {output.priorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <PriorityBadge priority={p.priority} />
                      <span>
                        <span className="font-medium text-foreground">{p.task}</span> — {p.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {output.schedule.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Schedule</h3>
                <div className="space-y-3">
                  {output.schedule.map((day, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="mb-2 text-sm font-medium">{day.day}</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {day.slots.map((slot, j) => (
                          <li key={j}>
                            <span className="font-mono text-xs text-foreground">
                              {slot.start}–{slot.end}
                            </span>{" "}
                            {slot.task}
                            {slot.note && <span className="text-xs"> · {slot.note}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {output.breaks.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Suggested breaks</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {output.breaks.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </section>
            )}

            {output.recommendations.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Recommendations</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {output.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <CopyButton text={plannerToMarkdown(output)} label="Copy plan" />
              <DownloadButton filename={`task-plan-${Date.now()}.md`} content={plannerToMarkdown(output)} label="Export schedule" />
              <RegenerateButton onClick={handleGenerate} />
            </div>
          </CardContent>
        </Card>
      )}

      {generated && output && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4" /> Schedule changed?
            </CardTitle>
            <CardDescription>
              Describe what changed today and the AI will reprioritize your tasks and rebuild today's plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              aria-label="Schedule changes"
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder={"e.g. A client call was added 14:00–15:00, my 11:00 meeting was cancelled, and the report is now due today."}
              rows={3}
              maxLength={3000}
            />
            {replanError && (
              <p className="text-sm text-destructive" role="alert">
                {replanError}
              </p>
            )}
            <Button onClick={handleReplan} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {isLoading ? "Rebuilding…" : "Rebuild today's plan"}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "idle" && !isLoading && (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          List your tasks above and choose <strong>Generate plan</strong> to see the proposed schedule here.
        </p>
      )}
    </ToolPage>
  );
}
