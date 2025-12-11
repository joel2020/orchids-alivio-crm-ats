import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [clientRes, contactsRes, projectsRes, activitiesRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("client_contacts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("object_type", "client").eq("object_id", id).order("created_at", { ascending: false }).limit(20)
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
  const { id } = await params
  const body = await request.json()
  const { updated_at: clientUpdatedAt, ...updateData } = body

  const { data: current } = await supabase
    .from("clients")
    .select("updated_at")
    .eq("id", id)
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
  const { id } = await params

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
