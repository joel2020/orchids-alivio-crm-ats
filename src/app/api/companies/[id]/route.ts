import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"
import { companiesSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "readonly")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const [company, contacts, jobs, activities] = await Promise.all([
    supabase.from("companies").select("*").eq("account_id", accountId).eq("id", id).single(),
    supabase.from("contacts").select("*").eq("account_id", accountId).eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("job_orders").select("*").eq("account_id", accountId).eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("account_id", accountId).eq("object_type", "company").eq("object_id", id).order("created_at", { ascending: false }).limit(20),
  ])

  if (company.error) return NextResponse.json({ error: company.error.message }, { status: 404 })

  return NextResponse.json({ ...company.data, contacts: contacts.data ?? [], job_orders: jobs.data ?? [], activities: activities.data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "bizdev")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const parsed = companiesSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase.from("companies").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("account_id", accountId).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, "admin")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!
  const { id } = await params

  const { error } = await supabase.from("companies").delete().eq("account_id", accountId).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
