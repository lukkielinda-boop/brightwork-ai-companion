import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const RESPONSIBLE_AI_DISCLAIMER =
  "AI-generated content may contain errors or omissions. Review all outputs before using them for important workplace decisions or external communication. Do not submit passwords, confidential business information, sensitive personal information, or other data you are not authorized to share. Users remain responsible for reviewing and approving AI-generated content.";

export function ResponsibleAiBanner({ variant = "compact" }: { variant?: "compact" | "full" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          AI-generated content may contain errors or omissions. Review all outputs before using them — you remain
          responsible for what you send or publish.
        </p>
      </div>
    );
  }

  return (
    <Alert className="border-amber-200/70 bg-amber-50 text-amber-900 [&>svg]:text-amber-900">
      <ShieldAlert />
      <AlertTitle>Responsible AI</AlertTitle>
      <AlertDescription className="text-amber-900/90">{RESPONSIBLE_AI_DISCLAIMER}</AlertDescription>
    </Alert>
  );
}
