import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  try {
    const body = await request.json()
    const { connection_id, campaign_id, starting_after, limit = 100, distinct_contacts = false, fetch_all = false } = body

    if (!connection_id) {
      return NextResponse.json({ error: "connection_id is required" }, { status: 400 })
    }

    const { data: connection, error: connError } = await supabase
      .from("instantly_connections")
      .select("api_key_encrypted")
      .eq("account_id", accountId)
      .eq("id", connection_id)
      .single()

    if (connError || !connection) {
      return NextResponse.json({ error: "Invalid connection_id" }, { status: 404 })
    }

    const apiKey = Buffer.from(connection.api_key_encrypted, "base64").toString("utf-8")

    const requestBody: Record<string, unknown> = {
      limit,
      skip: starting_after || 0
    }
    if (campaign_id) requestBody.campaign_id = campaign_id
    if (distinct_contacts) requestBody.distinct_contacts = true

    let allLeads: unknown[] = []
    let currentSkip = starting_after || 0
    let lastCursor = currentSkip

    do {
      requestBody.skip = currentSkip

      const response = await fetch("https://api.instantly.ai/api/v2/leads/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: `Instantly API error: ${response.statusText}`, details: errorText },
          { status: response.status }
        )
      }

      const result = await response.json()
      const leads = result.leads || []
      allLeads = allLeads.concat(leads)

      currentSkip += leads.length
      lastCursor = currentSkip

      if (!fetch_all || leads.length < limit) break
    } while (fetch_all)

    return NextResponse.json({
      leads: allLeads,
      count: allLeads.length,
      last_cursor: lastCursor
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
