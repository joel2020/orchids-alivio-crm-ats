import { NextRequest } from "next/server"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"
import { dataResponse, errorResponse, logApiError } from "@/lib/api/http"

const clientUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    industry: z.string().trim().optional().nullable(),
    website: z.string().trim().optional().nullable(),
    region: z.string().trim().optional().nullable(),
    status: z.string().trim().optional().nullable(),
    owner_id: z.uuid().optional().nullable(),
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params

  const [clientRes, contactsRes, projectsRes, activitiesRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).eq("account_id", accountId).single(),
    supabase
      .from("client_contacts")
      .select("*")
      .eq("client_id", id)
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", id)
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("*")
      .eq("object_type", "client")
      .eq("object_id", id)
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (clientRes.error) {
    logApiError("clients.[id].GET", clientRes.error, { accountId, id })
    return errorResponse(clientRes.error.message, { status: 404 })
  }

  return dataResponse({
    ...clientRes.data,
    contacts: contactsRes.data || [],
    projects: projectsRes.data || [],
    activities: activitiesRes.data || [],
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params
  const parsed = clientUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const { updated_at: clientUpdatedAt, ...updateData } = parsed.data

  const { data: current, error: currentError } = await supabase
    .from("clients")
    .select("updated_at")
    .eq("id", id)
    .eq("account_id", accountId)
    .single()

  if (currentError) {
    logApiError("clients.[id].PATCH.current", currentError, { accountId, id })
    return errorResponse(currentError.message, { status: 404 })
  }

  if (clientUpdatedAt && current?.updated_at && new Date(clientUpdatedAt) < new Date(current.updated_at)) {
    return errorResponse("Record has been modified by another user", { status: 409 })
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", accountId)
    .select()
    .single()

  if (error) {
    logApiError("clients.[id].PATCH", error, { accountId, id })
    return errorResponse(error.message)
  }

  return dataResponse(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params
  const { error } = await supabase.from("clients").delete().eq("id", id).eq("account_id", accountId)

  if (error) {
    logApiError("clients.[id].DELETE", error, { accountId, id })
    return errorResponse(error.message)
  }

  return dataResponse({ success: true })
}
