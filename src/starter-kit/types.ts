export type PipelineStage =
  | "new_lead"
  | "sourced"
  | "screening"
  | "submitted"
  | "interview"
  | "offer"
  | "placed"
  | "rejected"
  | "on_hold";

export interface CandidateRecord {
  id?: string;
  fullName: string;
  email?: string;
  phone?: string;
  currentTitle?: string;
  stage: PipelineStage;
  source?: string;
  notes?: string;
}

export interface JobOrderRecord {
  id?: string;
  clientId: string;
  title: string;
  location?: string;
  employmentType?: "full-time" | "part-time" | "contract" | "temporary";
  salaryMin?: number;
  salaryMax?: number;
  status: "open" | "on_hold" | "closed";
}

export interface SubmissionRecord {
  id?: string;
  candidateId: string;
  jobOrderId: string;
  status:
    | "draft"
    | "sent_to_client"
    | "client_review"
    | "interviewing"
    | "offer"
    | "accepted"
    | "declined"
    | "closed";
}
