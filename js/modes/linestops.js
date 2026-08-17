// Mode: Name the Line. Pick a route, type its stations; each fills its slot in order.
(function () {
  function bullet(label, big) {
    var b = document.createElement("div");
    b.className = "bullet" + (big ? " bullet--lg" : "") + (label === "SIR" ? " bullet--sir" : "");
    b.style.background = MTA.routeColor(label);
    b.style.color = MTA.DARK_TEXT.has(label) ? "#000" : "#fff";
    b.textContent = label;
    return b;
  }

  // Display order for the route picker
  function routeKeys() {
    var keys = Object.keys(MTA.routes);
    function rank(k) {
      var lab = MTA.routes[k].label;
      if (/^\d+$/.test(lab)) return [0, parseInt(lab, 10), k];
      if (lab === "S") return [2, 0, k];
      if (lab === "SIR") return [3, 0, k];
      return [1, lab.charCodeAt(0), k];
    }
    return keys.sort(function (a, b) {
      var ra = rank(a), rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || (ra[2] < rb[2] ? -1 : 1);
    });
  }

  function mount(root) {
    var key = null, stops = [], normed = [], found = [], timer = null, startAt = 0, done = false, hits = 0;

    root.innerHTML =
      '<div class="ns-picker" id="nsPicker"></div>' +
      '<div class="ns-body hidden" id="nsBody">' +
        '<div class="ns-head">' +
          '<span id="nsBullet"></span>' +
          '<div class="ns-head__meta">' +
            '<div class="ns-head__long" id="nsLong"></div>' +
            '<div class="ns-head__sub"><span id="nsCount">0 / 0</span> · <span id="nsTimer">0:00</span>' +
              ' · <span id="nsBest" class="ns-best"></span></div>' +
          "</div>" +
        "</div>" +
        '<div class="ns-bar"><div class="ns-bar__fill" id="nsBar"></div></div>' +
        '<input class="guess ns-input" id="nsInput" autocomplete="off" placeholder="Type a station…">' +
        '<div class="ns-controls">' +
          '<button class="btn" id="nsRestart">Restart</button>' +
          '<button class="btn btn--bad" id="nsGiveup">Give up</button>' +
        "</div>" +
        '<div class="ns-banner hidden" id="nsBanner"></div>' +
        '<div class="ns-list" id="nsList"></div>' +
      "</div>";

    var el = function (id) { return document.getElementById(id); };

    // Route picker
    var picker = el("nsPicker");
    routeKeys().forEach(function (k) {
      var wrap = document.createElement("button");
      wrap.className = "ns-pick";
      wrap.appendChild(bullet(MTA.routes[k].label));
      wrap.title = MTA.routes[k].long;
      wrap.onclick = function () { selectRoute(k); };
      wrap.dataset.key = k;
      picker.appendChild(wrap);
    });

    function fmt(ms) {
      var s = Math.floor(ms / 1000);
      return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
    }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function tick() { el("nsTimer").textContent = fmt(Date.now() - startAt); }

    function selectRoute(k) {
      key = k;
      Array.prototype.forEach.call(picker.children, function (c) {
        c.classList.toggle("ns-pick--on", c.dataset.key === k);
      });
      stops = MTA.routes[k].stops.map(function (id) { return MTA.byId[id]; });
      normed = stops.map(function (s) { return MTA.normName(s.n); });
      found = stops.map(function () { return false; });
      done = false; hits = 0;

      el("nsBody").classList.remove("hidden");
      el("nsBullet").innerHTML = "";
      el("nsBullet").appendChild(bullet(MTA.routes[k].label, true));
      el("nsLong").textContent = MTA.routes[k].long || ("The " + MTA.routes[k].label + " line");
      el("nsBanner").classList.add("hidden");
      el("nsInput").value = "";
      el("nsInput").disabled = false;

      var best = Stats.routeStat(k);
      el("nsBest").textContent = best && best.bestTimeMs != null
        ? "best " + fmt(best.bestTimeMs)
        : (best && best.bestCount ? "best " + best.bestCount + "/" + stops.length : "");

      renderList();
      updateHud();
      stopTimer(); startAt = 0;
      el("nsInput").focus();
    }

    function renderList() {
      var list = el("nsList");
      list.innerHTML = "";
      stops.forEach(function (s, i) {
        var row = document.createElement("div");
        row.className = "slot" + (found[i] ? " slot--got" : "");
        row.id = "slot" + i;
        row.innerHTML =
          '<span class="slot__num">' + (i + 1) + "</span>" +
          '<span class="slot__name">' + (found[i] ? s.n : "") + "</span>" +
          '<span class="slot__boro">' + (found[i] ? (MTA.BOROUGHS[s.b] || s.b) : "") + "</span>";
        list.appendChild(row);
      });
    }

    function updateHud() {
      var n = found.filter(Boolean).length;
      el("nsCount").textContent = n + " / " + stops.length;
      el("nsBar").style.width = (stops.length ? (n / stops.length) * 100 : 0) + "%";
    }

    function reveal(i, missed) {
      found[i] = true;
      var row = el("slot" + i);
      row.className = "slot " + (missed ? "slot--missed" : "slot--got");
      row.querySelector(".slot__name").textContent = stops[i].n;
      row.querySelector(".slot__boro").textContent = MTA.BOROUGHS[stops[i].b] || stops[i].b;
    }

    function tryMatch() {
      var q = MTA.normName(el("nsInput").value);
      if (!q) return;
      if (!startAt) { startAt = Date.now(); tick(); timer = setInterval(tick, 250); }

      // exact normalized match on a not-yet-found stop
      var hit = -1;
      for (var i = 0; i < normed.length; i++) {
        if (!found[i] && normed[i] === q) { hit = i; break; }
      }
      // unique-substring fallback (>=4 chars) so "union sq" -> "14 St-Union Sq",
      // "van cortlandt" -> full name, etc. Only accept when exactly one stop matches.
      if (hit === -1 && q.length >= 4) {
        var matches = [];
        for (var j = 0; j < normed.length; j++) {
          if (!found[j] && normed[j].indexOf(q) !== -1) matches.push(j);
        }
        if (matches.length === 1) hit = matches[0];
      }
      if (hit !== -1) {
        reveal(hit, false);
        hits++;
        el("nsInput").value = "";
        el("slot" + hit).scrollIntoView({ block: "nearest" });
        updateHud();
        if (found.every(Boolean)) finish(true);
      }
    }

    function finish(win) {
      done = true;
      stopTimer();
      el("nsInput").disabled = true;
      var n = hits; // only genuinely-typed stops count toward stats
      var timeMs = startAt ? Date.now() - startAt : 0;
      Stats.recordRoute(key, {
        count: n, pct: Math.round((n / stops.length) * 100),
        full: win, timeMs: timeMs
      });
      var banner = el("nsBanner");
      banner.classList.remove("hidden");
      banner.className = "ns-banner " + (win ? "ns-banner--win" : "ns-banner--end");
      banner.textContent = win
        ? "Perfect — all " + stops.length + " stops in " + fmt(timeMs) + " 🎉"
        : "Ended at " + n + " / " + stops.length + " named. Missed stops shown in red.";
    }

    el("nsInput").addEventListener("input", tryMatch);
    el("nsRestart").onclick = function () { selectRoute(key); };
    el("nsGiveup").onclick = function () {
      if (done) return;
      stops.forEach(function (_, i) { if (!found[i]) reveal(i, true); });
      updateHud();
      finish(false);
    };

    return function teardown() { stopTimer(); };
  }

  App.register({
    id: "line-stops",
    phase: "LINE MASTERY",
    title: "Name the Line",
    desc: "Pick a train and type every stop it serves — they fill into place, in order, against the clock.",
    mount: mount
  });
})();
