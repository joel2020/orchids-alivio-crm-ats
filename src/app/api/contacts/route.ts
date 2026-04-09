import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { contactsSchema } from "@/lib/api/schemas"
import { parsePaginationParams } from "@/lib/api/pagination"
import { errorResponse, logApiError } from "@/lib/api/http"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("company_id")
  const search = searchParams.get("search")
  let pagination
  try {
    pagination = parsePaginationParams(searchParams)
  } catch (error) {
    return errorResponse(400, "bad_request", (error as Error).message)
  }

  let query = supabase
    .from("contacts")
    .select("*, companies(*)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to)
  if (companyId) query = query.eq("company_id", companyId)
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, error } = await query
  if (error) {
    logApiError("/api/contacts", error)
    return errorResponse(400, "bad_request", "Failed to fetch contacts")
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const parsed = contactsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Validation failed", parsed.error.flatten())
  }

  const { data, error } = await supabase.from("contacts").insert({ ...parsed.data, account_id: accountId }).select("*").single()
  if (error) {
    logApiError("/api/contacts", error)
    return errorResponse(400, "bad_request", "Failed to create contact")
  }
  return NextResponse.json(data, { status: 201 })
}
