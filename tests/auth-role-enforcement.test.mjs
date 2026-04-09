import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routeExpectations = [
  ['src/app/api/companies/route.ts', 'requireApiAuth(request, "readonly")', 'requireApiAuth(request, "bizdev")'],
  ['src/app/api/companies/[id]/route.ts', 'requireApiAuth(request, "readonly")', 'requireApiAuth(request, "bizdev")', 'requireApiAuth(request, "admin")'],
  ['src/app/api/submissions/[id]/route.ts', 'requireApiAuth(request, "readonly")', 'requireApiAuth(request, "recruiter")', 'requireApiAuth(request, "admin")'],
  ['src/app/api/placements/route.ts', 'requireApiAuth(request, "readonly")', 'requireApiAuth(request, "recruiter")'],
]

test('API routes enforce explicit role checks', () => {
  for (const [file, ...checks] of routeExpectations) {
    const source = readFileSync(file, 'utf8')
    for (const check of checks) {
      assert.ok(source.includes(check), `${file} is missing ${check}`)
    }
  }
})
