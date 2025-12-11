import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const EVENT_TYPE_MAP: Record<string, string> = {
  email_sent: "sent",
  email_opened: "open",
  reply_received: "reply",
  auto_reply_received: "reply",
  link_clicked: "click",
  email_bounced: "bounce",
  lead_unsubscribed: "unsubscribe",
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    const {
      timestamp,
      event_type,
      workspace,
      campaign_id,
      campaign_name,
      lead_email,
      email_account,
      reply_text_snippet,
      reply_subject,
      reply_text,
      reply_html,
      step,
      variant,
      is_first,
      ...rest
    } = payload

    const mappedEventType = EVENT_TYPE_MAP[event_type] || event_type

    const { data: campaign } = await supabase
      .from("instantly_campaigns")
      .select("id, connection_id, account_id")
      .eq("instantly_campaign_id", campaign_id)
      .single()

    if (!campaign) {
      console.log(`Campaign not found: ${campaign_id}`)
      return NextResponse.json({ success: true, message: "Campaign not tracked" })
    }

    let prospectId = null
    if (lead_email) {
      const { data: prospect } = await supabase
        .from("instantly_prospects")
        .select("id")
        .eq("email", lead_email)
        .single()
      prospectId = prospect?.id
    }

    const { error: insertError } = await supabase.from("instantly_email_events").insert({
      account_id: campaign.account_id,
      connection_id: campaign.connection_id,
      campaign_id: campaign.id,
      prospect_id: prospectId,
      event_type: mappedEventType,
      occurred_at: timestamp || new Date().toISOString(),
      is_reply: event_type === "reply_received" || event_type === "auto_reply_received",
      is_bounce: event_type === "email_bounced",
      metadata: {
        instantly_event_type: event_type,
        workspace,
        instantly_campaign_id: campaign_id,
        campaign_name,
        lead_email,
        email_account,
        reply_text_snippet,
        reply_subject,
        reply_text,
        reply_html,
        step,
        variant,
        is_first,
        ...rest,
      },
    })

    if (insertError) {
      console.error("Failed to insert event:", insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    if (event_type === "email_sent") {
      await supabase.rpc("increment_campaign_stats", { p_campaign_id: campaign.id, p_field: "stats_sends" })
    } else if (event_type === "email_opened") {
      await supabase.rpc("increment_campaign_stats", { p_campaign_id: campaign.id, p_field: "stats_opens" })
    } else if (event_type === "link_clicked") {
      await supabase.rpc("increment_campaign_stats", { p_campaign_id: campaign.id, p_field: "stats_clicks" })
    } else if (event_type === "reply_received" || event_type === "auto_reply_received") {
      await supabase.rpc("increment_campaign_stats", { p_campaign_id: campaign.id, p_field: "stats_replies" })
    } else if (event_type === "email_bounced") {
      await supabase.rpc("increment_campaign_stats", { p_campaign_id: campaign.id, p_field: "stats_bounces" })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "Instantly webhook endpoint active" })
}
