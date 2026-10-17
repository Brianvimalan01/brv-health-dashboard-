# Garmin Connect sync

**Status:** built and tested with sample data; not yet run against the real
Garmin account.

## How it works

1. Every night at 00:30 Malaysia time (and whenever you run the workflow by
   hand), `.github/workflows/deploy.yml` runs `scripts/garmin-sync.ts`.
2. The script signs in to Garmin Connect with your account, fetches the last
   3 days (30 on the very first run) and merges them into the existing data.
3. It encrypts everything with your passphrase (AES-256-GCM, key from
   PBKDF2-SHA256 with 600,000 rounds) and saves the result as
   `garmin.enc.json` on the `garmin-data` branch.
4. The site is rebuilt with that file at `data/garmin.enc.json`. Your browser
   downloads it and decrypts it locally when you enter the passphrase.

The repository and the site are public, so only the encrypted file is ever
published. The script prints counts only, because Actions logs on a public
repository are public too.

## Setup (once)

In the repository on GitHub: **Settings → Secrets and variables → Actions →
New repository secret**, and add:

| Secret | Value |
|---|---|
| `GARMIN_EMAIL` | your Garmin Connect email |
| `GARMIN_PASSWORD` | your Garmin Connect password |
| `GARMIN_DATA_PASSPHRASE` | a long passphrase you'll type on the site, e.g. four or five random words |

Then **Actions → Deploy to GitHub Pages → Run workflow** to do the first sync.

The passphrase protects your data on a public site, so make it long and
don't reuse a password. If you change it later, delete the `garmin-data`
branch first, because the old file can't be read with the new passphrase
(the sync stops rather than overwriting it).

## If Garmin blocks the sign-in ("429 Too Many Requests")

Garmin rate-limits password sign-ins, especially from cloud servers such as
GitHub's. The fix is to sign in once from your own computer and give the job
the resulting session tokens instead:

```bash
GARMIN_EMAIL=you@example.com GARMIN_PASSWORD='...' npm run garmin-login
```

Copy the contents of the `garmin-tokens.json` it writes into a new repository
secret named `GARMIN_TOKENS`, then delete the file. When `GARMIN_TOKENS` is
set, the job uses it and never sends your password. The tokens last about a
year; repeat this when the sync starts failing with a sign-in error.

## Caveats (accepted on 2026-10-17)

- This uses the open-source
  [`garmin-connect`](https://github.com/Pythe1337N/garmin-connect) library
  (pinned to 1.6.2), not an official Garmin API. It can stop working if
  Garmin changes its sign-in, and automated access may conflict with Garmin's
  terms.
- Accounts with two-step verification turned on can't sign in this way.
- Garmin may block sign-ins from cloud servers. If the nightly run fails, you
  get an email from GitHub, the site still deploys, and you can type burned
  calories by hand on the Today page.
- A fork, `@gooin/garmin-connect`, is more recently updated but ships
  obfuscated code, so it was not used for something that handles your Garmin
  password.

## What is fetched

| Data | Source | Notes |
|---|---|---|
| Total, active and resting (BMR) calories per day | `usersummary-service/usersummary/daily/{displayName}?calendarDate=` | `totalKilocalories` already includes active and resting, so it is used as the day's total as-is |
| Activities (name, type, start, duration, distance, calories) | `getActivities` | shown per day; never added on top of the total |
