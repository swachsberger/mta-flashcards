window.MTA = window.MTA || {};

// Borough codes -> display names
MTA.BOROUGHS = { M: "Manhattan", Bk: "Brooklyn", Q: "Queens", Bx: "Bronx", SI: "Staten Island" };

// Official-ish MTA route bullet colors
MTA.COLORS = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  "A": "#0039A6", "C": "#0039A6", "E": "#0039A6",
  "B": "#FF6319", "D": "#FF6319", "F": "#FF6319", "M": "#FF6319",
  "G": "#6CBE45",
  "J": "#996633", "Z": "#996633",
  "L": "#A7A9AC",
  "N": "#FCCC0A", "Q": "#FCCC0A", "R": "#FCCC0A", "W": "#FCCC0A",
  "S": "#808183",
  "SIR": "#0039A6"
};

// Route bullets that need dark text (yellow line)
MTA.DARK_TEXT = new Set(["N", "Q", "R", "W"]);

MTA.routeColor = function (label) {
  return MTA.COLORS[label] || "#6b7280";
};

// Build a station-id -> station lookup once
MTA.byId = {};
(MTA.stations || []).forEach(function (s) { MTA.byId[s.id] = s; });

// --- name normalization for fuzzy matching in typing games ---
MTA.normName = function (str) {
  return (str || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.\-–—'']/g, " ")
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1")   // 8th -> 8, 42nd -> 42
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "av")
    .replace(/\baves\b/g, "av")
    .replace(/\bave\b/g, "av")
    .replace(/\bsquare\b/g, "sq")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bparkway\b/g, "pkwy")
    .replace(/\bheights\b/g, "hts")
    .replace(/\broad\b/g, "rd")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
};
