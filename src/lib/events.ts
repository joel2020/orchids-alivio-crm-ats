import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type EventType =
  | "candidate.created"
  | "candidate.updated"
  | "application.created"
  | "application.updated"
  | "activity.created"
  | "interview.created"
  | "interview.updated"
  | "placement.created"
  | "client.created"
  | "client.updated"
  | "contact.created"
  | "contact.updated"
  | "opportunity.created"
  | "opportunity.updated"
  | "opportunity.stageChanged"
  | "task.created"
  | "task.completed"

export type EventPayload = {
  type: EventType
  data: Record<string, unknown>
  metadata?: {
    source?: string
    updateSource?: string
    triggeredBy?: string
    previousStage?: string
    newStage?: string
  }
  timestamp: string
}

async function logActivity(
  objectType: string,
  objectId: string,
  activityType: string,
  payload: Record<string, unknown>,
  extraFields?: Record<string, unknown>
) {
  await supabase.from("activities").insert({
    object_type: objectType,
    object_id: objectId,
    type: activityType,
    payload,
    source: "system",
    timestamp: new Date().toISOString(),
    ...extraFields,
  })
}

async function createAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
  userId?: string
) {
  await supabase.from("audit_logs").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    before_data: beforeData,
    after_data: afterData,
    user_id: userId || null,
  })
}

export async function emitEvent(event: EventPayload): Promise<void> {
  const activityPayload = {
    ...event.data,
    metadata: event.metadata,
  }

  switch (event.type) {
    case "candidate.created": {
      await logActivity("candidate", event.data.id as string, "candidate_created", activityPayload, {
        candidate_id: event.data.id,
      })
      break
    }
    case "candidate.updated": {
      await logActivity("candidate", event.data.id as string, "candidate_updated", activityPayload, {
        candidate_id: event.data.id,
      })
      break
    }
    case "application.created": {
      await logActivity("application", event.data.id as string, "application_created", activityPayload, {
        application_id: event.data.id,
        candidate_id: event.data.candidate_id,
        job_id: event.data.job_id,
      })
      break
    }
    case "application.updated": {
      await logActivity("application", event.data.id as string, "stage_changed", activityPayload, {
        application_id: event.data.id,
        candidate_id: event.data.candidate_id,
        job_id: event.data.job_id,
      })
      break
    }
    case "interview.created": {
      await logActivity("interview", event.data.id as string, "interview_scheduled", activityPayload, {
        application_id: event.data.application_id,
      })
      break
    }
    case "interview.updated": {
      await logActivity("interview", event.data.id as string, "interview_completed", activityPayload, {
        application_id: event.data.application_id,
      })
      break
    }
    case "placement.created": {
      await logActivity("placement", event.data.id as string, "placement_created", activityPayload, {
        application_id: event.data.application_id,
      })
      break
    }
    case "client.created": {
      await logActivity("client", event.data.id as string, "client_created", activityPayload, {
        client_id: event.data.id,
      })
      break
    }
    case "client.updated": {
      await logActivity("client", event.data.id as string, "client_updated", activityPayload, {
        client_id: event.data.id,
      })
      await createAuditLog("client", event.data.id as string, "updated", event.metadata?.before as Record<string, unknown> | null, event.data, event.metadata?.triggeredBy)
      break
    }
    case "contact.created": {
      await logActivity("contact", event.data.id as string, "contact_created", activityPayload, {
        contact_id: event.data.id,
        client_id: event.data.client_id,
      })
      break
    }
    case "contact.updated": {
      await logActivity("contact", event.data.id as string, "contact_updated", activityPayload, {
        contact_id: event.data.id,
        client_id: event.data.client_id,
      })
      break
    }
    case "opportunity.created": {
      await logActivity("opportunity", event.data.id as string, "opportunity_created", activityPayload, {
        client_id: event.data.client_id,
      })
      break
    }
    case "opportunity.updated": {
      await logActivity("opportunity", event.data.id as string, "opportunity_updated", activityPayload, {
        client_id: event.data.client_id,
      })
      break
    }
    case "opportunity.stageChanged": {
      await logActivity("opportunity", event.data.id as string, "opportunity_stage_changed", {
        ...activityPayload,
        previousStage: event.metadata?.previousStage,
        newStage: event.metadata?.newStage,
      }, {
        client_id: event.data.client_id,
      })
      break
    }
    case "task.created": {
      await logActivity("task", event.data.id as string, "task_created", activityPayload, {
        client_id: event.data.client_id,
        contact_id: event.data.contact_id,
        candidate_id: event.data.candidate_id,
        job_id: event.data.job_id,
      })
      break
    }
    case "task.completed": {
      await logActivity("task", event.data.id as string, "task_completed", activityPayload, {
        client_id: event.data.client_id,
        contact_id: event.data.contact_id,
        candidate_id: event.data.candidate_id,
        job_id: event.data.job_id,
      })
      break
    }
    case "activity.created": {
      break
    }
  }
}

