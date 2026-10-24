(() => {
  const $ = (id) => document.getElementById(id);
  const Q = window.QUESTIONS, S = window.SECTIONS;
  const KEY = "cee422-exam1-progress";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
  let progress = load();            // { qid: true (last attempt correct) | false }
  const selTopics = new Set(Object.keys(S).map(Number));
  const sources = ["In class", "Additional"];
  const selSources = new Set(sources);
  let deck = [], i = 0, correct = 0, answered = false, tally = {};

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const md = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
  const srcOf = (q) => (q.tag.startsWith("In class") ? "In class" : "Additional");

  function chip(parent, label, set, val) {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label; b.type = "button";
    b.setAttribute("aria-pressed", set.has(val));
    b.onclick = () => {
      set.has(val) ? set.delete(val) : set.add(val);
      b.setAttribute("aria-pressed", set.has(val));
      refresh();
    };
    parent.appendChild(b);
  }

  function pool() {
    return Q.filter((q) => selTopics.has(q.section) && selSources.has(srcOf(q)) &&
      (!$("wrongOnly").checked || progress[q.id] === false));
  }
  function refresh() {
    const n = pool().length;
    $("count").textContent = `(${n})`;
    $("start").disabled = n === 0;
    const w = Q.filter((q) => progress[q.id] === false).length;
    $("wrongCount").textContent = `(${w})`;
  }

  Object.entries(S).forEach(([n, name]) => chip($("topics"), `${n}. ${name}`, selTopics, Number(n)));
  sources.forEach((s) => chip($("sources"), s === "In class" ? "In class (incl. converted)" : "Additional", selSources, s));
  $("wrongOnly").onchange = refresh;

  function show(id) { ["setup", "quiz", "done"].forEach((x) => ($(x).hidden = x !== id)); window.scrollTo(0, 0); }

  function start() {
    deck = pool();
    if ($("shuffle").checked) for (let a = deck.length - 1; a > 0; a--) { const b = Math.floor(Math.random() * (a + 1)); [deck[a], deck[b]] = [deck[b], deck[a]]; }
    i = 0; correct = 0; tally = {};
    show("quiz"); render();
  }

  function render() {
    const q = deck[i]; answered = false;
    $("bar").style.width = `${(i / deck.length) * 100}%`;
    $("pos").textContent = `Question ${i + 1} of ${deck.length}`;
    $("tag").textContent = `${q.id} · ${q.tag}`;
    $("score").textContent = `Score: ${correct}/${i}`;
    $("qtext").innerHTML = md(q.text);
    $("result").hidden = true; $("next").hidden = true;
    const box = $("opts"); box.innerHTML = "";
    q.options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "opt"; b.dataset.k = o.k; b.setAttribute("role", "radio");
      b.innerHTML = `<span class="k">${o.k}</span><span>${md(o.t)}</span>`;
      b.onclick = () => choose(q, o.k);
      box.appendChild(b);
    });
  }

  function choose(q, k) {
    if (answered) return; answered = true;
    const ok = k === q.answer;
    if (ok) correct++;
    progress[q.id] = ok; save(progress);
    const t = (tally[q.section] ||= { ok: 0, n: 0 }); t.n++; if (ok) t.ok++;
    document.querySelectorAll(".opt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.k === q.answer) b.classList.add("correct");
      else if (b.dataset.k === k) b.classList.add("wrong");
    });
    const r = $("result");
    r.innerHTML = `<p class="verdict ${ok ? "ok" : "no"}">${ok ? "Correct" : `Incorrect — the answer is ${q.answer}`}</p>` +
      q.options.map((o) => {
        const e = q.explain[o.k];
        return `<div class="exp ${o.k === q.answer ? "c" : ""}"><b class="lab">${o.k} — ${esc(e.label)}.</b> ${md(e.t)}</div>`;
      }).join("");
    r.hidden = false;
    $("score").textContent = `Score: ${correct}/${i + 1}`;
    $("next").textContent = i + 1 < deck.length ? "Next" : "Finish";
    $("next").hidden = false; $("next").focus();
  }

  function finish() {
    const answeredN = Object.values(tally).reduce((a, t) => a + t.n, 0);
    $("final").textContent = `${correct} / ${answeredN} (${answeredN ? Math.round((correct / answeredN) * 100) : 0}%)`;
    $("bysec").innerHTML = Object.entries(tally).map(([s, t]) =>
      `<div class="sec"><span>${s}. ${esc(S[s])}</span><span>${t.ok}/${t.n}</span></div>`).join("");
    show("done"); refresh();
  }

  $("start").onclick = start;
  $("next").onclick = () => { i++; i < deck.length ? render() : finish(); };
  $("quit").onclick = () => (answered || i > 0 ? finish() : (show("setup"), refresh()));
  $("again").onclick = () => { show("setup"); refresh(); };
  $("reset").onclick = () => { if (confirm("Clear saved progress?")) { progress = {}; save(progress); refresh(); } };
  document.addEventListener("keydown", (e) => {
    if ($("quiz").hidden) return;
    const k = e.key.toUpperCase();
    if (!answered) { const b = document.querySelector(`.opt[data-k="${k}"]`); if (b) b.click(); }
    else if (e.key === "Enter" && document.activeElement !== $("next")) $("next").click();
  });
  refresh();
})();
