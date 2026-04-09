import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const required = [
  'src/app/api/opportunities/route.ts',
  'src/app/api/opportunities/[id]/route.ts',
  'src/app/api/dashboard/overview/route.ts',
  'src/app/api/dashboard/pipeline/route.ts',
]

test('required routes are present on branch and expose GET handlers', () => {
  for (const file of required) {
    assert.ok(existsSync(file), `Missing required route: ${file}`)
    const source = readFileSync(file, 'utf8')
    assert.ok(source.includes('export async function GET'), `${file} missing GET handler`)
  }
})
