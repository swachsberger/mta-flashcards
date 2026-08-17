# Data build

`data/stations.js` and `data/routes.js` are generated, not hand-edited.

- **Stations** come from the [MTA Subway Stations dataset](https://data.ny.gov/api/v3/views/39hk-dx4f)
  on data.ny.gov (all fields: borough, division, structure, ADA, CBD, lat/lng,
  direction labels, complex id, daytime routes).
- **Route stop-order** is derived from the MTA GTFS static feed
  (`https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip`): each line's *set* of
  stops is taken from the daytime-routes field (which already encodes daytime
  express/local reality), and the *order* is read off the GTFS trip that covers
  the most of those stops. Branch tails (e.g. the A's Rockaway/Lefferts splits)
  are appended by latitude and are approximate.

`build_data.py` documents the transform. `serve.py` is a no-cache static server
for local dev (`python3 build/serve.py 8777`).
