import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/202604080002_rls_workflow_pipeline_consolidation.sql', 'utf8')
const coreTables = [
  'companies','contacts','candidates','candidate_licenses','candidate_preferences',
  'job_orders','submissions','interviews','placements','tasks','activities','opportunities'
]

test('all core tables are included in explicit RLS coverage list', () => {
  for (const table of coreTables) {
    assert.ok(sql.includes(`'${table}'`), `Missing table in RLS table list: ${table}`)
  }
})

test('RLS policy templates include account_id-based predicates for each action', () => {
  assert.ok(sql.includes('create policy %I_select'), 'SELECT policy template missing')
  assert.ok(sql.includes('create policy %I_insert'), 'INSERT policy template missing')
  assert.ok(sql.includes('create policy %I_update'), 'UPDATE policy template missing')
  assert.ok(sql.includes('create policy %I_delete'), 'DELETE policy template missing')
  assert.ok(sql.includes('account_id = public.current_account_id()'), 'account isolation predicate missing')
})
