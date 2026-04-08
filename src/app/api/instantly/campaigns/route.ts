import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { supabase, accountId } = auth.context!

  try {
    const body = await request.json()
    const { connection_id } = body

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

    const response = await fetch("https://api.instantly.ai/api/v2/campaigns", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Instantly API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
