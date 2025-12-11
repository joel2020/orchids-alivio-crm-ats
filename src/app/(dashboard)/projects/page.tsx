"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Project, Client, PROJECT_MODELS, PROJECT_STATUSES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

function ProjectsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledClientId = searchParams.get("client_id")
  const [projects, setProjects] = useState<(Project & { clients: Client })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(!!prefilledClientId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    client_id: prefilledClientId || "",
    model: "",
    status: "active",
    start_date: "",
    cal_event_type_id: "",
  })

  useEffect(() => {
    fetchData()
  }, [search, statusFilter])

  async function fetchData() {
    const [projectsRes, clientsRes] = await Promise.all([
      supabase.from("projects").select("*, clients(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ])
    let data = (projectsRes.data || []) as (Project & { clients: Client })[]
    if (search) data = data.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter && statusFilter !== "all") data = data.filter((p) => p.status === statusFilter)
    setProjects(data)
    setClients(clientsRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    
    if (!formData.name.trim() || !formData.client_id) {
      setError("Name and Client are required")
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase.from("projects").insert([formData]).select().single()
    
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await supabase.from("activities").insert({
      object_type: "project",
      object_id: data.id,
      type: "project_created",
      payload: { name: data.name }
    })

    setFormData({ name: "", client_id: "", model: "", status: "active", start_date: "", cal_event_type_id: "" })
    setDialogOpen(false)
    setSubmitting(false)
    router.push(`/projects/${data.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Project</DialogTitle></DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select required value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={formData.model} onValueChange={(v) => setFormData({ ...formData, model: v })}>
                  <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_MODELS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : projects.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No projects found</TableCell></TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell><Link href={`/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link></TableCell>
                  <TableCell>{project.clients?.name || "-"}</TableCell>
                  <TableCell>{project.model || "-"}</TableCell>
                  <TableCell><Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge></TableCell>
                  <TableCell>{project.start_date || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ProjectsContent />
    </Suspense>
  )
}