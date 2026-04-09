import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routeFiles = [
  'src/app/api/companies/route.ts',
  'src/app/api/contacts/route.ts',
  'src/app/api/job_orders/route.ts',
  'src/app/api/submissions/route.ts',
  'src/app/api/placements/route.ts',
  'src/app/api/opportunities/route.ts',
  'src/app/api/tasks/route.ts',
  'src/app/api/interviews/route.ts',
]

test('core API contracts expose GET and POST and enforce tenant scoping', () => {
  for (const file of routeFiles) {
    const source = readFileSync(file, 'utf8')
    assert.ok(source.includes('export async function GET'), `${file} missing GET`)
    assert.ok(source.includes('export async function POST'), `${file} missing POST`)
    assert.ok(source.includes('requireApiAuth(request'), `${file} missing auth guard`)
    assert.ok(source.includes('accountId'), `${file} missing account scope variable`)
    assert.ok(source.includes('eq("account_id", accountId)') || source.includes("eq('account_id', accountId)"), `${file} missing account_id filter`)
  }
})

test('pagination/filter validation is wired for target endpoints', () => {
  const paginated = [
    'src/app/api/candidates/route.ts',
    'src/app/api/companies/route.ts',
    'src/app/api/contacts/route.ts',
    'src/app/api/job_orders/route.ts',
    'src/app/api/opportunities/route.ts',
    'src/app/api/tasks/route.ts',
    'src/app/api/placements/route.ts',
  ]

  for (const file of paginated) {
    const source = readFileSync(file, 'utf8')
    assert.ok(source.includes('parsePaginationParams(searchParams)'), `${file} missing parsePaginationParams`) 
    assert.ok(source.includes('.range('), `${file} missing range() pagination`) 
  }
})