export async function emitCandidateCreated(candidate: Record<string, unknown>, source: string = "manual"): Promise<void> {
  await emitEvent({ type: "candidate.created", data: candidate, metadata: { source }, timestamp: new Date().toISOString() })
}

export async function emitCandidateUpdated(candidate: Record<string, unknown>, updateSource: string = "manual"): Promise<void> {
  await emitEvent({ type: "candidate.updated", data: candidate, metadata: { updateSource }, timestamp: new Date().toISOString() })
}

export async function emitApplicationCreated(application: Record<string, unknown>, source: string = "manual"): Promise<void> {
  await emitEvent({ type: "application.created", data: application, metadata: { source }, timestamp: new Date().toISOString() })
}

export async function emitApplicationUpdated(application: Record<string, unknown>, previousStage?: string, newStage?: string): Promise<void> {
  await emitEvent({ type: "application.updated", data: application, metadata: { previousStage, newStage }, timestamp: new Date().toISOString() })
}

export async function emitClientCreated(client: Record<string, unknown>, source: string = "manual"): Promise<void> {
  await emitEvent({ type: "client.created", data: client, metadata: { source }, timestamp: new Date().toISOString() })
}

export async function emitClientUpdated(client: Record<string, unknown>, before?: Record<string, unknown>, triggeredBy?: string): Promise<void> {
  await emitEvent({ type: "client.updated", data: client, metadata: { before: before as unknown as string, triggeredBy }, timestamp: new Date().toISOString() })
}

export async function emitContactCreated(contact: Record<string, unknown>, source: string = "manual"): Promise<void> {
  await emitEvent({ type: "contact.created", data: contact, metadata: { source }, timestamp: new Date().toISOString() })
}

export async function emitContactUpdated(contact: Record<string, unknown>, updateSource: string = "manual"): Promise<void> {
  await emitEvent({ type: "contact.updated", data: contact, metadata: { updateSource }, timestamp: new Date().toISOString() })
}

export async function emitOpportunityCreated(opportunity: Record<string, unknown>, source: string = "manual"): Promise<void> {
  await emitEvent({ type: "opportunity.created", data: opportunity, metadata: { source }, timestamp: new Date().toISOString() })
}

export async function emitOpportunityUpdated(opportunity: Record<string, unknown>): Promise<void> {
  await emitEvent({ type: "opportunity.updated", data: opportunity, timestamp: new Date().toISOString() })
}

export async function emitOpportunityStageChanged(opportunity: Record<string, unknown>, previousStage: string, newStage: string): Promise<void> {
  await emitEvent({ type: "opportunity.stageChanged", data: opportunity, metadata: { previousStage, newStage }, timestamp: new Date().toISOString() })
}

export async function emitTaskCreated(task: Record<string, unknown>): Promise<void> {
  await emitEvent({ type: "task.created", data: task, timestamp: new Date().toISOString() })
}

export async function emitTaskCompleted(task: Record<string, unknown>): Promise<void> {
  await emitEvent({ type: "task.completed", data: task, timestamp: new Date().toISOString() })
}

export async function emitResumeUploadActivity(candidateId: string, jobId: string | null, projectId: string | null, parseConfidence: number | null): Promise<void> {
  await logActivity("candidate", candidateId, "resume_uploaded", {
    jobId,
    projectId,
    parseConfidence,
    message: "Resume uploaded and parsed",
  }, { candidate_id: candidateId, job_id: jobId })
}