import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { interviewsSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get("submission_id")
  const stage = searchParams.get("interview_stage")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  let query = supabase
    .from("interviews")
    .select("*, submissions(*, candidates(*), job_orders(*))")
    .eq("account_id", accountId)
    .order("starts_at", { ascending: true })

  if (submissionId) query = query.eq("submission_id", submissionId)
  if (stage) query = query.eq("interview_stage", stage)
  if (status) query = query.eq("status", status)
  if (from) query = query.gte("starts_at", from)
  if (to) query = query.lte("starts_at", to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const parsed = interviewsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  if (new Date(parsed.data.starts_at) < new Date()) {
    return NextResponse.json({ error: "Interview must be scheduled in the future" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("interviews")
    .insert({ ...parsed.data, account_id: accountId })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from("activities").insert({
    account_id: accountId,
    object_type: "interview",
    object_id: data.id,
    type: "interview_scheduled",
    source: "system",
    user_id: user.id,
  })

  return NextResponse.json(data, { status: 201 })
}
