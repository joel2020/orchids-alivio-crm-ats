# alivio-recruiting-automation-kit

Open recruiting operations infrastructure for independent recruiters and boutique staffing teams building AI-assisted workflows.

## Why this exists
Most recruiting teams under 20 people are forced to stitch together a CRM, ATS, spreadsheets, outreach tools, and ad-hoc automations. This project provides a reusable baseline architecture so maintainers can start from a practical foundation instead of rebuilding common systems from scratch.

## Who this is for
- Independent recruiters and solo operators
- Boutique staffing agencies
- Recruiting operations consultants
- AI-native recruiting teams building internal tooling

## Core features
- Recruiter CRM/ATS starter data model (candidate, client, contact, job, submission, activity)
- Pipeline stage framework for candidate progression
- Submission tracking primitives and status transitions
- Outreach workflow templates for sourcing and follow-up
- AI recruiting agent prompt templates (sourcing, screening, outreach)
- Supabase SQL starter schema with indexes and enums
- n8n workflow examples for webhook ingestion and follow-up tasking
- API/webhook scaffold for integration with email, sourcing, and ATS channels

## Architecture overview
Default stack assumptions:
- **TypeScript + Node.js** for API and shared domain logic
- **Supabase (Postgres + Auth + Row Level Security)** for operational data
- **n8n (optional)** for low-code orchestration
- **AI provider abstraction (optional)** so teams can plug in Claude, OpenAI, or internal models

Data flow (starter):
1. Candidate/job/client records are created in the API layer.
2. Status changes generate activity events.
3. n8n webhook flows listen for new records or status updates.
4. Prompt templates are used by human recruiters or agent workers for sourcing and outreach.

## Quick start
1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in values.
3. Apply `supabase/schema.sql` to your Supabase project.
4. Install dependencies and run your local server.

```bash
npm install
npm run dev
```

5. Review docs:
   - `docs/setup.md`
   - `docs/architecture.md`
   - `docs/use-cases.md`
   - `docs/agents.md`

## Folder structure
```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── docs/
├── examples/
├── prompts/
├── src/starter-kit/
├── supabase/
└── workflows/n8n/
```

## Use cases
- Build a lightweight CRM/ATS backend for retained search.
- Stand up submission tracking for contract staffing.
- Launch AI-assisted sourcing workflows with human-in-the-loop review.
- Adapt templates for healthcare recruiting or generalist agency recruiting.

## Roadmap
See [`ROADMAP.md`](./ROADMAP.md) for planned milestones.

## Contributing
Contributions are welcome from recruiters, operators, and engineers. See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Compliance and usage disclaimer
This project is infrastructure only. Users are responsible for complying with applicable employment law, anti-discrimination rules, privacy/data protection obligations, and third-party platform terms (email, sourcing, job boards, and ATS APIs).

## License
MIT — see [`LICENSE`](./LICENSE).
