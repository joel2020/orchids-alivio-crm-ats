import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { interviewsSchema } from "@/lib/api/schemas"

const validTransitions: Record<string, string[]> = {
  scheduled: ["completed", "canceled", "no_show"],
  completed: [],
  canceled: [],
  no_show: [],
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { data, error } = await supabase
    .from("interviews")
    .select("*, submissions(*, candidates(*), job_orders(*))")
    .eq("account_id", accountId)
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!
  const { id } = await params

  const parsed = interviewsSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data: current } = await supabase
    .from("interviews")
    .select("status")
    .eq("account_id", accountId)
    .eq("id", id)
    .single()

  if (parsed.data.status && current?.status) {
    const allowed = validTransitions[current.status] ?? []
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json({ error: `Cannot transition from ${current.status} to ${parsed.data.status}` }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from("interviews")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (parsed.data.status === "completed") {
    await supabase.from("activities").insert({
      account_id: accountId,
      object_type: "interview",
      object_id: id,
      type: "interview_completed",
      source: "system",
      user_id: user.id,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("interviews").delete().eq("account_id", accountId).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
