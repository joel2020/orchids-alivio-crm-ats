import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobIds = searchParams.getAll("jobIds[]")

    if (jobIds.length === 0) {
      return NextResponse.json({ error: "No job IDs provided" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("resume_parse_jobs")
      .select(`
        id,
        status,
        candidate_id,
        parsed_data,
        parse_confidence,
        parser_provider,
        error_message,
        created_at,
        updated_at,
        resume_files(file_name, file_type, file_size),
        candidates(id, full_name, email)
      `)
      .in("id", jobIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const results = data.map((job) => ({
      jobId: job.id,
      status: job.status,
      candidateId: job.candidate_id,
      candidate: job.candidates,
      file: job.resume_files,
      parsedData: job.parsed_data,
      parseConfidence: job.parse_confidence,
      parserProvider: job.parser_provider,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
