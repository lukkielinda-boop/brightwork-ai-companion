// Shared, client-safe schemas for every AI tool.
// Used on the client for form validation and on the server to build the
// strict JSON schemas sent to the model. Optional values are `.nullable()`
// (never `.optional()`) so the generated schema is strict-compatible.
import { z } from "zod/v4";

export const TOOL_IDS = ["email", "meeting", "planner", "writing", "report", "brainstorm"] as const;
export type ToolId = (typeof TOOL_IDS)[number];
export const toolIds: ToolId[] = [...TOOL_IDS];

export const TOOL_META: Record<ToolId, { name: string; tagline: string }> = {
  email: {
    name: "Smart Email Generator",
    tagline: "Draft professional emails in your chosen tone.",
  },
  meeting: {
    name: "Meeting Notes Summarizer",
    tagline: "Turn long notes into structured summaries and action items.",
  },
  planner: {
    name: "AI Task Planner",
    tagline: "Organize tasks into a realistic daily or weekly schedule.",
  },
  writing: {
    name: "AI Writing Assistant",
    tagline: "Rewrite, simplify, and polish workplace writing.",
  },
  report: {
    name: "Document & Report Drafter",
    tagline: "Draft reports, memos, and proposals from your notes.",
  },
  brainstorm: {
    name: "Brainstorming Assistant",
    tagline: "Generate and organize ideas around any topic.",
  },
};

export const emailTones = ["formal", "friendly", "professional", "persuasive", "apologetic", "concise"] as const;
export const lengths = ["short", "medium", "long"] as const;

// ---------------------------------------------------------------- Email
export const emailInputSchema = z.object({
  purpose: z.string().trim().min(1, "Please describe the email's purpose.").max(2000, "Purpose must be under 2,000 characters."),
  audience: z.string().trim().min(1, "Please describe the recipient or audience.").max(500, "Audience must be under 500 characters."),
  keyPoints: z.string().trim().min(1, "Please include the key information to communicate.").max(5000, "Key information must be under 5,000 characters."),
  tone: z.enum(emailTones),
  length: z.enum(lengths).nullable(),
  subjectInstructions: z.string().trim().max(500, "Subject instructions must be under 500 characters.").nullable(),
});
export type EmailInput = z.infer<typeof emailInputSchema>;
export const emailOutputSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  placeholdersUsed: z.array(z.string()),
});
export type EmailOutput = z.infer<typeof emailOutputSchema>;

// -------------------------------------------------------------- Meeting
export const meetingInputSchema = z.object({
  title: z.string().trim().min(1, "Please enter the meeting title.").max(300, "Title must be under 300 characters."),
  notes: z.string().trim().min(1, "Please paste the meeting notes or transcript.").max(60000, "Notes must be under 60,000 characters."),
  date: z.string().trim().max(60).nullable(),
  participants: z.string().trim().max(2000, "Participants must be under 2,000 characters.").nullable(),
});
export type MeetingInput = z.infer<typeof meetingInputSchema>;
export const meetingOutputSchema = z.object({
  executiveSummary: z.string(),
  discussionPoints: z.array(z.string()),
  decisions: z.array(z.object({ decision: z.string(), context: z.string().nullable() })),
  actionItems: z.array(z.object({ task: z.string(), owner: z.string().nullable(), deadline: z.string().nullable() })),
  outstandingQuestions: z.array(z.string()),
  followUpTopics: z.array(z.string()),
  caveats: z.array(z.string()),
});
export type MeetingOutput = z.infer<typeof meetingOutputSchema>;

