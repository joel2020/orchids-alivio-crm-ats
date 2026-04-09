/**
 * @typedef {{ id: string, candidate_id: string, job_order_id: string, submission_status?: string }} Submission
 * @typedef {{ id: string, company_id?: string | null, fee_percent?: number | null }} JobOrder
 */

/**
 * @param {Submission} submission
 * @param {JobOrder | null | undefined} jobOrder
 */
export function validatePlacementPrerequisites(submission, jobOrder) {
  if (!submission?.id || !submission?.candidate_id || !submission?.job_order_id) {
    throw new Error("Submission must include id, candidate_id, and job_order_id")
  }

  if (!jobOrder?.id || !jobOrder.company_id) {
    throw new Error("Job order must include id and company_id")
  }

  const fee = Number(jobOrder.fee_percent ?? 0)
  if (Number.isNaN(fee) || fee < 0) {
    throw new Error("Placement fee must be non-negative")
  }

  return { fee }
}

/**
 * @param {Submission} submission
 * @param {JobOrder} jobOrder
 */
export function createPlacementPayload(submission, jobOrder) {
  const { fee } = validatePlacementPrerequisites(submission, jobOrder)

  return {
    submission_id: submission.id,
    candidate_id: submission.candidate_id,
    job_order_id: submission.job_order_id,
    company_id: jobOrder.company_id,
    start_date: new Date().toISOString().slice(0, 10),
    guarantee_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10),
    fee,
    revenue: fee,
    placement_status: "active",
    offer_status: "accepted",
  }
}
