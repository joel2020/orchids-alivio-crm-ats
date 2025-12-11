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

export type EventPayload = {
  type: EventType
  data: Record<string, unknown>
  metadata?: {
    source?: string
    updateSource?: string
    triggeredBy?: string
  }
  timestamp: string
}

async function logActivity(
  objectType: string,
  objectId: string,
  activityType: string,
  payload: Record<string, unknown>
) {
  await supabase.from("activities").insert({
    object_type: objectType,
    object_id: objectId,
    type: activityType,
    payload,
  })
}

export async function emitEvent(event: EventPayload): Promise<void> {
  const activityPayload = {
    ...event.data,
    metadata: event.metadata,
  }

  switch (event.type) {
    case "candidate.created": {
      await logActivity(
        "candidate",
        event.data.id as string,
        "candidate_created",
        activityPayload
      )
      break
    }
    case "candidate.updated": {
      await logActivity(
        "candidate",
        event.data.id as string,
        "candidate_updated",
        activityPayload
      )
      break
    }
    case "application.created": {
      await logActivity(
        "application",
        event.data.id as string,
        "application_created",
        activityPayload
      )
      break
    }
    case "application.updated": {
      await logActivity(
        "application",
        event.data.id as string,
        "stage_changed",
        activityPayload
      )
      break
    }
    case "interview.created": {
      await logActivity(
        "interview",
        event.data.id as string,
        "interview_scheduled",
        activityPayload
      )
      break
    }
    case "interview.updated": {
      await logActivity(
        "interview",
        event.data.id as string,
        "interview_completed",
        activityPayload
      )
      break
    }
    case "placement.created": {
      await logActivity(
        "placement",
        event.data.id as string,
        "placement_created",
        activityPayload
      )
      break
    }
    case "activity.created": {
      break
    }
  }
}

export async function emitCandidateCreated(
  candidate: Record<string, unknown>,
  source: string = "manual"
): Promise<void> {
  await emitEvent({
    type: "candidate.created",
    data: candidate,
    metadata: { source },
    timestamp: new Date().toISOString(),
  })
}

export async function emitCandidateUpdated(
  candidate: Record<string, unknown>,
  updateSource: string = "manual"
): Promise<void> {
  await emitEvent({
    type: "candidate.updated",
    data: candidate,
    metadata: { updateSource },
    timestamp: new Date().toISOString(),
  })
}

export async function emitApplicationCreated(
  application: Record<string, unknown>,
  source: string = "manual"
): Promise<void> {
  await emitEvent({
    type: "application.created",
    data: application,
    metadata: { source },
    timestamp: new Date().toISOString(),
  })
}

export async function emitResumeUploadActivity(
  candidateId: string,
  jobId: string | null,
  projectId: string | null,
  parseConfidence: number | null
): Promise<void> {
  await logActivity("candidate", candidateId, "resume_uploaded", {
    jobId,
    projectId,
    parseConfidence,
    message: "Resume uploaded and parsed",
  })
}
