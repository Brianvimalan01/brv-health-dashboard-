# BRV Health: how it works

A static dashboard for daily calorie balance: food typed in by hand, calories
burned from Garmin Connect (or typed in), and weight. This document explains
the design choices, how the pieces fit together and how to run your own copy.
Setup steps are in the [README](../README.md); Garmin details are in
[garmin.md](garmin.md).

## Design choices

1.  **Food is entered by hand.** Common food-logging apps (HealthifyMe,
    MyFitnessPal and others) have no public API, so at the end of each day
    you type the day's **carbs, fat, protein and fibre** in grams.
2.  **Calories come from the macros:**
    `kcal = 4 × protein + 4 × (carbs − fibre) + 2 × fibre + 9 × fat`
    (carbs are assumed to include fibre). An optional "calorie total" box
    replaces the calculated value when your food app shows its own total;
    the page says which one is used.
3.  **Garmin Connect is the only integration.** It uses an unofficial
    sign-in with your own account (open-source `garmin-connect`, pinned).
    It isn't an official Garmin API, may break if Garmin changes its
    sign-in, and may conflict with Garmin's terms. Typing burned calories by
    hand always works as a fallback.
4.  **GitHub Pages hosting.** No server, no database, no login page. On a
    free account that means a public repository, so nothing personal is ever
    committed in plain text.
5.  **Garmin data is published encrypted.** A nightly GitHub Actions job
    encrypts it with your passphrase; the site decrypts it in your browser.
6.  **Everything you type stays in your browser** (localStorage): food,
    weigh-ins, hand-typed burned calories and settings. Use the Backup page
    to move it between devices.
7.  **Tracking start date.** By default the dashboard starts at your first
    logged day. Set a date on the Backup page to leave out earlier days;
    Garmin history itself is kept.
8.  **Weight-based TDEE.** Your real daily burn is worked out from average
    intake minus the weight trend × 7,700 kcal/kg over the last 28 days
    (starting at the last weigh-in before tracking began). It needs 3+
    weigh-ins spread over 7+ days and food logged on 70%+ of those days;
    otherwise the app says what's missing and uses Garmin's burn alone.
    Garmin's daily total is then scaled by (weight-based TDEE ÷ Garmin
    average), clamped to 0.75-1.25, so active days still get more food.
9.  **Goal** −0.5 kg/week by default (Backup page). Day target = that day's
    burn (scaled) + goal × 7,700 ÷ 7; today's target uses a normal day's
    burn because today's is still rising.
10. **Defaults you can change:** maintenance band ±150 kcal and goal (Backup
    page); timezone `Asia/Kuala_Lumpur` (see [Your own copy](#your-own-copy)).

## How it works

-   **Static site:** Next.js 15 + TypeScript + Tailwind 4, built with
    `output: "export"` and served under `/<repo-name>/`.
-   **Browser storage:** the Backup page downloads a JSON backup, imports one
    (merging by date, newer entry wins) and exports CSV.
-   **Garmin sync** (`scripts/garmin-sync.ts`) runs in GitHub Actions every
    night at 16:30 UTC and on "Run workflow". It:
    1. restores `garmin.enc.json` from the `garmin-data` branch;
    2. signs in with the `GARMIN_TOKEN(S)` session token (or email +
       password if there's no token);
    3. fetches the daily summary (total, active and resting kcal) for the
       last 3 days (90 on a first run or after a passphrase change) and
       recent activities;
    4. encrypts everything (AES-256-GCM, key from PBKDF2-SHA256, 600,000
       rounds) with `GARMIN_DATA_PASSPHRASE` and commits it to
       `garmin-data`;
    5. builds and deploys the site with that file at `data/garmin.enc.json`.

    It prints only counts ("Garmin sync done: N days, M recent
    activities"), because Actions logs of a public repository are public.
-   **In the browser**, the Activity box asks for the passphrase once per
    device ("Remember on this device"). Spaces around it are ignored;
    capitals matter.
-   **Calorie balance** = eaten − burned. Garmin's `totalKilocalories` is
    the day's total and is never added to active, resting or workout
    calories. A hand-typed burned value overrides Garmin for that day.
    Status: deficit / around maintenance / surplus / incomplete data.
    Today is labelled provisional.
-   **Pages:** Dashboard `/` (the week's net calories, fat estimate, weight,
    daily balance chart, protein vs 1.6 g/kg, coach tips, progress since the
    start date, weekly table); Log `/day` (one day's numbers, food form,
    Garmin activities, sources); Weight `/weight` (weigh-ins, 7-day trend,
    weight-based TDEE); History (7/30/90 days); Backup (backup, import, CSV
    and settings).
-   **Update banner:** each build publishes `version.json`; an open page
    checks it and offers "tap to reload" when a newer deploy is live (a
    Home Screen web app otherwise keeps showing the old page).
-   **Fat estimates** use 7,700 kcal per kg and are labelled as estimates,
    next to the actual scale change.
-   **Coach tips** are plain rules: logging gaps, the week's surplus or
    deficit, Garmin vs weight-based burn, calorie target, protein, and
    active calories vs last week. Each says what it's based on.
-   **Tests:** `npm run verify` runs type-check, lint, unit tests and the
    static build.

## Your own copy

1.  Fork or copy the repository. You only need `main`; the `garmin-data`
    branch holds the original owner's encrypted file and is replaced by
    yours after your first sync.
2.  Follow the README setup: enable Pages, add the Garmin secrets, run the
    workflow.
3.  **Timezone:** add a repository variable `APP_TIMEZONE` (Settings →
    Secrets and variables → Actions → Variables), e.g. `Europe/London`. It
    decides where each day starts and ends. To have the sync run just after
    your midnight, also change the `cron` line in
    `.github/workflows/deploy.yml` (it's in UTC).
4.  Pick a long passphrase for `GARMIN_DATA_PASSPHRASE`: the encrypted file
    is public, so the passphrase is what keeps it private.

## Day-to-day use

-   Each evening: **Log** page, enter carbs, fat, protein, fibre (and
    optionally your food app's calorie total), tap **Save day**.
-   Most mornings: **Weight** page, enter the weigh-in.
-   Weekly: check the **Dashboard** for the week's net, fat estimate and
    coach notes.
-   Burned calories appear after the nightly sync; today's figure is
    provisional until the day ends.
-   Download a backup from the Backup page now and then. Garmin data needs
    no backup; it's re-fetched from Garmin.
-   On a phone, add the site to the Home Screen and keep using that same
    browser, since entries are stored there.

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Site shows 404 | GitHub Pages isn't enabled | Settings → Pages → Source: **GitHub Actions** |
| Sync skipped | Secrets missing or not visible to the workflow | Add them as **repository** secrets; the "Found secret …" steps show which are present |
| `429 Too Many Requests` from Garmin | Garmin rate-limits password sign-ins from cloud servers | Run `npm run garmin-login` once on your computer and save the token as the `GARMIN_TOKEN` secret |
| Passphrase rejected on the site | The file was encrypted with a different passphrase | Check the secret; after changing it, run the workflow (the sync rebuilds 90 days) |
| Sync fails | Token expired (about a year) or Garmin changed its sign-in | GitHub emails you; the run page shows the reason. Re-run `npm run garmin-login` and update the secret. Burned calories can be typed by hand meanwhile |
