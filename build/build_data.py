#!/usr/bin/env python3
"""Regenerate data/stations.js and data/routes.js.

Sources:
  - data.ny.gov MTA Subway Stations dataset (station attributes + daytime routes)
  - MTA GTFS static feed (stop ORDER along each route)

The set of stops on a line is defined by the daytime_routes field (which already
reflects daytime express/local service); GTFS is used only to order them.

Usage:  python3 build/build_data.py
Requires the GTFS zip; downloads it if not present next to this script.
"""
import csv, json, os, io, zipfile, urllib.parse, urllib.request, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GTFS_URL = "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip"
API = "https://data.ny.gov/api/v3/views/39hk-dx4f/query.json?query="
FIELDS = ["gtfs_stop_id", "station_id", "complex_id", "division", "line", "stop_name",
          "borough", "cbd", "daytime_routes", "structure", "gtfs_latitude",
          "gtfs_longitude", "north_direction_label", "south_direction_label", "ada"]

LONG = {'1':'Broadway–7 Av Local','2':'7 Av Express','3':'7 Av Express','4':'Lexington Av Express',
 '5':'Lexington Av Express','6':'Lexington Av Local','7':'Flushing Local','A':'8 Av Express',
 'B':'6 Av Express','C':'8 Av Local','D':'6 Av Express','E':'8 Av Local','F':'6 Av Local',
 'G':'Crosstown Local','J':'Nassau St Local','L':'14 St–Canarsie','M':'6 Av Local',
 'N':'Broadway Express','Q':'2 Av / Broadway Express','R':'Broadway Local','W':'Broadway Local',
 'Z':'Nassau St Express','SIR':'Staten Island Railway'}
# GTFS route_id -> display key (express variants collapse into the base local)
DISP = {'6X':'6','7X':'7','FX':'F','GS':'S42','FS':'SF','H':'SR','SI':'SIR'}


def fetch_stations():
    q = "SELECT " + ",".join("`%s`" % f for f in FIELDS) + " ORDER BY `station_id`"
    with urllib.request.urlopen(API + urllib.parse.quote(q)) as r:
        rows = json.load(r)
    return [{k: v for k, v in row.items() if not k.startswith(":")} for row in rows]


def load_gtfs():
    path = os.path.join(HERE, "gtfs_subway.zip")
    if not os.path.exists(path):
        print("downloading GTFS…")
        urllib.request.urlretrieve(GTFS_URL, path)
    return zipfile.ZipFile(path)


def sk(t):
    return (0, int(t)) if t.isdigit() else (2, "") if t == "SIR" else (1, t)


def main():
    raw = fetch_stations()
    byid = {}
    for r in raw:
        e = byid.setdefault(r["station_id"], {
            "id": r["station_id"], "n": r["stop_name"], "b": r["borough"],
            "div": r.get("division", ""), "l": r.get("line", ""), "st": r.get("structure", ""),
            "ada": r.get("ada", "0") in ("1", "2"),
            "cbd": str(r.get("cbd", "")).lower() == "true",
            "lat": round(float(r["gtfs_latitude"]), 5) if r.get("gtfs_latitude") else None,
            "lng": round(float(r["gtfs_longitude"]), 5) if r.get("gtfs_longitude") else None,
            "nl": r.get("north_direction_label", ""), "sl": r.get("south_direction_label", ""),
            "cx": r.get("complex_id", ""), "r": set(), "gid": set()})
        e["gid"].add(r["gtfs_stop_id"])
        for t in r.get("daytime_routes", "").split():
            e["r"].add(t)
    stations, gid2sid = [], {}
    for e in byid.values():
        e["r"] = sorted(e["r"], key=sk)
        for g in e["gid"]:
            gid2sid[g] = e["id"]
        del e["gid"]
        stations.append(e)
    stations.sort(key=lambda x: (x["b"], x["n"]))
    by = {s["id"]: s for s in stations}

    z = load_gtfs()
    def read(name):
        return csv.DictReader(io.TextIOWrapper(z.open(name), "utf-8"))
    parent = {r["stop_id"]: (r["parent_station"] or r["stop_id"]) for r in read("stops.txt")}
    trip2route = {r["trip_id"]: r["route_id"] for r in read("trips.txt")}

    route_trips = collections.defaultdict(list)
    cur, seq = None, []
    def flush(t, seq):
        if not t or t not in trip2route:
            return
        d = DISP.get(trip2route[t], trip2route[t])
        stops = [parent.get(s, s) for _, s in sorted(seq)]
        out = []
        for s in stops:
            if not out or out[-1] != s:
                out.append(s)
        route_trips[d].append(out)
    st = io.TextIOWrapper(z.open("stop_times.txt"), "utf-8")
    rd = csv.reader(st); h = next(rd)
    ti, si, qi = h.index("trip_id"), h.index("stop_id"), h.index("stop_sequence")
    for row in rd:
        if row[ti] != cur:
            flush(cur, seq); cur, seq = row[ti], []
        seq.append((int(row[qi]), row[si]))
    flush(cur, seq)

    members = collections.defaultdict(set)
    for s in stations:
        for t in s["r"]:
            members[t].add(s["id"])

    def order(day, gk):
        mem = members.get(day, set())
        best, cov = None, -1
        for tr in route_trips.get(gk, []):
            c = sum(1 for g in tr if gid2sid.get(g) in mem)
            if c > cov:
                cov, best = c, tr
        idx = {}
        for i, g in enumerate(best or []):
            sid = gid2sid.get(g)
            if sid in mem and sid not in idx:
                idx[sid] = i
        inpath = sorted([m for m in mem if m in idx], key=lambda m: idx[m])
        left = sorted([m for m in mem if m not in idx], key=lambda m: -(by[m]["lat"] or 0))
        return inpath + left

    routes = {}
    for day in list("123456789")[:0] + ['1','2','3','4','5','6','7','A','B','C','D','E','F',
                                        'G','J','L','M','N','Q','R','W','Z','SIR']:
        routes[day] = {"label": day, "long": LONG.get(day, ""), "stops": order(day, day)}
    for gk, lab, ln in [("S42", "S", "42 St Shuttle"), ("SF", "S", "Franklin Av Shuttle"),
                        ("SR", "S", "Rockaway Park Shuttle")]:
        tr = max(route_trips.get(gk, [[]]), key=len)
        sids = []
        for g in tr:
            sid = gid2sid.get(g)
            if sid and (not sids or sids[-1] != sid):
                sids.append(sid)
        routes[gk] = {"label": lab, "long": ln, "stops": sids}

    with open(os.path.join(ROOT, "data", "stations.js"), "w") as f:
        f.write("window.MTA=window.MTA||{};\nMTA.stations=" +
                json.dumps(stations, separators=(",", ":")) + ";\n")
    with open(os.path.join(ROOT, "data", "routes.js"), "w") as f:
        f.write("window.MTA=window.MTA||{};\nMTA.routes=" +
                json.dumps(routes, separators=(",", ":")) + ";\n")
    print("wrote %d stations, %d routes" % (len(stations), len(routes)))


if __name__ == "__main__":
    main()
