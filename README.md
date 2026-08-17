# MTA Mastery

A study tool for memorizing and mastering the NYC MTA subway map — a small,
dependency-free, offline-capable web app.

## Modes

- **Station → Lines** (recall) — see a station and its borough; name the daytime
  lines that stop there. Type a guess for auto-grading, or self-grade.
- **Name the Line** (line mastery) — pick a train and type every stop it serves.
  Each station drops into its slot **in order**, against the clock. Fuzzy matching
  (so "union sq", "8th ave" all land), progress bar, best-time tracking, give-up.

Progress (mastery %, accuracy, per-line bests) is saved in `localStorage`.

## Run it

Single-page app, no build step, no dependencies. Serve the folder:

```bash
python3 build/serve.py 8777      # then open http://localhost:8777
```

(It also runs from `file://` because the scripts are plain, non-module scripts.)

## Structure

```
index.html            # shell + script loader
css/styles.css
data/stations.js      # 493 stations, all fields (generated)
data/routes.js        # ordered stop sequences per route (generated)
data/meta.js          # colors, borough names, name normalization
js/stats.js           # localStorage progress + spaced-repetition scaffold
js/app.js             # hash router + home screen
js/modes/*.js         # one file per game mode (self-register with App)
build/build_data.py   # regenerates the data files from source
```

## Data

Station attributes from the [MTA Subway Stations dataset](https://data.ny.gov/api/v3/views/39hk-dx4f)
on data.ny.gov; stop ordering derived from the MTA GTFS static feed. See
[`build/README.md`](build/README.md) for how the data is built.

## Roadmap

Foundation (Phase 0) and Name-the-Line (Phase 2) are in. Next: more recall modes
(reverse, borough/structure/ADA), map-based click-to-locate, terminals/transfers,
a daily challenge with shareable results, and a progress dashboard.
