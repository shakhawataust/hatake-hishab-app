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

To understand how the production build works step by step, what it produces, and how the pieces fit together, open `docs/BUILD-AND-DESIGN.html`. Its build figures are measured from a real `next build`, and its database claims are verified against the live Supabase project.

To deploy, run `./deploy.sh` — it signs in to Vercel, uploads the two Supabase variables, builds, and prints the live URL along with the two Supabase dashboard settings you must still apply by hand.

The current application includes the authenticated foundation and multi-tenant data model. The next implementation step is the role-aware farm dashboard CRUD screens backed by the SQL tables.
