"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Plus, Upload, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Candidate, Application, Job, Project, Client, Activity, ResumeFile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResumeUploadModal } from "@/components/resume-upload-modal"

type ApplicationWithJob = Application & { jobs: Job & { projects: Project & { clients: Client } } }
type JobOption = Job & { projects: Project & { clients: Client } }

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [resumes, setResumes] = useState<ResumeFile[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editCandidate, setEditCandidate] = useState<Partial<Candidate>>({})
  const [appDialogOpen, setAppDialogOpen] = useState(false)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState("")

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [candRes, appsRes, activitiesRes, jobsRes, resumesRes] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", id).single(),
      supabase.from("applications").select("*, jobs(*, projects(*, clients(*)))").eq("candidate_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("object_type", "candidate").eq("object_id", id).order("created_at", { ascending: false }),
      supabase.from("jobs").select("*, projects(*, clients(*))").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("resume_files").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
    ])
    if (candRes.data) {
      setCandidate(candRes.data)
      setEditCandidate(candRes.data)
    }
    setApplications((appsRes.data || []) as ApplicationWithJob[])
    setActivities(activitiesRes.data || [])
    setJobs((jobsRes.data || []) as JobOption[])
    setResumes((resumesRes.data || []) as ResumeFile[])
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("candidates").update(editCandidate).eq("id", id)
    setEditMode(false)
    fetchData()
  }

  async function handleAddApplication(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("applications").insert([{ candidate_id: id, job_id: selectedJobId, status: "new", stage: "sourced" }])
    setSelectedJobId("")
    setAppDialogOpen(false)
    fetchData()
  }

  function handleResumeUploadComplete() {
    setResumeModalOpen(false)
    fetchData()
  }

  if (!candidate) return <div className="p-6">Loading...</div>

  const latestResume = resumes[0]

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Resume</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setResumeModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />{latestResume ? "Replace" : "Upload"}
          </Button>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No resume uploaded</p>
              <Button variant="link" onClick={() => setResumeModalOpen(true)}>Upload resume</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map((resume) => (
                <div key={resume.id} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{resume.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(resume.file_size / 1024).toFixed(1)} KB • Uploaded {new Date(resume.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      <ResumeUploadModal
        open={resumeModalOpen}
        onOpenChange={setResumeModalOpen}
        onComplete={handleResumeUploadComplete}
      />
    </div>
  )
}