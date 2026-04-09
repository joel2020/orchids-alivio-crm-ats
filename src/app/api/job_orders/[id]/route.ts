import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { jobOrdersSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const [job, submissions, placements] = await Promise.all([
    supabase.from("job_orders").select("*, companies(*)").eq("account_id", accountId).eq("id", id).single(),
    supabase.from("submissions").select("*, candidates(*)").eq("account_id", accountId).eq("job_order_id", id).order("created_at", { ascending: false }),
    supabase.from("placements").select("*").eq("account_id", accountId).eq("job_order_id", id).order("created_at", { ascending: false }),
  ])

  if (job.error) return NextResponse.json({ error: job.error.message }, { status: 404 })
  return NextResponse.json({ ...job.data, submissions: submissions.data ?? [], placements: placements.data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const parsed = jobOrdersSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase.from("job_orders").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("account_id", accountId).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("job_orders").delete().eq("account_id", accountId).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
