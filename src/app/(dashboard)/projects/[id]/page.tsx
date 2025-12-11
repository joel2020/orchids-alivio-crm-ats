"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Project, Client, Job, Activity, PROJECT_MODELS, PROJECT_STATUSES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<(Project & { clients?: Client }) | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editProject, setEditProject] = useState<Partial<Project>>({})

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [projectRes, jobsRes, activitiesRes] = await Promise.all([
      supabase.from("projects").select("*, clients(*)").eq("id", id).single(),
      supabase.from("jobs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("object_type", "project").eq("object_id", id).order("created_at", { ascending: false }),
    ])
    if (projectRes.data) {
      setProject(projectRes.data as Project & { clients?: Client })
      setEditProject(projectRes.data)
    }
    setJobs(jobsRes.data || [])
    setActivities(activitiesRes.data || [])
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("projects").update(editProject).eq("id", id)
    setEditMode(false)
    fetchData()
  }

  if (!project) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.clients?.name} • {project.model}</p>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}><Pencil className="mr-2 h-4 w-4" />{editMode ? "Cancel" : "Edit"}</Button>
      </div>

      {editMode && (
        <form onSubmit={handleUpdate} className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={editProject.name || ""} onChange={(e) => setEditProject({ ...editProject, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={editProject.model || ""} onValueChange={(v) => setEditProject({ ...editProject, model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_MODELS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editProject.status || ""} onValueChange={(v) => setEditProject({ ...editProject, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={editProject.start_date || ""} onChange={(e) => setEditProject({ ...editProject, start_date: e.target.value })} /></div>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      )}

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/jobs?project_id=${id}`}><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Job</Button></Link>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Level</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No jobs</TableCell></TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell><Link href={`/jobs/${job.id}`} className="font-medium hover:underline">{job.title}</Link></TableCell>
                      <TableCell>{job.level || "-"}</TableCell>
                      <TableCell>{job.location || "-"}</TableCell>
                      <TableCell><Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge></TableCell>
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

        <TabsContent value="settings" className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-medium">Cal.com Integration</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cal.com Event Type ID</Label>
                <Input 
                  value={project.cal_event_type_id || ""} 
                  placeholder="e.g., interview-30min" 
                  onChange={async (e) => {
                    const val = e.target.value
                    await supabase.from("projects").update({ cal_event_type_id: val }).eq("id", id)
                    fetchData()
                  }} 
                />
                <p className="text-sm text-muted-foreground">Event type slug for scheduling</p>
              </div>
              <div className="space-y-2">
                <Label>Cal.com Org Slug</Label>
                <Input 
                  value={project.cal_org_slug || ""} 
                  placeholder="e.g., alivio" 
                  onChange={async (e) => {
                    const val = e.target.value
                    await supabase.from("projects").update({ cal_org_slug: val }).eq("id", id)
                    fetchData()
                  }} 
                />
                <p className="text-sm text-muted-foreground">Your Cal.com organization slug</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Cal.com Base URL</Label>
                <Input 
                  value={project.cal_base_url || ""} 
                  placeholder="e.g., https://cal.com" 
                  onChange={async (e) => {
                    const val = e.target.value
                    await supabase.from("projects").update({ cal_base_url: val }).eq("id", id)
                    fetchData()
                  }} 
                />
                <p className="text-sm text-muted-foreground">Custom Cal.com instance URL (leave empty for default cal.com)</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}