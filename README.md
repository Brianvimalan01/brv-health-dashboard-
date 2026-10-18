# BRV Health

A personal dashboard that answers one question each day: **how many calories
did I eat, how many did I burn, and am I in a deficit, around maintenance or
in a surplus?** Published on GitHub Pages like the
[brv website](https://github.com/Brianvimalan01/brv).

- **Eaten:** type the day's carbs, fat, protein and fibre at the end of the
  day (from HealthifyMe). Calories are calculated as
  `4 × protein + 4 × (carbs − fibre) + 2 × fibre + 9 × fat`, or type
  HealthifyMe's own total to use that instead.
- **Burned:** Garmin Connect's daily total, synced nightly by GitHub Actions
  and published encrypted (see [docs/garmin.md](docs/garmin.md)), or typed by
  hand.
- **Balance:** eaten − burned. Within ±150 kcal counts as maintenance
  (changeable on the Backup page). Today's numbers are marked provisional.
- **Dashboard:** the week at a glance (net calories, estimated fat change,
  weight, daily balance chart), progress since tracking started (12 Oct 2026
  by default) and rule-based feedback.
- **Weight:** weigh-ins typed by hand. Once there are enough (3+ over 7+
  days with food logged), the app works out your real TDEE from intake and
  the weight trend, and scales Garmin's daily burn to match for targets.

Requirements and decisions: [docs/requirements.md](docs/requirements.md).

## Where your data lives

| Data | Where |
|---|---|
| Food entries, weigh-ins, hand-typed burned calories, settings | Only in the browser you typed them in (localStorage). Use **Backup → Download backup** regularly, and **Import backup** to copy them to another device. |
| Garmin calories and activities | Encrypted file on the `garmin-data` branch, published with the site; decrypted in your browser with your passphrase. |

Nothing personal is stored in the code. The repository is public, as GitHub
Pages requires on a free account.

## Setup on GitHub (once)

1. **Settings → Pages → Source:** choose **GitHub Actions**.
2. **Settings → Secrets and variables → Actions:** add `GARMIN_EMAIL`,
   `GARMIN_PASSWORD` and `GARMIN_DATA_PASSPHRASE` (details in
   [docs/garmin.md](docs/garmin.md)).
3. **Actions → Deploy to GitHub Pages → Run workflow** for the first Garmin
   sync and deploy.

The site is then at `https://brianvimalan01.github.io/<repo-name>/`. Every
push to `main` redeploys it, and the nightly run refreshes Garmin data.

## Local development

Needs Node.js 22+.

```bash
npm install
npm run dev       # http://localhost:3000
npm run verify    # type-check, lint, unit tests and static build
```

To try the Garmin sync locally (writes `public/data/garmin.enc.json`, which
is git-ignored):

```bash
GARMIN_EMAIL=... GARMIN_PASSWORD=... GARMIN_DATA_PASSPHRASE=... npm run garmin-sync
```

## Code map

| Path | What it does |
|---|---|
| `src/lib/calorie-balance/` | Macro → calorie maths, balance and status, dates |
| `src/lib/day.ts` | Combines food, Garmin and hand-typed values for one day |
| `src/lib/store.ts` | Browser storage, backup and import |
| `src/lib/progress.ts` | Weekly summaries, weight trend, weight-based TDEE, coach tips |
| `src/lib/crypto.ts` | Passphrase encryption shared by the sync script and the browser |
| `src/lib/garmin/` | Garmin data types, normalization, and in-browser decryption |
| `scripts/garmin-sync.ts` | The nightly sync run by GitHub Actions |
| `src/app/`, `src/components/` | Dashboard, Log (one day), Weight, History and Backup pages |
