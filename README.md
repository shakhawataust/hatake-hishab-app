# Hatake Hishab

Multi-user farm management foundation built with Next.js and Supabase.

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in its SQL Editor, then the add-on scripts in this
   order: `member-management.sql`, `crop-planner.sql`,
   `pending-member-invites.sql`, `cash-handovers.sql`, `view-only-role.sql`,
   `forgot-password.sql`.
3. The SQL creates the private `receipts` Storage bucket and its access policies.
4. Copy `.env.example` to `.env.local`, then add the project URL and publishable key.
5. In **Authentication → URL Configuration**, set the Site URL and add
   `http://localhost:3000/**` and your deployed origin to the redirect
   allow-list. Supabase refuses to send members back to an address it does not
   know, which covers sign-up confirmations and any recovery link you send by
   hand from the dashboard.
6. Run `npm run dev` and open `http://localhost:3000`.

## Roles

`admin` adds and removes members. `accountant`, `field_member` and `sales` all
read and write farm records. `viewer` reads everything — every page, report and
CSV export — and writes nothing; `supabase/view-only-role.sql` enforces that in
the database, so a viewer account cannot write even outside this app.

## Passwords

**Forgot password** on the sign-in screen asks for the member's email and the
password they want, sets it, and signs them in. Nothing is emailed: the project
has no SMTP sender, and Supabase's built-in one only delivers to the project
owner's own address, so an emailed link would never have reached the farm.

The cost of that convenience is real and worth knowing: **an email address is the
only thing needed to take over an account.** `supabase/forgot-password.sql`
narrows it as far as it can without a second channel — only accounts that already
belong to a farm can be reset, every reset signs that member out everywhere, and
each one is recorded in `public.password_resets`, which the farm's admins can
read. Configure SMTP and move back to emailed links when the farm outgrows this.

Members already signed in can change their password from **Settings**, which asks
for the current one first. A recovery link sent by hand from the Supabase
dashboard also still works.

## Deployment

Import this folder into Vercel, add the same two environment variables, then deploy.

For the full cloud-agnostic architecture, security model, Supabase setup, deployment steps, and verification checklist, open `docs/ARCHITECTURE-DEPLOYMENT.html`.

To understand how the production build works step by step, what it produces, and how the pieces fit together, open `docs/BUILD-AND-DESIGN.html`. Its build figures are measured from a real `next build`, and its database claims are verified against the live Supabase project.

To deploy, run `./deploy.sh` — it signs in to Vercel, uploads the two Supabase variables, builds, and prints the live URL along with the two Supabase dashboard settings you must still apply by hand.

The current application includes the authenticated foundation and multi-tenant data model. The next implementation step is the role-aware farm dashboard CRUD screens backed by the SQL tables.
