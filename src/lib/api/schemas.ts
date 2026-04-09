import { z } from "zod"

export const candidateStatusEnum = z.enum([
  "new",
  "screening",
  "qualified",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "rejected",
  "nurture",
])

export const submissionStatusEnum = z.enum([
  "draft",
  "submitted",
  "client_review",
  "shortlisted",
  "rejected",
  "offer",
  "accepted",
])

export const interviewStageEnum = z.enum(["phone_screen", "technical", "manager", "onsite", "final"])
export const offerStatusEnum = z.enum(["none", "extended", "accepted", "declined", "rescinded"])
export const placementStatusEnum = z.enum(["pending", "active", "guaranteed", "completed", "falloff"])

const id = z.uuid()
const text = z.string().trim().min(1)
const isoDate = z.string().datetime({ offset: true })

export const companiesSchema = z.object({
  name: text,
  website: z.url().optional().nullable(),
  industry: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  status: z.enum(["prospect", "active", "dormant", "lost"]).default("prospect"),
})

export const contactsSchema = z.object({
  company_id: id,
  full_name: text,
  email: z.email(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  is_decision_maker: z.boolean().default(false),
})

export const candidatesSchema = z.object({
  full_name: text,
  email: z.email().optional().nullable(),
  phone: z.string().optional().nullable(),
  candidate_status: candidateStatusEnum.default("new"),
  source: z.string().optional().nullable(),
})

export const jobOrdersSchema = z.object({
  company_id: id,
  title: text,
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  openings: z.number().int().positive().default(1),
  fee_percent: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(["intake", "open", "on_hold", "filled", "closed"]).default("open"),
})

export const submissionsSchema = z.object({
  candidate_id: id,
  job_order_id: id,
  submission_status: submissionStatusEnum.default("draft"),
  submitted_at: isoDate.optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const applicationsSchema = z.object({
  candidate_id: id,
  job_id: id,
  stage: z.enum([
    "sourced",
    "contacted",
    "replied",
    "qualified",
    "submitted",
    "client_interview",
    "final_interview",
    "offer",
    "placed",
    "rejected",
    "nurture",
  ]).default("sourced"),
  status: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
})

export const interviewsSchema = z.object({
  submission_id: id,
  interview_stage: interviewStageEnum,
  starts_at: isoDate,
  ends_at: isoDate.optional().nullable(),
  status: z.enum(["scheduled", "completed", "canceled", "no_show"]).default("scheduled"),
})

export const placementsSchema = z.object({
  submission_id: id,
  candidate_id: id,
  company_id: id,
  job_order_id: id,
  start_date: z.string().date(),
  guarantee_end_date: z.string().date().optional().nullable(),
  fee: z.number().min(0),
  revenue: z.number().min(0),
  placement_status: placementStatusEnum.default("pending"),
  offer_status: offerStatusEnum.default("accepted"),
})

export const tasksSchema = z.object({
  title: text,
  entity_type: z.enum(["company", "contact", "candidate", "job_order", "submission", "placement"]),
  entity_id: id,
  due_date: z.string().date().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["open", "in_progress", "done"]).default("open"),
})

export const opportunitiesSchema = z.object({
  name: text,
  company_id: z.uuid(),
  contact_id: z.uuid().optional().nullable(),
  job_order_id: z.uuid().optional().nullable(),
  stage: z.enum(["lead", "qualification", "proposal", "verbal", "won", "lost"]).default("lead"),
  value: z.number().min(0).optional().nullable(),
  currency: z.string().default("USD"),
  probability: z.number().int().min(0).max(100).default(20),
  expected_close_date: z.string().date().optional().nullable(),
  actual_close_date: z.string().date().optional().nullable(),
  reason_lost: z.enum(["price", "timing", "competition", "no_budget", "no_decision", "other"]).optional().nullable(),
  reason_lost_text: z.string().optional().nullable(),
  source: z.enum(["referral", "outbound", "inbound", "existing_client", "other"]).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const activitiesSchema = z.object({
  object_type: z.string().min(1),
  object_id: id,
  type: z.string().min(1),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  source: z.enum(["manual", "system", "instantly", "n8n"]).default("manual"),
})

export type SchemaMap = {
  candidates: typeof candidatesSchema
  contacts: typeof contactsSchema
  companies: typeof companiesSchema
  job_orders: typeof jobOrdersSchema
  submissions: typeof submissionsSchema
  applications: typeof applicationsSchema
  interviews: typeof interviewsSchema
  placements: typeof placementsSchema
  tasks: typeof tasksSchema
  activities: typeof activitiesSchema
  opportunities: typeof opportunitiesSchema
}
