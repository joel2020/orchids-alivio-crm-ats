"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import { APPLICATION_STAGES } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { extractErrorMessage, extractList } from "@/lib/api/client-response"

type PipelineSubmission = {
  id: string
  stage: string | null
  submission_status?: string | null
  candidate_id: string
  job_order_id: string
  candidates?: { id: string; full_name: string | null }
  job_orders?: { id: string; title: string | null; companies?: { name: string | null } }
}

function PipelineContent() {
  const [applications, setApplications] = useState<PipelineSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<string>("all")

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [submissionsRes, candidatesRes, jobOrdersRes, companiesRes] = await Promise.all([
        fetch("/api/submissions?limit=200"),
        fetch("/api/candidates?limit=200"),
        fetch("/api/job_orders?limit=200"),
        fetch("/api/companies?limit=200"),
      ])

      const [submissions, candidates, jobOrders, companies] = await Promise.all([
        submissionsRes.json(),
        candidatesRes.json(),
        jobOrdersRes.json(),
        companiesRes.json(),
      ])

      if (!submissionsRes.ok) {
        setLoadError(extractErrorMessage(submissions, "Failed to load pipeline"))
        setApplications([])
        return
      }
      if (!candidatesRes.ok || !jobOrdersRes.ok || !companiesRes.ok) {
        setLoadError("Failed to load related pipeline data")
        setApplications([])
        return
      }

      const candidateById = new Map(extractList<{ id: string; full_name: string | null }>(candidates).map((c) => [c.id, c]))
      const companyById = new Map(extractList<{ id: string; name: string | null }>(companies).map((c) => [c.id, c]))
      const jobOrderById = new Map(
        extractList<{ id: string; title: string | null; company_id: string | null }>(jobOrders).map((j) => [j.id, j])
      )

      let merged = extractList<PipelineSubmission>(submissions).map((submission) => {
        const jobOrder = jobOrderById.get(submission.job_order_id)
        return {
          ...submission,
          stage: submission.stage ?? submission.submission_status ?? null,
          candidates: candidateById.get(submission.candidate_id) || null,
          job_orders: jobOrder
            ? {
                ...jobOrder,
                companies: jobOrder.company_id ? companyById.get(jobOrder.company_id) || null : null,
              }
            : null,
        }
      }) as PipelineSubmission[]

      if (stageFilter !== "all") {
        merged = merged.filter((app) => app.stage === stageFilter)
      }

      setApplications(merged)
    } catch (error) {
      setLoadError(String(error))
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [stageFilter])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const groupedApplications = APPLICATION_STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((app) => app.stage === stage)
    return acc
  }, {} as Record<string, PipelineSubmission[]>)

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
      ) : loadError ? (
        <div className="text-center py-12 text-destructive">{loadError}</div>
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
                          {app.job_orders?.title || "No job"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.job_orders?.companies?.name || "No client"}
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
