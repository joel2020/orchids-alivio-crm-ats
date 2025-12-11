"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Interview, Application, Candidate, Job, INTERVIEW_STAGES, INTERVIEW_STATUSES } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type InterviewWithRelations = Interview & {
  applications: Application & { candidates: Candidate; jobs: Job }
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  useEffect(() => { fetchInterviews() }, [search, stageFilter, statusFilter])

  async function fetchInterviews() {
    const { data } = await supabase
      .from("interviews")
      .select("*, applications(*, candidates(*), jobs(*))")
      .order("start_time", { ascending: false })
    let filtered = (data || []) as InterviewWithRelations[]
    if (search) {
      filtered = filtered.filter((i) =>
        i.applications?.candidates?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.applications?.jobs?.title?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (stageFilter && stageFilter !== "all") filtered = filtered.filter((i) => i.stage === stageFilter)
    if (statusFilter && statusFilter !== "all") filtered = filtered.filter((i) => i.status === statusFilter)
    setInterviews(filtered)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search interviews..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {INTERVIEW_STAGES.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {INTERVIEW_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cal Booking ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : interviews.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No interviews found</TableCell></TableRow>
            ) : (
              interviews.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Link href={`/candidates/${i.applications?.candidates?.id}`} className="font-medium hover:underline">
                      {i.applications?.candidates?.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/jobs/${i.applications?.jobs?.id}`} className="hover:underline">
                      {i.applications?.jobs?.title}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{i.stage?.replace("_", " ")}</TableCell>
                  <TableCell>{i.start_time ? new Date(i.start_time).toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === "completed" ? "default" : i.status === "canceled" ? "destructive" : "outline"}>
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{i.cal_booking_id || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}