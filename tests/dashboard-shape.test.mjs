import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const overview = readFileSync('src/app/api/dashboard/overview/route.ts', 'utf8')
const pipeline = readFileSync('src/app/api/dashboard/pipeline/route.ts', 'utf8')

test('dashboard overview response shape includes key aggregates', () => {
  const keys = ['companies:', 'candidates:', 'job_orders:', 'submissions:', 'placements:', 'total_revenue:', 'total_fee:', 'open_opportunity_value:']
  for (const key of keys) {
    assert.ok(overview.includes(key), `overview missing ${key}`)
  }
})

test('dashboard pipeline response shape includes stage buckets', () => {
  const keys = ['submissions:', 'interviews:', 'interviews_by_status:', 'placements:', 'offers:', 'applications:']
  for (const key of keys) {
    assert.ok(pipeline.includes(key), `pipeline missing ${key}`)
  }
})
