import { useState } from "react";
import { Loader2, PenLine, Save } from "lucide-react";
import { toast } from "sonner";

import { ResponsibleAiBanner } from "@/components/responsible-ai-banner";
import { AiErrorAlert, CopyButton, LoadingPanel, RegenerateButton, SavedDraftsPanel, ToolPage } from "@/components/tool-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSavedDrafts } from "@/hooks/use-saved-drafts";
import { recordActivity } from "@/lib/activity";
import { writingInputSchema, writingActions, writingTones, type WritingInput, type WritingOutput } from "@/lib/ai/schemas";
import type { SavedDraft } from "@/lib/saved-drafts";

type WritingAction = (typeof writingActions)[number];

const ACTION_LABELS: Record<WritingAction, string> = {
  "professional-rewrite": "Rewrite professionally",
  "grammar-spelling": "Fix grammar & spelling",
  simplify: "Simplify",
  summarize: "Summarize",
  "improve-clarity": "Improve clarity",
  "structure-notes": "Turn notes into structured writing",
  "adjust-tone": "Adjust tone",
};

export function WritingAssistantTool() {
  const { status, error, output, run, reset, load, isLoading } = useAiTool<WritingOutput>("writing");
  const { save, drafts, refresh } = useSavedDrafts("writing");

  const [text, setText] = useState("");
  const [action, setAction] = useState<WritingAction>("professional-rewrite");
  const [tone, setTone] = useState<string>("none");
  const [formError, setFormError] = useState<string | null>(null);
  const [editedResult, setEditedResult] = useState("");
  const [editing, setEditing] = useState(false);
  const [sourceText, setSourceText] = useState("");

  const handleGenerate = async () => {
    const parsed = writingInputSchema.safeParse({
      text,
      action,
      tone: tone === "none" ? null : tone,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setFormError(null);
    const result = await run(parsed.data as WritingInput);
    if (result) {
      setEditedResult(result.result);
      setEditing(false);
      setSourceText(text);
      recordActivity("writing", ACTION_LABELS[action], result.result);
    }
  };

  const handleSave = () => {
    if (!output) return;
    const title = sourceText.trim().slice(0, 60) || "Writing draft";
    const draft = save(title, { ...output, result: editedResult });
    if (draft) toast.success(`Saved "${draft.title}" — reopen it anytime below.`);
  };

  const handleClear = () => {
    setText("");
    setAction("professional-rewrite");
    setTone("none");
    setFormError(null);
    reset();
    setEditing(false);
  };

  const generated = status === "done" && output && !isLoading;

  return (
    <ToolPage
      icon={<PenLine className="size-5" />}
      title="AI Writing Assistant"
      description="Improve everyday workplace writing: rewrite, correct, simplify, summarize, or restructure. Your meaning is preserved."
    >
      <ResponsibleAiBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your text</CardTitle>
          <CardDescription>Paste the text, choose what to do with it, then generate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="writing-text">Text to improve</Label>
            <Textarea
              id="writing-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your draft email, message, or rough notes here."
              rows={8}
              className="min-h-40"
              maxLength={20000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="writing-action">Writing action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="writing-action" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {writingActions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="writing-tone">Tone (optional)</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="writing-tone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keep current tone</SelectItem>
                  {writingTones.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
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
              {isLoading ? "Working…" : "Improve text"}
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={isLoading}>
              Clear inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <AiErrorAlert message={error} onRetry={handleGenerate} />}
      {isLoading && <LoadingPanel label="Improving your writing…" />}

      {generated && output && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Improved version</CardTitle>
            <CardDescription>{output.changesSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {output.substantialChanges && (
              <Badge className="bg-destructive/10 text-destructive">Substantial changes — the meaning may have shifted; review carefully</Badge>
            )}
            <div className="space-y-2">
              <Label>Original</Label>
              <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{sourceText}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="writing-result">Improved</Label>
              <Textarea
                id="writing-result"
                value={editedResult}
                onChange={(e) => setEditedResult(e.target.value)}
                readOnly={!editing}
                rows={10}
                className="min-h-48"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={editedResult} label="Copy improved text" />
              <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
                {editing ? "Done editing" : "Edit"}
              </Button>
              <RegenerateButton onClick={handleGenerate} />
              <Button variant="secondary" size="sm" onClick={handleSave}>
                <Save />
                Save draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "idle" && !isLoading && (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Paste your text and choose <strong>Improve text</strong> to see the improved version here.
        </p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Saved writing drafts</h2>
        <SavedDraftsPanel
          kind="writing"
          emptyLabel="No saved drafts yet. Improve a text and choose Save draft to keep it here."
          getTitle={(draft) => draft.title}
          getPreview={(draft) => (draft.kind === "writing" ? draft.data.result.slice(0, 120) : "")}
          onLoad={(draft: SavedDraft) => {
            if (draft.kind !== "writing") return;
            load(draft.data);
            setEditedResult(draft.data.result);
            setSourceText(draft.data.result);
            setEditing(false);
            refresh();
          }}
        />
        {drafts.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Reopening shows the saved result above; the original panel shows the same text. Save again to keep edits.
          </p>
        )}
      </div>
    </ToolPage>
  );
}
