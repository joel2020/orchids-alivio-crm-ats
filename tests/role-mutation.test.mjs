import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const expectations = {
  'src/app/api/companies/route.ts': ['"bizdev"'],
  'src/app/api/contacts/route.ts': ['"bizdev"'],
  'src/app/api/job_orders/route.ts': ['"bizdev"'],
  'src/app/api/submissions/route.ts': ['"recruiter"'],
  'src/app/api/placements/route.ts': ['"recruiter"'],
  'src/app/api/tasks/route.ts': ['"recruiter"'],
  'src/app/api/interviews/route.ts': ['"recruiter"'],
}

test('mutation roles are explicit by endpoint', () => {
  for (const [file, roles] of Object.entries(expectations)) {
    const source = readFileSync(file, 'utf8')
    for (const role of roles) {
      assert.ok(source.includes(`requireApiAuth(request, ${role})`), `${file} missing mutation role ${role}`)
    }
  }
})

test('placements id route supports update/delete guards', () => {
  const source = readFileSync('src/app/api/placements/[id]/route.ts', 'utf8')
  assert.ok(source.includes('export async function PATCH'), 'placements/[id] missing PATCH')
  assert.ok(source.includes('export async function DELETE'), 'placements/[id] missing DELETE')
  assert.ok(
    source.includes('handleDelete(request, TABLE, id)') || source.includes('requireApiAuth(request, "admin")'),
    'placements/[id] missing delete authorization path'
  )
})
