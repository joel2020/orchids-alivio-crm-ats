import { NextRequest } from "next/server"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"
import { dataResponse, errorResponse, logApiError, parsePagination } from "@/lib/api/http"

const clientCreateSchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  status: z.string().trim().optional().nullable(),
  owner_id: z.uuid().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim()
  const industry = searchParams.get("industry")
  const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 200 })

  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }
  if (industry && industry !== "all") {
    query = query.eq("industry", industry)
  }

  const { data, error, count } = await query
  if (error) {
    logApiError("clients.GET", error, { accountId, search, industry })
    return errorResponse(error.message)
  }

  return dataResponse(data ?? [], {
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = clientCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const payload = {
    ...parsed.data,
    account_id: accountId,
    owner_id: parsed.data.owner_id ?? user.id,
  }

  const { data, error } = await supabase.from("clients").insert([payload]).select().single()
  if (error) {
    logApiError("clients.POST", error, { accountId })
    return errorResponse(error.message)
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    object_type: "client",
    object_id: data.id,
    type: "client_created",
    payload: { name: data.name },
  })

  return dataResponse(data, { status: 201 })
}
