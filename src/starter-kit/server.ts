import {
  createCandidate,
  createJobOrder,
  createSubmission,
  health,
  sourceCandidateWebhook,
} from "./routes";

export function registerStarterRoutes() {
  return {
    "GET /api/v1/health": health,
    "POST /api/v1/candidates": createCandidate,
    "POST /api/v1/job-orders": createJobOrder,
    "POST /api/v1/submissions": createSubmission,
    "POST /api/v1/webhooks/source-candidate": sourceCandidateWebhook,
  };
}
