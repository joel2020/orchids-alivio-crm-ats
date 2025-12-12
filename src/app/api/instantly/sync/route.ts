import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { connection_id } = body

    if (!connection_id) {
      return NextResponse.json({ error: "connection_id is required" }, { status: 400 })
    }

    const { data: connection, error: connError } = await supabase
      .from("instantly_connections")
      .select("api_key_encrypted")
      .eq("id", connection_id)
      .single()

    if (connError || !connection) {
      return NextResponse.json({ error: "Invalid connection_id" }, { status: 404 })
    }

    const apiKey = Buffer.from(connection.api_key_encrypted, "base64").toString("utf-8")

    const results = {
      campaigns: { synced: 0, errors: [] as string[] },
      leads: { synced: 0, errors: [] as string[] },
      accounts: { synced: 0, errors: [] as string[] }
    }

    try {
      const campaignsResponse = await fetch(`https://api.instantly.ai/api/v1/campaign/list?api_key=${apiKey}`, {
        method: "GET"
      })

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        const campaigns = campaignsData.data || campaignsData.campaigns || []

        for (const campaign of campaigns) {
          const { error } = await supabase
            .from("instantly_campaigns")
            .upsert({
              connection_id,
              instantly_campaign_id: campaign.id,
              name: campaign.name || "",
              status: campaign.status || "unknown",
              stats_sends: campaign.stats?.sends || campaign.sends || 0,
              stats_opens: campaign.stats?.opens || campaign.opens || 0,
              stats_clicks: campaign.stats?.clicks || campaign.clicks || 0,
              stats_replies: campaign.stats?.replies || campaign.replies || 0,
              stats_bounces: campaign.stats?.bounces || campaign.bounces || 0,
              raw_data: campaign,
              updated_at: new Date().toISOString()
            }, { onConflict: "connection_id,instantly_campaign_id" })

          if (error) {
            results.campaigns.errors.push(`Campaign ${campaign.id}: ${error.message}`)
          } else {
            results.campaigns.synced++
          }
        }
      } else {
        results.campaigns.errors.push(`API error: ${campaignsResponse.statusText}`)
      }
    } catch (error) {
      results.campaigns.errors.push(String(error))
    }

    try {
      const leadsResponse = await fetch(`https://api.instantly.ai/api/v1/lead/list?api_key=${apiKey}&limit=1000&skip=0`, {
        method: "GET"
      })

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        const leads = leadsData.leads || leadsData.data || []

        for (const lead of leads) {
          const { error: prospectError } = await supabase
            .from("instantly_prospects")
            .upsert({
              connection_id,
              instantly_prospect_id: lead.id || lead.email,
              email: lead.email,
              first_name: lead.first_name || lead.firstName || null,
              last_name: lead.last_name || lead.lastName || null,
              company: lead.company || null,
              phone: lead.phone || null,
              website: lead.website || null,
              status: lead.status || "unknown",
              raw_data: lead,
              updated_at: new Date().toISOString()
            }, { onConflict: "connection_id,instantly_prospect_id" })

          if (prospectError) {
            results.leads.errors.push(`Lead ${lead.email}: ${prospectError.message}`)
          } else {
            results.leads.synced++
          }
        }
      } else {
        results.leads.errors.push(`API error: ${leadsResponse.statusText}`)
      }
    } catch (error) {
      results.leads.errors.push(String(error))
    }

    try {
      const accountsResponse = await fetch(`https://api.instantly.ai/api/v1/account/list?api_key=${apiKey}`, {
        method: "GET"
      })

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        const accounts = accountsData.data || accountsData.accounts || []

        results.accounts.synced = accounts.length
      } else {
        results.accounts.errors.push(`API error: ${accountsResponse.statusText}`)
      }
    } catch (error) {
      results.accounts.errors.push(String(error))
    }

    await supabase
      .from("instantly_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection_id)

    return NextResponse.json({
      success: true,
      results,
      total_synced: results.campaigns.synced + results.leads.synced + results.accounts.synced,
      total_errors: results.campaigns.errors.length + results.leads.errors.length + results.accounts.errors.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}