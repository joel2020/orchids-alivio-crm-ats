import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"
import { dataResponse, errorResponse, logApiError, parsePagination } from "@/lib/api/http"
import type { Database } from "@/lib/database.types"
import { env } from "@/lib/env"

const clientCreateSchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  status: z.string().trim().optional().nullable(),
  owner_id: z.uuid().optional().nullable(),
})

type ClientRow = Database["public"]["Tables"]["clients"]["Row"]
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"]
type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"]

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { accessToken, accountId } = auth.context!
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

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

  const { data, error, count } = await query.returns<ClientRow[]>()
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
  const { accessToken, accountId, user } = auth.context!
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const parsed = clientCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse("Validation failed", { status: 422, details: parsed.error.flatten() })
  }

  const payload: ClientInsert = {
    ...parsed.data,
    account_id: accountId,
    owner_id: parsed.data.owner_id ?? user.id,
  }

  const { data, error } = await supabase.from("clients").insert([payload]).select().returns<ClientRow[]>().single()
  if (error) {
    logApiError("clients.POST", error, { accountId })
    return errorResponse(error.message)
  }

  const activityPayload: ActivityInsert = {
    account_id: accountId,
    object_type: "client",
    object_id: data.id,
    type: "client_created",
    payload: { name: data.name },
  }

  await supabase.from("activities").insert(activityPayload)

  return dataResponse(data, { status: 201 })
}
