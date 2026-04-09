import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { submissionsSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { data, error } = await supabase
    .from("submissions")
    .select("*, candidates(*), job_orders(*)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = submissionsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const payload = { ...parsed.data, account_id: accountId }
  const { data, error } = await supabase.from("submissions").insert(payload).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from("tasks").insert({
    account_id: accountId,
    entity_type: "submission",
    entity_id: data.id,
    title: "Follow up with client on submitted candidate",
    status: "open",
    priority: "high",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    assignee_user_id: user.id,
  })

  return NextResponse.json(data, { status: 201 })
}
