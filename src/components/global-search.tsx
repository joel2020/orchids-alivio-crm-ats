"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Building2, Users, Briefcase, Target, FileStack, UserCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type SearchResult = {
  type: "client" | "contact" | "candidate" | "job" | "opportunity" | "application"
  id: string
  title: string
  subtitle?: string
  href: string
}

const typeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  client: { icon: Building2, label: "Client" },
  contact: { icon: UserCircle, label: "Contact" },
  candidate: { icon: Users, label: "Candidate" },
  job: { icon: Briefcase, label: "Job" },
  opportunity: { icon: Target, label: "Opportunity" },
  application: { icon: FileStack, label: "Application" },
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([])
      return
    }

    setLoading(true)

    let scopedType: string | null = null
    let searchTerm = q

    const scopeMatch = q.match(/^(client|job|candidate|contact|opportunity):(.+)/i)
    if (scopeMatch) {
      scopedType = scopeMatch[1].toLowerCase()
      searchTerm = scopeMatch[2].trim()
    }

    const allResults: SearchResult[] = []

    if (!scopedType || scopedType === "client") {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, industry")
        .ilike("name", `%${searchTerm}%`)
        .limit(5)
      
      clients?.forEach(c => allResults.push({
        type: "client",
        id: c.id,
        title: c.name,
        subtitle: c.industry,
        href: `/clients/${c.id}`,
      }))
    }

    if (!scopedType || scopedType === "contact") {
      const { data: contacts } = await supabase
        .from("client_contacts")
        .select("id, name, email, clients(name)")
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5)
      
      contacts?.forEach((c: { id: string; name: string; email: string; clients: { name: string }[] | null }) => allResults.push({
        type: "contact",
        id: c.id,
        title: c.name,
        subtitle: (c.clients && c.clients[0]?.name) || c.email,
        href: `/contacts`,
      }))
    }

    if (!scopedType || scopedType === "candidate") {
      const { data: candidates } = await supabase
        .from("candidates")
        .select("id, full_name, email, current_company")
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,current_company.ilike.%${searchTerm}%`)
        .limit(5)
      
      candidates?.forEach(c => allResults.push({
        type: "candidate",
        id: c.id,
        title: c.full_name,
        subtitle: c.current_company || c.email,
        href: `/candidates/${c.id}`,
      }))
    }

    if (!scopedType || scopedType === "job") {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, location, projects(clients(name))")
        .ilike("title", `%${searchTerm}%`)
        .limit(5)
      
      jobs?.forEach((j: { id: string; title: string; location: string | null; projects: { clients: { name: string }[] | null }[] | null }) => allResults.push({
        type: "job",
        id: j.id,
        title: j.title,
        subtitle: (j.projects && j.projects[0]?.clients && j.projects[0].clients[0]?.name) || j.location || undefined,
        href: `/jobs/${j.id}`,
      }))
    }

    if (!scopedType || scopedType === "opportunity") {
      const { data: opportunities } = await supabase
        .from("opportunities")
        .select("id, name, stage, clients(name)")
        .ilike("name", `%${searchTerm}%`)
        .limit(5)
      
      opportunities?.forEach((o: { id: string; name: string; stage: string; clients: { name: string }[] | null }) => allResults.push({
        type: "opportunity",
        id: o.id,
        title: o.name,
        subtitle: (o.clients && o.clients[0]?.name) || o.stage,
        href: `/opportunities/${o.id}`,
      }))
    }

    setResults(allResults)
    setSelectedIndex(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      router.push(results[selectedIndex].href)
      setOpen(false)
      setQuery("")
    }
  }

  function handleSelect(result: SearchResult) {
    router.push(result.href)
    setOpen(false)
    setQuery("")
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full max-w-sm h-9 px-3 py-2 text-sm text-muted-foreground bg-muted/50 border rounded-md hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, candidates, jobs... (use client:, job:, etc.)"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
          
          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : results.length === 0 && query.length >= 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                <p className="mb-2">Type to search across:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Clients, Contacts, Candidates</li>
                  <li>• Jobs, Opportunities, Applications</li>
                  <li>• Use <code className="bg-muted px-1 rounded">client:Acme</code> for scoped search</li>
                </ul>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => {
                  const config = typeConfig[result.type]
                  const Icon = config.icon
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-muted transition-colors",
                        index === selectedIndex && "bg-muted"
                      )}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{config.label}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
