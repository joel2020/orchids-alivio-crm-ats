import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET() {
  const ready = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return NextResponse.json({ status: ready ? "ready" : "not_ready", checks: { env: ready }, time: new Date().toISOString() }, { status: ready ? 200 : 503 })
}
