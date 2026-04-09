import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/202604080002_rls_workflow_pipeline_consolidation.sql', 'utf8')

const tables = [
  'companies','contacts','candidates','candidate_licenses','candidate_preferences',
  'job_orders','submissions','interviews','placements','tasks','activities','opportunities'
]

test('RLS migration defines explicit SELECT/INSERT/UPDATE/DELETE policies for all workflow tables', () => {
  for (const table of tables) {
    assert.ok(sql.includes(`'${table}'`), `table missing from RLS loop: ${table}`)
    assert.ok(sql.includes('create policy %I_select'), 'SELECT policy missing')
    assert.ok(sql.includes('create policy %I_insert'), 'INSERT policy missing')
    assert.ok(sql.includes('create policy %I_update'), 'UPDATE policy missing')
    assert.ok(sql.includes('create policy %I_delete'), 'DELETE policy missing')
  }
  assert.ok(sql.includes('account_id = public.current_account_id()'), 'account isolation predicate missing')
})
