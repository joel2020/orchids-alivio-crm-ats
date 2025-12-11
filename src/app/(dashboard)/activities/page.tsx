"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Activity } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const OBJECT_TYPES = ["client", "project", "job", "candidate", "application"]
const ACTIVITY_TYPES = ["note", "email", "call", "calendar_event", "sequence_started", "instantly_reply"]

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>("")
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("")

  useEffect(() => { fetchActivities() }, [objectTypeFilter, activityTypeFilter])

  async function fetchActivities() {
    let query = supabase.from("activities").select("*").order("created_at", { ascending: false })
    if (objectTypeFilter && objectTypeFilter !== "all") query = query.eq("object_type", objectTypeFilter)
    if (activityTypeFilter && activityTypeFilter !== "all") query = query.eq("type", activityTypeFilter)
    const { data } = await query.limit(100)
    let filtered = data || []
    if (search) {
      filtered = filtered.filter((a) => JSON.stringify(a.payload).toLowerCase().includes(search.toLowerCase()))
    }
    setActivities(filtered)
    setLoading(false)
  }

  function getObjectLink(activity: Activity) {
    if (!activity.object_type || !activity.object_id) return null
    const routes: Record<string, string> = {
      client: "/clients",
      project: "/projects",
      job: "/jobs",
      candidate: "/candidates",
      application: "/applications",
    }
    const route = routes[activity.object_type]
    return route ? `${route}/${activity.object_id}` : null
  }

  function getPayloadDescription(payload: Record<string, unknown> | null) {
    if (!payload) return "-"
    if (payload.body) return String(payload.body).substring(0, 100)
    if (payload.description) return String(payload.description).substring(0, 100)
    if (payload.message) return String(payload.message).substring(0, 100)
    return JSON.stringify(payload).substring(0, 100)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Activities</h1>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search activities..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={objectTypeFilter} onValueChange={setObjectTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Objects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Objects</SelectItem>
            {OBJECT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACTIVITY_TYPES.map((t) => (<SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Object Type</TableHead>
              <TableHead>Object</TableHead>
              <TableHead>Activity Type</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : activities.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activities found</TableCell></TableRow>
            ) : (
              activities.map((a) => {
                const link = getObjectLink(a)
                return (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{a.object_type}</Badge></TableCell>
                    <TableCell>
                      {link ? (
                        <Link href={link} className="text-primary hover:underline">View {a.object_type}</Link>
                      ) : "-"}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{a.type?.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{getPayloadDescription(a.payload)}</TableCell>
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
