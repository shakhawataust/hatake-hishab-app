#!/usr/bin/env bash
# Deploys Hatake Hishab to Vercel and prints the public URL.
#
#   ./deploy.sh
#
# Everything except the browser login is automated. Reads the Supabase
# values from .env.local and uploads them as Vercel environment variables,
# so members' browsers can reach the database from the deployed site.
set -euo pipefail
cd "$(dirname "$0")"

VC="npx --yes vercel@latest"

say() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mError:\033[0m %s\n' "$1" >&2; exit 1; }

[ -f .env.local ] || die ".env.local not found — cannot read Supabase settings."

SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '\r\n')
SUPABASE_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' .env.local | cut -d= -f2- | tr -d '\r\n')
[ -n "$SUPABASE_URL" ] || die "NEXT_PUBLIC_SUPABASE_URL missing from .env.local"
[ -n "$SUPABASE_KEY" ] || die "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing from .env.local"

say "Step 1 of 4: Signing in to Vercel"
if $VC whoami >/dev/null 2>&1; then
  echo "Already signed in as $($VC whoami 2>/dev/null | tail -1)"
else
  echo "A browser window will open. Choose 'Continue with GitHub' (or email)."
  $VC login
fi

say "Step 2 of 4: Linking this folder to a Vercel project"
# Accepts the defaults: creates a project named after this directory.
$VC link --yes

say "Step 3 of 4: Uploading Supabase settings"
# These two values are meant to reach the browser, and Vercel refuses to store
# a NEXT_PUBLIC_ name as a secret, so ask for plain config visibility. Without
# the flags the CLI defaults new variables to sensitive and rejects them.
PUBLIC="--visibility config --no-sensitive"
# Remove any stale values first so re-running this script stays safe.
for target in production preview development; do
  for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; do
    $VC env rm "$name" "$target" --yes >/dev/null 2>&1 || true
  done
  printf '%s' "$SUPABASE_URL" | $VC env add NEXT_PUBLIC_SUPABASE_URL "$target" $PUBLIC >/dev/null
  printf '%s' "$SUPABASE_KEY" | $VC env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$target" $PUBLIC >/dev/null
  echo "set for $target"
done

say "Step 4 of 4: Building and deploying"
$VC deploy --prod

URL=$($VC inspect --json 2>/dev/null | grep -o '"alias":\[[^]]*' | grep -o 'https\?://[^",]*' | head -1 || true)
[ -n "$URL" ] || URL=$($VC ls --json 2>/dev/null | grep -o 'https://[^",]*' | head -1 || true)

cat <<BANNER

────────────────────────────────────────────────────────────
 Deployed.
────────────────────────────────────────────────────────────
BANNER
if [ -n "$URL" ]; then
  echo " Your app:  $URL"
else
  echo " Your app:  see the 'Production' URL printed just above."
fi
cat <<'BANNER'

 TWO THINGS LEFT — the app will not work for members until
 you do these in the Supabase dashboard:

 1. Authentication -> URL Configuration
      Site URL:       <paste your app URL above>
      Redirect URLs:  <your app URL>/**
                      http://localhost:3000/**

 2. Authentication -> Sign In / Providers -> Email
      Turn OFF "Confirm email"   (small trusted team)
      ...or configure SMTP under Project Settings.

      "Forgot password" needs no email: it asks for the
      member's address and their new password and sets it
      on the spot, because Supabase's built-in sender only
      reaches your own team addresses. Read the warning at
      the top of supabase/forgot-password.sql — an email
      address is all it takes to get into an account.

 Then send members the URL. Each signs up first, tells you
 their email, and you add them from the Members screen.
────────────────────────────────────────────────────────────
BANNER
