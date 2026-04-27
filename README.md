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
- **Phase 1 (this commit)** Interactive UI: click-to-open notes popover, checkbox tick-offs for deliverables, message templates (scheduling / check-in / template request), add/remove athlete form, punch list with adds and completes.
- **Phase 2** Google Calendar integration via scheduled Claude task. Drives meeting status and the daily punch list. Replaces the old weekly session checker.
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

### Phase 2 env vars (not yet)

`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` - added when Calendar integration ships.

## Conventions

- No emojis anywhere in the UI or code.
- All dates in `roster.json` are ISO-8601 (`YYYY-MM-DD`).
- Athlete IDs are kebab-case slugs of the athlete's name.
