# BRVHealth --- Product Context & Requirements

**Filename:** `BRVHealth_md.md`\
**Purpose:** Product context and requirements\
**Product:** Personal nutrition, activity, and daily calorie-balance
dashboard\
**Status:** **Live since 2026-10-17** at
<https://brianvimalan01.github.io/brv-health-dashboard-/>. Section 0 records
every decision, how it was built and how to run it; it overrides anything
in sections 1-14 (the original requirements) that conflicts with it.

------------------------------------------------------------------------

## 0. Current state: decisions, build and operations (updated 2026-10-17)

This section overrides the rest of the document where they conflict.
Sections 1-14 are the original requirements, kept for reference.

### 0.1 Where things are

| What | Where |
|---|---|
| Live site | <https://brianvimalan01.github.io/brv-health-dashboard-/> |
| Code | <https://github.com/Brianvimalan01/brv-health-dashboard-> (public, branch `main`) |
| Encrypted Garmin data | branch `garmin-data` of the same repo, file `garmin.enc.json` |
| Deploy + nightly sync | `.github/workflows/deploy.yml` ("Deploy to GitHub Pages") |
| Repo docs | `README.md`, `docs/garmin.md`, `docs/requirements.md` (copy of this file) |
| Local clone on Brian's Mac | `~/brv-health-dashboard-` (used for the one-time Garmin sign-in) |
| Not used | `Brianvimalan01/brv` is Brian's public portfolio website (Astro), unrelated to this app |

### 0.2 Decisions (all made by Brian on 2026-10-17)

1.  **No HealthifyMe integration.** HealthifyMe has no public API or data
    export, and on Brian's iPhone it writes no nutrition data to Apple
    Health (Health → Browse → Nutrition → Dietary Energy showed nothing).
    Brian enters the day's totals by hand at the end of each day:
    **carbs, fat, protein and fibre** (grams).
2.  **Calories are derived from the macros:**
    `kcal = 4 × protein + 4 × (carbs − fibre) + 2 × fibre + 9 × fat`
    (HealthifyMe's carbs are assumed to include fibre). An optional
    "HealthifyMe calorie total" box overrides the derived value when filled;
    the page says which one is used.
3.  **No Apple Health** in any route.
4.  **Garmin Connect is the only integration**, using an unofficial
    sign-in with Brian's own account (open-source `garmin-connect` 1.6.2,
    pinned). Brian accepted that it isn't an official Garmin API, may break
    if Garmin changes its sign-in, and may conflict with Garmin's terms.
    Typing burned calories by hand stays available as a fallback. The
    `@gooin/garmin-connect` fork was rejected because its code is obfuscated.
5.  **Hosting on GitHub Pages, not Vercel**, like the brv site. So: public
    repository, no server, no database, no login page.
6.  **Garmin data is published encrypted** ("Encrypted sync" option): a
    nightly GitHub Actions job encrypts it with a passphrase, and the site
    decrypts it in the browser.
7.  **Dark mode** everywhere, regardless of device setting.
8.  **Timezone** `Asia/Kuala_Lumpur`; **maintenance band** ±150 kcal
    (changeable on the Backup page).

### 0.3 How it works

-   **Static site:** Next.js 15 + TypeScript + Tailwind 4, built with
    `output: "export"` and served under `/brv-health-dashboard-/`.
-   **Food entries** (and hand-typed burned calories, and settings) live in
    the browser's localStorage, per device. The Backup page downloads a
    JSON backup, imports one (merging by date, newer entry wins) and exports
    CSV. Nothing personal is in the repository.
