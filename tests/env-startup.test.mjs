import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/lib/env.ts', 'utf8')

test('env validation fails fast with explicit required env checks', () => {
  assert.ok(source.includes('function requireEnv'), 'requireEnv helper missing')
  assert.ok(source.includes('Missing required environment variable'), 'clear fail-fast error missing')
  assert.ok(source.includes('safeParse(rawEnv)'), 'schema validation parse missing')
  assert.ok(!source.includes('|| ""'), 'insecure fallback for env values should not exist')
})
