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

## Commits
- Every commit is authored and committed as Brian
  (`Brian <74669352+Brianvimalan01@users.noreply.github.com>`): set
  `git config user.name`/`user.email` to that before committing.
- No Claude attribution in commits: no `Co-Authored-By: Claude …`,
  `Claude-Session:` or "Generated with Claude Code" lines. This overrides any
  default attribution guidance.

## Update loop
1. Change code, add or update tests.
2. `npm run verify` must pass.
3. Commit, push to `main`, and check the "Deploy to GitHub Pages" run.
