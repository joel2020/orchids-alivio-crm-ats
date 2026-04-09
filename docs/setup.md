# Setup

## Prerequisites
- Node.js 20+
- npm 10+
- Supabase project (local or hosted)
- Optional: n8n instance

## 1) Environment configuration
```bash
cp .env.example .env
```
Populate values for Supabase and optional providers.

## 2) Install dependencies
```bash
npm install
```

## 3) Apply schema
Run `supabase/schema.sql` in your Supabase SQL editor.

## 4) Start app
```bash
npm run dev
```

## 5) Validate starter endpoints
- `GET /api/v1/health`
- `POST /api/v1/candidates`
- `POST /api/v1/job-orders`
- `POST /api/v1/submissions`
- `POST /api/v1/webhooks/source-candidate`

## 6) Optional n8n setup
- Import `workflows/n8n/candidate-intake-and-followup.json`
- Configure webhook secret and endpoint targets
- Enable workflow and test with `examples/sample-candidate.json`

## Deployment notes
- Use secure secret management (not plaintext `.env` in production).
- Add authentication middleware before exposing endpoints publicly.
- Enable RLS policies and audit logging in Supabase.
