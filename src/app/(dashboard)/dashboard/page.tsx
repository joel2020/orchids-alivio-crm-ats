"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { APPLICATION_STAGES, type Activity, type ApplicationStage } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Metrics = {
  openOpportunities: number
  wonOpportunities: number
  openJobs: number
  activeCandidates: number
  upcomingInterviews: number
  placementsYtd: number
}

export default function OperationsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metrics>({
    openOpportunities: 0,
    wonOpportunities: 0,
    openJobs: 0,
    activeCandidates: 0,
    upcomingInterviews: 0,
    placementsYtd: 0,
  })
  const [stageCounts, setStageCounts] = useState<Record<ApplicationStage, number>>(
    Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0])) as Record<ApplicationStage, number>
  )
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    const now = new Date()
    const ytdStart = `${now.getUTCFullYear()}-01-01`

    const [
      oppOpenRes,
      oppWonRes,
      jobsOpenRes,
      appsStageRes,
      interviewsUpcomingRes,
      placementsRes,
      activityRes,
    ] = await Promise.all([
      supabase.from("opportunities").select("id", { count: "exact", head: true }).not("stage", "in", '("won","lost")'),
      supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("stage", "won"),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("applications").select("id, stage"),
      supabase.from("interviews").select("id", { count: "exact", head: true }).gte("start_time", new Date().toISOString()).in("status", ["scheduled"]),
      supabase.from("placements").select("id", { count: "exact", head: true }).gte("created_at", ytdStart),
      supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(12),
    ])

    const nextStageCounts = Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0])) as Record<ApplicationStage, number>
    for (const row of appsStageRes.data || []) {
      const stage = row.stage as ApplicationStage | null
      if (stage && stage in nextStageCounts) {
        nextStageCounts[stage] += 1
      }
    }

    setStageCounts(nextStageCounts)
    setRecentActivity((activityRes.data || []) as Activity[])
    setMetrics({
      openOpportunities: oppOpenRes.count || 0,
      wonOpportunities: oppWonRes.count || 0,
      openJobs: jobsOpenRes.count || 0,
      activeCandidates: (appsStageRes.data || []).length,
      upcomingInterviews: interviewsUpcomingRes.count || 0,
      placementsYtd: placementsRes.count || 0,
    })
    setLoading(false)
  }

  const stageSummary = useMemo(
    () => APPLICATION_STAGES.map((stage) => ({ stage, count: stageCounts[stage] || 0 })),
    [stageCounts]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Internal recruiting and delivery metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Open opportunities" value={metrics.openOpportunities} loading={loading} href="/opportunities" />
        <MetricCard title="Won opportunities" value={metrics.wonOpportunities} loading={loading} href="/opportunities" />
        <MetricCard title="Open jobs" value={metrics.openJobs} loading={loading} href="/jobs" />
        <MetricCard title="Candidates in pipeline" value={metrics.activeCandidates} loading={loading} href="/applications" />
        <MetricCard title="Upcoming interviews" value={metrics.upcomingInterviews} loading={loading} href="/interviews" />
        <MetricCard title="Placements (YTD)" value={metrics.placementsYtd} loading={loading} href="/applications" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidates by stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stageSummary.map((row) => (
              <div key={row.stage} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="capitalize">{row.stage.replace(/_/g, " ")}</span>
                <Badge variant="secondary">{row.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No recent activity</TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell>{item.type || "-"}</TableCell>
                      <TableCell className="capitalize">{item.object_type || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, loading, href }: { title: string; value: number; loading: boolean; href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent/30 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{loading ? "—" : value.toLocaleString()}</div>
        </CardContent>
      </Card>
    </Link>
  )
}
