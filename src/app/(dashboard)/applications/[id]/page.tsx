"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Application, Candidate, Job, Project, Client, Interview, Activity, SequenceInst, APPLICATION_STAGES, ApplicationStage, INTERVIEW_STAGES, INTERVIEW_STATUSES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type ApplicationWithRelations = Application & {
  candidates: Candidate
  jobs: Job & { projects: Project & { clients: Client } }
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [application, setApplication] = useState<ApplicationWithRelations | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [sequence, setSequence] = useState<SequenceInst | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [interviewForm, setInterviewForm] = useState({ stage: "", start_time: "", status: "scheduled" })

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [appRes, interviewsRes, seqRes, activitiesRes] = await Promise.all([
      supabase.from("applications").select("*, candidates(*), jobs(*, projects(*, clients(*)))").eq("id", id).single(),
      supabase.from("interviews").select("*").eq("application_id", id).order("start_time", { ascending: false }),
      supabase.from("sequences_inst").select("*").eq("application_id", id).single(),
      supabase.from("activities").select("*").eq("object_type", "application").eq("object_id", id).order("created_at", { ascending: false }),
    ])
    if (appRes.data) setApplication(appRes.data as ApplicationWithRelations)
    setInterviews(interviewsRes.data || [])
    setSequence(seqRes.data || null)
    setActivities(activitiesRes.data || [])
  }

  async function handleStatusChange(newStatus: string) {
    await supabase.from("applications").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id)
    fetchData()
  }

  async function handleAddInterview(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("interviews").insert([{ application_id: id, ...interviewForm }])
    setInterviewForm({ stage: "", start_time: "", status: "scheduled" })
    setInterviewDialogOpen(false)
    fetchData()
  }

  if (!application) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/applications"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Application</h1>
          <p className="text-muted-foreground">{application.candidates?.full_name} for {application.jobs?.title}</p>
        </div>
        <Select value={application.status || "applied"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {APPLICATION_STAGES.map((s: ApplicationStage) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Candidate</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> <Link href={`/candidates/${application.candidates?.id}`} className="font-medium hover:underline">{application.candidates?.full_name}</Link></div>
            <div><span className="text-muted-foreground">Email:</span> {application.candidates?.email || "-"}</div>
            <div><span className="text-muted-foreground">Phone:</span> {application.candidates?.phone || "-"}</div>
            <div><span className="text-muted-foreground">Current:</span> {application.candidates?.current_title} at {application.candidates?.current_company}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Job</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Title:</span> <Link href={`/jobs/${application.jobs?.id}`} className="font-medium hover:underline">{application.jobs?.title}</Link></div>
            <div><span className="text-muted-foreground">Client:</span> {application.jobs?.projects?.clients?.name}</div>
            <div><span className="text-muted-foreground">Project:</span> {application.jobs?.projects?.name}</div>
            <div><span className="text-muted-foreground">Location:</span> {application.jobs?.location || "-"}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="interviews">
        <TabsList>
          <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
          <TabsTrigger value="sequence">Sequence</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="interviews" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
              <DialogTrigger asChild><Button size="sm">Schedule Interview</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
                <form onSubmit={handleAddInterview} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Stage *</Label>
                    <Select required value={interviewForm.stage} onValueChange={(v) => setInterviewForm({ ...interviewForm, stage: v })}>
                      <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>{INTERVIEW_STAGES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Start Time</Label><Input type="datetime-local" value={interviewForm.start_time} onChange={(e) => setInterviewForm({ ...interviewForm, start_time: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={interviewForm.status} onValueChange={(v) => setInterviewForm({ ...interviewForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{INTERVIEW_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Interview</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Stage</TableHead><TableHead>Date/Time</TableHead><TableHead>Status</TableHead><TableHead>Cal Booking ID</TableHead></TableRow></TableHeader>
              <TableBody>
                {interviews.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No interviews scheduled</TableCell></TableRow>
                ) : (
                  interviews.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="capitalize">{i.stage?.replace("_", " ")}</TableCell>
                      <TableCell>{i.start_time ? new Date(i.start_time).toLocaleString() : "-"}</TableCell>
                      <TableCell><Badge variant={i.status === "completed" ? "default" : "outline"}>{i.status}</Badge></TableCell>
                      <TableCell>{i.cal_booking_id || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sequence" className="space-y-4">
          {sequence ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Instantly Sequence</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Campaign ID:</span> {sequence.instantly_campaign_id || "-"}</div>
                <div><span className="text-muted-foreground">Lead ID:</span> {sequence.instantly_lead_id || "-"}</div>
                <div><span className="text-muted-foreground">Stage:</span> <Badge variant="outline">{sequence.stage}</Badge></div>
                <div><span className="text-muted-foreground">Last Event:</span> {sequence.last_event_at ? new Date(sequence.last_event_at).toLocaleString() : "-"}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No sequence data</div>
          )}
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