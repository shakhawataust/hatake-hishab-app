# Hatake Hishab

Multi-user farm management foundation built with Next.js and Supabase.

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in its SQL Editor.
3. The SQL creates the private `receipts` Storage bucket and its access policies.
4. Copy `.env.example` to `.env.local`, then add the project URL and publishable key.
5. Run `npm run dev` and open `http://localhost:3000`.

## Deployment

Import this folder into Vercel, add the same two environment variables, then deploy.

For the full cloud-agnostic architecture, security model, Supabase setup, deployment steps, and verification checklist, open `docs/ARCHITECTURE-DEPLOYMENT.html`.

The current application includes the authenticated foundation and multi-tenant data model. The next implementation step is the role-aware farm dashboard CRUD screens backed by the SQL tables.
