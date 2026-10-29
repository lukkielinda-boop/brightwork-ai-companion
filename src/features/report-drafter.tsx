import { useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { ResponsibleAiBanner } from "@/components/responsible-ai-banner";
import { AiErrorAlert, CopyButton, DownloadButton, LoadingPanel, RegenerateButton, SavedDraftsPanel, ToolPage } from "@/components/tool-ui";
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
import { documentTypes, lengths, reportInputSchema, type ReportInput, type ReportOutput } from "@/lib/ai/schemas";
import type { SavedDraft } from "@/lib/saved-drafts";

const TYPE_LABELS: Record<(typeof documentTypes)[number], string> = {
  report: "Report",
  memo: "Memo",
  "status-update": "Status update",
  proposal: "Proposal",
  analysis: "Analysis",
};

type EditedSection = { heading: string; content: string };

export function reportToMarkdown(output: ReportOutput): string {
  return [
    `# ${output.title}`,
    "",
    ...output.sections.flatMap((s) => [`## ${s.heading}`, s.content, ""]),
    ...(output.missingInformation.length ? ["## Missing information", ...output.missingInformation.map((m) => `- ${m}`)] : []),
  ].join("\n");
}

export function ReportDrafterTool() {
  const { status, error, output, run, reset, load, isLoading } = useAiTool<ReportOutput>("report");
  const { save, drafts, refresh } = useSavedDrafts("report");

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [keyInformation, setKeyInformation] = useState("");
  const [documentType, setDocumentType] = useState<string>("report");
  const [length, setLength] = useState<string>("medium");
  const [formError, setFormError] = useState<string | null>(null);

  const [editedTitle, setEditedTitle] = useState("");
  const [editedSections, setEditedSections] = useState<EditedSection[]>([]);
  const [editing, setEditing] = useState(false);

  const applyOutput = (value: ReportOutput) => {
    setEditedTitle(value.title);
    setEditedSections(value.sections.map((s) => ({ heading: s.heading, content: s.content })));
    setEditing(false);
  };

  const currentOutput = (): ReportOutput | null => {
    if (!output) return null;
    return { ...output, title: editedTitle, sections: editedSections };
  };

  const handleGenerate = async () => {
    const parsed = reportInputSchema.safeParse({ topic, audience, keyInformation, documentType, length });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    setFormError(null);
    const result = await run(parsed.data as ReportInput);
    if (result) {
      applyOutput(result);
      recordActivity("report", parsed.data.topic, result.sections[0]?.content ?? result.title);
    }
  };

  const handleSave = () => {
    const value = currentOutput();
    if (!value) return;
    const draft = save(editedTitle || "Untitled document", value);
    if (draft) toast.success(`Saved "${draft.title}" — reopen it anytime below.`);
  };

  const handleClear = () => {
    setTopic("");
    setAudience("");
    setKeyInformation("");
    setDocumentType("report");
    setLength("medium");
    setFormError(null);
    reset();
    setEditing(false);
  };

  const generated = status === "done" && output && !isLoading;

  return (
    <ToolPage
      icon={<FileText className="size-5" />}
      title="Document & Report Drafter"
      description="Draft reports, memos, proposals, or status updates from your own facts and notes. Missing data is marked, never invented."
    >
      <ResponsibleAiBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document details</CardTitle>
          <CardDescription>Provide the facts, data, and notes the document should be built from.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-topic">Topic</Label>
            <Input id="report-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Monthly customer support performance" maxLength={500} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-audience">Audience</Label>
            <Input id="report-audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Department leadership" maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-key-info">Key information</Label>
            <Textarea
              id="report-key-info"
              value={keyInformation}
              onChange={(e) => setKeyInformation(e.target.value)}
              placeholder="Facts, figures, observations, and notes to include."
              rows={8}
              className="min-h-40"
              maxLength={10000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-type">Document type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="report-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-length">Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger id="report-length" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lengths.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
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
              {isLoading ? "Drafting…" : "Draft document"}
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={isLoading}>
              Clear inputs
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <AiErrorAlert message={error} onRetry={handleGenerate} />}
      {isLoading && <LoadingPanel label="Drafting your document…" />}

      {generated && output && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft</CardTitle>
            <CardDescription>Review every section and replace any placeholder before sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {output.missingInformation.length > 0 && (
              <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">Missing information marked in the draft:</p>
                <ul className="mt-1 list-disc pl-4">
                  {output.missingInformation.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {editing ? (
              <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} aria-label="Document title" />
            ) : (
              <h2 className="text-lg font-semibold">{editedTitle}</h2>
            )}

            <div className="space-y-4">
              {editedSections.map((section, i) => (
                <section key={i} className="space-y-1">
                  {editing ? (
                    <Input
                      value={section.heading}
                      aria-label={`Heading ${i + 1}`}
                      onChange={(e) =>
                        setEditedSections((prev) => prev.map((s, j) => (j === i ? { ...s, heading: e.target.value } : s)))
                      }
                    />
                  ) : (
                    <h3 className="text-sm font-semibold">{section.heading}</h3>
                  )}
                  <Textarea
                    value={section.content}
                    aria-label={`Content ${i + 1}`}
                    onChange={(e) =>
                      setEditedSections((prev) => prev.map((s, j) => (j === i ? { ...s, content: e.target.value } : s)))
                    }
                    readOnly={!editing}
                    rows={Math.min(12, Math.max(3, Math.ceil(section.content.length / 90)))}
                  />
                </section>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <CopyButton text={reportToMarkdown(currentOutput() ?? output)} label="Copy document" />
              <DownloadButton filename={`${(editedTitle || "document").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.md`} content={reportToMarkdown(currentOutput() ?? output)} label="Download" />
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
          Describe the document above and choose <strong>Draft document</strong> to see it here.
        </p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Saved documents</h2>
        <SavedDraftsPanel
          kind="report"
          emptyLabel="No saved documents yet. Draft one and choose Save draft to keep it here."
          getTitle={(draft) => draft.title}
          getPreview={(draft) => (draft.kind === "report" ? (draft.data.sections[0]?.content ?? "").slice(0, 120) : "")}
          onLoad={(draft: SavedDraft) => {
            if (draft.kind !== "report") return;
            load(draft.data);
            applyOutput(draft.data);
            refresh();
          }}
        />
        {drafts.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Reopening loads the saved sections above; save again to keep your edits.
          </p>
        )}
      </div>
    </ToolPage>
  );
}
