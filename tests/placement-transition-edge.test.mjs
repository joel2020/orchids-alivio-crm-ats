import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const submissionsRoute = readFileSync('src/app/api/submissions/[id]/route.ts', 'utf8')
const placementsRoute = readFileSync('src/app/api/placements/[id]/route.ts', 'utf8')

test('submission accepted transition handles placement prerequisite failures', () => {
  assert.ok(submissionsRoute.includes('createPlacementPayload'), 'submission route must use canonical placement helper')
  assert.ok(submissionsRoute.includes('catch (placementError)'), 'submission route should trap placement transition failures')
})

test('placements update/delete routes are exposed and protected', () => {
  assert.ok(placementsRoute.includes('export async function PATCH'), 'placements/[id] missing PATCH')
  assert.ok(placementsRoute.includes('export async function DELETE'), 'placements/[id] missing DELETE')
  assert.ok(placementsRoute.includes('handleDelete(request, TABLE, id)'), 'placements/[id] delete must go through auth-protected handler')
})
