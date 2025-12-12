export type ClientStatus = 'prospect' | 'active' | 'dormant' | 'lost'
export type ClientTier = 'A' | 'B' | 'C'

export type Client = {
  id: string
  name: string
  website: string | null
  size_band: string | null
  industry: string | null
  region: string | null
  status: ClientStatus
  tier: ClientTier
  billing_email: string | null
  user_id: string | null
  owner_id: string | null
  created_at: string
  updated_at?: string
}

export type ContactSeniority = 'c_level' | 'vp' | 'director' | 'manager' | 'ic'

export type ClientContact = {
  id: string
  client_id: string
  name: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  phones: string[]
  title: string | null
  department: string | null
  seniority: ContactSeniority | null
  role_type: string | null
  notes: string | null
  is_decision_maker: boolean
  linkedin_url: string | null
  owner_id: string | null
  is_primary_contact: boolean
  created_at: string
  updated_at?: string
  clients?: Client
}

export type Project = {
  id: string
  client_id: string
  name: string
  model: string | null
  start_date: string | null
  status: string | null
  cal_event_type_id: string | null
  cal_org_slug: string | null
  cal_base_url: string | null
  created_at: string
  clients?: Client
}

export type Job = {
  id: string
  project_id: string
  title: string
  level: string | null
  location: string | null
  compensation_min: number | null
  compensation_max: number | null
  urgency: string | null
  status: string | null
  created_at: string
  projects?: Project & { clients?: Client }
}

export type Candidate = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  location: string | null
  current_title: string | null
  current_company: string | null
  source: string | null
  user_id: string | null
  created_at: string
}

export type ApplicationStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

export type Application = {
  id: string
  candidate_id: string
  job_id: string
  status: string | null
  stage: ApplicationStage | null
  position: number
  rejection_reason: string | null
  created_at: string
  updated_at: string
  candidates?: Candidate
  jobs?: Job & { projects?: Project & { clients?: Client } }
}

export type InterviewStatus = 'scheduled' | 'completed' | 'canceled' | 'no_show'

