"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Candidate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

const SOURCES = ["linkedin", "referral", "indeed", "website", "recruiter"]

export default function CandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    location: "",
    current_title: "",
    current_company: "",
    source: "",
  })

  useEffect(() => { fetchCandidates() }, [search, sourceFilter])

  async function fetchCandidates() {
    let query = supabase.from("candidates").select("*").order("created_at", { ascending: false })
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,current_title.ilike.%${search}%`)
    if (sourceFilter && sourceFilter !== "all") query = query.eq("source", sourceFilter)
    const { data } = await query
    setCandidates(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!formData.full_name.trim()) {
      setError("Full name is required")
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase.from("candidates").insert([formData]).select().single()
    
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await supabase.from("activities").insert({
      object_type: "candidate",
      object_id: data.id,
      type: "candidate_created",
      payload: { name: data.full_name }
    })

    setFormData({ full_name: "", email: "", phone: "", linkedin_url: "", location: "", current_title: "", current_company: "", source: "" })
    setDialogOpen(false)
    setSubmitting(false)
    router.push(`/candidates/${data.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Candidate</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Candidate</DialogTitle></DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Full Name *</Label><Input required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>LinkedIn URL</Label><Input value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Current Title</Label><Input value={formData.current_title} onChange={(e) => setFormData({ ...formData, current_title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Current Company</Label><Input value={formData.current_company} onChange={(e) => setFormData({ ...formData, current_company: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Candidate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search candidates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : candidates.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No candidates found</TableCell></TableRow>
            ) : (
              candidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Link href={`/candidates/${c.id}`} className="font-medium hover:underline">{c.full_name}</Link></TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell>{c.current_title || "-"}</TableCell>
                  <TableCell>{c.current_company || "-"}</TableCell>
                  <TableCell>{c.location || "-"}</TableCell>
                  <TableCell>{c.source || "-"}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}