// ------------------------------------------------------------- Planner
export const plannerScopes = ["daily", "weekly", "both"] as const;
export const plannerInputSchema = z.object({
  tasks: z.string().trim().min(1, "Please list at least one task.").max(10000, "Task list must be under 10,000 characters."),
  workdayStart: z.string().trim().max(20).nullable(),
  workdayEnd: z.string().trim().max(20).nullable(),
  availableHoursPerDay: z.string().trim().max(100).nullable(),
  commitments: z.string().trim().max(3000, "Existing commitments must be under 3,000 characters.").nullable(),
  scope: z.enum(plannerScopes),
  // Replanning: what changed in the user's day, plus the current plan to rebuild from.
  scheduleChanges: z.string().trim().max(3000, "Schedule changes must be under 3,000 characters.").nullable().default(null),
  currentPlan: z.string().trim().max(15000).nullable().default(null),
  currentTime: z.string().trim().max(40).nullable().default(null),
});
export type PlannerInput = z.infer<typeof plannerInputSchema>;
export const plannerOutputSchema = z.object({
  summary: z.string(),
  insufficientTime: z.boolean(),
  conflicts: z.array(z.string()),
  priorities: z.array(z.object({ task: z.string(), priority: z.enum(["high", "medium", "low"]), reason: z.string() })),
  schedule: z.array(
    z.object({
      day: z.string(),
      slots: z.array(z.object({ start: z.string(), end: z.string(), task: z.string(), note: z.string().nullable() })),
    }),
  ),
  breaks: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

// ------------------------------------------------------------- Writing
export const writingActions = [
  "professional-rewrite",
  "grammar-spelling",
  "simplify",
  "summarize",
  "improve-clarity",
  "structure-notes",
  "adjust-tone",
] as const;
export const writingTones = ["formal", "friendly", "professional", "persuasive", "concise"] as const;
export const writingInputSchema = z.object({
  text: z.string().trim().min(1, "Please paste the text you want to improve.").max(20000, "Text must be under 20,000 characters."),
  action: z.enum(writingActions),
  tone: z.enum(writingTones).nullable(),
});
export type WritingInput = z.infer<typeof writingInputSchema>;
export const writingOutputSchema = z.object({
  result: z.string().min(1),
  changesSummary: z.string(),
  substantialChanges: z.boolean(),
});
export type WritingOutput = z.infer<typeof writingOutputSchema>;

// -------------------------------------------------------------- Report
export const documentTypes = ["report", "memo", "status-update", "proposal", "analysis"] as const;
export const reportInputSchema = z.object({
  topic: z.string().trim().min(1, "Please describe the document topic.").max(500, "Topic must be under 500 characters."),
  audience: z.string().trim().min(1, "Please describe the audience.").max(300, "Audience must be under 300 characters."),
  keyInformation: z.string().trim().min(1, "Please include the facts, data, or notes to build the document from.").max(10000, "Key information must be under 10,000 characters."),
  documentType: z.enum(documentTypes),
  length: z.enum(lengths),
});
export type ReportInput = z.infer<typeof reportInputSchema>;
export const reportOutputSchema = z.object({
  title: z.string().min(1),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })),
  missingInformation: z.array(z.string()),
});
export type ReportOutput = z.infer<typeof reportOutputSchema>;

// ---------------------------------------------------------- Brainstorm
export const brainstormCounts = ["6", "9", "12"] as const;
export const brainstormInputSchema = z.object({
  topic: z.string().trim().min(1, "Please describe the brainstorming topic.").max(500, "Topic must be under 500 characters."),
  goal: z.string().trim().max(1000, "Goal must be under 1,000 characters.").nullable(),
  constraints: z.string().trim().max(1000, "Constraints must be under 1,000 characters.").nullable(),
  ideaCount: z.enum(brainstormCounts),
});
export type BrainstormInput = z.infer<typeof brainstormInputSchema>;
export const brainstormOutputSchema = z.object({
  ideas: z.array(z.object({ title: z.string(), description: z.string(), category: z.string().nullable() })),
  themes: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
export type BrainstormOutput = z.infer<typeof brainstormOutputSchema>;

// Registry used by both the client hook and the server handler.
export const toolInputSchemas = {
  email: emailInputSchema,
  meeting: meetingInputSchema,
  planner: plannerInputSchema,
  writing: writingInputSchema,
  report: reportInputSchema,
  brainstorm: brainstormInputSchema,
} as const;

export const toolOutputSchemas = {
  email: emailOutputSchema,
  meeting: meetingOutputSchema,
  planner: plannerOutputSchema,
  writing: writingOutputSchema,
  report: reportOutputSchema,
  brainstorm: brainstormOutputSchema,
} as const;

export type ToolInputMap = typeof toolInputSchemas;
export type ToolOutputMap = typeof toolOutputSchemas;
