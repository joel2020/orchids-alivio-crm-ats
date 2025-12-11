"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Job, Project, Client, Application, Candidate, Activity, JOB_STATUSES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type JobWithRelations = Job & { projects: Project & { clients: Client } }
type ApplicationWithCandidate = Application & { candidates: Candidate }

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [job, setJob] = useState<JobWithRelations | null>(null)
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editJob, setEditJob] = useState<Partial<Job>>({})

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [jobRes, appsRes, activitiesRes] = await Promise.all([
      supabase.from("jobs").select("*, projects(*, clients(*))").eq("id", id).single(),
      supabase.from("applications").select("*, candidates(*)").eq("job_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("object_type", "job").eq("object_id", id).order("created_at", { ascending: false }),
    ])
    if (jobRes.data) {
      setJob(jobRes.data as JobWithRelations)
      setEditJob(jobRes.data)
    }
    setApplications((appsRes.data || []) as ApplicationWithCandidate[])
    setActivities(activitiesRes.data || [])
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...editJob,
      compensation_min: editJob.compensation_min ? Number(editJob.compensation_min) : null,
      compensation_max: editJob.compensation_max ? Number(editJob.compensation_max) : null,
    }
    await supabase.from("jobs").update(payload).eq("id", id)
    setEditMode(false)
    fetchData()
  }

  if (!job) return <div className="p-6">Loading...</div>

  const compRange = job.compensation_min || job.compensation_max
    ? `$${job.compensation_min?.toLocaleString() || "?"} - $${job.compensation_max?.toLocaleString() || "?"}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground">{job.projects?.clients?.name} • {job.projects?.name} • {job.location}</p>
        </div>
        <Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}><Pencil className="mr-2 h-4 w-4" />{editMode ? "Cancel" : "Edit"}</Button>
      </div>

      {compRange && <div className="text-sm text-muted-foreground">Compensation: {compRange}</div>}

      {editMode && (
        <form onSubmit={handleUpdate} className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editJob.title || ""} onChange={(e) => setEditJob({ ...editJob, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Level</Label><Input value={editJob.level || ""} onChange={(e) => setEditJob({ ...editJob, level: e.target.value })} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={editJob.location || ""} onChange={(e) => setEditJob({ ...editJob, location: e.target.value })} /></div>
            <div className="space-y-2"><Label>Urgency</Label><Input value={editJob.urgency || ""} onChange={(e) => setEditJob({ ...editJob, urgency: e.target.value })} /></div>
            <div className="space-y-2"><Label>Comp Min</Label><Input type="number" value={editJob.compensation_min || ""} onChange={(e) => setEditJob({ ...editJob, compensation_min: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="space-y-2"><Label>Comp Max</Label><Input type="number" value={editJob.compensation_max || ""} onChange={(e) => setEditJob({ ...editJob, compensation_max: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editJob.status || ""} onValueChange={(v) => setEditJob({ ...editJob, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      )}

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Candidate</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Applied</TableHead></TableRow></TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No applications</TableCell></TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell><Link href={`/applications/${app.id}`} className="font-medium hover:underline">{app.candidates?.full_name}</Link></TableCell>
                      <TableCell>{app.candidates?.email || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                      <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No activity</TableCell></TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{new Date(activity.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{activity.type}</Badge></TableCell>
                      <TableCell className="max-w-md truncate">{JSON.stringify(activity.payload)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
