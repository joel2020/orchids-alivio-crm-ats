# Contributing

Thanks for contributing to `alivio-recruiting-automation-kit`.

## Project goals
This repository focuses on practical, open recruiting operations infrastructure:
- composable data model
- predictable automation patterns
- clear compliance boundaries
- provider-agnostic AI workflow building blocks

## Ways to contribute
- Improve docs, examples, and setup guidance
- Add tested schema migrations and API endpoints
- Add reusable n8n workflow templates
- Improve prompt templates with safer recruiting practices
- Report bugs and suggest enhancements

## Development workflow
1. Fork and create a branch:
   - `feat/<short-name>`
   - `fix/<short-name>`
   - `docs/<short-name>`
2. Keep changes scoped and well documented.
3. Update docs when behavior or configuration changes.
4. Open a pull request using the provided template.

## Pull request checklist
- [ ] Purpose and scope are clear
- [ ] Backwards compatibility is addressed
- [ ] Environment variables are documented
- [ ] SQL/schema changes are reversible
- [ ] Tests or validation steps are included
- [ ] Compliance implications are noted (if relevant)

## Code standards
- Prefer explicit TypeScript types for domain models.
- Keep modules small and composable.
- Avoid hard-coding provider-specific logic in shared layers.
- Favor deterministic workflows over hidden magic.

## Issue triage labels
Suggested labels:
- `bug`
- `enhancement`
- `docs`
- `good first issue`
- `help wanted`
- `compliance`
- `automation`

## Code of conduct
Be respectful, practical, and transparent. This project serves a broad recruiting ops community.
