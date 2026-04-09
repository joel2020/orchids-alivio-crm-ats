import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const [submissionRows, interviewRows, placementRows, applicationRows] = await Promise.all([
    supabase.from("submissions").select("submission_status").eq("account_id", accountId),
    supabase.from("interviews").select("interview_stage, status").eq("account_id", accountId),
    supabase.from("placements").select("placement_status, offer_status").eq("account_id", accountId),
    supabase.from("applications").select("stage").eq("account_id", accountId),
  ])

  const countBy = <T extends Record<string, unknown>>(rows: T[] | null, key: keyof T) =>
    (rows ?? []).reduce<Record<string, number>>((acc, row) => {
      const k = String(row[key] ?? "unknown")
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  return NextResponse.json({
    submissions: countBy(submissionRows.data, "submission_status"),
    interviews: countBy(interviewRows.data, "interview_stage"),
    interviews_by_status: countBy(interviewRows.data, "status"),
    placements: countBy(placementRows.data, "placement_status"),
    offers: countBy(placementRows.data, "offer_status"),
    applications: countBy(applicationRows.data, "stage"),
  })
}
