"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Briefcase, Users, Calendar, Building2, TrendingUp, ArrowRight, DollarSign, Target, CheckSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { APPLICATION_STAGES, ApplicationStage, OPPORTUNITY_STAGES } from "@/lib/types"

type PipelineStats = {
  totalJobs: number
  openJobs: number
  totalCandidates: number
  totalApplications: number
  stageBreakdown: Record<ApplicationStage, number>
  activeClients: number
  upcomingInterviews: { id: string; candidateName: string; jobTitle: string; startTime: string; clientName: string }[]
  recentApplications: { id: string; candidateName: string; jobTitle: string; stage: string; createdAt: string }[]
  opportunitiesByStage: Record<string, { count: number; value: number }>
  totalPipeline: number
  placements90Days: number
  fees90Days: number
  tasksOverdue: number
  tasksDueToday: number
}

const stageColors: Record<string, string> = {
  applied: "bg-blue-500",
  screening: "bg-purple-500",
  interview: "bg-amber-500",
  offer: "bg-emerald-500",
  hired: "bg-green-600",
  rejected: "bg-red-500",
}

const oppStageColors: Record<string, string> = {
  lead: "bg-slate-500",
  qualification: "bg-blue-500",
  proposal: "bg-purple-500",
  verbal: "bg-yellow-500",
  won: "bg-green-500",
  lost: "bg-red-500",
}

