# MTA Subway Flashcards

A study tool for memorizing the NYC MTA subway map.

**How to play:** each card shows a station name and its borough — your job is to name the
daytime lines that serve it. Type your guess (e.g. `N Q R`) and hit **Reveal** to be
auto-graded, or just hit Reveal to test yourself and **self-grade** with *Got it / Missed*.
The answer is shown as official MTA route bullets in their real line colors.

## Features

- All 493 stations (with daytime routes), baked in — runs fully offline, no network needed.
- Typed-guess grading that tells you what you missed and any extras.
- Colored route bullets matching MTA line colors.
- Correct / Seen / Streak tracking, with a shuffled deck (no repeats until exhausted).
- Borough filter chips to drill into a single borough.

## Run it

Just open the file — it's a single self-contained HTML page:

```bash
open index.html
```

## Data

Station and daytime-route data comes from the
[MTA Subway Stations dataset](https://data.ny.gov/api/v3/views/39hk-dx4f) on data.ny.gov,
bundled into `index.html` at build time.
