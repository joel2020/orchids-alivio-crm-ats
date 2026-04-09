"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
  const [loadError, setLoadError] = useState<string | null>(null)
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
    setLoadError(null)
    try {
      const now = new Date()
      const ytdStart = `${now.getUTCFullYear()}-01-01`

      const [jobsRes, submissionsRes, interviewsRes, placementsRes, activityRes] = await Promise.all([
        fetch("/api/job_orders?limit=200"),
        fetch("/api/submissions?limit=200"),
        fetch("/api/interviews?limit=200"),
        fetch("/api/placements?limit=200"),
        fetch("/api/activities?limit=12"),
      ])

      const [jobs, submissions, interviews, placements, activities] = await Promise.all([
        jobsRes.json(),
        submissionsRes.json(),
        interviewsRes.json(),
        placementsRes.json(),
        activityRes.json(),
      ])

      if (!jobsRes.ok || !submissionsRes.ok || !interviewsRes.ok || !placementsRes.ok || !activityRes.ok) {
        setLoadError("Some dashboard data could not be loaded from API endpoints.")
      }

      const jobsData = Array.isArray(jobs) ? jobs : []
      const submissionsData = Array.isArray(submissions) ? submissions : []
      const interviewsData = Array.isArray(interviews) ? interviews : []
      const placementsData = Array.isArray(placements) ? placements : []
      const activitiesData = Array.isArray(activities) ? activities : []

      const nextStageCounts = Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0])) as Record<ApplicationStage, number>
      for (const row of submissionsData) {
        const stage = (row.stage ?? row.submission_status) as ApplicationStage | null
        if (stage && stage in nextStageCounts) {
          nextStageCounts[stage] += 1
        }
      }

      setStageCounts(nextStageCounts)
      setRecentActivity(activitiesData as Activity[])
      setMetrics({
        // Blocked by missing /api/opportunities endpoint
        openOpportunities: 0,
        wonOpportunities: 0,
        openJobs: jobsData.filter((job) => job.status === "open").length,
        activeCandidates: submissionsData.length,
        upcomingInterviews: interviewsData.filter((interview) => {
          const startsAt = interview.starts_at || interview.start_time
          return startsAt && new Date(startsAt) >= new Date() && interview.status === "scheduled"
        }).length,
        placementsYtd: placementsData.filter((placement) => {
          const createdAt = placement.created_at || placement.start_date
          return createdAt && createdAt >= ytdStart
        }).length,
      })
    } catch (error) {
      setLoadError(String(error))
    } finally {
      setLoading(false)
    }
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
        {loadError && <p className="text-sm text-destructive mt-1">{loadError}</p>}
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
