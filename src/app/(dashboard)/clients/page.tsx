"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter, X, ArrowUpDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Client, CLIENT_STATUSES, CLIENT_TIERS, ClientStatus, ClientTier } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

const SIZE_BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Other"]
const REGIONS = ["North America", "Europe", "APAC", "LATAM", "Global"]

type ClientWithCounts = Client & {
  open_jobs_count: number
  open_opportunities_count: number
  last_activity_date: string | null
}

const statusColors: Record<string, string> = {
  prospect: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  dormant: "bg-slate-100 text-slate-800",
  lost: "bg-red-100 text-red-800",
}

const tierColors: Record<string, string> = {
  A: "bg-purple-100 text-purple-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-slate-100 text-slate-800",
}

type SortField = "created_at" | "last_activity_date" | "open_opportunities_count" | "name"
type SortDirection = "asc" | "desc"

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  
  const [filters, setFilters] = useState({
    status: [] as string[],
    tier: [] as string[],
    industry: "",
    sizeBand: "",
    hasOpenJobs: false,
    hasOpenOpportunities: false,
  })
  
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const [formData, setFormData] = useState({
    name: "",
    website: "",
    size_band: "",
    industry: "",
    region: "",
    status: "prospect" as ClientStatus,
    tier: "B" as ClientTier,
    billing_email: "",
  })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order(sortField === "last_activity_date" ? "created_at" : sortField, { ascending: sortDirection === "asc" })

    if (clientsError) {
      setError(clientsError.message)
      setLoading(false)
      return
    }

    const clientIds = (clientsData || []).map(c => c.id)
    
    const [jobsRes, oppsRes, activitiesRes] = await Promise.all([
      supabase.from("jobs").select("id, project_id").in("status", ["open", "draft"]),
      supabase.from("opportunities").select("id, client_id").not("stage", "in", '("won","lost")'),
      supabase.from("activities").select("object_id, created_at").eq("object_type", "client").in("object_id", clientIds).order("created_at", { ascending: false }),
    ])

    const { data: projectsData } = await supabase.from("projects").select("id, client_id")
    
    const projectClientMap = new Map<string, string>()
    ;(projectsData || []).forEach(p => projectClientMap.set(p.id, p.client_id))

    const jobCountByClient = new Map<string, number>()
    ;(jobsRes.data || []).forEach(j => {
      const clientId = projectClientMap.get(j.project_id)
      if (clientId) {
        jobCountByClient.set(clientId, (jobCountByClient.get(clientId) || 0) + 1)
      }
    })

    const oppCountByClient = new Map<string, number>()
    ;(oppsRes.data || []).forEach(o => {
      if (o.client_id) {
        oppCountByClient.set(o.client_id, (oppCountByClient.get(o.client_id) || 0) + 1)
      }
    })

    const lastActivityByClient = new Map<string, string>()
    ;(activitiesRes.data || []).forEach(a => {
      if (a.object_id && !lastActivityByClient.has(a.object_id)) {
        lastActivityByClient.set(a.object_id, a.created_at)
      }
    })

    let enrichedClients: ClientWithCounts[] = (clientsData || []).map(c => ({
      ...c,
      open_jobs_count: jobCountByClient.get(c.id) || 0,
      open_opportunities_count: oppCountByClient.get(c.id) || 0,
      last_activity_date: lastActivityByClient.get(c.id) || null,
    }))

    if (search) {
      enrichedClients = enrichedClients.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (filters.status.length > 0) {
      enrichedClients = enrichedClients.filter(c => filters.status.includes(c.status))
    }
    if (filters.tier.length > 0) {
      enrichedClients = enrichedClients.filter(c => filters.tier.includes(c.tier))
    }
    if (filters.industry) {
      enrichedClients = enrichedClients.filter(c => c.industry === filters.industry)
    }
    if (filters.sizeBand) {
      enrichedClients = enrichedClients.filter(c => c.size_band === filters.sizeBand)
    }
    if (filters.hasOpenJobs) {
      enrichedClients = enrichedClients.filter(c => c.open_jobs_count > 0)
    }
    if (filters.hasOpenOpportunities) {
      enrichedClients = enrichedClients.filter(c => c.open_opportunities_count > 0)
    }

    if (sortField === "last_activity_date") {
      enrichedClients.sort((a, b) => {
        const aDate = a.last_activity_date ? new Date(a.last_activity_date).getTime() : 0
        const bDate = b.last_activity_date ? new Date(b.last_activity_date).getTime() : 0
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate
      })
    } else if (sortField === "open_opportunities_count") {
      enrichedClients.sort((a, b) => 
        sortDirection === "asc" 
          ? a.open_opportunities_count - b.open_opportunities_count 
          : b.open_opportunities_count - a.open_opportunities_count
      )
    }

    setClients(enrichedClients)
    setLoading(false)
  }, [search, filters, sortField, sortDirection])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    
    if (!formData.name.trim()) {
      setError("Name is required")
      setSubmitting(false)
      return
    }

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error || "Failed to create client")
      setSubmitting(false)
      return
    }

    setFormData({ name: "", website: "", size_band: "", industry: "", region: "", status: "prospect", tier: "B", billing_email: "" })
    setDialogOpen(false)
    setSubmitting(false)
    router.push(`/clients/${result.id}`)
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const activeFilterCount = [
    filters.status.length > 0,
    filters.tier.length > 0,
    !!filters.industry,
    !!filters.sizeBand,
    filters.hasOpenJobs,
    filters.hasOpenOpportunities,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ClientStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUSES.map((s) => (<SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tier</Label>
                  <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v as ClientTier })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_TIERS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Size Band</Label>
                  <Select value={formData.size_band} onValueChange={(v) => setFormData({ ...formData, size_band: v })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {SIZE_BANDS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={formData.region} onValueChange={(v) => setFormData({ ...formData, region: v })}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_email">Billing Email</Label>
                  <Input id="billing_email" type="email" value={formData.billing_email} onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_STATUSES.map((s) => (
                    <Badge
                      key={s}
                      variant={filters.status.includes(s) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => {
                        setFilters({
                          ...filters,
                          status: filters.status.includes(s)
                            ? filters.status.filter(x => x !== s)
                            : [...filters.status, s]
                        })
                      }}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tier</Label>
                <div className="flex gap-2">
                  {CLIENT_TIERS.map((t) => (
                    <Badge
                      key={t}
                      variant={filters.tier.includes(t) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters({
                          ...filters,
                          tier: filters.tier.includes(t)
                            ? filters.tier.filter(x => x !== t)
                            : [...filters.tier, t]
                        })
                      }}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={filters.industry} onValueChange={(v) => setFilters({ ...filters, industry: v === "all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="All industries" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All industries</SelectItem>
                    {INDUSTRIES.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Size Band</Label>
                <Select value={filters.sizeBand} onValueChange={(v) => setFilters({ ...filters, sizeBand: v === "all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="All sizes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sizes</SelectItem>
                    {SIZE_BANDS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="hasJobs" checked={filters.hasOpenJobs} onCheckedChange={(c) => setFilters({ ...filters, hasOpenJobs: !!c })} />
                  <label htmlFor="hasJobs" className="text-sm">Has open jobs</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hasOpps" checked={filters.hasOpenOpportunities} onCheckedChange={(c) => setFilters({ ...filters, hasOpenOpportunities: !!c })} />
                  <label htmlFor="hasOpps" className="text-sm">Has open opportunities</label>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters({ status: [], tier: [], industry: "", sizeBand: "", hasOpenJobs: false, hasOpenOpportunities: false })}>
                  <X className="mr-2 h-4 w-4" />Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Open Jobs</TableHead>
              <TableHead>Open Opps</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("last_activity_date")}>
                <div className="flex items-center gap-1">Last Activity <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                <div className="flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No clients found</TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">{client.name}</Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[client.status] || ""}>{client.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={tierColors[client.tier] || ""}>{client.tier}</Badge>
                  </TableCell>
                  <TableCell>{client.industry || "-"}</TableCell>
                  <TableCell>{client.open_jobs_count}</TableCell>
                  <TableCell>{client.open_opportunities_count}</TableCell>
                  <TableCell>
                    {client.last_activity_date 
                      ? new Date(client.last_activity_date).toLocaleDateString() 
                      : "-"}
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
