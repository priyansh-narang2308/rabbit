"use client";

import { usePathname } from "next/navigation";
import {
  AnimatedSidebarProvider,
  AnimatedSidebar,
  AnimatedSidebarHeader,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarGroupContent,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuButton,
  AnimatedSidebarInset,
  AnimatedSidebarTrigger,
} from "@/components/motion/animated-sidebar";
import {
  LayoutDashboard,
  Activity,
  Settings,
  User,
  PanelLeft,
  Terminal,
} from "lucide-react";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatedSidebarProvider>
      <AnimatedSidebar collapsible="icon" variant="sidebar">
        <AnimatedSidebarHeader className="flex items-center gap-3 px-4 py-6 overflow-hidden whitespace-nowrap">
          <span className="font-bold text-3xl tracking-tight font-(family-name:--font-caveat) transition-all duration-300 group-data-[state=collapsed]/sidebar:opacity-0 group-data-[state=collapsed]/sidebar:w-0">
            Rabbit
          </span>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent>
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>
              Execution Engine
            </AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    href="/dashboard"
                    isActive={pathname === "/dashboard"}
                    icon={<LayoutDashboard className="w-4 h-4 cursor-pointer" />}
                    className="cursor-pointer"
                  >
                    Overview
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    href="/dashboard/tasks"
                    isActive={pathname?.startsWith("/dashboard/tasks")}
                    icon={<Terminal className="w-4 h-4 cursor-pointer" />}
                    className="cursor-pointer"
                  >
                    Tasks
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    href="/dashboard/identities"
                    isActive={pathname?.startsWith("/dashboard/identities")}
                    icon={<User className="w-4 h-4 cursor-pointer" />}
                    className="cursor-pointer"
                  >
                    Identities
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    href="/dashboard/runs"
                    isActive={pathname?.startsWith("/dashboard/runs")}
                    icon={<Activity className="w-4 h-4 cursor-pointer" />}
                    className="cursor-pointer"
                  >
                    Live Runs
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>

          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>Configuration</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    href="/dashboard/settings"
                    isActive={pathname?.startsWith("/dashboard/settings")}
                    icon={<Settings className="w-4 h-4 cursor-pointer" />}
                    className="cursor-pointer"
                  >
                    Settings
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
      </AnimatedSidebar>

      <AnimatedSidebarInset className="flex flex-col flex-1 min-w-0 bg-black text-white">
        <header className="flex items-center h-16 px-4 border-b border-white/10 shrink-0 bg-black">
          <AnimatedSidebarTrigger className="text-white cursor-pointer hover:text-purple-400 transition-colors">
            <PanelLeft className="w-5 h-5 cursor-pointer" />
          </AnimatedSidebarTrigger>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-black">{children}</main>
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  );
}