export default function PipelinePage() {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [jobsRes, candidatesRes, appsRes, clientsRes, interviewsRes, oppsRes, placementsRes, tasksRes] = await Promise.all([
      supabase.from("jobs").select("id, status"),
      supabase.from("candidates").select("id", { count: "exact" }),
      supabase.from("applications").select("id, stage, candidate_id, job_id, created_at, candidates(full_name), jobs(title, projects(clients(name)))"),
      supabase.from("clients").select("id", { count: "exact" }),
      supabase.from("interviews").select("id, start_time, status, applications(candidates(full_name), jobs(title, projects(clients(name))))").eq("status", "scheduled").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(5),
      supabase.from("opportunities").select("id, stage, value, probability"),
      supabase.from("placements").select("id, fee, created_at").gte("created_at", ninetyDaysAgo.toISOString()),
      supabase.from("tasks").select("id, due_date, status").neq("status", "done"),
    ])

    const jobs = jobsRes.data || []
    const apps = (appsRes.data || []) as Array<{
      id: string
      stage: ApplicationStage | null
      created_at: string
      candidates: { full_name: string } | null
      jobs: { title: string; projects: { clients: { name: string } | null } | null } | null
    }>

    const stageBreakdown = APPLICATION_STAGES.reduce((acc, stage) => {
      acc[stage] = apps.filter(a => a.stage === stage).length
      return acc
    }, {} as Record<ApplicationStage, number>)

    const interviews = (interviewsRes.data || []) as Array<{
      id: string
      start_time: string
      applications: { candidates: { full_name: string } | null; jobs: { title: string; projects: { clients: { name: string } | null } | null } | null } | null
    }>

    const recentApps = [...apps]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    const opps = (oppsRes.data || []) as Array<{ id: string; stage: string; value: number | null; probability: number }>
    const opportunitiesByStage = OPPORTUNITY_STAGES.reduce((acc, stage) => {
      const stageOpps = opps.filter(o => o.stage === stage)
      acc[stage] = {
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + (o.value || 0), 0),
      }
      return acc
    }, {} as Record<string, { count: number; value: number }>)

    const activeOpps = opps.filter(o => o.stage !== "won" && o.stage !== "lost")
    const totalPipeline = activeOpps.reduce((sum, o) => sum + ((o.value || 0) * (o.probability / 100)), 0)

    const placements = placementsRes.data || []
    const fees90Days = placements.reduce((sum, p) => sum + (p.fee || 0), 0)

    const tasks = (tasksRes.data || []) as Array<{ id: string; due_date: string | null; status: string }>
    const tasksOverdue = tasks.filter(t => t.due_date && new Date(t.due_date) < todayStart).length
    const tasksDueToday = tasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate >= todayStart && dueDate <= today
    }).length

    setStats({
      totalJobs: jobs.length,
      openJobs: jobs.filter(j => j.status === "open").length,
      totalCandidates: candidatesRes.count || 0,
      totalApplications: apps.length,
      stageBreakdown,
      activeClients: clientsRes.count || 0,
      upcomingInterviews: interviews.map(i => ({
        id: i.id,
        candidateName: i.applications?.candidates?.full_name || "Unknown",
        jobTitle: i.applications?.jobs?.title || "Unknown",
        startTime: i.start_time,
        clientName: i.applications?.jobs?.projects?.clients?.name || "Unknown"
      })),
      recentApplications: recentApps.map(a => ({
        id: a.id,
        candidateName: a.candidates?.full_name || "Unknown",
        jobTitle: a.jobs?.title || "Unknown",
        stage: a.stage || "applied",
        createdAt: a.created_at
      })),
      opportunitiesByStage,
      totalPipeline,
      placements90Days: placements.length,
      fees90Days,
      tasksOverdue,
      tasksDueToday,
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading pipeline...</div>
  }

  if (!stats) return null

  const totalInPipeline = stats.stageBreakdown.applied + stats.stageBreakdown.screening + stats.stageBreakdown.interview + stats.stageBreakdown.offer

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your CRM and ATS pipeline</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalPipeline.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">weighted by probability</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInPipeline}</div>
            <p className="text-xs text-muted-foreground">candidates in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placements (90d)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.placements90Days}</div>
            <p className="text-xs text-muted-foreground">${stats.fees90Days.toLocaleString()} in fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksOverdue + stats.tasksDueToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.tasksOverdue > 0 && <span className="text-red-600">{stats.tasksOverdue} overdue</span>}
              {stats.tasksOverdue > 0 && stats.tasksDueToday > 0 && " · "}
              {stats.tasksDueToday > 0 && <span>{stats.tasksDueToday} today</span>}
              {stats.tasksOverdue === 0 && stats.tasksDueToday === 0 && "none urgent"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openJobs}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalJobs} total jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <p className="text-xs text-muted-foreground">companies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingInterviews.length}</div>
            <p className="text-xs text-muted-foreground">scheduled upcoming</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Client Pipeline</CardTitle>
            <CardDescription>Opportunities by stage</CardDescription>
          </div>
          <Link href="/opportunities">
            <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {OPPORTUNITY_STAGES.map(stage => {
              const stageData = stats.opportunitiesByStage?.[stage] || { count: 0, value: 0 }
              return (
                <Link key={stage} href={`/opportunities`}>
                  <div className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${oppStageColors[stage]}`} />
                      <span className="text-sm font-medium capitalize">{stage}</span>
                    </div>
                    <div className="text-2xl font-bold">{stageData.count}</div>
                    <div className="text-xs text-muted-foreground">${stageData.value.toLocaleString()}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ATS Pipeline by Stage</CardTitle>
          <CardDescription>Applications breakdown by recruiting stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {APPLICATION_STAGES.map(stage => (
              <Link key={stage} href={`/applications?stage=${stage}`}>
                <div className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${stageColors[stage]}`} />
                    <span className="text-sm font-medium capitalize">{stage}</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.stageBreakdown[stage]}</div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
              <CardDescription>Scheduled interviews this week</CardDescription>
            </div>
            <Link href="/interviews">
              <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.upcomingInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No upcoming interviews scheduled</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingInterviews.map(interview => (
                  <div key={interview.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{interview.candidateName}</div>
                      <div className="text-xs text-muted-foreground">{interview.jobTitle} • {interview.clientName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{new Date(interview.startTime).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">{new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Applications</CardTitle>
              <CardDescription>Latest candidate applications</CardDescription>
            </div>
            <Link href="/applications">
              <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No recent applications</p>
            ) : (
              <div className="space-y-3">
                {stats.recentApplications.map(app => (
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{app.candidateName}</div>
                        <div className="text-xs text-muted-foreground">{app.jobTitle}</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{app.stage}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/clients"><Button variant="outline"><Building2 className="mr-2 h-4 w-4" />Add Client</Button></Link>
            <Link href="/candidates"><Button variant="outline"><Users className="mr-2 h-4 w-4" />Add Candidate</Button></Link>
            <Link href="/opportunities"><Button variant="outline"><Target className="mr-2 h-4 w-4" />Add Opportunity</Button></Link>
            <Link href="/jobs"><Button variant="outline"><Briefcase className="mr-2 h-4 w-4" />Post Job</Button></Link>
            <Link href="/tasks"><Button variant="outline"><CheckSquare className="mr-2 h-4 w-4" />Add Task</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}