import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { submissionsSchema } from "@/lib/api/schemas"
import { createPlacementPayload } from "@/lib/workflow/placement"

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

      try {
        const placementPayload = createPlacementPayload(
          {
            id: data.id,
            candidate_id: data.candidate_id,
            job_order_id: data.job_order_id,
            submission_status: data.submission_status,
          },
          {
            id: data.job_order_id,
            company_id: jobOrder?.company_id,
            fee_percent: jobOrder?.fee_percent,
          }
        )

        await supabase.from("placements").insert({ account_id: accountId, ...placementPayload })
      } catch (placementError) {
        return NextResponse.json({ error: (placementError as Error).message }, { status: 400 })
      }
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
