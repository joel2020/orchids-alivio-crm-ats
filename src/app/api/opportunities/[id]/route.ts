import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { opportunitiesSchema } from "@/lib/api/schemas"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { data, error } = await supabase
    .from("opportunities")
    .select("*, companies(*), contacts(*), job_orders(*)")
    .eq("account_id", accountId)
    .eq("id", id)
    .single()

  if (error) {
    logApiError("/api/opportunities/[id]", error, { id })
    return errorResponse(404, "not_found", "Opportunity not found")
  }
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const parsed = opportunitiesSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase
    .from("opportunities")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    logApiError("/api/opportunities/[id]", error, { id })
    return errorResponse(400, "bad_request", "Failed to update opportunity")
  }
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("opportunities").delete().eq("account_id", accountId).eq("id", id)
  if (error) {
    logApiError("/api/opportunities/[id]", error, { id })
    return errorResponse(400, "bad_request", "Failed to delete opportunity")
  }
  return NextResponse.json({ success: true })
}
