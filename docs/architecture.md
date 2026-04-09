# Architecture

## Design principles
1. **Ops-first:** model the day-to-day recruiting workflow directly.
2. **Composable:** schema, API, prompts, and automations should work independently.
3. **Provider-agnostic:** avoid lock-in to one ATS, one email provider, or one AI model.
4. **Auditability:** preserve event history for compliance and reporting.

## Logical components
- **Domain layer (`src/starter-kit/types.ts`)**
  - canonical entities and enums
- **API layer (`src/starter-kit/server.ts`, `src/starter-kit/routes.ts`)**
  - endpoints for candidates, jobs, submissions, and webhooks
- **Data layer (`supabase/schema.sql`)**
  - relational schema and core constraints
- **Automation layer (`workflows/n8n`)**
  - ingestion and follow-up orchestration examples
- **Agent layer (`prompts`)**
  - reusable prompt templates with human review expectations

## Entity map
- `clients` own `job_orders`
- `candidates` can have many `submissions`
- `submissions` connect candidates to jobs and pass through pipeline stages
- `activities` track timeline/audit events

## Integration boundaries
- Inbound webhooks for lead/candidate sources
- Outbound hooks for outreach and task generation
- Optional AI adapter for ranking, summary, and draft generation

## Security and compliance notes
- Apply Supabase RLS before production use.
- Track consent, source, and retention metadata for candidate records.
- Keep PII access scoped to least privilege.
