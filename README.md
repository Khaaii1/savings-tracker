# Ledger — a savings goal tracker

Set a savings goal and a deadline, log your actual savings each week, and see
immediately — with numbers, not vibes — whether you're on pace, ahead, or
behind.

## Tech stack, and why

| Piece | Choice | Why |
|---|---|---|
| UI | React 18 | Component state maps naturally onto "plan settings" + "weekly entries," and it's the most common choice a hiring manager will recognize in a portfolio project. |
| Build tool | Vite | Fast local dev server, zero-config, and its static `dist/` output deploys to GitHub Pages with nothing extra. |
| Charting | Recharts | The only real dependency beyond React itself. Hand-rolling an SVG line chart for two series with tooltips is a lot of code to maintain for not much benefit. |
| Styling | Plain CSS (`src/index.css`) | No Tailwind/UI kit — for an app this size a hand-written stylesheet is easier to read for a beginner/intermediate developer, keeps the dependency count near zero, and lets the design (see below) avoid looking like a template. |
| Persistence | `localStorage`, via `src/lib/storage.js` | No backend needed for a personal tool. All reads/writes go through one small file, so swapping in a real API later means changing one file, not the whole app. |
| State | One custom hook, `useSavingsPlan` | Keeps all the "what does the app currently know" logic in one place, separate from how it's drawn on screen. |

**No date library, no CSS framework, no state management library.** The app
doesn't need them, and every dependency is something a future maintainer has
to trust and keep updated.

## How the math works

This is the part worth understanding before touching the code — it's all in
`src/lib/calculations.js`, which has no React or DOM code in it at all, so
you can read (and unit test) it on its own.

- **The benchmark schedule** (`buildSchedule`) is a straight line from your
  starting savings to your target, split evenly across the weeks between
  when you set up the plan and your deadline. It's fixed once created — it
  only moves if you edit your goal, target, or deadline — so your weekly
  check-ins are always compared against a stable yardstick, not one that
  quietly redraws itself around your actual progress.
- **"Current savings"** shown on the dashboard is your most recent weekly
  check-in if you've logged one, otherwise the starting savings figure you
  entered. Editing "current savings" directly in settings updates that
  baseline (handy if you got a windfall and don't want to wait for the next
  weekly check-in).
- **Required weekly pace** is recalculated live from *today*: `(target −
  current savings) ÷ weeks left`. This is compared against your stated
  *weekly savings goal* — if your goal is lower than what's actually
  required, the dashboard says so explicitly, rather than assuming your
  stated goal is sufficient.
- **Projected final total** extrapolates forward using your real observed
  average weekly savings rate once you've logged at least one check-in
  (falling back to your stated weekly goal before that).

### Edge cases it handles on purpose

- Deadline already passed, with or without the goal being met
- Deadline is today
- Zero starting savings, or a $0 weekly goal
- Savings already at or past the target
- Target set lower than current savings
- Weeks that don't divide evenly (a shorter final week lands exactly on the
  target instead of overshooting)
- Changing the deadline after weekly entries already exist (the schedule
  rebuilds; any logged entries beyond the new, shorter schedule are kept and
  compared against the target itself)

All of these are covered by unit tests in
`src/lib/__tests__/calculations.test.js`.

## Design

The visual idea is a bank passbook / ledger, which is where a "savings
tracker" naturally lives: paper-toned background, a serif for the numbers
that matter, a monospace-style tabular treatment for the weekly table, and a
single accent color (deep emerald) reserved for positive progress, with a
brick red for behind-pace states. Structure (the week-numbered ledger rows)
is used because the content really is sequential — not decoration.

## Running it locally

You'll need [Node.js](https://nodejs.org) 18 or later.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Running the tests

The calculation logic has no dependencies, so its tests run with Node's
built-in test runner — no extra tooling required:

```bash
npm test
```

## Building for production

```bash
npm run build
```

This outputs a static site to `dist/`. Preview it locally with:

```bash
npm run preview
```

## Deploying to GitHub Pages

There are two ways to do this — pick one.

### Option A: GitHub Actions (recommended, deploys automatically)

This repo already includes `.github/workflows/deploy.yml`. To turn it on:

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

The workflow builds the app and publishes `dist/` automatically, setting the
correct base path for `https://<your-username>.github.io/<repo-name>/`.

### Option B: Deploy manually with `gh-pages`

```bash
VITE_BASE=/<your-repo-name>/ npm run build
npx gh-pages -d dist
```

Then, in **Settings → Pages**, set **Source** to the `gh-pages` branch.

> If you're deploying to a custom domain or to the root of
> `<username>.github.io`, you can skip `VITE_BASE` entirely (it defaults to
> `/`).

## Project structure

```
src/
  lib/
    calculations.js   # all the math — pure functions, no React
    storage.js        # localStorage read/write, isolated for an easy backend swap later
  hooks/
    useSavingsPlan.js # owns plan state, persistence, and derived values
  components/
    SetupScreen.jsx   # first-run form
    Dashboard.jsx      # hero, stat grid, chart, ledger — the main screen
    StatCard.jsx
    StatusPill.jsx
    ProgressBar.jsx
    SavingsChart.jsx
    WeeklyLedger.jsx  # the weekly check-in table with inline edit/delete
    SettingsPanel.jsx # edit goal/deadline/current savings, reset plan
  App.jsx
  main.jsx
  index.css
```

## Ideas for taking this further

The core app is complete and tested. If you want to keep building on it as a
portfolio piece, roughly in order of impact:

1. **Multiple named goals** (e.g. "Emergency fund" and "Trip to Japan" side
   by side) instead of one plan at a time.
2. **CSV export** of the weekly ledger, for people who want to keep records
   outside the app.
3. **A real backend** (the `storage.js` boundary already exists for this) so
   the plan follows you across devices instead of living in one browser.
4. **Streaks / reminders**, e.g. a lightweight browser notification on the
   day a week's check-in is due.
5. **Currency selection** — right now everything assumes USD.
