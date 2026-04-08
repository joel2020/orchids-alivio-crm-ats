import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { GlobalSearch } from "@/components/global-search"
import { extractAccessTokenFromCookieStore, resolveAccountId } from "@/lib/auth"

async function requireDashboardSession() {
  const accessToken = await extractAccessTokenFromCookieStore()
  if (!accessToken) {
    redirect("/auth/sign-in")
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken)

  if (!user || !resolveAccountId(user)) {
    redirect("/auth/sign-in")
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireDashboardSession()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger className="-ml-2" />
          <GlobalSearch />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
