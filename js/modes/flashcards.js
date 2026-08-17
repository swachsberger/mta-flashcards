// Mode: Station -> Lines. Show a station + borough; name the daytime routes.
(function () {
  function bullet(route) {
    var b = document.createElement("div");
    b.className = "bullet" + (route === "SIR" ? " bullet--sir" : "");
    b.style.background = MTA.routeColor(route);
    b.style.color = MTA.DARK_TEXT.has(route) ? "#000" : "#fff";
    b.textContent = route;
    return b;
  }

  function mount(root) {
    var deck = [];
    var current = null, revealed = false;
    var correct = 0, seen = 0, streak = 0;

    root.innerHTML =
      '<div class="fc-stats">' +
        '<span>Correct <b id="fcCorrect">0</b></span>' +
        '<span>Seen <b id="fcSeen">0</b></span>' +
        '<span>Streak <b id="fcStreak">0</b></span>' +
      "</div>" +
      '<div class="card fc-card">' +
        '<span class="badge" id="fcBoro">—</span>' +
        '<div class="fc-name" id="fcName">—</div>' +
        '<div class="fc-line" id="fcLine"></div>' +
        '<div id="fcGuessWrap">' +
          '<div class="hint">Type the lines (e.g. <b>N Q R</b>), then Reveal — or Reveal to self-test</div>' +
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
      "</div>";

    var el = function (id) { return document.getElementById(id); };

    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    function buildDeck() { deck = shuffle(MTA.stations.slice()); }

    function next() {
      revealed = false;
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

    function norm(str) {
      return str.toUpperCase().replace(/[^A-Z0-9]/g, " ").split(/\s+/).filter(Boolean);
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
        var exact = answer.length === guess.length &&
          answer.every(function (r) { return guessed[r]; });
        if (exact) {
          v.textContent = "✓ Correct!"; v.className = "verdict verdict--ok";
          correct++; streak++;
        } else {
          var missed = answer.filter(function (r) { return !guessed[r]; });
          var wrong = guess.filter(function (r) { return !ansSet[r]; });
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

    buildDeck();
    next();

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
