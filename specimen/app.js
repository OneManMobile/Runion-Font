/* Runion Basic — specimen + dot-to-dot sketchpad. Data comes from build.py (specimen/data.js). */
(() => {
  const { params: P, glyphs, built } = window.RUNION;
  // load the font stamped with its build time, so a rebuild is never hidden by the browser cache
  new FontFace("Runion Basic", `url(fonts/webfonts/RunionBasic-Regular.woff2?v=${built})`).load().then((f) => document.fonts.add(f));
  const h0 = P.stroke / 2, $ = (id) => document.getElementById(id);
  let pen = P.stroke;                                     // sketchpad pen: the dots never move, only the line swells
  const X = (gx) => P.side + h0 + gx * P.cell_w;          // grid → font units, y flipped for SVG
  const Y = (gy) => P.cap - (h0 + gy * P.cell_h);
  const LOW = 2, HIGH = P.rows + 1;                       // mark rows: cellar -1,-2 (written a,b) · attic 7,8
  const rowCode = (y) => (y < 0 ? "ab"[-y - 1] : "" + y), rowOf = (c) => ("ab".includes(c) ? -("ab".indexOf(c) + 1) : +c);

  // ── type tester: plain input → runes, optionally with the typed letters underneath ──
  const base = (name) => name.replace(/\.cap$/, ""), glyphOf = {};
  for (const g of glyphs) for (const c of g.chars) glyphOf[c] = base(g.name);
  const pairSet = (kind) => new Set(glyphs.filter((g) => !g.cap).flatMap((g) => g[kind].map((l) => [...l].map((c) => glyphOf[c]).join("+"))));
  const LIGA = pairSet("ligatures"), OPT = pairSet("optional");
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cl = (text, label, attrs = "") => `<span class="cl"${attrs}>${esc(text)}<span class="l">${esc(label)}</span></span>`;
  const clusters = (line) => {                            // split the way the font contracts: same glyph pairs, left to right
    const out = [], ch = [...line];
    for (let i = 0; i < ch.length; i++) {
      const key = glyphOf[ch[i]] + "+" + glyphOf[ch[i + 1]];
      const joins = ($("liga").checked && LIGA.has(key)) || ($("nordic").checked && OPT.has(key));
      out.push(joins ? ch[i] + ch[++i] : ch[i]);
    }
    return out;
  };
  const typeset = () => {
    const out = $("out"), text = $("tester").value;
    out.classList.toggle("plain", !$("liga").checked);
    out.style.fontFeatureSettings = $("nordic").checked ? '"ss01"' : "normal";
    if (!$("sub").checked) { out.textContent = text; return; }
    out.innerHTML = text.split("\n").map((line) => {
      let html = "", word = "";
      const flush = () => { if (word) html += `<span class="w">${word}</span>`; word = ""; };
      for (const c of clusters(line)) {
        if (/^\s$/.test(c)) { word += cl("\u00a0", " "); flush(); } else word += cl(c, c);   // a space rides with its word, so wrapped lines never start indented
      }
      flush();
      return `<div>${html || "\u00a0"}</div>`;
    }).join("");
  };
  for (const id of ["tester", "sub", "liga", "nordic"]) $(id).addEventListener("input", typeset);
  $("size").oninput = (e) => ($("out").style.fontSize = e.target.value + "px");
  typeset();

  // ── showcase: every character the font answers to, set in the real font ──
  const isRune = (c) => c >= "\u16a0" && c <= "\u16ff";
  const CON = "Contractions — type the pair, get one rune  (° = optional, off by default)";
  const rows = { "a – z": [], "A – Z  ·  same runes, heavier line": [], "Accented & Nordic": [], [CON]: [], "Numbers": [], "Symbols": [], "Real runes — the Unicode runic block works too": [] };
  const [AZ, CAP, NOR, , NUM, SYM, RUN] = Object.keys(rows);
  for (const g of glyphs) {
    for (const c of g.chars) {
      if (/\s/.test(c) || g.mark) continue;
      const row = isRune(c) ? RUN : /[0-9]/.test(c) ? NUM : /[a-z]/.test(c) ? AZ : /[A-Z]/.test(c) ? CAP : c.toLowerCase() !== c.toUpperCase() ? NOR : SYM;
      rows[row].push({ text: c, label: c, name: g.name });
    }
    for (const l of g.ligatures) rows[CON].push({ text: l, label: l, name: g.name });
    for (const l of g.optional) rows[CON].push({ text: l, label: l + "°", name: g.name, opt: true });
  }
  const nordic = "æøåäöðþŋáéíóúýüÆØÅÄÖÐÞŊÁÉÍÓÚÝÜ", at = (c) => (nordic.indexOf(c) + 1 || 99);
  rows[AZ].sort((p, q) => (p.text < q.text ? -1 : 1));
  rows[CAP].sort((p, q) => (p.text < q.text ? -1 : 1));
  rows[NOR].sort((p, q) => at(p.text) - at(q.text));
  $("showcase").innerHTML = Object.entries(rows).filter(([, items]) => items.length).map(([title, items]) =>
    `<div class="group">${title}  ·  ${items.length}</div><div class="runes show">` +
    items.map((it) => cl(it.text, it.label, ` data-name="${it.name}"${it.opt ? ` style="font-feature-settings:'ss01'"` : ""}`)).join("") + "</div>").join("");

  // ── the engine, re-enacted in SVG: bands between dots + ink clipped to each dot's nib ──
  const clips = () => {
    let s = "";
    const h = pen / 2;
    for (let x = 0; x < P.cols; x++) for (let y = -LOW; y <= HIGH; y++)
      s += `<clipPath id="n${x}${y}"><rect x="${X(x) - h}" y="${Y(y) - h}" width="${2 * h}" height="${2 * h}"/></clipPath>`;
    return `<defs>${s}</defs>`;
  };
  const toward = (a, b, d) => {                           // point at distance d from a, heading to b
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a[0] + ((b[0] - a[0]) / L) * d, a[1] + ((b[1] - a[1]) / L) * d];
  };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const ink = (strokes) => {
    const h = pen / 2, arms = new Map();
    let s = "";
    const arm = (n, to) => {                              // a line leaving dot n towards `to`
      let t = Math.atan2(Y(n[1]) - Y(to[1]), X(to[0]) - X(n[0]));
      if (t < -Math.PI + 1e-9) t += 2 * Math.PI;
      const key = n.join("");
      if (!arms.has(key)) arms.set(key, { n, set: new Set() });
      arms.get(key).set.add(Math.round(t * 1e6) / 1e6);
    };
    for (const pts of strokes) {
      if (pts.length === 1) {
        s += `<rect x="${X(pts[0][0]) - h}" y="${Y(pts[0][1]) - h}" width="${2 * h}" height="${2 * h}" fill="currentColor" stroke="none"/>`;
        continue;
      }
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1], k = gcd(b[0] - a[0], b[1] - a[1]);
        if (!k) continue;
        s += `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}"/>`;
        for (let j = 0; j <= k; j++) {                    // every dot the line touches or crosses
          const n = [a[0] + ((b[0] - a[0]) / k) * j, a[1] + ((b[1] - a[1]) / k) * j];
          if (j < k) arm(n, b);
          if (j > 0) arm(n, a);
        }
      }
    }
    for (const { n, set } of arms.values()) {             // ink each dot once, from all lines meeting there
      const th = [...set].sort((p, q) => p - q), N = [X(n[0]), Y(n[1])];
      const out = (t, sign) => [N[0] + Math.cos(t) * 3 * h * sign, N[1] - Math.sin(t) * 3 * h * sign];
      th.forEach((t, i) => {
        const u = th[(i + 1) % th.length];
        const gap = th.length === 1 ? 2 * Math.PI : (u - t + 2 * Math.PI) % (2 * Math.PI);
        if (gap < Math.PI - 1e-6) return;                 // only the outer corner gets a mitre
        s += `<polyline clip-path="url(#n${n[0]}${n[1]})" points="${out(t, 1)} ${N} ${th.length === 1 ? out(t, -1) : out(u, 1)}"/>`;
      });
    }
    return `<g fill="none" stroke="currentColor" stroke-width="${pen}" stroke-linejoin="miter" stroke-miterlimit="100">${s}</g>`;
  };

  // ── sketchpad ─────────────────────────────────────────────────────
  let strokes = [], active = null;
  const encode = () => strokes.map((s) => s.map((p) => p[0] + rowCode(p[1])).join("-")).join(" ");
  const decode = (t) => t.trim().split(/\s+/).filter(Boolean).map((s) => s.split("-").map((p) => [+p[0], rowOf(p[1])]));
  const valid = (t) => new RegExp(`^\\s*(([0-${P.cols - 1}][0-${HIGH}ab])(-[0-${P.cols - 1}][0-${HIGH}ab])*\\s*)*$`).test(t);

  function draw(fromInput) {
    const pad = 70, last = active !== null ? strokes[active][strokes[active].length - 1] : null;
    let dots = "", skeleton = "";
    for (let x = 0; x < P.cols; x++) for (let y = -LOW; y <= HIGH; y++) {
      const on = last && last[0] === x && last[1] === y, rune = y >= 0 && y < P.rows;
      dots += `<text x="${X(x) + 16}" y="${Y(y) - 14}" font-size="26" fill="var(--soft)" opacity="${rune ? 1 : 0.5}">${x}${rowCode(y)}</text>
        <circle class="hit" data-p="${x}${rowCode(y)}" cx="${X(x)}" cy="${Y(y)}" r="${P.cell_w / 2.2}"/>
        <circle cx="${X(x)}" cy="${Y(y)}" r="${on ? 16 : rune ? 9 : 6}" fill="var(--accent)" opacity="${rune || on ? 1 : 0.45}" pointer-events="none"/>`;
    }
    for (const s of strokes)
      skeleton += `<polyline points="${s.map(([x, y]) => [X(x), Y(y)]).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="4"/>`;
    $("stage").setAttribute("viewBox", `${-pad} ${-pad - (HIGH - P.rows + 1) * P.cell_h} ${P.advance + 2 * pad} ${P.cap + 2 * pad + (HIGH - P.rows + 1 + LOW) * P.cell_h}`);
    $("stage").innerHTML = clips() +
      `<rect x="${P.side}" y="0" width="${P.advance - 2 * P.side}" height="${P.cap}" fill="none" stroke="var(--line)" stroke-width="3" stroke-dasharray="10 10"/>` +
      `<g opacity=".82">${ink(strokes)}</g>${skeleton}${dots}`;
    if (!fromInput) $("code").value = encode();
    const xs = strokes.flat().map((p) => p[0]), full = xs.includes(0) && xs.includes(P.cols - 1);
    $("rule").className = full ? "ok" : "bad";
    $("rule").textContent = !xs.length ? "" : full ? "✓ fills the full width" : "✗ must touch both the left and right column";
  }

  $("stage").onclick = (e) => {
    const p = e.target.dataset && e.target.dataset.p;
    if (!p) return;
    const pt = [+p[0], rowOf(p[1])];
    if (active === null) { strokes.push([pt]); active = strokes.length - 1; }
    else {
      const s = strokes[active], l = s[s.length - 1];
      if (l[0] === pt[0] && l[1] === pt[1]) active = null; else s.push(pt);
    }
    draw();
  };
  $("undo").onclick = () => {
    if (!strokes.length) return;
    const s = strokes[strokes.length - 1];
    s.pop();
    if (!s.length) { strokes.pop(); active = null; } else active = strokes.length - 1;
    draw();
  };
  $("clear").onclick = () => { strokes = []; active = null; draw(); };
  $("copy").onclick = () => navigator.clipboard && navigator.clipboard.writeText($("code").value);
  $("code").oninput = (e) => { if (valid(e.target.value)) { strokes = decode(e.target.value); active = null; draw(true); } };
  const setPen = (v) => { pen = +v; $("pen").value = pen; $("penv").textContent = pen; draw(); };
  $("pen").oninput = (e) => setPen(e.target.value);
  $("penreg").onclick = () => setPen(P.stroke);
  $("pencap").onclick = () => setPen(P.cap_stroke);

  // ── glyph table (exact outlines from the build) ───────────────────
  const drawn = glyphs.filter((g) => g.strokes.length && g.name !== ".notdef");
  const groups = [["Elder Futhark — the 24", 24], ["Latin gaps", 4], ["Nordic & more letters", 7], ["Numbers", 10], ["Symbols", Infinity]];
  const composed = (g) => /^uni[0-9A-F]{4}$/.test(g.name);
  let rest = drawn.filter((g) => !g.cap && !g.mark && !composed(g)), html = "";
  const sets = groups.map(([title, count]) => { const set = rest.slice(0, count); rest = rest.slice(count); return [title, set]; });
  sets.push(["Accented — never drawn: the build composes rune + mark from Unicode", drawn.filter((g) => composed(g) && !g.cap && !g.mark)]);
  sets.push([`Capitals — same dots, same lines, stroke ${P.cap_stroke} instead of ${P.stroke}`, drawn.filter((g) => g.cap)]);
  for (const [title, set] of sets) {
    html += `<div class="group">${title}</div><div class="grid">` + set.map((g) => {
      const runic = (c) => c >= "\u16a0" && c <= "\u16ff";
      const keys = [g.chars.find((c) => !runic(c)) || g.chars[0] || "", ...g.ligatures, ...g.optional.map((l) => l + "°")];
      return `<div class="cell" data-name="${g.name}"><svg viewBox="0 ${-2 * P.cell_h - 50} ${P.advance} ${P.cap + 4 * P.cell_h + 100}">
        <path transform="translate(0 ${P.cap}) scale(1 -1)" d="${g.path}" fill="currentColor"/></svg>
        <b>${keys.join(" ").replace(/&/g, "&amp;").replace(/</g, "&lt;") || "·"}</b><i>${g.name}</i></div>`;
    }).join("") + "</div>";
  }
  $("glyphs").innerHTML = html;
  const pick = (e) => {                                   // showcase tile or table cell → open on the grid
    const hit = e.target.closest("[data-name]");
    if (!hit) return;
    document.querySelectorAll(".cell.on").forEach((c) => c.classList.remove("on"));
    const cell = document.querySelector(`.cell[data-name="${hit.dataset.name}"]`);
    if (cell) cell.classList.add("on");
    const g = glyphs.find((g) => g.name === hit.dataset.name);
    strokes = JSON.parse(JSON.stringify(g.strokes));
    active = null;
    setPen(g.cap ? P.cap_stroke : P.stroke);
    $("stage").scrollIntoView({ behavior: "smooth", block: "center" });
  };
  $("glyphs").onclick = pick;
  $("showcase").onclick = pick;

  strokes = JSON.parse(JSON.stringify(glyphs.find((g) => g.name === "fehu").strokes));
  setPen(P.stroke);
})();
