// Lightweight localStorage-backed progress + spaced-repetition scaffold.
// Kept intentionally small in Phase 0; modes call record() / bestFor().
window.Stats = (function () {
  var KEY = "mta_mastery_v1";
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { stations: {}, routes: {}, totals: { seen: 0, correct: 0 } };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // Leitner-lite box (0..5). Correct promotes, wrong resets to 0.
  function record(stationId, correct) {
    var s = state.stations[stationId] || { seen: 0, correct: 0, box: 0, last: 0 };
    s.seen++;
    if (correct) { s.correct++; s.box = Math.min(5, s.box + 1); }
    else { s.box = 0; }
    s.last = Date.now();
    state.stations[stationId] = s;
    state.totals.seen++;
    if (correct) state.totals.correct++;
    save();
  }

  // Weight for spaced repetition: lower box + longer since seen = more likely.
  function weight(stationId) {
    var s = state.stations[stationId];
    if (!s) return 6;                 // never seen -> high priority
    var recency = Math.min(5, (Date.now() - s.last) / (1000 * 60 * 60)); // hrs, capped
    return (6 - s.box) + recency * 0.5;
  }

  function recordRoute(routeKey, result) {
    var r = state.routes[routeKey] || { attempts: 0, bestCount: 0, bestPct: 0, bestTimeMs: null };
    r.attempts++;
    if (result.count > r.bestCount) r.bestCount = result.count;
    if (result.pct > r.bestPct) r.bestPct = result.pct;
    if (result.full && (r.bestTimeMs === null || result.timeMs < r.bestTimeMs)) r.bestTimeMs = result.timeMs;
    state.routes[routeKey] = r;
    save();
  }
  function routeStat(routeKey) { return state.routes[routeKey] || null; }

  function masteryPct() {
    var ids = Object.keys(state.stations);
    if (!ids.length) return 0;
    var mastered = ids.filter(function (id) { return state.stations[id].box >= 3; }).length;
    return Math.round((mastered / (MTA.stations || []).length) * 100);
  }

  return {
    record: record, weight: weight, masteryPct: masteryPct,
    recordRoute: recordRoute, routeStat: routeStat,
    totals: function () { return state.totals; },
    reset: function () { state = { stations: {}, routes: {}, totals: { seen: 0, correct: 0 } }; save(); }
  };
})();
