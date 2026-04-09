import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const [companies, candidates, jobOrders, submissions, placements, opportunities] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("job_orders").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("placements").select("revenue, fee").eq("account_id", accountId),
    supabase.from("opportunities").select("value, stage").eq("account_id", accountId),
  ])

  const firstError = companies.error ?? candidates.error ?? jobOrders.error ?? submissions.error ?? placements.error ?? opportunities.error
  if (firstError) {
    logApiError("/api/dashboard/overview", firstError)
    return errorResponse(400, "bad_request", "Failed to fetch dashboard overview")
  }

  return NextResponse.json({
    companies: companies.count ?? 0,
    candidates: candidates.count ?? 0,
    job_orders: jobOrders.count ?? 0,
    submissions: submissions.count ?? 0,
    placements: placements.data?.length ?? 0,
    total_revenue: (placements.data ?? []).reduce((sum, p) => sum + Number(p.revenue ?? 0), 0),
    total_fee: (placements.data ?? []).reduce((sum, p) => sum + Number(p.fee ?? 0), 0),
    open_opportunity_value: (opportunities.data ?? []).filter((o) => o.stage !== "won" && o.stage !== "lost").reduce((sum, o) => sum + Number(o.value ?? 0), 0),
  })
}
