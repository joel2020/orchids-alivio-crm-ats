"use client"

import { useEffect, useState, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { Application, Job, Project, Client, Candidate, APPLICATION_STAGES } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

type ApplicationWithRelations = Application & {
  candidates: Candidate
  jobs: Job & { projects: Project & { clients: Client } }
}

function PipelineContent() {
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string>("all")

  useEffect(() => {
    fetchApplications()
  }, [stageFilter])

  async function fetchApplications() {
    setLoading(true)
    let query = supabase
      .from("applications")
      .select("*, candidates(*), jobs(*, projects(*, clients(*)))")
      .order("created_at", { ascending: false })

    if (stageFilter !== "all") {
      query = query.eq("stage", stageFilter)
    }

    const { data } = await query
    setApplications((data || []) as ApplicationWithRelations[])
    setLoading(false)
  }

  const groupedApplications = APPLICATION_STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((app) => app.stage === stage)
    return acc
  }, {} as Record<string, ApplicationWithRelations[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {APPLICATION_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {APPLICATION_STAGES.map((stage) => (
            <Card key={stage} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="capitalize">{stage.replace(/_/g, " ")}</span>
                  <Badge variant="secondary" className="ml-2">
                    {groupedApplications[stage]?.length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 overflow-auto">
                {groupedApplications[stage]?.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No applications
                  </div>
                ) : (
                  groupedApplications[stage]?.map((app) => (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {app.candidates?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.jobs?.title || "No job"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.jobs?.projects?.clients?.name || "No client"}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PipelineContent />
    </Suspense>
  )
}
