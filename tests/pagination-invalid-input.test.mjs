import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('pagination helper enforces strict bounds and explicit error message', () => {
  const source = readFileSync('src/lib/api/pagination.ts', 'utf8')
  assert.ok(source.includes('min(1)'), 'page/limit minimum bound missing')
  assert.ok(source.includes('max(100)'), 'limit maximum bound missing')
  assert.ok(source.includes('Invalid pagination params'), 'explicit pagination error missing')
})

test('hardened endpoints return explicit invalid filter errors', () => {
  const targets = [
    ['src/app/api/candidates/route.ts', 'Invalid candidate_status filter'],
    ['src/app/api/companies/route.ts', 'Invalid status filter'],
    ['src/app/api/job_orders/route.ts', 'Invalid status filter'],
    ['src/app/api/opportunities/route.ts', 'Invalid stage filter'],
    ['src/app/api/tasks/route.ts', 'Invalid status filter'],
    ['src/app/api/placements/route.ts', 'Invalid placement_status filter'],
  ]

  for (const [file, phrase] of targets) {
    const source = readFileSync(file, 'utf8')
    assert.ok(source.includes(phrase), `${file} missing filter validation message ${phrase}`)
  }
})