export type Interview = {
  id: string
  application_id: string
  stage: string | null
  start_time: string | null
  end_time: string | null
  cal_booking_id: string | null
  status: InterviewStatus | null
  created_at: string
  applications?: Application & { candidates?: Candidate; jobs?: Job }
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'system_event' | 'client_created' | 'project_created' | 'job_created' | 'candidate_created' | 'application_created' | 'stage_changed' | 'interview_scheduled' | 'interview_completed' | 'note_added' | 'status_changed'
export type ActivityDirection = 'inbound' | 'outbound'
export type ActivitySource = 'manual' | 'instantly' | 'n8n' | 'system'

export type Activity = {
  id: string
  object_type: string | null
  object_id: string | null
  type: ActivityType | string | null
  subject: string | null
  body: string | null
  direction: ActivityDirection | null
  timestamp: string
  payload: Record<string, unknown> | null
  user_id: string | null
  owner_id: string | null
  source: ActivitySource | null
  client_id: string | null
  contact_id: string | null
  candidate_id: string | null
  job_id: string | null
  application_id: string | null
  external_message_id: string | null
  email_provider: string | null
  created_at: string
}

export type SequenceInst = {
  id: string
  application_id: string
  instantly_lead_id: string | null
  instantly_campaign_id: string | null
  stage: string | null
  current_step: number
  next_run_at: string | null
  status: string | null
  last_event_at: string | null
  created_at: string
}

export type Account = {
  id: string
  name: string
  slug: string | null
  plan: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type OpportunityStage = 'lead' | 'qualification' | 'proposal' | 'verbal' | 'won' | 'lost'
export type OpportunitySource = 'referral' | 'outbound' | 'inbound' | 'existing_client' | 'other'
export type ReasonLost = 'price' | 'timing' | 'competition' | 'no_budget' | 'no_decision' | 'other'

export type Opportunity = {
  id: string
  account_id: string
  client_id: string | null
  project_id: string | null
  primary_contact_id: string | null
  linked_job_id: string | null
  name: string
  stage: OpportunityStage
  value: number | null
  currency: string
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  reason_lost: ReasonLost | null
  reason_lost_text: string | null
  source: OpportunitySource | null
  owner_user_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: Client
  projects?: Project
  primary_contact?: ClientContact
}

export type TaskStatus = 'open' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  account_id: string
  entity_type: string
  entity_id: string
  title: string
  description: string | null
  assignee_user_id: string | null
  due_date: string | null
  completed_at: string | null
  status: TaskStatus
  priority: TaskPriority
  client_id: string | null
  contact_id: string | null
  candidate_id: string | null
  job_id: string | null
  application_id: string | null
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'recruiter' | 'readonly'

export type User = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export type AuditLog = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  user_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  created_at: string
}

export type Note = {
  id: string
  account_id: string
  entity_type: string
  entity_id: string
  content: string
  author_user_id: string | null
  created_at: string
  updated_at: string
}

export type Tag = {
  id: string
  account_id: string
  name: string
  color: string
  created_at: string
}

export type InstantlyConnection = {
  id: string
  account_id: string
  label: string
  instantly_account_id: string | null
  status: string
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type InstantlyCampaign = {
  id: string
  account_id: string
  connection_id: string
  instantly_campaign_id: string
  name: string
  status: string
  stats_sends: number
  stats_opens: number
  stats_clicks: number
  stats_replies: number
  stats_bounces: number
  created_at: string
  updated_at: string
}

export type InstantlyEventType = 'send' | 'open' | 'click' | 'reply' | 'bounce' | 'unsubscribe'

export type InstantlyEmailEvent = {
  id: string
  account_id: string
  connection_id: string
  campaign_id: string | null
  prospect_id: string | null
  event_type: InstantlyEventType
  occurred_at: string
  metadata: Record<string, unknown>
  is_reply: boolean
  is_bounce: boolean
  created_at: string
}

export type Placement = {
  id: string
  application_id: string
  status: string | null
  start_date: string | null
  fee: number | null
  currency: string
  notes: string | null
  account_id: string | null
  created_at: string
  updated_at: string
  applications?: Application
}

export type ResumeFile = {
  id: string
  candidate_id: string | null
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  file_hash: string | null
  account_id: string | null
  created_at: string
}

export type ParseJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type ResumeParseJob = {
  id: string
  resume_file_id: string
  status: ParseJobStatus
  job_id: string | null
  project_id: string | null
  candidate_id: string | null
  parsed_data: ParsedResume | null
  parse_confidence: number | null
  parser_provider: string | null
  error_message: string | null
  account_id: string | null
  created_at: string
  updated_at: string
}

export type ParsedResume = {
  fullName: string | null
  firstName: string | null
  lastName: string | null
  primaryEmail: string | null
  secondaryEmails: string[]
  phoneNumbers: string[]
  currentLocation: {
    city: string | null
    state: string | null
    country: string | null
  } | null
  relocationOpen: boolean
  remotePreference: 'on-site' | 'hybrid' | 'remote' | 'unknown'
  currentTitle: string | null
  currentCompany: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  personalWebsiteUrl: string | null
  summary: string | null
  experience: {
    companyName: string
    title: string
    startDate: string | null
    endDate: string | null
    isCurrent: boolean
    location: string | null
    responsibilities: string | null
    skills: string[]
  }[]
  education: {
    institutionName: string
    degree: string | null
    fieldOfStudy: string | null
    startDate: string | null
    endDate: string | null
  }[]
  skills: {
    name: string
    level: string | null
    yearsExperience: number | null
  }[]
  rawJson?: Record<string, unknown>
}

export const CLIENT_STATUSES: ClientStatus[] = ['prospect', 'active', 'dormant', 'lost']
export const CLIENT_TIERS: ClientTier[] = ['A', 'B', 'C']
export const CONTACT_SENIORITIES: ContactSeniority[] = ['c_level', 'vp', 'director', 'manager', 'ic']
export const PLACEMENT_STATUSES = ['pending', 'confirmed', 'started', 'completed', 'cancelled'] as const

export const APPLICATION_STAGES: ApplicationStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected'
]

export const JOB_STATUSES = ['draft', 'open', 'paused', 'closed', 'filled'] as const
export const PROJECT_STATUSES = ['active', 'paused', 'closed'] as const
export const PROJECT_MODELS = ['retained', 'contingent', 'sprint', 'talent_engine'] as const
export const INTERVIEW_STAGES = ['screen', 'hiring_manager', 'panel', 'final'] as const
export const INTERVIEW_STATUSES: InterviewStatus[] = ['scheduled', 'completed', 'canceled', 'no_show']
export const CONTACT_ROLE_TYPES = ['decision_maker', 'recruiting', 'finance'] as const
export const ACTIVITY_TYPES: string[] = ['call', 'email', 'meeting', 'note', 'task', 'system_event', 'client_created', 'project_created', 'job_created', 'candidate_created', 'application_created', 'stage_changed', 'interview_scheduled', 'interview_completed', 'note_added', 'status_changed']
export const OPPORTUNITY_STAGES: OpportunityStage[] = ['lead', 'qualification', 'proposal', 'verbal', 'won', 'lost']
export const OPPORTUNITY_SOURCES: OpportunitySource[] = ['referral', 'outbound', 'inbound', 'existing_client', 'other']
export const REASONS_LOST: ReasonLost[] = ['price', 'timing', 'competition', 'no_budget', 'no_decision', 'other']
export const TASK_STATUSES: TaskStatus[] = ['open', 'in_progress', 'done']
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']
export const USER_ROLES: UserRole[] = ['admin', 'recruiter', 'readonly']