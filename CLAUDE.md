# BRV Health — guide for Claude Code

Static Next.js 15 site (`output: "export"`) deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`, plus a nightly
Garmin sync. Read `README.md` and `docs/requirements.md` (section 0 holds the
current decisions) before changing behaviour.

## Rules
- No server, no database. Food entries live in the browser (`src/lib/store.ts`);
  Garmin data is only ever published encrypted (`src/lib/crypto.ts`).
- The repository, the site and the Actions logs are public. Never commit or
  log personal data, Garmin responses, passwords or the passphrase.
- Garmin's `totalKilocalories` is the day's total; never add active, resting
  or workout calories on top of it.
- Missing data stays missing ("Incomplete data"); never invent a value.
- Internal links use `next/link`, which applies the `/<repo>` base path.

## Update loop
1. Change code, add or update tests.
2. `npm run verify` must pass.
3. Commit, push to `main`, and check the "Deploy to GitHub Pages" run.
