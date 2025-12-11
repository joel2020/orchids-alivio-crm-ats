"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Client, ClientContact, Project, Activity, CONTACT_ROLE_TYPES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Badge } from "@/components/ui/badge"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [editMode, setEditMode] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editClient, setEditClient] = useState<Partial<Client>>({})
  const [contactForm, setContactForm] = useState({ name: "", email: "", title: "", role_type: "" })

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    const [clientRes, contactsRes, projectsRes, activitiesRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("client_contacts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("object_type", "client").eq("object_id", id).order("created_at", { ascending: false }),
    ])
    if (clientRes.data) {
      setClient(clientRes.data)
      setEditClient(clientRes.data)
    }
    setContacts(contactsRes.data || [])
    setProjects(projectsRes.data || [])
    setActivities(activitiesRes.data || [])
  }

  async function handleUpdateClient(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("clients").update(editClient).eq("id", id)
    setEditMode(false)
    fetchData()
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from("client_contacts").insert([{ ...contactForm, client_id: id }])
    setContactForm({ name: "", email: "", title: "", role_type: "" })
    setContactDialogOpen(false)
    fetchData()
  }

  if (!client) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">{client.industry} • {client.size_band}</p>
        </div>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}>
          <Pencil className="mr-2 h-4 w-4" />
          {editMode ? "Cancel" : "Edit"}
        </Button>
      </div>

      {editMode && (
        <form onSubmit={handleUpdateClient} className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editClient.name || ""} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={editClient.website || ""} onChange={(e) => setEditClient({ ...editClient, website: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Size Band</Label>
              <Input value={editClient.size_band || ""} onChange={(e) => setEditClient({ ...editClient, size_band: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={editClient.industry || ""} onChange={(e) => setEditClient({ ...editClient, industry: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Billing Email</Label>
              <Input value={editClient.billing_email || ""} onChange={(e) => setEditClient({ ...editClient, billing_email: e.target.value })} />
            </div>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      )}

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddContact} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input required type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role Type</Label>
                    <Select value={contactForm.role_type} onValueChange={(v) => setContactForm({ ...contactForm, role_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_ROLE_TYPES.map((r) => (
                          <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Add Contact</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No contacts</TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.title || "-"}</TableCell>
                      <TableCell>
                        {contact.role_type && <Badge variant="secondary">{contact.role_type.replace("_", " ")}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/projects?client_id=${id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </Link>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No projects</TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link>
                      </TableCell>
                      <TableCell>{project.model || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                      </TableCell>
                      <TableCell>{project.start_date || "-"}</TableCell>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No activity</TableCell>
                  </TableRow>
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
