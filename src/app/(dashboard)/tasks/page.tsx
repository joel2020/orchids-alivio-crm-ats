"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Task, TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority } from "@/lib/types"
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
    due_date: "",
    priority: "medium" as TaskPriority,
  })

  useEffect(() => { fetchTasks() }, [search, statusFilter])

  async function fetchTasks() {
    let query = supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false })
    if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter)
    const { data } = await query
    let filtered = (data || []) as Task[]
    if (search) filtered = filtered.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    setTasks(filtered)
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

    const { error } = await supabase.from("tasks").insert([{
      title: formData.title,
      description: formData.description || null,
      entity_type: formData.entity_type,
      entity_id: formData.entity_id || crypto.randomUUID(),
      due_date: formData.due_date || null,
      priority: formData.priority,
      status: "open",
    }])

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setFormData({ title: "", description: "", entity_type: "general", entity_id: "", due_date: "", priority: "medium" })
    setDialogOpen(false)
    setSubmitting(false)
    fetchTasks()
  }

  async function toggleComplete(task: Task) {
    const newStatus: TaskStatus = task.status === "done" ? "open" : "done"
    await supabase.from("tasks").update({ 
      status: newStatus, 
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString() 
    }).eq("id", task.id)
    fetchTasks()
  }

  async function updateStatus(id: string, status: TaskStatus) {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
    fetchTasks()
  }

  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done")
  const todayTasks = tasks.filter(t => {
    if (!t.due_date || t.status === "done") return false
    const today = new Date().toDateString()
    return new Date(t.due_date).toDateString() === today
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
          <DialogContent>
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
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating..." : "Create Task"}</Button>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : tasks.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
            ) : (
              tasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done"
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
