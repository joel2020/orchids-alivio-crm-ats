import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { opportunitiesSchema } from "@/lib/api/schemas"

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

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const parsed = opportunitiesSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("opportunities")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("opportunities").delete().eq("account_id", accountId).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
