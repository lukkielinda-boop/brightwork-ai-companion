import { useState } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";

import { ResponsibleAiBanner } from "@/components/responsible-ai-banner";
import {
  AiErrorAlert,
  CopyButton,
  LoadingPanel,
  RegenerateButton,
  SavedDraftsPanel,
  ToolPage,
} from "@/components/tool-ui";
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
import { useSavedDrafts } from "@/hooks/use-saved-drafts";
import { recordActivity } from "@/lib/activity";
import { emailInputSchema, emailTones, type EmailOutput, type EmailInput } from "@/lib/ai/schemas";
import type { SavedDraft } from "@/lib/saved-drafts";

const TONE_LABELS: Record<(typeof emailTones)[number], string> = {
  formal: "Formal",
  friendly: "Friendly",
  professional: "Professional",
  persuasive: "Persuasive",
  apologetic: "Apologetic",
  concise: "Concise",
};

export function EmailGeneratorTool() {
  const { status, error, output, run, reset, load, isLoading } = useAiTool<EmailOutput>("email");
  const { save, drafts, refresh } = useSavedDrafts("email");

  const [purpose, setPurpose] = useState("");
  const [audience, setAudience] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [tone, setTone] = useState<string>("professional");
  const [length, setLength] = useState<string>("none");
  const [subjectInstructions, setSubjectInstructions] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  const generated = status === "done" && output;

  const applyOutput = (value: EmailOutput) => {
    setEditedSubject(value.subject);
    setEditedBody(value.body);
    setEditing(false);
  };

  const handleGenerate = async () => {
    const parsed = emailInputSchema.safeParse({
      purpose,
      audience,
      keyPoints,
      tone,
      length: length === "none" ? null : length,
      subjectInstructions: subjectInstructions.trim() ? subjectInstructions.trim() : null,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setFormError(null);
    const result = await run(parsed.data as EmailInput);
    if (result) {
      applyOutput(result);
      recordActivity("email", parsed.data.purpose, result.body);
    }
  };

  const handleSave = () => {
    if (!output) return;
    const draft = save(editedSubject || "Untitled email", {
      ...output,
      subject: editedSubject,
      body: editedBody,
    });
    if (draft) toast.success(`Saved "${draft.title}" — reopen it anytime below.`);
  };

  const handleClear = () => {
    setPurpose("");
    setAudience("");
    setKeyPoints("");
    setTone("professional");
    setLength("none");
    setSubjectInstructions("");
    setFormError(null);
    reset();
    setEditing(false);
  };

  const emailText = `Subject: ${editedSubject}\n\n${editedBody}`;

  return (
    <ToolPage
      icon={<Mail className="size-5" />}
      title="Smart Email Generator"
      description="Draft a professional email from your notes. Nothing is sent automatically — you copy the result into your own mail client."
    >
      <ResponsibleAiBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email details</CardTitle>
          <CardDescription>Only the information you enter is used — the AI will not invent facts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-purpose">Purpose of the email</Label>
            <Input
              id="email-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Request a project deadline extension"
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-audience">Recipient or audience</Label>
            <Input
              id="email-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. My manager, a client, the whole team"
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-points">Key information to communicate</Label>
            <Textarea
              id="email-points"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="List the facts, requests, dates, or details the email should contain."
              rows={5}
              maxLength={5000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email-tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="email-tone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTones.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TONE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-length">Length (optional)</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger id="email-length" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-subject-instructions">Subject-line instructions (optional)</Label>
            <Input
              id="email-subject-instructions"
              value={subjectInstructions}
              onChange={(e) => setSubjectInstructions(e.target.value)}
              placeholder="e.g. Mention the June launch"
              maxLength={500}
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
              {isLoading ? "Generating…" : "Generate email"}
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={isLoading}>
              Clear inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <AiErrorAlert message={error} onRetry={handleGenerate} />}
      {isLoading && <LoadingPanel label="Drafting your email…" />}

      {generated && output && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated email</CardTitle>
            <CardDescription>Review, edit, and copy the result before using it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {output.placeholdersUsed.length > 0 && (
              <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                The AI used neutral placeholders because information was missing: {output.placeholdersUsed.join(", ")}.
                Replace them before sending.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                readOnly={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Body</Label>
              <Textarea
                id="email-body"
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                readOnly={!editing}
                rows={12}
                className="min-h-64"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={emailText} label="Copy email" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing((v) => !v)}
                disabled={!editing && editedBody.length === 0}
              >
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
          Fill in the details above and choose <strong>Generate email</strong> to see the draft here.
        </p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Saved email drafts</h2>
        <SavedDraftsPanel
          kind="email"
          emptyLabel="No saved drafts yet. Generate an email and choose Save draft to keep it here."
          getTitle={(draft) => draft.title}
          getPreview={(draft) => (draft.kind === "email" ? draft.data.body.slice(0, 120) : "")}
          onLoad={(draft: SavedDraft) => {
            if (draft.kind !== "email") return;
            load(draft.data);
            applyOutput(draft.data);
            refresh();
          }}
        />
        {drafts.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Reopening a draft shows its saved subject and body above. Edits you make are kept only if you save again.
          </p>
        )}
      </div>
    </ToolPage>
  );
}