-   **Garmin sync** (`scripts/garmin-sync.ts`) runs in GitHub Actions every
    night at 00:30 Malaysia time (16:30 UTC) and on "Run workflow". It:
    1. restores `garmin.enc.json` from the `garmin-data` branch;
    2. signs in with the `GARMIN_TOKEN(S)` session token (falls back to
       email + password if no token);
    3. fetches the daily summary (total, active and resting kcal) for the
       last 3 days (90 on a first run or after a passphrase change) and
       recent activities;
    4. encrypts everything (AES-256-GCM, key from PBKDF2-SHA256, 600,000
       rounds) with `GARMIN_DATA_PASSPHRASE` and commits it to
       `garmin-data`;
    5. builds and deploys the site with that file at `data/garmin.enc.json`.
    It prints only counts, as a run annotation ("Garmin sync done: N days,
    M recent activities"), because Actions logs of a public repo are public.
-   **In the browser**, the Activity box asks for the passphrase once per
    device ("Remember on this device"). Spaces around it are ignored;
    capitals matter.
-   **Calorie balance** = eaten − burned. Garmin's `totalKilocalories` is
    the day's total and is never added to active, resting or workout
    calories. A hand-typed burned value overrides Garmin for that day.
    Status: deficit / around maintenance (±150) / surplus / incomplete data.
    Today is labelled provisional.
-   **Pages:** Today (date picker, cards, macro form, Garmin activity,
    sources), History (7/30/90 days, weekly averages of finished complete
    days), Backup (backup/import/CSV, tolerance, lock Garmin data).
-   **Tests:** 27 unit tests (calorie maths, balance, dates, Garmin
    normalization, encryption, day summary). `npm run verify` runs
    type-check, lint, tests and the static build.

### 0.4 GitHub setup (done)

-   Settings → Pages → Source: **GitHub Actions**. Automation can't change this
    setting or publish a public site on its own; Brian did it.
-   Repository secrets (Settings → Secrets and variables → Actions →
    Repository secrets): `GARMIN_EMAIL`, `GARMIN_PASSWORD`,
    `GARMIN_DATA_PASSPHRASE`, and the session token saved as
    `GARMIN_TOKEN` (the workflow accepts `GARMIN_TOKEN` or `GARMIN_TOKENS`).
-   The workflow shows "Found secret …" steps (green = present, skipped =
    missing), so missing secrets are visible without reading logs.

### 0.5 Problems hit and how they were solved

| Problem | Cause | Fix |
|---|---|---|
| Site showed 404 | GitHub Pages wasn't enabled | Brian set Pages source to GitHub Actions |
| Sync always skipped | Workflow bug: a step's `if` can't read its own `env` | Job-level `HAS_GARMIN` flag |
| Sync skipped after secrets "added" | Secrets weren't visible to the workflow yet | Re-added as repository secrets; presence steps added |
| `429 Too Many Requests` from Garmin | Garmin rate-limits password sign-ins from cloud servers | One-time `npm run garmin-login` on Brian's Mac → token saved as `GARMIN_TOKEN` secret |
| Passphrase rejected on the site | File had been encrypted with a different passphrase value | Sync now trims the passphrase and rebuilds 90 days from Garmin when it changes; site trims input and disables autocorrect |

### 0.6 Day-to-day use

-   Each evening: open the site, enter carbs, fat, protein, fibre (and
    optionally HealthifyMe's calorie total), tap **Save day**.
-   Burned calories appear after the nightly sync; today's figure is
    provisional until the day ends.
-   Download a backup from the Backup page now and then (iPhone: save to
    Files). Garmin data needs no backup; it's re-fetched from Garmin.
-   iPhone: Safari → Share → Add to Home Screen; keep using that same
    browser, since entries are stored there.

### 0.7 Maintenance

-   **Sync fails** → GitHub emails Brian; the run page shows the reason as
    an annotation. The site still deploys, and burned calories can be typed
    by hand meanwhile.
-   **Token expires** (about a year) or sign-in errors → on the Mac:
    `export PATH=~/.local/node/bin:$PATH; cd ~/brv-health-dashboard- && git pull && npm run garmin-login`,
    then update the `GARMIN_TOKEN` secret with the copied token. Never paste
    the token or passwords into chat or screenshots.
-   **Change the passphrase** → update `GARMIN_DATA_PASSPHRASE`, run the
    workflow; the sync rebuilds 90 days.
-   **Run a sync now** → Actions → Deploy to GitHub Pages → Run workflow.
-   **Code changes** → edit, `npm run verify`, push to `main`; it deploys
    automatically.

### 0.8 Possible next steps (not started)

-   Body-weight log and daily calorie/protein targets.
-   Optional cross-device sync for food entries (currently per browser).

------------------------------------------------------------------------

## 1. Product vision

Build a private personal web application that brings together:

-   **HealthifyMe** for daily food logs, calorie intake, and
    macronutrients when available.
-   **Garmin Connect** for activities, workout calories, active
    calories, and total daily energy expenditure when available.
-   A **calorie-balance engine** that estimates whether the user is in a
    calorie deficit, around maintenance, or in a calorie surplus.
-   A **daily dashboard and history** so the user can see the numbers in
    one place instead of manually checking separate apps.

The central question the application should answer is:

> **How many calories have I eaten today, how many calories have I
> burned today, and am I in a deficit, around maintenance, or in a
> surplus?**

This is a personal-use application. Keep it maintainable, private by
default, transparent about data sources, and useful even when one
external integration is unavailable.

## 2. Primary goals

1.  Show today's calories consumed from HealthifyMe when supported data
    access is available.
2.  Show today's Garmin activities and available activity/workout
    calorie estimates.
3.  Show total daily calories burned only when a suitable
    total-expenditure value is available, or show a clearly labelled
    estimate if a defensible method is possible.
4.  Calculate calorie balance as **calories consumed minus total daily
    energy expenditure**.
5.  Classify the result as estimated deficit, around maintenance,
    surplus, or incomplete data.
6.  Show the latest successful sync time and the status of each data
    source.
7.  Allow the user to select dates and review previous days.
8.  Keep provider integrations, data normalization, calculations, and UI
    in separate modules.
9.  Store credentials and tokens securely; keep the app private by
    default.
10. Store source code in a GitHub repository and deploy the dashboard to
    an appropriate hosting service.

## 3. User stories

-   As a user, I can see today's total calories consumed.
-   I can inspect individual food entries when HealthifyMe provides
    them.
-   I can see protein, carbohydrates, and fat totals when available.
-   I can see Garmin activities, activity type, duration, distance where
    relevant, and activity calories when available.
-   I can distinguish individual workout calories, active calories,
    resting calories, and total daily calories burned.
-   I can see my estimated calorie balance and its status.
-   I can tell when the current day's data is provisional or incomplete.
-   I can see the last successful sync for each provider separately.
-   I can review previous days and weekly trends.
-   I can import a supported export or enter data manually if an
    automatic integration is not available.
-   I can understand which source each number came from and how
    calculated values were derived.

## 4. Data-access feasibility comes first

**The main technical risk is access to personal HealthifyMe and Garmin
data.** Prove data access through supported methods before building a
full integration. Do not claim an integration works until tested with
authorized data from the user's accounts.

### 4.1 HealthifyMe

> **Superseded (2026-10-17):** investigated; no supported access exists.
> Daily macro totals are entered manually. See section 0.

Investigate whether HealthifyMe offers an official, supported API,
personal-data export, or another permitted method to access the user's
own food diary.

Desired data, subject to actual availability:

-   Food-entry identifier
-   Food name and portion/quantity
-   Entry date and time
-   Calories per entry
-   Daily calorie total
-   Protein, carbohydrates, and fat
-   Source update time or export time

Preferred order of implementation:

1.  Official supported API or integration.
2.  Official data export/import, such as CSV, if available.
3.  Manual daily totals or manual food-entry input.

Do not assume an unofficial API collection or reverse-engineered
endpoint is a supported public API. Do not bypass authentication, scrape
protected pages, hard-code private endpoints, or rely on undocumented
behavior without reviewing permission and terms. If the only available
method supplies daily totals, support those totals rather than inventing
individual entries.

### 4.2 Garmin Connect

Investigate official Garmin-supported data access and its eligibility,
authorization, and scope requirements. Do not assume an ordinary Garmin
Connect account has unrestricted API access.

Desired data, subject to actual availability:

-   Activity ID, name, and type
-   Start time, duration, and distance where relevant
-   Activity/workout calories
-   Daily active calories
-   Daily resting calories
-   Total daily calories burned
-   Last update or sync timestamp

Preferred order:

1.  Official supported and authorized data access.
2.  Permitted export/import method.
3.  Manual import or entry.

Never put a Garmin password, token, or client secret in source code or
frontend code. Do not bypass provider access controls.

### 4.3 Fallback and source status

The application must work even when a provider is unavailable. Each
source should have a clear status:

-   Not configured
-   Connected
-   Import-only
-   Syncing
-   Sync successful
-   Stale data
-   Error / reauthorization required

When required data is missing, show "incomplete data" instead of
manufacturing a balance. Show the last successful sync and any
limitations.

## 5. Calorie-balance logic

### 5.1 Main formula

When compatible values are available for the same local date:

`calorie_balance_kcal = calories_consumed_kcal - total_daily_expenditure_kcal`

Interpretation:

-   Negative balance: estimated calorie deficit.
-   Near-zero balance: around maintenance.
-   Positive balance: estimated calorie surplus.

Example:

-   Calories consumed: 2,100 kcal
-   Total daily calories burned: 2,650 kcal
-   Balance: 2,100 − 2,650 = **−550 kcal**, indicating an estimated
    deficit.

Use an initial configurable maintenance tolerance of **±150 kcal**. This
is a product display convention, not a medical standard. Make the
threshold configurable.

### 5.2 Avoid double-counting

Do **not** add Garmin workout calories or active calories to Garmin's
total daily calories burned if that total already includes them.

Do not label workout calories or active calories as total daily energy
expenditure. If only activity calories are available, show them
separately and mark the daily balance incomplete unless a documented and
defensible expenditure estimate can be made.

Only add resting and active calories if the provider's definitions
establish that the components are compatible, cover the same period, and
do not overlap. Label the sum as an estimate unless the provider itself
supplies it as total daily expenditure.

### 5.3 Partial days and uncertainty

Today's energy expenditure is incomplete until the day ends. The
dashboard must:

-   Label current-day figures "so far today" or "provisional."
-   Display the latest sync time and data coverage.
-   Avoid silently comparing partial intake with full-day expenditure or
    vice versa.
-   Show "incomplete data" if a required value is missing.
-   Distinguish a provisional current-day result from a finalized daily
    result.
-   Recalculate historical days when late-arriving source data changes.
-   Keep enough source and calculation metadata to explain changes.

Food portions and wearable energy expenditure are estimates. Never
present the daily balance as an exact measurement of body-fat change.

## 6. Dashboard requirements

### 6.1 Daily overview

Show clear summary cards for:

-   **Calories consumed** (kcal)
-   **Total daily calories burned** (kcal), if available
-   **Estimated calorie balance** (kcal)
-   **Status:** deficit / around maintenance / surplus / incomplete data

Also show, where available:

-   Protein, carbohydrates, and fat
-   Active calories, separate from total daily expenditure
-   Number of food entries
-   Number of activities
-   Selected date and local timezone
-   HealthifyMe last-sync time
-   Garmin last-sync time
-   Data-quality indicator if a source is missing, stale, or incomplete

Use sensible rounding; avoid false precision.

### 6.2 Food log

Display the day's food entries with time, food name, serving/quantity,
calories, and available macros. Identify imported versus manually
entered records. If only a daily total is available, display that total
without fabricating individual food entries.

### 6.3 Activity log

Display Garmin activities with activity type, start time, duration,
distance where relevant, and workout calories when available. Separately
show daily active calories and total daily calories burned if the source
supports them. Label each metric clearly.

### 6.4 History and trends

Provide a date selector and daily/weekly views for:

-   Calories consumed
-   Total daily calories burned, when available
-   Estimated calorie balance
-   Protein intake, when available
-   Body weight only if the user chooses to enter or import it

Distinguish finalized days from incomplete days. Do not infer actual
weight change directly from one day's calorie balance.

### 6.5 Data-source panel

For each provider, show:

-   Connection/import status
-   Last successful sync
-   Date range covered
-   Permission/authentication issues
-   Retry, refresh, or manual-import action when appropriate

## 7. Recommended architecture

First inspect the existing repository and preserve its working stack and
conventions. If starting from scratch, use:

-   **Frontend:** Next.js + TypeScript
-   **UI:** Tailwind CSS and accessible responsive components
-   **Backend:** server-side Next.js routes or a separate TypeScript
    service
-   **Database:** PostgreSQL through a reputable managed provider
-   **Validation:** schema validation at integration boundaries
-   **Authentication:** private, single-user access initially
-   **Source control:** GitHub repository
-   **Hosting:** Vercel or another host supporting server-side functions
    and secrets

GitHub stores the code; it is not necessarily the production host.
GitHub Pages is suitable for static sites but is not the preferred
option for a dashboard that needs secure provider credentials and
server-side integrations. A server-capable host is recommended.

### Suggested module boundaries

-   `integrations/healthifyme/` --- supported authorization,
    fetch/import, normalization
-   `integrations/garmin/` --- supported authorization, fetch/import,
    normalization
-   `lib/calorie-balance/` --- calculation logic and unit tests
-   `lib/sync/` --- sync orchestration, retries, deduplication, status
-   `app/` or `dashboard/` --- daily dashboard, food log, activities,
    history
-   `docs/` --- setup, integration limitations, data definitions

Keep source-specific code independent from the UI so providers can be
changed without rewriting the dashboard.

### Do we need MCP?

Not necessarily. The application can read provider data through backend
connectors and calculate the balance itself. Add an MCP server only if
there is a concrete need for an external tool to query or act on the application's
data through standardized tools.

If MCP is useful, start with read-only tools such as:

-   `get_daily_nutrition(date)`
-   `get_daily_garmin_summary(date)`
-   `get_activities(date)`
-   `get_calorie_balance(date)`
-   `get_sync_status()`

Return structured values with units, source attribution, timestamps, and
data-quality flags. Require explicit confirmation for any future tool
that modifies or deletes records.

## 8. Suggested normalized data model

Adapt the schema to the fields that the providers actually supply;
nullable fields are expected.

### `food_entries`

-   `id`
-   `source` (`healthifyme`, `manual`, or another approved source)
-   `source_record_id` (nullable)
-   `logged_at`
-   `local_date`
-   `food_name`
-   `quantity` or `serving_description` (nullable)
-   `calories_kcal`
-   `protein_g` (nullable)
-   `carbohydrates_g` (nullable)
-   `fat_g` (nullable)
-   `imported_at`
-   `updated_at`

### `daily_nutrition`

-   `local_date`
-   `source`
-   `calories_kcal` (nullable)
-   `protein_g` (nullable)
-   `carbohydrates_g` (nullable)
-   `fat_g` (nullable)
-   `is_complete`
-   `last_synced_at`

### `activities`

-   `id`
-   `source`
-   `source_activity_id`
-   `activity_type`
-   `started_at`
-   `duration_seconds` (nullable)
-   `distance_meters` (nullable)
-   `activity_calories_kcal` (nullable)
-   `imported_at`

### `daily_energy`

-   `local_date`
-   `source`
-   `active_calories_kcal` (nullable)
-   `resting_calories_kcal` (nullable)
-   `total_burned_kcal` (nullable)
-   `calculation_method`
-   `is_complete`
-   `last_synced_at`

### `sync_runs`

-   `id`
-   `source`
-   `started_at`
-   `finished_at`
-   `status`
-   `records_imported`
-   `error_summary` (nullable)

Use unique constraints on source + source record ID when possible. Store
timestamps consistently with timezone awareness and derive local dates
in one defined timezone. Start with `Asia/Kuala_Lumpur` as the user's
timezone, configurable in settings.

## 9. Calculation pseudocode

``` ts
type BalanceStatus = "deficit" | "maintenance" | "surplus" | "incomplete";

type DailyBalance = {
  intakeKcal: number | null;
  totalBurnedKcal: number | null;
  balanceKcal: number | null;
  status: BalanceStatus;
  isPartialDay: boolean;
  method: string;
};

function calculateDailyBalance(
  intakeKcal: number | null,
  totalBurnedKcal: number | null,
  isPartialDay: boolean,
  maintenanceToleranceKcal = 150
): DailyBalance {
  if (intakeKcal == null || totalBurnedKcal == null) {
    return {
      intakeKcal,
      totalBurnedKcal,
      balanceKcal: null,
      status: "incomplete",
      isPartialDay,
      method: "insufficient data"
    };
  }

  const balanceKcal = intakeKcal - totalBurnedKcal;

  let status: BalanceStatus;
  if (balanceKcal < -maintenanceToleranceKcal) {
    status = "deficit";
  } else if (balanceKcal > maintenanceToleranceKcal) {
    status = "surplus";
  } else {
    status = "maintenance";
  }

  return {
    intakeKcal,
    totalBurnedKcal,
    balanceKcal,
    status,
    isPartialDay,
    method: "intake minus total daily expenditure"
  };
}
```

Do not compare partial-day intake with a full-day expenditure figure
without a clear warning and compatible time windows. Missing data must
remain missing rather than being replaced with a fabricated value.

## 10. GitHub, deployment, and secrets

-   Keep the source repository private by default because the project
    handles personal nutrition and activity information.
-   Store application code and documentation in GitHub.
-   Deploy the dashboard to a host that supports server-side code and
    environment variables, such as Vercel.
-   Store API keys, OAuth secrets, tokens, and database credentials in
    the deployment host's secret/environment settings.
-   Never commit `.env`, token files, exports containing personal data,
    or credentials.
-   Include `.env.example` with variable names and placeholder values
    only.
-   Add appropriate `.gitignore` rules.
-   Document local development, deployment, database migrations,
    provider setup, and recovery.
-   Do not claim a repository has been created, a provider connected, or
    a deployment completed until the action has actually succeeded.
-   If GitHub access is not connected, prepare the repository-ready code
    locally and tell the user what connection/action is required to
    publish it.

## 11. Privacy and security

This app contains personal nutrition and activity data:

-   Private by default, with authentication and server-side
    authorization.
-   Use secure transport and the database/provider's appropriate
    protections at rest.
-   Never expose provider tokens or secrets to browser code.
-   Avoid logging raw food diaries, health records, passwords, or
    tokens.
-   Request only the minimum necessary permissions.
-   Provide a way to disconnect providers and delete imported data.
-   Respect source-provider terms and applicable privacy requirements.
-   Use mock/sample data only for design previews, and label it clearly
    as illustrative.

## 12. Implementation plan

### Phase 1 --- inspect the existing project

-   Inspect repository files, current framework, database,
    authentication, and deployment.
-   Report the existing stack and any constraints.
-   Preserve existing working features and conventions.
-   Propose a short plan before large changes.

### Phase 2 --- prove provider access

-   Investigate official HealthifyMe API/export options.
-   Investigate official Garmin data-access routes and permissions.
-   Document which fields are truly available and how often they can be
    refreshed.
-   Build a minimal proof of concept for each accessible source.
-   If an integration is unavailable, implement a labelled
    manual/file-import fallback.

### Phase 3 --- data layer

-   Create normalized schemas and validation.
-   Implement imports, idempotency, and deduplication.
-   Track source, sync timestamps, errors, and data coverage.
-   Test duplicate records, late updates, missing fields, and timezone
    boundaries.

### Phase 4 --- balance calculations

-   Implement the calculation service and unit tests.
-   Validate definitions of total, active, resting, and workout
    calories.
-   Prevent double-counting.
-   Make the maintenance tolerance configurable.
-   Clearly label current-day results as provisional.

### Phase 5 --- dashboard and history

-   Build daily summary cards, food log, activity list, source status,
    and historical views.
-   Make the app responsive for desktop and mobile.
-   Add refresh, retry, and manual-import controls.
-   Show source and last-sync information beside the relevant metrics.

### Phase 6 --- test and deploy

-   Add unit and integration tests.
-   Cover loading, empty, stale, disconnected, and error states.
-   Validate Malaysia timezone behavior.
-   Check that secrets never reach the frontend or Git history.
-   Deploy privately and document setup and recovery.

## 13. Acceptance criteria

The first useful version is complete when:

1.  Today's HealthifyMe calorie intake is displayed or can be imported
    through a documented fallback.
2.  Today's Garmin activities and available calorie values are displayed
    or can be imported through a documented fallback.
3.  The app distinguishes workout/activity calories from total daily
    expenditure.
4.  The app calculates `intake − total daily expenditure` only when
    compatible values are available.
5.  The status reads deficit, around maintenance, surplus, or incomplete
    data.
6.  Current-day data is labelled provisional and is not misrepresented
    as a finalized daily total.
7.  Re-syncing the same data does not duplicate entries.
8.  Each provider displays its last sync time and any missing-data
    status.
9.  Previous days can be reviewed.
10. Tests cover deficit, maintenance, surplus, missing data, partial
    days, and double-counting risks.
11. The dashboard remains usable if either external integration is
    unavailable.
12. The repository and deployment setup do not expose credentials or
    personal data.

## 14. Engineering guidelines

Act as a pragmatic senior full-stack engineer.

1.  Read this document fully before editing the repository.
2.  Inspect the existing project and summarize the current stack and
    implementation status.
3.  Validate HealthifyMe and Garmin data access through supported
    methods before building production integrations.
4.  Do not invent endpoints, OAuth scopes, provider capabilities, or
    credentials.
5.  Do not state that a connector works until it has been tested using
    authorized data.
6.  Distinguish provider-supplied values, calculated values, manual
    inputs, and estimates in both code and UI.
7.  Build incrementally, with tests, keeping the app runnable after each
    phase.
8.  Ask the user only for decisions or credentials that cannot be
    obtained through safe project configuration; never ask the user to
    paste passwords or secrets into chat.
9.  Keep the dashboard private by default and deploy only after
    configuration and access have been reviewed.
10. Prioritize a working daily overview over unnecessary complexity.

The product's core outcome is a reliable personal answer to:

> **"How many calories have I eaten today, how many calories have I
> burned today, and am I in a deficit, around maintenance, or in a
> surplus?"**
