import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const health = readFileSync('src/app/api/health/route.ts', 'utf8')
const ready = readFileSync('src/app/api/ready/route.ts', 'utf8')
const http = readFileSync('src/lib/api/http.ts', 'utf8')

test('health and readiness endpoints exist with deterministic status fields', () => {
  assert.ok(health.includes('status: "ok"'), 'health endpoint missing status ok')
  assert.ok(ready.includes('status: ready ? "ready" : "not_ready"'), 'readiness status not deterministic')
  assert.ok(ready.includes('checks: { env: ready }'), 'readiness checks missing env key')
})

test('structured API error logging and response helper are present', () => {
  assert.ok(http.includes('errorResponse('), 'errorResponse helper missing')
  assert.ok(http.includes('logApiError('), 'logApiError helper missing')
  assert.ok(!ready.includes('env: {'), 'readiness response should expose only boolean check state')
})
