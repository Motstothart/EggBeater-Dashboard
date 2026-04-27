# EggBeater Dashboard

A single-page dashboard for tracking athletes day-to-day across three tracks: 9th graders, 10th graders on the full recruiting roadmap, and 11th / retainer / partial-commit relationships.

## Architecture

```
Browser  --reads-->  data/*.json  (roster, state, actions)
                          ^
                          | commits
Claude scheduled task ----+
   reads:   data/roster.json (source of truth: athletes, parents, mentors, deliverables)
   reads:   Google Calendar / Drive / Gmail
   writes:  data/state.json   (derived facts: last/next meeting, drive progress, surfaced notes)
   writes:  data/actions.json (punch list, completed tasks, athlete notes)
```

- Frontend: Next.js (App Router), deployed on Vercel.
- Persistence: JSON files in this repo. Version-controlled and auto-committed by the scheduled task.
- No Zapier, no third-party automation. A scheduled Claude task does all the integration work.

## Data files

- `data/roster.json` - the source of truth for athletes, parents, mentors, deliverables, and global rules. Edit this manually (or via the upcoming Phase 1 form) to add/remove athletes.
- `data/state.json` - derived facts written by the scheduled task. Do not edit by hand.
- `data/actions.json` - your manual notes, punch list items, and completed-task history. Edited by the UI in Phase 1.

## Tracks

| Track | Description |
|---|---|
| `9th` | Light touch. Schedule support and meeting cadence. |
| `10th-roadmap` | Full recruiting roadmap. Per-athlete deliverable schedule. |
| `11th-retainer` | On retainer or partial commitment. Free-form action tracking. |

## Cadence rules

Defined in `roster.json` under `rules`:

- `meetingOverdueWeeks: 3` - athletes turn red when 3+ weeks have passed since last meeting.
- `deliverableWarnDays: 14` - 10th-grade deliverables turn yellow 2 weeks before due, red after.

## Phase plan

- **Phase 0** Scaffold + roster + read-only stub UI showing three columns.
- **Phase 1** Interactive UI: notes popover, deliverable checkoffs, message templates, add/remove athlete form, punch list.
- **Phase 2 (this commit)** Google Calendar sync. `/api/sync/calendar` matches events to athletes by attendee email or name and writes to `data/state.json`. Triggered every 15 min by GitHub Actions cron and on-demand by the "Sync now" button. Drives meeting status pills and "weeks since last meeting" data.
- **Phase 3** Google Drive integration. Auto-detect deliverable progress from athlete folders. Surface in-doc "mot to..." notes as actions.
- **Phase 4** Gmail integration. Surface incoming items as pending actions.
- **Phase 5** Polish: completed-task drawer, broader template library, message generators for weekend prep emails.

## Local development

```
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

Import this repo on Vercel.

### Required env vars (Phase 1)

- `GITHUB_TOKEN` - a fine-grained personal access token with **Contents: Read and write** scope on this repo. Without it the dashboard runs in read-only mode.
- `GITHUB_BRANCH` - branch to read from and commit to. Defaults to `main`. Set this to whatever branch your Vercel project deploys (e.g. `claude/build-tracking-dashboard-VMxvR`).

### How to create the GitHub token

1. Visit https://github.com/settings/personal-access-tokens/new
2. Token name: `EggBeater Dashboard write`
3. Resource owner: your account
4. Expiration: pick the longest you're comfortable with (or "no expiration")
5. Repository access: **Only select repositories** > add `EggBeater-Dashboard`
6. Repository permissions: scroll to **Contents** and set to **Read and write**
7. Generate token, copy it
8. In Vercel: Project > Settings > Environment Variables > add `GITHUB_TOKEN` (paste) and `GITHUB_BRANCH` (set to your deploy branch)
9. Redeploy

### Phase 2 env vars (Google Calendar)

Three env vars enable Calendar sync. The "Sync now" button stays disabled until they're set.

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `CRON_SECRET` (any random string - used by the GitHub Actions cron to authenticate to the sync endpoint)

### Google OAuth setup (one-time, ~10 minutes)

1. **Create a Google Cloud project**
   - Visit https://console.cloud.google.com/
   - Click the project dropdown (top left) > **New Project**. Name it `EggBeater Dashboard`. Create.
   - With the project selected, go to **APIs & Services > Library**.
   - Search for **Google Calendar API**, open it, click **Enable**.

2. **Configure the OAuth consent screen**
   - **APIs & Services > OAuth consent screen**.
   - User type: **External**. Create.
   - App name: `EggBeater Dashboard`. User support email: your email. Developer contact: your email. Save and continue.
   - Scopes: skip (we'll specify scopes in the playground). Save and continue.
   - Test users: **Add Users** > add your own Google account email. Save and continue.
   - Back to dashboard.

3. **Create OAuth credentials**
   - **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `OAuth Playground`.
   - Authorized redirect URIs: add `https://developers.google.com/oauthplayground` exactly.
   - Create. Copy the **Client ID** and **Client secret** that appear.

4. **Get the refresh token via the OAuth Playground**
   - Visit https://developers.google.com/oauthplayground/
   - Click the gear icon (top right) > check **Use your own OAuth credentials**. Paste the Client ID and Client secret. Close.
   - Step 1 - left pane, find **Calendar API v3**, expand, check `https://www.googleapis.com/auth/calendar.readonly`.
   - Click **Authorize APIs**. Sign in with the Google account whose calendar you want to read. Allow.
   - Step 2 - click **Exchange authorization code for tokens**.
   - Copy the **Refresh token** that appears (long string starting with `1//`).

5. **Add env vars in Vercel**
   - Project > Settings > Environment Variables. Add (all Production, all Sensitive ON):
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REFRESH_TOKEN`
     - `CRON_SECRET` (any string, e.g. `openssl rand -hex 32` output)
   - Save. Vercel redeploys automatically.

6. **Test the sync** Click "Sync now" on the dashboard. The status pills should fill with real meeting data within a few seconds. If it errors, check the Vercel function logs.

### GitHub Actions cron (auto-sync every 15 min)

The included `.github/workflows/sync.yml` hits the sync endpoint on a 15-minute schedule. To wire it up:

1. Repo on GitHub > Settings > Secrets and variables > Actions > **New repository secret**. Add:
   - `SYNC_URL` = your full sync endpoint URL, e.g. `https://egg-beater-dashboard.vercel.app/api/sync/calendar`
   - `CRON_SECRET` = the same value you set in Vercel
2. The cron starts running automatically. To verify, go to **Actions** tab > Sync calendar > **Run workflow**.

### Matching events to athletes

The sync matches a calendar event to an athlete in this priority order:

1. Athlete email is in the event attendee list
2. A parent email is in the attendee list
3. The mentor email is in the attendee list
4. The athlete's first name appears as a whole word in the event title or description

Set `athleteEmail`, `parentEmails`, and `mentorEmail` on the athlete to get reliable matches. Without emails, name-in-title is the fallback (works fine for distinctive names).

## Conventions

- No emojis anywhere in the UI or code.
- All dates in `roster.json` are ISO-8601 (`YYYY-MM-DD`).
- Athlete IDs are kebab-case slugs of the athlete's name.
