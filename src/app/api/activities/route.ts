import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { searchParams } = new URL(request.url)
  const objectType = searchParams.get("object_type")
  const activityType = searchParams.get("activity_type")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const limit = parseInt(searchParams.get("limit") || "50")

  let query = supabase
    .from("activities")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (objectType && objectType !== "all") query = query.eq("object_type", objectType)
  if (activityType && activityType !== "all") query = query.eq("type", activityType)
  if (startDate) query = query.gte("created_at", startDate)
  if (endDate) query = query.lte("created_at", endDate)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId, user } = auth.context!

  const body = await request.json()

  if (!body.object_type || !body.object_id || !body.type) {
    return NextResponse.json({ error: "object_type, object_id, and type are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("activities")
    .insert([{ ...body, account_id: accountId, user_id: body.user_id ?? user.id }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
