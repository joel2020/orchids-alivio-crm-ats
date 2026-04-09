import { NextRequest } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { submissionsSchema } from "@/lib/api/schemas"
import { dataResponse, errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { data, error } = await supabase
    .from("submissions")
    .select("*, candidates(*), job_orders(*), interviews(*), placements(*)")
    .eq("account_id", accountId)
    .eq("id", id)
    .single()

  if (error) {
    logApiError("submissions.[id].GET", error, { accountId, id })
    return errorResponse(error.message, { status: 404 })
  }

  return dataResponse(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const parsed = submissionsSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    logApiError("submissions.[id].PATCH", error, { accountId, id })
    return errorResponse(error.message)
  }

  if (parsed.data.submission_status === "accepted") {
    const { data: existingPlacement } = await supabase
      .from("placements")
      .select("id")
      .eq("account_id", accountId)
      .eq("submission_id", data.id)
      .maybeSingle()

    if (!existingPlacement) {
      const { data: jobOrder, error: jobOrderError } = await supabase
        .from("job_orders")
        .select("company_id, fee_percent")
        .eq("account_id", accountId)
        .eq("id", data.job_order_id)
        .single()

      if (jobOrderError) {
        logApiError("submissions.[id].PATCH.jobOrder", jobOrderError, { accountId, id })
        return errorResponse(jobOrderError.message)
      }

      const { error: placementError } = await supabase.from("placements").insert({
        account_id: accountId,
        submission_id: data.id,
        candidate_id: data.candidate_id,
        job_order_id: data.job_order_id,
        company_id: jobOrder.company_id,
        start_date: new Date().toISOString().slice(0, 10),
        guarantee_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10),
        fee: jobOrder.fee_percent ?? 20,
        revenue: 0,
        placement_status: "active",
        offer_status: "accepted",
      })

      if (placementError) {
        logApiError("submissions.[id].PATCH.placement", placementError, { accountId, id })
        return errorResponse(placementError.message)
      }
    }
  }

  return dataResponse(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("submissions").delete().eq("account_id", accountId).eq("id", id)
  if (error) {
    logApiError("submissions.[id].DELETE", error, { accountId, id })
    return errorResponse(error.message)
  }

  return dataResponse({ success: true })
}
