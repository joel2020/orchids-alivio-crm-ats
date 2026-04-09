import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlacementPayload } from '../src/lib/workflow/placement.js'

function createId(prefix, index) {
  return `${prefix}-${index}`
}

test('end-to-end workflow path produces placement from accepted canonical submission', () => {
  const company = { id: createId('company', 1) }
  const contact = { id: createId('contact', 1), company_id: company.id }
  const opportunity = { id: createId('opportunity', 1), company_id: company.id, contact_id: contact.id }
  const jobOrder = { id: createId('job', 1), company_id: company.id, opportunity_id: opportunity.id, fee_percent: 25 }
  const candidate = { id: createId('candidate', 1) }
  const submission = {
    id: createId('submission', 1),
    candidate_id: candidate.id,
    job_order_id: jobOrder.id,
    submission_status: 'accepted',
  }
  const interview = { id: createId('interview', 1), submission_id: submission.id }

  assert.equal(contact.company_id, company.id)
  assert.equal(opportunity.company_id, company.id)
  assert.equal(opportunity.contact_id, contact.id)
  assert.equal(jobOrder.company_id, company.id)
  assert.equal(jobOrder.opportunity_id, opportunity.id)
  assert.equal(submission.candidate_id, candidate.id)
  assert.equal(submission.job_order_id, jobOrder.id)
  assert.equal(interview.submission_id, submission.id)

  const placement = createPlacementPayload(submission, {
    id: jobOrder.id,
    company_id: jobOrder.company_id,
    fee_percent: jobOrder.fee_percent,
  })

  assert.equal(placement.submission_id, submission.id)
  assert.equal(placement.candidate_id, candidate.id)
  assert.equal(placement.job_order_id, jobOrder.id)
  assert.equal(placement.company_id, company.id)
  assert.equal(placement.fee, 25)
  assert.equal(placement.revenue, 25)
  assert.equal(placement.offer_status, 'accepted')
})

test('placement creation fails without canonical submission prerequisites', () => {
  assert.throws(
    () => createPlacementPayload({ id: 's1', candidate_id: 'c1', job_order_id: 'j1' }, { id: 'j1', company_id: null, fee_percent: 20 }),
    /company_id/
  )

  assert.throws(
    () => createPlacementPayload({ id: 's1', candidate_id: 'c1', job_order_id: 'j1' }, { id: 'j1', company_id: 'co1', fee_percent: -1 }),
    /non-negative/
  )
})
