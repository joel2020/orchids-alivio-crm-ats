This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication & Authorization (Supabase)

- Dashboard pages are guarded in `src/app/(dashboard)/layout.tsx` and require a valid Supabase session plus `account_id` claim.
- API handlers use `requireApiAuth` from `src/lib/auth.ts`.
- Role model: `readonly < recruiter < admin`.
- Account scoping is enforced in API queries by `account_id` filters and account-aware inserts.
- Requests now forward the user bearer token to Supabase (`Authorization: Bearer <token>`) to align with future Postgres RLS policies.

### Required JWT claims

Set these claims in Supabase Auth metadata (app_metadata preferred):

- `account_id` (string)
- `role` (`admin` | `recruiter` | `readonly`)

This keeps authorization colocated with auth identity and prepares API traffic for RLS policy checks.
