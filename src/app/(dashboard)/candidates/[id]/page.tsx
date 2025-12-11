"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Candidate, Application, Job, Project, Client, Activity } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type ApplicationWithJob = Application & { jobs: Job & { projects: Project & { clients: Client } } }
type JobOption = Job & { projects: Project & { clients: Client } }

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editCandidate, setEditCandidate] = useState<Partial<Candidate>>({})
  const [appDialogOpen, setAppDialogOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState("")

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [candRes, appsRes, activitiesRes, jobsRes] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", id).single(),
      supabase.from("applications").select("*, jobs(*, projects(*, clients(*)))").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("object_type", "candidate").eq("object_id", id).order("created_at", { ascending: false }),
      supabase.from("jobs").select("*, projects(*, clients(*))").eq("status", "open").order("created_at", { ascending: false }),
    ])
    if (candRes.data) {
      setCandidate(candRes.data)
      setEditCandidate(candRes.data)
    }
    setApplications((appsRes.data || []) as ApplicationWithJob[])
    setActivities(activitiesRes.data || [])
    setJobs((jobsRes.data || []) as JobOption[])
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("candidates").update(editCandidate).eq("id", id)
    setEditMode(false)
    fetchData()
  }

  async function handleAddApplication(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("applications").insert([{ candidate_id: id, job_id: selectedJobId, status: "new" }])
    setSelectedJobId("")
    setAppDialogOpen(false)
    fetchData()
  }

  if (!candidate) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/candidates"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{candidate.full_name}</h1>
          <p className="text-muted-foreground">{candidate.current_title} at {candidate.current_company} • {candidate.location}</p>
        </div>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}><Pencil className="mr-2 h-4 w-4" />{editMode ? "Cancel" : "Edit"}</Button>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        {candidate.email && <span>{candidate.email}</span>}
        {candidate.phone && <span>{candidate.phone}</span>}
        {candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" className="text-primary hover:underline">LinkedIn</a>}
      </div>

      {editMode && (
        <form onSubmit={handleUpdate} className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={editCandidate.full_name || ""} onChange={(e) => setEditCandidate({ ...editCandidate, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={editCandidate.email || ""} onChange={(e) => setEditCandidate({ ...editCandidate, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={editCandidate.phone || ""} onChange={(e) => setEditCandidate({ ...editCandidate, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>LinkedIn URL</Label><Input value={editCandidate.linkedin_url || ""} onChange={(e) => setEditCandidate({ ...editCandidate, linkedin_url: e.target.value })} /></div>
            <div className="space-y-2"><Label>Current Title</Label><Input value={editCandidate.current_title || ""} onChange={(e) => setEditCandidate({ ...editCandidate, current_title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Current Company</Label><Input value={editCandidate.current_company || ""} onChange={(e) => setEditCandidate({ ...editCandidate, current_company: e.target.value })} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={editCandidate.location || ""} onChange={(e) => setEditCandidate({ ...editCandidate, location: e.target.value })} /></div>
            <div className="space-y-2"><Label>Source</Label><Input value={editCandidate.source || ""} onChange={(e) => setEditCandidate({ ...editCandidate, source: e.target.value })} /></div>
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
          <div className="flex justify-end">
            <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Application</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Application</DialogTitle></DialogHeader>
                <form onSubmit={handleAddApplication} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Job *</Label>
                    <Select required value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger><SelectValue placeholder="Search and select job" /></SelectTrigger>
                      <SelectContent>
                        {jobs.map((j) => (<SelectItem key={j.id} value={j.id}>{j.projects?.clients?.name} - {j.title}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Application</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Applied</TableHead></TableRow></TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No applications</TableCell></TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell><Link href={`/applications/${app.id}`} className="font-medium hover:underline">{app.jobs?.title}</Link></TableCell>
                      <TableCell>{app.jobs?.projects?.clients?.name || "-"}</TableCell>
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
