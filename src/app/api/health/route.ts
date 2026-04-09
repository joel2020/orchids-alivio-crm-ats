import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ status: "ok", service: "alivio-crm-ats", time: new Date().toISOString() })
}
