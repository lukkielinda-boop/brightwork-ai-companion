import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  Mail,
  PenLine,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { TOOL_META } from "@/lib/ai/schemas";

const toolItems = [
  { tool: "email" as const, icon: Mail },
  { tool: "meeting" as const, icon: ClipboardList },
  { tool: "planner" as const, icon: CalendarCheck },
  { tool: "writing" as const, icon: PenLine },
  { tool: "report" as const, icon: FileText },
  { tool: "brainstorm" as const, icon: Lightbulb },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (router) => router.location.pathname });

  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="AI Productivity Assistant">
              <Link to="/">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">AI Productivity Assistant</span>
                  <span className="truncate text-xs text-muted-foreground">Workplace AI tools</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard">
                  <Link to="/">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => {
                const path = toolPath(item.tool);
                return (
                  <SidebarMenuItem key={item.tool}>
                    <SidebarMenuButton asChild isActive={isActive(path)} tooltip={TOOL_META[item.tool].name}>
                      <Link to={path}>
                        <item.icon />
                        <span>{TOOL_META[item.tool].name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { to: "/activity", label: "Recent Activity", icon: History },
                { to: "/settings", label: "Settings", icon: Settings },
                { to: "/help", label: "Help & Documentation", icon: BookOpen },
              ].map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 pb-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          AI-generated content may contain errors. Review before use.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

export const toolPaths = {
  email: "/email-generator",
  meeting: "/meeting-summarizer",
  planner: "/task-planner",
  writing: "/writing-assistant",
  report: "/report-drafter",
  brainstorm: "/brainstorming",
} as const;

export function toolPath(tool: keyof typeof toolPaths): string {
  return toolPaths[tool];
}
