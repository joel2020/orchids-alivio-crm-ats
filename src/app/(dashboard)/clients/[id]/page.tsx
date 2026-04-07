"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Pencil, Mail, Phone, Activity as ActivityIcon, Target, Briefcase, UserCircle, Settings, MessageSquare } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Client, ClientContact, Project, Job, Opportunity, Activity, CONTACT_SENIORITIES, ContactSeniority, CLIENT_STATUSES, CLIENT_TIERS, ClientStatus, ClientTier, OPPORTUNITY_STAGES, OpportunityStage, OpportunitySource, OPPORTUNITY_SOURCES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

type JobWithProject = Job & { projects: Project }
type OpportunityWithContact = Opportunity & { primary_contact?: ClientContact }

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

const stageColors: Record<string, string> = {
  lead: "bg-slate-100 text-slate-800",
  qualification: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  verbal: "bg-yellow-100 text-yellow-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
}

const activityTypeIcons: Record<string, string> = {
  call: "phone",
  email: "mail",
  meeting: "calendar",
  note: "note",
  system_event: "activity",
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [jobs, setJobs] = useState<JobWithProject[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityWithContact[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [editMode, setEditMode] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [oppDialogOpen, setOppDialogOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [editClient, setEditClient] = useState<Partial<Client>>({})
  const [activityFilter, setActivityFilter] = useState<string>("all")

  const [contactForm, setContactForm] = useState({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    title: "",
    department: "",
    seniority: "" as ContactSeniority | "",
    is_decision_maker: false,
    linkedin_url: "",
    notes: "",
    is_primary_contact: false,
  })

  const [oppForm, setOppForm] = useState({
    name: "",
    stage: "lead" as OpportunityStage,
    value: "",
    probability: "20",
    expected_close_date: "",
    source: "" as OpportunitySource | "",
    primary_contact_id: "",
  })

  const [activityForm, setActivityForm] = useState({
    type: "note" as string,
    subject: "",
    body: "",
    direction: "" as string,
  })

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [clientRes, contactsRes, projectsRes, oppsRes, activitiesRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("client_contacts").select("*").eq("client_id", id).order("is_primary_contact", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("*, primary_contact:client_contacts(*)").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").or(`client_id.eq.${id},and(object_type.eq.client,object_id.eq.${id})`).order("timestamp", { ascending: false }).limit(100),
    ])
    
    if (clientRes.data) {
      setClient(clientRes.data)
      setEditClient(clientRes.data)
    }
    setContacts((contactsRes.data || []) as ClientContact[])
    setProjects(projectsRes.data || [])
    setOpportunities((oppsRes.data || []) as OpportunityWithContact[])
    setActivities((activitiesRes.data || []) as Activity[])

    const projectIds = (projectsRes.data || []).map(p => p.id)
    if (projectIds.length > 0) {
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*, projects(*)")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
      setJobs((jobsData || []) as JobWithProject[])
    }
  }

  async function handleUpdateClient(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editClient),
    })
    setEditMode(false)
    fetchData()
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    const fullName = contactForm.first_name && contactForm.last_name 
      ? `${contactForm.first_name} ${contactForm.last_name}` 
      : contactForm.name

    await fetch(`/api/clients/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      name: fullName,
      full_name: fullName,
      first_name: contactForm.first_name,
      last_name: contactForm.last_name,
      email: contactForm.email,
      phone: contactForm.phone,
      title: contactForm.title,
      department: contactForm.department,
      seniority: contactForm.seniority || null,
      is_decision_maker: contactForm.is_decision_maker,
      linkedin_url: contactForm.linkedin_url,
      notes: contactForm.notes,
      is_primary_contact: contactForm.is_primary_contact,
      }),
    })

    setContactForm({ name: "", first_name: "", last_name: "", email: "", phone: "", title: "", department: "", seniority: "", is_decision_maker: false, linkedin_url: "", notes: "", is_primary_contact: false })
    setContactDialogOpen(false)
    fetchData()
  }

  async function handleAddOpportunity(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/clients/${id}/opportunities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      name: oppForm.name,
      stage: oppForm.stage,
      value: oppForm.value ? Number(oppForm.value) : null,
      probability: Number(oppForm.probability),
      expected_close_date: oppForm.expected_close_date || null,
      source: oppForm.source || null,
      primary_contact_id: oppForm.primary_contact_id || null,
      }),
    })

    setOppForm({ name: "", stage: "lead", value: "", probability: "20", expected_close_date: "", source: "", primary_contact_id: "" })
    setOppDialogOpen(false)
    fetchData()
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/clients/${id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      type: activityForm.type,
      subject: activityForm.subject,
      body: activityForm.body,
      direction: activityForm.direction || null,
      source: "manual",
      timestamp: new Date().toISOString(),
      }),
    })
    setActivityForm({ type: "note", subject: "", body: "", direction: "" })
    setActivityDialogOpen(false)
    fetchData()
  }

  const filteredActivities = activityFilter === "all" 
    ? activities 
    : activities.filter(a => a.type === activityFilter)

  const pipelineValue = opportunities
    .filter(o => o.stage !== "won" && o.stage !== "lost")
    .reduce((sum, o) => sum + ((o.value || 0) * (o.probability / 100)), 0)

  const openJobsCount = jobs.filter(j => j.status === "open").length

  if (!client) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <Badge className={statusColors[client.status]}>{client.status}</Badge>
            <Badge className={tierColors[client.tier]}>Tier {client.tier}</Badge>
          </div>
          <p className="text-muted-foreground">{client.industry} • {client.size_band} employees • {client.region}</p>
        </div>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}>
          <Pencil className="mr-2 h-4 w-4" />{editMode ? "Cancel" : "Edit"}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${pipelineValue.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open Jobs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{openJobsCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{contacts.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Opportunities</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{opportunities.filter(o => o.stage !== "won" && o.stage !== "lost").length}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><UserCircle className="mr-2 h-4 w-4" />Add Contact</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2"><Label>First Name</Label><Input value={contactForm.first_name} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={contactForm.last_name} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })} /></div>
                <div className="space-y-2 col-span-2"><Label>Email *</Label><Input required type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Title</Label><Input value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Department</Label><Input value={contactForm.department} onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Seniority</Label>
                  <Select value={contactForm.seniority} onValueChange={(v) => setContactForm({ ...contactForm, seniority: v as ContactSeniority })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_SENIORITIES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", "-").toUpperCase()}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2"><Label>LinkedIn URL</Label><Input value={contactForm.linkedin_url} onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })} /></div>
                <div className="space-y-2 col-span-2"><Label>Notes</Label><Textarea value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} /></div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="decision" checked={contactForm.is_decision_maker} onCheckedChange={(c) => setContactForm({ ...contactForm, is_decision_maker: !!c })} />
                  <label htmlFor="decision" className="text-sm">Decision Maker</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="primary" checked={contactForm.is_primary_contact} onCheckedChange={(c) => setContactForm({ ...contactForm, is_primary_contact: !!c })} />
                  <label htmlFor="primary" className="text-sm">Primary Contact</label>
                </div>
              </div>
              <Button type="submit" className="w-full">Add Contact</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={oppDialogOpen} onOpenChange={setOppDialogOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Target className="mr-2 h-4 w-4" />Add Opportunity</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Opportunity</DialogTitle></DialogHeader>
            <form onSubmit={handleAddOpportunity} className="space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input required value={oppForm.name} onChange={(e) => setOppForm({ ...oppForm, name: e.target.value })} /></div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2"><Label>Value ($)</Label><Input type="number" value={oppForm.value} onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })} /></div>
                <div className="space-y-2"><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={oppForm.probability} onChange={(e) => setOppForm({ ...oppForm, probability: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={oppForm.stage} onValueChange={(v) => setOppForm({ ...oppForm, stage: v as OpportunityStage })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OPPORTUNITY_STAGES.map((s) => (<SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={oppForm.source} onValueChange={(v) => setOppForm({ ...oppForm, source: v as OpportunitySource })}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{OPPORTUNITY_SOURCES.map((s) => (<SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Expected Close</Label><Input type="date" value={oppForm.expected_close_date} onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Primary Contact</Label>
                  <Select value={oppForm.primary_contact_id} onValueChange={(v) => setOppForm({ ...oppForm, primary_contact_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                    <SelectContent>{contacts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Create Opportunity</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Link href={`/projects?client_id=${id}`}><Button size="sm" variant="outline"><Briefcase className="mr-2 h-4 w-4" />Add Job</Button></Link>

        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><MessageSquare className="mr-2 h-4 w-4" />Log Activity</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
            <form onSubmit={handleLogActivity} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={activityForm.type} onValueChange={(v) => setActivityForm({ ...activityForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={activityForm.direction} onValueChange={(v) => setActivityForm({ ...activityForm, direction: v })}>
                    <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Subject</Label><Input value={activityForm.subject} onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={activityForm.body} onChange={(e) => setActivityForm({ ...activityForm, body: e.target.value })} /></div>
              <Button type="submit" className="w-full">Log Activity</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {editMode && (
        <form onSubmit={handleUpdateClient} className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Name</Label><Input value={editClient.name || ""} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={editClient.website || ""} onChange={(e) => setEditClient({ ...editClient, website: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editClient.status} onValueChange={(v) => setEditClient({ ...editClient, status: v as ClientStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLIENT_STATUSES.map((s) => (<SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={editClient.tier} onValueChange={(v) => setEditClient({ ...editClient, tier: v as ClientTier })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLIENT_TIERS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Size Band</Label><Input value={editClient.size_band || ""} onChange={(e) => setEditClient({ ...editClient, size_band: e.target.value })} /></div>
            <div className="space-y-2"><Label>Industry</Label><Input value={editClient.industry || ""} onChange={(e) => setEditClient({ ...editClient, industry: e.target.value })} /></div>
            <div className="space-y-2"><Label>Region</Label><Input value={editClient.region || ""} onChange={(e) => setEditClient({ ...editClient, region: e.target.value })} /></div>
            <div className="space-y-2"><Label>Billing Email</Label><Input value={editClient.billing_email || ""} onChange={(e) => setEditClient({ ...editClient, billing_email: e.target.value })} /></div>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      )}

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts"><UserCircle className="mr-2 h-4 w-4" />Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="opportunities"><Target className="mr-2 h-4 w-4" />Opportunities ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="jobs"><Briefcase className="mr-2 h-4 w-4" />Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="activity"><ActivityIcon className="mr-2 h-4 w-4" />Activity</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Seniority</TableHead>
                  <TableHead>Decision Maker</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No contacts</TableCell></TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contact.name}</span>
                          {contact.is_primary_contact && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{contact.title || "-"}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.seniority ? <Badge variant="outline">{contact.seniority.replace("_", "-").toUpperCase()}</Badge> : "-"}</TableCell>
                      <TableCell>{contact.is_decision_maker ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" asChild><a href={`mailto:${contact.email}`}><Mail className="h-4 w-4" /></a></Button>
                          {contact.phone && <Button variant="ghost" size="icon" asChild><a href={`tel:${contact.phone}`}><Phone className="h-4 w-4" /></a></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No opportunities</TableCell></TableRow>
                ) : (
                  opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell><Link href={`/opportunities/${opp.id}`} className="font-medium hover:underline">{opp.name}</Link></TableCell>
                      <TableCell><Badge className={stageColors[opp.stage]}>{opp.stage}</Badge></TableCell>
                      <TableCell>{opp.value ? `$${opp.value.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>{opp.probability}%</TableCell>
                      <TableCell>{opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{opp.primary_contact?.name || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No jobs</TableCell></TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell><Link href={`/jobs/${job.id}`} className="font-medium hover:underline">{job.title}</Link></TableCell>
                      <TableCell><Link href={`/projects/${job.project_id}`} className="hover:underline">{job.projects?.name}</Link></TableCell>
                      <TableCell><Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge></TableCell>
                      <TableCell>{job.location || "-"}</TableCell>
                      <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="flex gap-2">
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="system_event">System Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No activity</div>
              ) : (
                filteredActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 p-4 rounded-lg border">
                    <div className="flex-shrink-0">
                      <Badge variant="outline">{activity.type}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.subject && <div className="font-medium">{activity.subject}</div>}
                      {activity.body && <div className="text-sm text-muted-foreground mt-1">{activity.body}</div>}
                      {activity.payload && !activity.body && (
                        <div className="text-sm text-muted-foreground mt-1">{JSON.stringify(activity.payload)}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.timestamp || activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Client Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div><Label className="text-muted-foreground">Website</Label><p>{client.website || "-"}</p></div>
                <div><Label className="text-muted-foreground">Billing Email</Label><p>{client.billing_email || "-"}</p></div>
                <div><Label className="text-muted-foreground">Created</Label><p>{new Date(client.created_at).toLocaleDateString()}</p></div>
                <div><Label className="text-muted-foreground">Last Updated</Label><p>{client.updated_at ? new Date(client.updated_at).toLocaleDateString() : "-"}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
