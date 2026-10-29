import { useState, type ReactNode } from "react";
import { Check, Copy, Download, Loader2, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedDrafts } from "@/hooks/use-saved-drafts";
import type { SavedDraft } from "@/lib/saved-drafts";
import { cn } from "@/lib/utils";

export function ToolPage({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-start gap-3">
        <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function AiErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive" className="[&>svg]:self-start">
      <AlertTitle>Generation failed</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function LoadingPanel({ label = "Generating…" }: { label?: string }) {
  return (
    <div className="rounded-xl border bg-card p-6" role="status" aria-live="polite">
      <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {label}
      </p>
      <div className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(async () => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): void {
  if (typeof document === "undefined") return;
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
  size = "sm",
  className,
}: {
  text: string;
  label?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant={variant} size={size} className={className} onClick={handleCopy}>
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function DownloadButton({
  filename,
  content,
  label = "Download",
  className,
}: {
  filename: string;
  content: string;
  label?: string;
  className?: string;
}) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" className={className} onClick={handleDownload}>
      <Download />
      {label}
    </Button>
  );
}

export function RegenerateButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <RefreshCw />
      Regenerate
    </Button>
  );
}

export function DeleteDraftButton({ onConfirmPrompt }: { onConfirmPrompt: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Delete saved draft"
      onClick={onConfirmPrompt}
    >
      <Trash2 />
    </Button>
  );
}

// Reusable saved-drafts list for tools that support saving (email, writing,
// report). Shows a confirm prompt before deleting.
export function SavedDraftsPanel({
  kind,
  emptyLabel,
  getTitle,
  getPreview,
  onLoad,
}: {
  kind: "email" | "writing" | "report";
  emptyLabel: string;
  getTitle: (draft: SavedDraft) => string;
  getPreview: (draft: SavedDraft) => string;
  onLoad: (draft: SavedDraft) => void;
}) {
  const { drafts, refresh, remove } = useSavedDrafts(kind);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (drafts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {drafts.map((draft) => (
        <li key={draft.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{getTitle(draft)}</p>
            <p className="truncate text-xs text-muted-foreground">{getPreview(draft)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Saved {new Date(draft.updatedAt).toLocaleString()}
            </p>
          </div>
          {confirmingId === draft.id ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  remove(draft.id);
                  setConfirmingId(null);
                  refresh();
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className={cn("flex items-center gap-1")}>
              <Button size="sm" variant="outline" onClick={() => onLoad(draft)}>
                Reopen
              </Button>
              <DeleteDraftButton onConfirmPrompt={() => setConfirmingId(draft.id)} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
