import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { AppRole, requireApiAuth } from "@/lib/auth"

export async function handleList(request: NextRequest, table: string, role: AppRole = "readonly") {
  const auth = await requireApiAuth(request, role)
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function handleCreate<T extends z.ZodTypeAny>(
  request: NextRequest,
  table: string,
  schema: T,
  role: AppRole = "recruiter",
  extras?: Record<string, unknown>
) {
  const auth = await requireApiAuth(request, role)
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const payload = { ...parsed.data, account_id: accountId, ...extras }
  const { data, error } = await supabase.from(table).insert(payload).select("*").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (table !== "activities") {
    await supabase.from("activities").insert({
      account_id: accountId,
      user_id: user.id,
      object_type: table,
      object_id: data.id,
      type: `${table}_created`,
      source: "system",
    })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function handleGetById(request: NextRequest, table: string, id: string, role: AppRole = "readonly") {
  const auth = await requireApiAuth(request, role)
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { data, error } = await supabase.from(table).select("*").eq("account_id", accountId).eq("id", id).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function handleUpdate<T extends z.ZodTypeAny>(
  request: NextRequest,
  table: string,
  id: string,
  schema: T,
  role: AppRole = "recruiter"
) {
  const auth = await requireApiAuth(request, role)
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const parsed = schema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from(table)
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function handleDelete(request: NextRequest, table: string, id: string, role: AppRole = "admin") {
  const auth = await requireApiAuth(request, role)
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { error } = await supabase.from(table).delete().eq("account_id", accountId).eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
