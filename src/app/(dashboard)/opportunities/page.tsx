"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, LayoutGrid, Table as TableIcon, TrendingUp, DollarSign, Percent, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Opportunity, Client, ClientContact, OPPORTUNITY_STAGES, OpportunityStage, OPPORTUNITY_SOURCES, OpportunitySource } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { emitOpportunityCreated, emitOpportunityStageChanged } from "@/lib/events"

type OpportunityWithRelations = Opportunity & { clients: Client | null; primary_contact: ClientContact | null }

const stageColors: Record<string, string> = {
  lead: "bg-slate-100 text-slate-800 border-slate-300",
  qualification: "bg-blue-100 text-blue-800 border-blue-300",
  proposal: "bg-purple-100 text-purple-800 border-purple-300",
  verbal: "bg-yellow-100 text-yellow-800 border-yellow-300",
  won: "bg-green-100 text-green-800 border-green-300",
  lost: "bg-red-100 text-red-800 border-red-300",
}

const stageProbabilities: Record<string, number> = {
  lead: 10,
  qualification: 25,
  proposal: 50,
  verbal: 75,
  won: 100,
  lost: 0,
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    primary_contact_id: "",
    stage: "lead" as OpportunityStage,
    value: "",
    probability: "10",
    expected_close_date: "",
    source: "" as OpportunitySource | "",
  })

  useEffect(() => { fetchData() }, [search])

  async function fetchData() {
    const [oppRes, clientRes] = await Promise.all([
      supabase.from("opportunities").select("*, clients(*), primary_contact:client_contacts(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ])
    let data = (oppRes.data || []) as OpportunityWithRelations[]
    if (search) data = data.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.clients?.name?.toLowerCase().includes(search.toLowerCase()))
    setOpportunities(data)
    setClients(clientRes.data || [])
    setLoading(false)
  }

  async function fetchContactsForClient(clientId: string) {
    const { data } = await supabase.from("client_contacts").select("*").eq("client_id", clientId).order("name")
    setContacts(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!formData.name.trim()) {
      setError("Name is required")
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase.from("opportunities").insert([{
      name: formData.name,
      client_id: formData.client_id || null,
      primary_contact_id: formData.primary_contact_id || null,
      stage: formData.stage,
      value: formData.value ? Number(formData.value) : null,
      probability: Number(formData.probability),
      expected_close_date: formData.expected_close_date || null,
      source: formData.source || null,
    }]).select().single()

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await emitOpportunityCreated(data)

    setFormData({ name: "", client_id: "", primary_contact_id: "", stage: "lead", value: "", probability: "10", expected_close_date: "", source: "" })
    setDialogOpen(false)
    setSubmitting(false)
    fetchData()
  }

  async function updateStage(id: string, previousStage: string, newStage: OpportunityStage) {
    await supabase.from("opportunities").update({ 
      stage: newStage, 
      probability: stageProbabilities[newStage],
      updated_at: new Date().toISOString(),
      actual_close_date: newStage === "won" || newStage === "lost" ? new Date().toISOString() : null,
    }).eq("id", id)
    
    const opp = opportunities.find(o => o.id === id)
    if (opp) {
      await emitOpportunityStageChanged({ ...opp, stage: newStage }, previousStage, newStage)
    }
    
    fetchData()
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.setData("text/plain", id)
  }

  function handleDrop(e: React.DragEvent, stage: OpportunityStage) {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    const opp = opportunities.find(o => o.id === id)
    if (id && dragging && opp && opp.stage !== stage) {
      updateStage(id, opp.stage, stage)
    }
    setDragging(null)
  }

  const activeOpps = opportunities.filter(o => o.stage !== "won" && o.stage !== "lost")
  const totalPipeline = activeOpps.reduce((sum, o) => sum + ((o.value || 0) * (o.probability / 100)), 0)
  const pipelineByStage = OPPORTUNITY_STAGES.slice(0, -2).reduce((acc, stage) => {
    acc[stage] = opportunities.filter(o => o.stage === stage).reduce((sum, o) => sum + (o.value || 0), 0)
    return acc
  }, {} as Record<string, number>)

  const wonOpps = opportunities.filter(o => o.stage === "won")
  const lostOpps = opportunities.filter(o => o.stage === "lost")
  const winRate = wonOpps.length + lostOpps.length > 0 
    ? Math.round((wonOpps.length / (wonOpps.length + lostOpps.length)) * 100) 
    : 0

  const groupedByStage = OPPORTUNITY_STAGES.reduce((acc, stage) => {
    acc[stage] = opportunities.filter((o) => o.stage === stage)
    return acc
  }, {} as Record<string, OpportunityWithRelations[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Manage your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")}>
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Opportunity</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Opportunity</DialogTitle></DialogHeader>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={formData.client_id} onValueChange={(v) => { setFormData({ ...formData, client_id: v, primary_contact_id: "" }); fetchContactsForClient(v) }}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Contact</Label>
                    <Select value={formData.primary_contact_id} onValueChange={(v) => setFormData({ ...formData, primary_contact_id: v })} disabled={!formData.client_id}>
                      <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                      <SelectContent>{contacts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Value ($)</Label><Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v as OpportunitySource })}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>{OPPORTUNITY_SOURCES.map((s) => (<SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Expected Close Date</Label><Input type="date" value={formData.expected_close_date} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating..." : "Create Opportunity"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Total Pipeline</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalPipeline.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Active Deals</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeOpps.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Percent className="h-4 w-4" />Win Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{winRate}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" />Won This Month</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${wonOpps.filter(o => {
            const closeDate = new Date(o.actual_close_date || o.updated_at)
            const now = new Date()
            return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear()
          }).reduce((sum, o) => sum + (o.value || 0), 0).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search opportunities..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {OPPORTUNITY_STAGES.map((stage) => (
            <div key={stage} className="flex-shrink-0 w-72" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, stage)}>
              <Card className={`h-full ${dragging ? "border-dashed" : ""}`}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="capitalize">{stage}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{groupedByStage[stage]?.length || 0}</Badge>
                      <span className="text-xs text-muted-foreground">${(pipelineByStage[stage] || groupedByStage[stage]?.reduce((s, o) => s + (o.value || 0), 0) || 0).toLocaleString()}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="space-y-2 px-2">
                      {groupedByStage[stage]?.map((opp) => (
                        <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                          <div draggable onDragStart={(e) => handleDragStart(e, opp.id)} className={`p-3 bg-background rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${stageColors[stage]}`}>
                            <div className="font-medium text-sm">{opp.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{opp.clients?.name || "No client"}</div>
                            <div className="flex items-center justify-between mt-2">
                              {opp.value && <div className="text-sm font-medium">${opp.value.toLocaleString()}</div>}
                              <div className="text-xs text-muted-foreground">{opp.probability}%</div>
                            </div>
                            {opp.expected_close_date && <div className="text-xs text-muted-foreground mt-1">Close: {new Date(opp.expected_close_date).toLocaleDateString()}</div>}
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
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No opportunities</TableCell></TableRow>
              ) : (
                opportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell><Link href={`/opportunities/${opp.id}`} className="font-medium hover:underline">{opp.name}</Link></TableCell>
                    <TableCell>{opp.clients?.name || "-"}</TableCell>
                    <TableCell>
                      <Select value={opp.stage} onValueChange={(v) => updateStage(opp.id, opp.stage, v as OpportunityStage)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>{OPPORTUNITY_STAGES.map((s) => (<SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>))}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{opp.value ? `$${opp.value.toLocaleString()}` : "-"}</TableCell>
                    <TableCell>{opp.probability}%</TableCell>
                    <TableCell>{opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{opp.source ? <Badge variant="outline" className="capitalize">{opp.source.replace("_", " ")}</Badge> : "-"}</TableCell>
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
