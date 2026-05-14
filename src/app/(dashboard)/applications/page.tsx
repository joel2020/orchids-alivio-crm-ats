"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, List, LayoutGrid } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Application, Candidate, Job, Project, Client, APPLICATION_STAGES, ApplicationStage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BulkLeadUpload } from "@/components/crm/bulk-lead-upload"

type ApplicationWithRelations = Application & {
  candidates: Candidate
  jobs: Job & { projects: Project & { clients: Client } }
}

const stageColors: Record<string, string> = {
  sourced: "bg-slate-100 text-slate-800",
  contacted: "bg-blue-100 text-blue-800",
  replied: "bg-cyan-100 text-cyan-800",
  qualified: "bg-indigo-100 text-indigo-800",
  submitted: "bg-purple-100 text-purple-800",
  client_interview: "bg-amber-100 text-amber-800",
  final_interview: "bg-orange-100 text-orange-800",
  offer: "bg-green-100 text-green-800",
  placed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  nurture: "bg-pink-100 text-pink-800",
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("")
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => { fetchApplications() }, [search, stageFilter])

  async function fetchApplications() {
    const { data } = await supabase
      .from("applications")
      .select("*, candidates(*), jobs(*, projects(*, clients(*)))")
      .order("position", { ascending: true })
    let filtered = (data || []) as ApplicationWithRelations[]
    if (search) filtered = filtered.filter((a) => 
      a.candidates?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.jobs?.title?.toLowerCase().includes(search.toLowerCase())
    )
    if (stageFilter && stageFilter !== "all") filtered = filtered.filter((a) => a.stage === stageFilter)
    setApplications(filtered)
    setLoading(false)
  }

  async function updateStage(id: string, newStage: ApplicationStage, newPosition: number) {
    await supabase.from("applications").update({ 
      stage: newStage, 
      position: newPosition,
      updated_at: new Date().toISOString() 
    }).eq("id", id)

    await supabase.from("activities").insert({
      object_type: "application",
      object_id: id,
      type: "stage_changed",
      payload: { new_stage: newStage }
    })

    fetchApplications()
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.setData("text/plain", id)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent, stage: ApplicationStage) {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (id && dragging) {
      const appsInStage = applications.filter(a => a.stage === stage)
      const newPosition = appsInStage.length
      updateStage(id, stage, newPosition)
    }
    setDragging(null)
  }

  const groupedByStage = APPLICATION_STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((a) => a.stage === stage).sort((a, b) => a.position - b.position)
    return acc
  }, {} as Record<string, ApplicationWithRelations[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <div className="flex gap-2">
          <BulkLeadUpload onImported={fetchApplications} />
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search applications..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {view === "list" && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {APPLICATION_STAGES.map((s) => (<SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {APPLICATION_STAGES.map((stage) => (
            <div
              key={stage}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <Card className="h-full">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="capitalize">{stage.replace(/_/g, " ")}</span>
                    <Badge variant="secondary">{groupedByStage[stage]?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-2 px-2">
                      {groupedByStage[stage]?.map((app) => (
                        <Link key={app.id} href={`/applications/${app.id}`}>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, app.id)}
                            className="p-3 bg-background rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                          >
                            <div className="font-medium text-sm">{app.candidates?.full_name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{app.jobs?.title}</div>
                            <div className="text-xs text-muted-foreground">{app.jobs?.projects?.clients?.name}</div>
                            <div className="text-xs text-muted-foreground mt-2">{new Date(app.created_at).toLocaleDateString()}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No applications found</TableCell></TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell><Link href={`/applications/${app.id}`} className="font-medium hover:underline">{app.candidates?.full_name}</Link></TableCell>
                    <TableCell>{app.jobs?.title || "-"}</TableCell>
                    <TableCell>{app.jobs?.projects?.clients?.name || "-"}</TableCell>
                    <TableCell><Badge className={stageColors[app.stage || "sourced"]}>{app.stage?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(app.updated_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
