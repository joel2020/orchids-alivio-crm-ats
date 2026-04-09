# AI Agents and Prompting

This repository includes prompt templates intended for **human-in-the-loop** recruiting workflows.

## Included templates
- `prompts/sourcing-agent.md`
- `prompts/screening-agent.md`
- `prompts/outreach-agent.md`

## Operating model
1. Provide structured inputs from CRM/ATS records.
2. Ask the model for a draft (summary, score rationale, or outreach copy).
3. Require recruiter review before candidate-facing communication.
4. Log final decisions and overrides in `activities`.

## Guardrails
- Never auto-reject candidates solely using model output.
- Exclude protected-class inferences from model instructions.
- Respect jurisdictional employment and privacy obligations.
- Keep prompts generic and auditable.

## Provider abstraction guidance
Implement an adapter with a common interface:
- `generateSummary(candidate, job)`
- `draftOutreach(candidate, job, tone)`
- `scoreFit(candidate, job)`

This allows switching providers without rewriting recruiting logic.
