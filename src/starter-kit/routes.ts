import type { CandidateRecord, JobOrderRecord, SubmissionRecord } from "./types";

const memory = {
  candidates: [] as CandidateRecord[],
  jobs: [] as JobOrderRecord[],
  submissions: [] as SubmissionRecord[],
};

export function health() {
  return { ok: true, service: "alivio-recruiting-automation-kit" };
}

export function createCandidate(input: CandidateRecord) {
  memory.candidates.push(input);
  return input;
}

export function createJobOrder(input: JobOrderRecord) {
  memory.jobs.push(input);
  return input;
}

export function createSubmission(input: SubmissionRecord) {
  memory.submissions.push(input);
  return input;
}

export function sourceCandidateWebhook(payload: unknown) {
  return {
    status: "received",
    receivedAt: new Date().toISOString(),
    payload,
  };
}
