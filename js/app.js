// Tiny hash router + home screen. Modes self-register via App.register().
window.App = (function () {
  var modes = [];
  var view, home, backBtn, titleEl;

  function register(mode) { modes.push(mode); }

  function shell() {
    view = document.getElementById("view");
    home = document.getElementById("home");
    backBtn = document.getElementById("backBtn");
    titleEl = document.getElementById("modeTitle");
    backBtn.addEventListener("click", function () { location.hash = ""; });
    window.addEventListener("hashchange", route);
  }

  function renderHome() {
    var grid = document.getElementById("modeGrid");
    grid.innerHTML = "";
    modes.forEach(function (m) {
      var a = document.createElement("a");
      a.className = "mode-tile";
      a.href = "#/" + m.id;
      a.innerHTML =
        '<div class="mode-tile__phase">' + (m.phase || "") + "</div>" +
        '<div class="mode-tile__title">' + m.title + "</div>" +
        '<div class="mode-tile__desc">' + m.desc + "</div>";
      grid.appendChild(a);
    });
    // stats strip
    var t = Stats.totals();
    var acc = t.seen ? Math.round((t.correct / t.seen) * 100) : 0;
    document.getElementById("statMastery").textContent = Stats.masteryPct() + "%";
    document.getElementById("statSeen").textContent = t.seen;
    document.getElementById("statAcc").textContent = acc + "%";
  }

  function route() {
    var hash = location.hash.replace(/^#\/?/, "");
    var mode = modes.filter(function (m) { return m.id === hash; })[0];
    if (mode) {
      home.classList.add("hidden");
      view.classList.remove("hidden");
      backBtn.classList.remove("hidden");
      titleEl.textContent = mode.title;
      view.innerHTML = "";
      if (mode._teardown) { try { mode._teardown(); } catch (e) {} }
      mode._teardown = mode.mount(view) || null;
    } else {
      view.classList.add("hidden");
      view.innerHTML = "";
      backBtn.classList.add("hidden");
      titleEl.textContent = "";
      home.classList.remove("hidden");
      renderHome();
    }
  }

  function start() { shell(); route(); }

  return { register: register, start: start };
})();
