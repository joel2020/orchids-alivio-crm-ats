import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiAuth } from "@/lib/auth"

type CandidateRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
}

const leadSchema = z.object({
  businessName: z.string().trim().optional().nullable(),
  ownerFirstName: z.string().trim().min(1, "Owner first name is required"),
  ownerLastName: z.string().trim().min(1, "Owner last name is required"),
  cellPhone: z.string().trim().min(7, "Cell phone is required"),
  email: z.string().trim().email("Valid email is required"),
  monthlyRevenue: z.string().trim().optional().nullable(),
  requestedFundingAmount: z.string().trim().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  leadSource: z.string().trim().optional().nullable(),
  ein: z.string().trim().optional().nullable(),
  ssn: z.string().trim().optional().nullable(),
  businessAddress: z.string().trim().optional().nullable(),
  timeInBusiness: z.string().trim().optional().nullable(),
  averageMonthlyDeposits: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  assignedRep: z.string().trim().optional().nullable(),
  status: z.string().trim().optional().nullable(),
})

const requestSchema = z.object({
  rows: z.array(leadSchema).min(1),
  duplicateMode: z.enum(["skip", "update", "import_new"]).default("skip"),
  fileName: z.string().trim().optional().nullable(),
})

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "")
}

function fullName(row: z.infer<typeof leadSchema>) {
  return `${row.ownerFirstName} ${row.ownerLastName}`.trim()
}

function buildNotes(row: z.infer<typeof leadSchema>, batchId: string, fileName?: string | null) {
  const details = [
    `Bulk upload batch: ${batchId}`,
    fileName ? `Original file: ${fileName}` : null,
    row.businessName ? `Business: ${row.businessName}` : null,
    row.monthlyRevenue ? `Monthly revenue: ${row.monthlyRevenue}` : null,
    row.requestedFundingAmount ? `Requested funding: ${row.requestedFundingAmount}` : null,
    row.industry ? `Industry: ${row.industry}` : null,
    row.state ? `State: ${row.state}` : null,
    row.ein ? `EIN: ${row.ein}` : null,
    row.ssn ? `SSN: ${row.ssn}` : null,
    row.businessAddress ? `Business address: ${row.businessAddress}` : null,
    row.timeInBusiness ? `Time in business: ${row.timeInBusiness}` : null,
    row.averageMonthlyDeposits ? `Average monthly deposits: ${row.averageMonthlyDeposits}` : null,
    row.assignedRep ? `Assigned rep: ${row.assignedRep}` : null,
    row.status ? `Status: ${row.status}` : null,
    row.notes ? `Notes: ${row.notes}` : null,
  ].filter(Boolean)

  return details.join("\n")
}

function findDuplicate(row: z.infer<typeof leadSchema>, existing: CandidateRow[]) {
  const email = normalize(row.email)
  const phone = normalizePhone(row.cellPhone)
  const name = normalize(fullName(row))

  return existing.find((candidate) => {
    const candidateEmail = normalize(candidate.email)
    const candidatePhone = normalizePhone(candidate.phone)
    const candidateName = normalize(candidate.full_name)
    return Boolean(
      (email && candidateEmail && email === candidateEmail) ||
      (phone && candidatePhone && phone === candidatePhone) ||
      (name && candidateName && name === candidateName)
    )
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "recruiter")
  if (auth.response) return auth.response

  const { supabase, accountId, user } = auth.context!
  const parsed = requestSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 })
  }

  const { rows, duplicateMode, fileName } = parsed.data
  const batchId = crypto.randomUUID()

  const { data: existingCandidates, error: existingError } = await supabase
    .from("candidates")
    .select("id, full_name, email, phone")
    .eq("account_id", accountId)
    .limit(10000)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 })
  }

  const existing = (existingCandidates || []) as CandidateRow[]
  const imported: unknown[] = []
  const updated: unknown[] = []
  const duplicates: unknown[] = []
  const failed: { rowNumber: number; error: string; row: unknown }[] = []

  for (const [index, row] of rows.entries()) {
    const duplicate = findDuplicate(row, existing)
    const basePayload = {
      account_id: accountId,
      full_name: fullName(row),
      email: row.email || null,
      phone: row.cellPhone || null,
      source: row.leadSource || "Bulk Upload",
      candidate_status: row.status || "new",
      notes: buildNotes(row, batchId, fileName),
      updated_at: new Date().toISOString(),
    }

    if (duplicate && duplicateMode === "skip") {
      duplicates.push({ rowNumber: index + 1, duplicateId: duplicate.id, row })
      continue
    }

    if (duplicate && duplicateMode === "update") {
      const { data, error } = await supabase
        .from("candidates")
        .update(basePayload)
        .eq("account_id", accountId)
        .eq("id", duplicate.id)
        .select("*")
        .single()

      if (error) failed.push({ rowNumber: index + 1, error: error.message, row })
      else updated.push(data)
      continue
    }

    const { data, error } = await supabase
      .from("candidates")
      .insert({ ...basePayload, created_at: new Date().toISOString() })
      .select("*")
      .single()

    if (error) {
      failed.push({ rowNumber: index + 1, error: error.message, row })
    } else {
      imported.push(data)
      existing.push(data as CandidateRow)
    }
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    user_id: user.id,
    object_type: "bulk_upload",
    object_id: null,
    type: "bulk_lead_upload_completed",
    source: "system",
    payload: {
      batch_id: batchId,
      file_name: fileName,
      duplicate_mode: duplicateMode,
      total_rows: rows.length,
      imported: imported.length,
      updated: updated.length,
      duplicates: duplicates.length,
      failed: failed.length,
    },
  })

  return NextResponse.json({
    batchId,
    fileName,
    totalRows: rows.length,
    imported: imported.length,
    updated: updated.length,
    duplicates: duplicates.length,
    failed: failed.length,
    duplicateRows: duplicates,
    failedRows: failed,
  })
}
