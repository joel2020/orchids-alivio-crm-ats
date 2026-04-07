import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params

  const [clientRes, contactsRes, projectsRes, activitiesRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).eq("account_id", accountId).single(),
    supabase.from("client_contacts").select("*").eq("client_id", id).eq("account_id", accountId).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("client_id", id).eq("account_id", accountId).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("object_type", "client").eq("object_id", id).eq("account_id", accountId).order("created_at", { ascending: false }).limit(20)
  ])

  if (clientRes.error) {
    return NextResponse.json({ error: clientRes.error.message }, { status: 404 })
  }

  return NextResponse.json({
    ...clientRes.data,
    contacts: contactsRes.data || [],
    projects: projectsRes.data || [],
    activities: activitiesRes.data || []
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params
  const body = await request.json()
  const { updated_at: clientUpdatedAt, ...updateData } = body

  const { data: current } = await supabase
    .from("clients")
    .select("updated_at")
    .eq("id", id)
    .eq("account_id", accountId)
    .single()

  if (clientUpdatedAt && current?.updated_at && new Date(clientUpdatedAt) < new Date(current.updated_at)) {
    return NextResponse.json(
      { error: "Record has been modified by another user" },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", accountId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  const { id } = await params

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
