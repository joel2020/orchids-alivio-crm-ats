"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Job, Project, Client, JOB_STATUSES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

type JobWithRelations = Job & { projects: Project & { clients: Client } }

function JobsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledProjectId = searchParams.get("project_id")
  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [projects, setProjects] = useState<(Project & { clients: Client })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(!!prefilledProjectId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    project_id: prefilledProjectId || "",
    level: "",
    location: "",
    compensation_min: "",
    compensation_max: "",
    urgency: "",
    status: "open",
  })

  useEffect(() => { fetchData() }, [search, statusFilter])

  async function fetchData() {
    const [jobsRes, projectsRes] = await Promise.all([
      supabase.from("jobs").select("*, projects(*, clients(*))").order("created_at", { ascending: false }),
      supabase.from("projects").select("*, clients(*)").order("name"),
    ])
    let data = (jobsRes.data || []) as JobWithRelations[]
    if (search) data = data.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter && statusFilter !== "all") data = data.filter((j) => j.status === statusFilter)
    setJobs(data)
    setProjects((projectsRes.data || []) as (Project & { clients: Client })[])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!formData.title.trim() || !formData.project_id) {
      setError("Title and Project are required")
      setSubmitting(false)
      return
    }

    const payload = {
      ...formData,
      compensation_min: formData.compensation_min ? Number(formData.compensation_min) : null,
      compensation_max: formData.compensation_max ? Number(formData.compensation_max) : null,
    }
    
    const { data, error } = await supabase.from("jobs").insert([payload]).select().single()
    
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await supabase.from("activities").insert({
      object_type: "job",
      object_id: data.id,
      type: "job_created",
      payload: { title: data.title }
    })

    setFormData({ title: "", project_id: "", level: "", location: "", compensation_min: "", compensation_max: "", urgency: "", status: "open" })
    setDialogOpen(false)
    setSubmitting(false)
    router.push(`/jobs/${data.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Job</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Job</DialogTitle></DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select required value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.clients?.name} - {p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Level</Label><Input value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Comp Min</Label><Input type="number" value={formData.compensation_min} onChange={(e) => setFormData({ ...formData, compensation_min: e.target.value })} /></div>
                <div className="space-y-2"><Label>Comp Max</Label><Input type="number" value={formData.compensation_max} onChange={(e) => setFormData({ ...formData, compensation_max: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Urgency</Label><Input value={formData.urgency} onChange={(e) => setFormData({ ...formData, urgency: e.target.value })} placeholder="e.g. high, medium, low" /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{JOB_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Job"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {JOB_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : jobs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell><Link href={`/jobs/${job.id}`} className="font-medium hover:underline">{job.title}</Link></TableCell>
                  <TableCell>{job.projects?.clients?.name || "-"}</TableCell>
                  <TableCell>{job.projects?.name || "-"}</TableCell>
                  <TableCell>{job.location || "-"}</TableCell>
                  <TableCell><Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge></TableCell>
                  <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <JobsContent />
    </Suspense>
  )
}