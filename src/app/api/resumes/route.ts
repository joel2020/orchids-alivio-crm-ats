import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseResume } from "@/lib/resume-parser"
import {
  emitCandidateCreated,
  emitCandidateUpdated,
  emitApplicationCreated,
  emitResumeUploadActivity,
} from "@/lib/events"
import { createHash } from "crypto"
import { requireApiAuth } from "@/lib/auth"

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]
const MAX_FILE_SIZE = 10 * 1024 * 1024

function getFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex")
}

async function findCandidateByEmail(email: string, accountId: string) {
  const { data } = await serviceSupabase
    .from("candidates")
    .select("*")
    .eq("account_id", accountId)
    .ilike("email", email)
    .single()
  return data
}

async function findCandidateByNameAndLinkedIn(
  fullName: string,
  linkedinUrl: string | null,
  accountId: string
) {
  if (linkedinUrl) {
    const { data } = await serviceSupabase
      .from("candidates")
      .select("*")
      .eq("account_id", accountId)
      .ilike("linkedin_url", linkedinUrl)
      .single()
    if (data) return data
  }

  const { data } = await serviceSupabase
    .from("candidates")
    .select("*")
    .eq("account_id", accountId)
    .ilike("full_name", fullName)
    .single()
  return data
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response
  const { accountId } = auth.context!

  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const jobId = formData.get("jobId") as string | null
    const projectId = formData.get("projectId") as string | null

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (files.length > 20) {
      return NextResponse.json({ error: "Maximum 20 files per upload" }, { status: 400 })
    }

    const results: {
      jobId: string
      fileName: string
      status: "pending" | "error"
      error?: string
    }[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({
          jobId: "",
          fileName: file.name,
          status: "error",
          error: `Unsupported file type: ${file.type}. Allowed: PDF, DOCX, DOC, TXT`,
        })
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        results.push({
          jobId: "",
          fileName: file.name,
          status: "error",
          error: `File too large. Maximum size is 10MB`,
        })
        continue
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const fileHash = getFileHash(buffer)

      const { data: existingFile } = await serviceSupabase
        .from("resume_files")
        .select("id")
        .eq("file_hash", fileHash)
        .single()

      if (existingFile) {
        results.push({
          jobId: "",
          fileName: file.name,
          status: "error",
          error: "Duplicate file already processed",
        })
        continue
      }

      const storagePath = `resumes/${Date.now()}_${file.name}`

      const { error: uploadError } = await serviceSupabase.storage
        .from("resumes")
        .upload(storagePath, buffer, {
          contentType: file.type,
        })

      if (uploadError) {
        results.push({
          jobId: "",
          fileName: file.name,
          status: "error",
          error: `Storage upload failed: ${uploadError.message}`,
        })
        continue
      }

      const { data: resumeFile, error: fileInsertError } = await serviceSupabase
        .from("resume_files")
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          file_hash: fileHash,
          account_id: accountId,
        })
        .select()
        .single()

      if (fileInsertError || !resumeFile) {
        results.push({
          jobId: "",
          fileName: file.name,
          status: "error",
          error: `Failed to save file record: ${fileInsertError?.message}`,
        })
        continue
      }

      const { data: parseJob, error: jobInsertError } = await serviceSupabase
        .from("resume_parse_jobs")
        .insert({
          resume_file_id: resumeFile.id,
          status: "pending",
          job_id: jobId,
          project_id: projectId,
          account_id: accountId,
        })
        .select()
        .single()

      if (jobInsertError || !parseJob) {
        results.push({
          jobId: "",
          fileName: file.name,
          status: "error",
          error: `Failed to create parse job: ${jobInsertError?.message}`,
        })
        continue
      }

      results.push({
        jobId: parseJob.id,
        fileName: file.name,
        status: "pending",
      })

      processResumeAsync(parseJob.id, buffer, file.type, jobId, projectId, accountId)
    }

    return NextResponse.json({ results }, { status: 200 })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function processResumeAsync(
  parseJobId: string,
  fileBuffer: Buffer,
  fileType: string,
  jobId: string | null,
  projectId: string | null,
  accountId: string
) {
  try {
    await serviceSupabase
      .from("resume_parse_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
            .eq("account_id", accountId)
      .eq("id", parseJobId)

    const { data: parsedData, confidence, provider } = await parseResume(
      fileBuffer,
      fileType
    )

    let candidateId: string | null = null

    let existingCandidate = null
    if (parsedData.primaryEmail) {
      existingCandidate = await findCandidateByEmail(parsedData.primaryEmail, accountId)
    }

    if (!existingCandidate && parsedData.fullName) {
      existingCandidate = await findCandidateByNameAndLinkedIn(
        parsedData.fullName,
        parsedData.linkedinUrl,
        accountId
      )
    }

    if (existingCandidate) {
      candidateId = existingCandidate.id
      const updates: Record<string, unknown> = {}

      if (!existingCandidate.linkedin_url && parsedData.linkedinUrl) {
        updates.linkedin_url = parsedData.linkedinUrl
      }
      if (!existingCandidate.phone && parsedData.phoneNumbers[0]) {
        updates.phone = parsedData.phoneNumbers[0]
      }
      if (!existingCandidate.location && parsedData.currentLocation?.city) {
        updates.location = parsedData.currentLocation.city
      }
      if (!existingCandidate.current_title && parsedData.currentTitle) {
        updates.current_title = parsedData.currentTitle
      }
      if (!existingCandidate.current_company && parsedData.currentCompany) {
        updates.current_company = parsedData.currentCompany
      }

      if (Object.keys(updates).length > 0) {
        await serviceSupabase
          .from("candidates")
          .update(updates)
                    .eq("account_id", accountId)
          .eq("id", candidateId)

        const { data: updatedCandidate } = await serviceSupabase
          .from("candidates")
          .select("*")
                    .eq("account_id", accountId)
          .eq("id", candidateId)
          .single()

        if (updatedCandidate) {
          await emitCandidateUpdated(updatedCandidate, "resume_parser")
        }
      }
    } else {
      const { data: newCandidate, error: candidateError } = await serviceSupabase
        .from("candidates")
        .insert({
          full_name: parsedData.fullName || "Unknown",
          email: parsedData.primaryEmail,
          phone: parsedData.phoneNumbers[0] || null,
          linkedin_url: parsedData.linkedinUrl,
          location: parsedData.currentLocation?.city || null,
          current_title: parsedData.currentTitle,
          current_company: parsedData.currentCompany,
          source: "resume_upload",
          account_id: accountId,
        })
        .select()
        .single()

      if (candidateError || !newCandidate) {
        throw new Error(`Failed to create candidate: ${candidateError?.message}`)
      }

      candidateId = newCandidate.id

      await emitCandidateCreated(newCandidate, "resume_upload")
    }

    await serviceSupabase
      .from("resume_files")
      .update({ candidate_id: candidateId })
            .eq("account_id", accountId)
      .eq("id", (
        await serviceSupabase
          .from("resume_parse_jobs")
          .select("resume_file_id")
                .eq("account_id", accountId)
      .eq("id", parseJobId)
          .single()
      ).data?.resume_file_id)

    if (jobId && candidateId) {
      const { data: existingApp } = await serviceSupabase
        .from("applications")
        .select("id")
                .eq("account_id", accountId)
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .single()

      if (!existingApp) {
        const { data: newApplication } = await serviceSupabase
          .from("applications")
          .insert({
            candidate_id: candidateId,
            job_id: jobId,
            stage: "applied",
            status: "new",
            account_id: accountId,
          })
          .select()
          .single()

        if (newApplication) {
          await emitApplicationCreated(
            { ...newApplication, source: "resume_upload" },
            "resume_upload"
          )
        }
      }
    }

    await emitResumeUploadActivity(candidateId!, jobId, projectId, confidence)

    await serviceSupabase
      .from("resume_parse_jobs")
      .update({
        status: "completed",
        candidate_id: candidateId,
        parsed_data: parsedData,
        parse_confidence: confidence,
        parser_provider: provider,
        updated_at: new Date().toISOString(),
      })
            .eq("account_id", accountId)
      .eq("id", parseJobId)
  } catch (error) {
    console.error("Resume processing error:", error)
    await serviceSupabase
      .from("resume_parse_jobs")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
            .eq("account_id", accountId)
      .eq("id", parseJobId)
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "Resume upload endpoint" })
}