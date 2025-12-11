"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Opportunity, Client, Activity, Task, Note, OPPORTUNITY_STAGES, OpportunityStage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type OpportunityWithRelations = Opportunity & { clients: Client | null }

const stageColors: Record<string, string> = {
  lead: "bg-slate-100 text-slate-800",
  qualified: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
}

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [opportunity, setOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newNote, setNewNote] = useState("")

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [oppRes, actRes, taskRes, noteRes] = await Promise.all([
      supabase.from("opportunities").select("*, clients(*)").eq("id", id).single(),
      supabase.from("activities").select("*").eq("object_type", "opportunity").eq("object_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("entity_type", "opportunity").eq("entity_id", id).order("due_date"),
      supabase.from("notes").select("*").eq("entity_type", "opportunity").eq("entity_id", id).order("created_at", { ascending: false }),
    ])
    setOpportunity(oppRes.data as OpportunityWithRelations)
    setActivities(actRes.data || [])
    setTasks(taskRes.data || [])
    setNotes(noteRes.data || [])
    setLoading(false)
  }

  async function handleStageChange(stage: OpportunityStage) {
    if (!opportunity) return
    await supabase.from("opportunities").update({ stage, updated_at: new Date().toISOString() }).eq("id", id)
    await supabase.from("activities").insert({
      object_type: "opportunity",
      object_id: id,
      type: "stage_changed",
      payload: { old_stage: opportunity.stage, new_stage: stage }
    })
    fetchData()
  }

  async function handleAddNote() {
    if (!newNote.trim()) return
    await supabase.from("notes").insert({ entity_type: "opportunity", entity_id: id, content: newNote })
    await supabase.from("activities").insert({ object_type: "opportunity", object_id: id, type: "note_added", payload: {} })
    setNewNote("")
    fetchData()
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!opportunity) return <div className="p-6">Opportunity not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/opportunities"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{opportunity.name}</h1>
          <p className="text-sm text-muted-foreground">{opportunity.clients?.name || "No client"}</p>
        </div>
        <Badge className={stageColors[opportunity.stage]}>{opportunity.stage}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Value</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">${(opportunity.value || 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Probability</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">{opportunity.probability}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Expected Close</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">{opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString() : "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Stage</CardTitle></CardHeader>
          <CardContent className="py-0">
            <Select value={opportunity.stage} onValueChange={handleStageChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OPPORTUNITY_STAGES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notes">
        <TabsList><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="tasks">Tasks</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
        
        <TabsContent value="notes" className="space-y-4">
          <div className="flex gap-2">
            <Textarea placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="flex-1" />
            <Button onClick={handleAddNote}>Add Note</Button>
          </div>
          <div className="space-y-2">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="py-3">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(note.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
            {notes.length === 0 && <p className="text-center text-muted-foreground py-4">No notes yet</p>}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                  </div>
                  <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>{task.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && <p className="text-center text-muted-foreground py-4">No tasks yet</p>}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="space-y-2">
            {activities.map((act) => (
              <Card key={act.id}>
                <CardContent className="py-3">
                  <p className="text-sm font-medium">{act.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(act.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
            {activities.length === 0 && <p className="text-center text-muted-foreground py-4">No activity yet</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
