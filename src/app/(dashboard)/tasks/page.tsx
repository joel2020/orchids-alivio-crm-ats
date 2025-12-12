"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Task, TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority, Client, ClientContact, Candidate, Job } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { emitTaskCreated, emitTaskCompleted } from "@/lib/events"

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-red-100 text-red-800",
}

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    entity_type: "general",
    entity_id: "",
    client_id: "",
    candidate_id: "",
    job_id: "",
    due_date: "",
    priority: "medium" as TaskPriority,
  })

  useEffect(() => { fetchData() }, [search, statusFilter])

  async function fetchData() {
    const [tasksRes, clientsRes, candidatesRes, jobsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("candidates").select("id, full_name").order("full_name"),
      supabase.from("jobs").select("id, title").order("title"),
    ])
    
    let filtered = (tasksRes.data || []) as Task[]
    if (statusFilter && statusFilter !== "all") filtered = filtered.filter(t => t.status === statusFilter)
    if (search) filtered = filtered.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    
    setTasks(filtered)
    setClients(clientsRes.data || [])
    setCandidates(candidatesRes.data || [])
    setJobs(jobsRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!formData.title.trim()) {
      setError("Title is required")
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase.from("tasks").insert([{
      title: formData.title,
      description: formData.description || null,
      entity_type: formData.entity_type,
      entity_id: formData.entity_id || crypto.randomUUID(),
      client_id: formData.client_id || null,
      candidate_id: formData.candidate_id || null,
      job_id: formData.job_id || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      status: "open",
    }]).select().single()

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await emitTaskCreated(data)

    setFormData({ title: "", description: "", entity_type: "general", entity_id: "", client_id: "", candidate_id: "", job_id: "", due_date: "", priority: "medium" })
    setDialogOpen(false)
    setSubmitting(false)
    fetchData()
  }

  async function toggleComplete(task: Task) {
    const newStatus: TaskStatus = task.status === "done" ? "open" : "done"
    await supabase.from("tasks").update({ 
      status: newStatus, 
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString() 
    }).eq("id", task.id)
    
    if (newStatus === "done") {
      await emitTaskCompleted({ ...task, status: newStatus })
    }
    
    fetchData()
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const task = tasks.find(t => t.id === id)
    await supabase.from("tasks").update({ 
      status, 
      completed_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString() 
    }).eq("id", id)
    
    if (status === "done" && task) {
      await emitTaskCompleted({ ...task, status })
    }
    
    fetchData()
  }

  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done")
  const todayTasks = tasks.filter(t => {
    if (!t.due_date || t.status === "done") return false
    const today = new Date().toDateString()
    return new Date(t.due_date).toDateString() === today
  })
  const upcomingTasks = tasks.filter(t => {
    if (!t.due_date || t.status === "done") return false
    const taskDate = new Date(t.due_date)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return taskDate > today && taskDate <= nextWeek
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {overdueTasks.length > 0 && <span className="text-red-600">{overdueTasks.length} overdue</span>}
            {overdueTasks.length > 0 && todayTasks.length > 0 && " · "}
            {todayTasks.length > 0 && <span>{todayTasks.length} due today</span>}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Task</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Due Date</Label><Input type="datetime-local" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Client</Label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Candidate</Label>
                  <Select value={formData.candidate_id} onValueChange={(v) => setFormData({ ...formData, candidate_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {candidates.map((c) => (<SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Link to Job</Label>
                  <Select value={formData.job_id} onValueChange={(v) => setFormData({ ...formData, job_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {jobs.map((j) => (<SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating..." : "Create Task"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Overdue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{overdueTasks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-600">Due Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{todayTasks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">Next 7 Days</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{upcomingTasks.length}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TASK_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : tasks.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
            ) : (
              tasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done"
                const linkedClient = clients.find(c => c.id === task.client_id)
                const linkedCandidate = candidates.find(c => c.id === task.candidate_id)
                const linkedJob = jobs.find(j => j.id === task.job_id)
                
                return (
                  <TableRow key={task.id} className={task.status === "done" ? "opacity-60" : ""}>
                    <TableCell>
                      <Checkbox checked={task.status === "done"} onCheckedChange={() => toggleComplete(task)} />
                    </TableCell>
                    <TableCell>
                      <div className={task.status === "done" ? "line-through" : ""}>
                        <p className="font-medium">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={priorityColors[task.priority]}>{task.priority}</Badge></TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v as TaskStatus)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{TASK_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {linkedClient && <Link href={`/clients/${linkedClient.id}`}><Badge variant="outline" className="text-xs">{linkedClient.name}</Badge></Link>}
                        {linkedCandidate && <Link href={`/candidates/${linkedCandidate.id}`}><Badge variant="outline" className="text-xs">{linkedCandidate.full_name}</Badge></Link>}
                        {linkedJob && <Link href={`/jobs/${linkedJob.id}`}><Badge variant="outline" className="text-xs">{linkedJob.title}</Badge></Link>}
                        {!linkedClient && !linkedCandidate && !linkedJob && "-"}
                      </div>
                    </TableCell>
                    <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                      {task.due_date ? new Date(task.due_date).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}