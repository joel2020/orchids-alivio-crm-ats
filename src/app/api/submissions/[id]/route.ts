import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { submissionsSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { data, error } = await supabase
    .from("submissions")
    .select("*, candidates(*), job_orders(*), interviews(*), placements(*)")
    .eq("account_id", accountId)
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const parsed = submissionsSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (parsed.data.submission_status === "accepted") {
    const { data: existingPlacement } = await supabase
      .from("placements")
      .select("id")
      .eq("account_id", accountId)
      .eq("submission_id", data.id)
      .maybeSingle()

    if (!existingPlacement) {
      const { data: jobOrder } = await supabase
        .from("job_orders")
        .select("company_id, fee_percent")
        .eq("account_id", accountId)
        .eq("id", data.job_order_id)
        .single()

      await supabase.from("placements").insert({
        account_id: accountId,
        submission_id: data.id,
        candidate_id: data.candidate_id,
        job_order_id: data.job_order_id,
        company_id: jobOrder?.company_id,
        start_date: new Date().toISOString().slice(0, 10),
        guarantee_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10),
        fee: jobOrder?.fee_percent ?? 20,
        revenue: 0,
        placement_status: "active",
        offer_status: "accepted",
      })
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("submissions").delete().eq("account_id", accountId).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
