// Mode: Station -> Lines. Show a station + borough; name the daytime routes.
// Deck can be filtered to specific boroughs and/or lines via the Filters toggle.
(function () {
  var FILTER_KEY = "mta_fc_filters_v1";

  function bullet(route, cls) {
    var b = document.createElement("div");
    b.className = "bullet" + (route === "SIR" ? " bullet--sir" : "") + (cls ? " " + cls : "");
    b.style.background = MTA.routeColor(route);
    b.style.color = MTA.DARK_TEXT.has(route) ? "#000" : "#fff";
    b.textContent = route;
    return b;
  }

  function routeSort(a, b) {
    function rank(t) {
      if (/^\d+$/.test(t)) return [0, parseInt(t, 10), t];
      if (t === "S") return [2, 0, t];
      if (t === "SIR") return [3, 0, t];
      return [1, t.charCodeAt(0), t];
    }
    var ra = rank(a), rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || (ra[2] < rb[2] ? -1 : 1);
  }

  // distinct daytime route labels across all stations
  function allLines() {
    var seen = {};
    MTA.stations.forEach(function (s) { s.r.forEach(function (r) { seen[r] = 1; }); });
    return Object.keys(seen).sort(routeSort);
  }

  function loadFilters() {
    try {
      var f = JSON.parse(localStorage.getItem(FILTER_KEY)) || {};
      return { boros: f.boros || [], lines: f.lines || [] };
    } catch (e) { return { boros: [], lines: [] }; }
  }

  function mount(root) {
    var saved = loadFilters();
    var selBoros = {}; saved.boros.forEach(function (b) { selBoros[b] = 1; });
    var selLines = {}; saved.lines.forEach(function (l) { selLines[l] = 1; });

    var deck = [], pool = [], current = null, revealed = false;
    var correct = 0, seen = 0, streak = 0;

    root.innerHTML =
      '<div class="fc-toolbar">' +
        '<button class="btn fc-filter-toggle" id="fcFilterToggle">' +
          '<span class="caret">▶</span> Filters <span class="fc-filter-badge hidden" id="fcBadge"></span>' +
        "</button>" +
        '<span class="fc-deckcount" id="fcDeckCount"></span>' +
      "</div>" +
      '<div class="fc-filters hidden" id="fcFilters">' +
        '<div class="filter-group">' +
          '<div class="filter-label">Boroughs</div>' +
          '<div class="chips" id="fcBoroChips"></div>' +
        "</div>" +
        '<div class="filter-group">' +
          '<div class="filter-label">Lines</div>' +
          '<div class="chips" id="fcLineChips"></div>' +
        "</div>" +
        '<div class="filter-actions">' +
          '<button class="btn" id="fcReset">Reset to all</button>' +
        "</div>" +
      "</div>" +
      '<div class="fc-stats">' +
        '<span>Correct <b id="fcCorrect">0</b></span>' +
        '<span>Seen <b id="fcSeen">0</b></span>' +
        '<span>Streak <b id="fcStreak">0</b></span>' +
      "</div>" +
      '<div class="card fc-card">' +
        '<div id="fcBody">' +
          '<span class="badge" id="fcBoro">—</span>' +
          '<div class="fc-name" id="fcName">—</div>' +
          '<div class="fc-line" id="fcLine"></div>' +
          '<div id="fcGuessWrap">' +
            '<div class="hint">Type the lines (e.g. <b>N Q R</b> or <b>nqr</b>), then Reveal — or Reveal to self-test</div>' +
            '<input class="guess" id="fcGuess" autocomplete="off" placeholder="? ? ?">' +
          "</div>" +
          '<div class="bullets hidden" id="fcBullets"></div>' +
          '<div class="verdict" id="fcVerdict"></div>' +
          '<div class="btnrow" id="fcPre">' +
            '<button class="btn btn--primary" id="fcReveal">Reveal</button>' +
            '<button class="btn" id="fcSkip">Skip</button>' +
          "</div>" +
          '<div class="btnrow hidden" id="fcPost">' +
            '<button class="btn btn--good" id="fcGot">Got it</button>' +
            '<button class="btn btn--bad" id="fcMiss">Missed</button>' +
          "</div>" +
        "</div>" +
        '<div class="fc-empty hidden" id="fcEmpty">No stations match these filters — widen your selection.</div>' +
      "</div>";

    var el = function (id) { return document.getElementById(id); };

    // ---- build filter chips ----
    var boroChips = el("fcBoroChips");
    Object.keys(MTA.BOROUGHS).forEach(function (code) {
      var c = document.createElement("span");
      c.className = "chip";
      c.textContent = MTA.BOROUGHS[code];
      c.dataset.code = code;
      c.onclick = function () { toggle(selBoros, code); refreshChips(); apply(); };
      boroChips.appendChild(c);
    });
    var lineChips = el("fcLineChips");
    allLines().forEach(function (label) {
      var btn = document.createElement("button");
      btn.className = "line-chip";
      btn.dataset.label = label;
      btn.title = label;
      btn.appendChild(bullet(label));
      btn.onclick = function () { toggle(selLines, label); refreshChips(); apply(); };
      lineChips.appendChild(btn);
    });

    function toggle(set, key) { if (set[key]) delete set[key]; else set[key] = 1; }

    function refreshChips() {
      var anyB = Object.keys(selBoros).length > 0;
      Array.prototype.forEach.call(boroChips.children, function (c) {
        c.classList.toggle("on", !!selBoros[c.dataset.code]);
      });
      var anyL = Object.keys(selLines).length > 0;
      Array.prototype.forEach.call(lineChips.children, function (c) {
        var on = !!selLines[c.dataset.label];
        // when nothing is selected, all lines are effectively active -> show plain
        c.classList.toggle("on", anyL && on);
        c.classList.toggle("off", anyL && !on);
      });
      // toggle-button badge = number of active constraints
      var n = Object.keys(selBoros).length + Object.keys(selLines).length;
      var badge = el("fcBadge");
      if (n) { badge.textContent = n; badge.classList.remove("hidden"); }
      else { badge.classList.add("hidden"); }
    }

    function saveFilters() {
      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify({
          boros: Object.keys(selBoros), lines: Object.keys(selLines)
        }));
      } catch (e) {}
    }

    function matches(s) {
      var b = Object.keys(selBoros);
      var l = Object.keys(selLines);
      var bOk = b.length === 0 || selBoros[s.b];
      var lOk = l.length === 0 || s.r.some(function (r) { return selLines[r]; });
      return bOk && lOk;
    }

    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function buildDeck() { deck = shuffle(pool.slice()); }

    // recompute pool from filters, save, refresh count, and deal a fresh card
    function apply() {
      pool = MTA.stations.filter(matches);
      saveFilters();
      var total = MTA.stations.length;
      el("fcDeckCount").textContent = pool.length === total
        ? total + " stations"
        : pool.length + " of " + total + " stations";
      buildDeck();
      next();
    }

    function next() {
      revealed = false;
      if (!pool.length) {
        el("fcBody").classList.add("hidden");
        el("fcEmpty").classList.remove("hidden");
        return;
      }
      el("fcBody").classList.remove("hidden");
      el("fcEmpty").classList.add("hidden");
      if (!deck.length) buildDeck();
      current = deck.pop();
      el("fcBoro").textContent = MTA.BOROUGHS[current.b] || current.b;
      el("fcName").textContent = current.n;
      el("fcLine").textContent = current.l ? current.l + " Line" : "";
      el("fcGuess").value = "";
      el("fcBullets").classList.add("hidden");
      el("fcBullets").innerHTML = "";
      el("fcVerdict").textContent = ""; el("fcVerdict").className = "verdict";
      el("fcGuessWrap").classList.remove("hidden");
      el("fcPre").classList.remove("hidden");
      el("fcPost").classList.add("hidden");
      el("fcGuess").focus();
    }

    // Tokenize a guess: any separator OR none ("654" -> 6,5,4). SIR kept whole.
    function norm(str) {
      var toks = [];
      str.toUpperCase().replace(/[^A-Z0-9]/g, " ").split(/\s+/).filter(Boolean)
        .forEach(function (chunk) {
          if (chunk === "SIR") { toks.push("SIR"); return; }
          chunk.split("").forEach(function (ch) { toks.push(ch); });
        });
      return toks;
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      seen++; el("fcSeen").textContent = seen;

      var answer = current.r;
      var guess = norm(el("fcGuess").value);
      var guessed = {}; guess.forEach(function (g) { guessed[g] = 1; });
      var ansSet = {}; answer.forEach(function (a) { ansSet[a] = 1; });

      var bd = el("fcBullets"); bd.innerHTML = "";
      answer.forEach(function (rt) { bd.appendChild(bullet(rt)); });
      bd.classList.remove("hidden");
      el("fcGuessWrap").classList.add("hidden");
      el("fcPre").classList.add("hidden");
      el("fcPost").classList.remove("hidden");

      var v = el("fcVerdict");
      if (guess.length) {
        var exact = Object.keys(guessed).length === answer.length &&
          answer.every(function (r) { return guessed[r]; });
        if (exact) {
          v.textContent = "✓ Correct!"; v.className = "verdict verdict--ok";
          correct++; streak++;
        } else {
          var missed = answer.filter(function (r) { return !guessed[r]; });
          var wrong = Object.keys(guessed).filter(function (r) { return !ansSet[r]; });
          var msg = "✗ Not quite.";
          if (missed.length) msg += " Missed: " + missed.join(" ") + ".";
          if (wrong.length) msg += " Extra: " + wrong.join(" ") + ".";
          v.textContent = msg; v.className = "verdict verdict--no";
          streak = 0;
        }
        el("fcCorrect").textContent = correct;
        el("fcStreak").textContent = streak;
        Stats.record(current.id, exact);
      } else {
        v.textContent = "Self-grade below."; v.className = "verdict";
      }
    }

    function grade(got) {
      if (!norm(el("fcGuess").value).length) {
        if (got) { correct++; streak++; } else { streak = 0; }
        el("fcCorrect").textContent = correct;
        el("fcStreak").textContent = streak;
        Stats.record(current.id, got);
      }
      next();
    }

    el("fcFilterToggle").onclick = function () {
      var open = el("fcFilters").classList.toggle("hidden") === false;
      el("fcFilterToggle").classList.toggle("open", open);
    };
    el("fcReset").onclick = function () {
      selBoros = {}; selLines = {}; refreshChips(); apply();
    };
    el("fcReveal").onclick = reveal;
    el("fcSkip").onclick = next;
    el("fcGot").onclick = function () { grade(true); };
    el("fcMiss").onclick = function () { grade(false); };
    el("fcGuess").addEventListener("keydown", function (e) { if (e.key === "Enter") reveal(); });

    function onKey(e) {
      if (e.key === " " && revealed && document.activeElement.tagName !== "INPUT") {
        e.preventDefault(); next();
      }
    }
    document.addEventListener("keydown", onKey);

    refreshChips();
    apply();

    return function teardown() { document.removeEventListener("keydown", onKey); };
  }

  App.register({
    id: "flashcards",
    phase: "RECALL",
    title: "Station → Lines",
    desc: "See a station and its borough — name the daytime lines that stop there.",
    mount: mount
  });
})();
