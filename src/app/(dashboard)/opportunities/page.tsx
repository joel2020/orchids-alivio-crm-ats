"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Opportunity, Client, OPPORTUNITY_STAGES, OpportunityStage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

type OpportunityWithRelations = Opportunity & { clients: Client | null }

const stageColors: Record<string, string> = {
  lead: "bg-slate-100 text-slate-800",
  qualified: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    stage: "lead" as OpportunityStage,
    value: "",
    probability: "0",
    expected_close_date: "",
  })

  useEffect(() => { fetchData() }, [search])

  async function fetchData() {
    const [oppRes, clientRes] = await Promise.all([
      supabase.from("opportunities").select("*, clients(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ])
    let data = (oppRes.data || []) as OpportunityWithRelations[]
    if (search) data = data.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    setOpportunities(data)
    setClients(clientRes.data || [])
    setLoading(false)
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
      stage: formData.stage,
      value: formData.value ? Number(formData.value) : null,
      probability: Number(formData.probability),
      expected_close_date: formData.expected_close_date || null,
    }]).select().single()

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await supabase.from("activities").insert({
      object_type: "opportunity",
      object_id: data.id,
      type: "opportunity_created",
      payload: { name: data.name }
    })

    setFormData({ name: "", client_id: "", stage: "lead", value: "", probability: "0", expected_close_date: "" })
    setDialogOpen(false)
    setSubmitting(false)
    fetchData()
  }

  async function updateStage(id: string, newStage: OpportunityStage) {
    await supabase.from("opportunities").update({ stage: newStage, updated_at: new Date().toISOString() }).eq("id", id)
    await supabase.from("activities").insert({
      object_type: "opportunity",
      object_id: id,
      type: "stage_changed",
      payload: { new_stage: newStage }
    })
    fetchData()
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.setData("text/plain", id)
  }

  function handleDrop(e: React.DragEvent, stage: OpportunityStage) {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (id && dragging) updateStage(id, stage)
    setDragging(null)
  }

  const groupedByStage = OPPORTUNITY_STAGES.reduce((acc, stage) => {
    acc[stage] = opportunities.filter((o) => o.stage === stage)
    return acc
  }, {} as Record<string, OpportunityWithRelations[]>)

  const totalValue = opportunities.filter(o => o.stage !== 'lost').reduce((sum, o) => sum + (o.value || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Pipeline value: ${totalValue.toLocaleString()}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Opportunity</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Opportunity</DialogTitle></DialogHeader>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Value ($)</Label><Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} /></div>
                <div className="space-y-2"><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Expected Close Date</Label><Input type="date" value={formData.expected_close_date} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating..." : "Create Opportunity"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search opportunities..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {OPPORTUNITY_STAGES.map((stage) => (
            <div key={stage} className="flex-shrink-0 w-72" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, stage)}>
              <Card className="h-full">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="capitalize">{stage}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{groupedByStage[stage]?.length || 0}</Badge>
                      <span className="text-xs text-muted-foreground">${groupedByStage[stage]?.reduce((s, o) => s + (o.value || 0), 0).toLocaleString()}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    <div className="space-y-2 px-2">
                      {groupedByStage[stage]?.map((opp) => (
                        <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                          <div draggable onDragStart={(e) => handleDragStart(e, opp.id)} className="p-3 bg-background rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                            <div className="font-medium text-sm">{opp.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{opp.clients?.name || "No client"}</div>
                            {opp.value && <div className="text-sm font-medium mt-2">${opp.value.toLocaleString()}</div>}
                            {opp.expected_close_date && <div className="text-xs text-muted-foreground">Close: {new Date(opp.expected_close_date).toLocaleDateString()}</div>}
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
      )}
    </div>
  )
}
