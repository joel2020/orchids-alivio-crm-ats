"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  FolderKanban,
  Briefcase,
  Users,
  FileStack,
  Calendar,
  Activity,
  Target,
  CheckSquare,
  Settings,
  Mail,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const crmItems = [
  { title: "Clients", href: "/clients", icon: Building2 },
  { title: "Opportunities", href: "/opportunities", icon: Target },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
]

const atsItems = [
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Jobs", href: "/jobs", icon: Briefcase },
  { title: "Candidates", href: "/candidates", icon: Users },
  { title: "Applications", href: "/applications", icon: FileStack },
  { title: "Interviews", href: "/interviews", icon: Calendar },
]

const systemItems = [
  { title: "Activities", href: "/activities", icon: Activity },
  { title: "Instantly", href: "/instantly", icon: Mail },
  { title: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-lg tracking-tight">Alivio</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>ATS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {atsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}