/* Radar de Layer 2 · lógica de la demostración (cálculos y gráficos en el navegador) */
'use strict';
// ---------- Datos ----------
const D = CSV.trim().split("\n").map(l => { const p = l.split(","); return {
  raw: l, fecha: new Date(p[0] + "T00:00:00"), fs: p[0], precio: +p[1], rm: +p[2], rl: +p[3], rb: +p[4], vol: +p[5] }; });
const N = D.length;
// ---------- Utilidades numéricas ----------
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy); };
const ols = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  const b = sxy / sxx; return { b, a: my - b * mx }; };
const rmse = (r, p) => Math.sqrt(mean(r.map((v, i) => (v - (Array.isArray(p) ? p[i] : p)) ** 2)));
const sse = (x, y, a, b) => x.reduce((s, xi, i) => s + (y[i] - a - b * xi) ** 2, 0);
function ols2(X, y) { // X: filas [1,x1,x2]
  const k = X[0].length, A = Array.from({ length: k }, () => Array(k + 1).fill(0));
  for (let r = 0; r < X.length; r++) for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j]; A[i][k] += X[r][i] * y[r]; }
  for (let i = 0; i < k; i++) { let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]];
    for (let r = 0; r < k; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= k; c++) A[r][c] -= f * A[i][c]; } }
  return A.map((row, i) => row[k] / row[i]); }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// formato español
const f = (v, d = 3) => (v < 0 || Object.is(v, -0) ? "−" : "") + Math.abs(v).toFixed(d).replace(".", ",");
const pc = (v, d = 1) => f(v * 100, d) + " %";
const pcs = (v, d = 1) => (v > 0 ? "+" : "") + pc(v, d);
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fd = d => d.getDate() + "-" + MES[d.getMonth()] + "-" + d.getFullYear();
const fds = d => d.getDate() + "-" + MES[d.getMonth()];
// ---------- Cálculos principales ----------
const X = D.map(d => d.rl), Y = D.map(d => d.rm), B = D.map(d => d.rb);
const R = corr(X, Y), FIT = ols(X, Y), R2 = R * R;
const TR = D.slice(0, 90), TE = D.slice(90);
const FTR = ols(TR.map(d => d.rl), TR.map(d => d.rm));
const PRED = TE.map(d => FTR.a + FTR.b * d.rl);
const RM = rmse(TE.map(d => d.rm), PRED), RB = rmse(TE.map(d => d.rm), 0), MEJ = 1 - RM / RB;
const RES = D.map(d => d.rm - FIT.b * d.rl), SIG = sd(RES);
const alertsFor = k => D.map((d, i) => ({ ...d, res: RES[i], i })).filter(d => Math.abs(d.res) > k * SIG);
const AL2 = alertsFor(2);
const EXT = [...AL2].sort((a, b) => Math.abs(b.res) - Math.abs(a.res)).slice(0, 2).sort((a, b) => a.i - b.i);

// ---------- Mini librería de gráficos SVG ----------
const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
function niceTicks(lo, hi, n = 5) { const span = hi - lo, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag; const t = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) t.push(+v.toFixed(10)); return t; }
function chart(host, o) {
  host.innerHTML = "";
  const W = o.w || 640, H = o.h || 300, m = { t: 12, r: 16, b: 44, l: 62, ...(o.m || {}) };
  if (o.title) { const t = document.createElement("p"); t.className = "title"; t.textContent = o.title; host.appendChild(t); }
  if (o.sub) { const t = document.createElement("p"); t.className = "sub"; t.textContent = o.sub; host.appendChild(t); }
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.title || "" }, host);
  const [x0, x1] = o.x, [y0, y1] = o.y;
  const sx = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), sy = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  const g = el("g", {}, svg);
  const yt = o.yticks || niceTicks(y0, y1, o.ny || 5);
  yt.forEach(v => { el("line", { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), stroke: "var(--grid)" }, g);
    el("text", { x: m.l - 8, y: sy(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--ink2)" }, g).textContent = o.yf ? o.yf(v) : v; });
  const xt = o.xticks || niceTicks(x0, x1, o.nx || 6);
  xt.forEach(v => { el("line", { x1: sx(v), x2: sx(v), y1: H - m.b, y2: H - m.b + 4, stroke: "var(--muted)" }, g);
    el("text", { x: sx(v), y: H - m.b + 17, "text-anchor": "middle", "font-size": 11, fill: "var(--ink2)" }, g).textContent = o.xf ? o.xf(v) : v; });
  el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: "var(--muted)" }, g);
  if (o.xl) el("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: "var(--ink2)" }, g).textContent = o.xl;
  if (o.yl) el("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", "font-size": 12, fill: "var(--ink2)", transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` }, g).textContent = o.yl;
  const plot = el("g", {}, svg);
  const tip = document.createElement("div"); tip.className = "tip"; host.appendChild(tip);
  const show = (html, px, py) => { tip.innerHTML = html; tip.style.opacity = 1; const r = svg.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const k = r.width / W; let left = r.left - hr.left + px * k + 12, top = r.top - hr.top + py * k - 10;
    if (left + tip.offsetWidth > hr.width) left -= tip.offsetWidth + 24; tip.style.left = left + "px"; tip.style.top = top + "px"; };
  const hide = () => tip.style.opacity = 0;
  if (o.legend) { const lg = document.createElement("div"); lg.className = "legend"; lg.innerHTML = o.legend.map(([c, t, dash]) => `<span><i style="background:${c}${dash ? ";height:3px;vertical-align:3px" : ""}"></i>${t}</span>`).join(""); host.appendChild(lg); }
  return { svg, plot, sx, sy, W, H, m, show, hide };
}
const path = pts => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
const t0 = D[0].fecha.getTime(), DAY = 864e5, dayIx = d => (d.getTime() - t0) / DAY;
const monthTicks = [0, 31, 61, 92].concat(); // 1-mar,1-abr,1-may,1-jun
const xfDay = v => fds(new Date(t0 + v * DAY));
function lineHover(c, xs, rowsFn) { // crosshair sobre serie diaria
  const ov = el("rect", { x: c.m.l, y: c.m.t, width: c.W - c.m.l - c.m.r, height: c.H - c.m.t - c.m.b, fill: "transparent" }, c.svg);
  const vl = el("line", { y1: c.m.t, y2: c.H - c.m.b, stroke: "var(--muted)", "stroke-dasharray": "3 3", opacity: 0 }, c.svg);
  ov.addEventListener("mousemove", e => { const r = c.svg.getBoundingClientRect(); const px = (e.clientX - r.left) * c.W / r.width;
    let best = 0, bd = 1e9; xs.forEach((x, i) => { const d = Math.abs(c.sx(x) - px); if (d < bd) { bd = d; best = i; } });
    vl.setAttribute("x1", c.sx(xs[best])); vl.setAttribute("x2", c.sx(xs[best])); vl.setAttribute("opacity", 1);
    const [html, py] = rowsFn(best); c.show(html, c.sx(xs[best]), py); });
  ov.addEventListener("mouseleave", () => { c.hide(); vl.setAttribute("opacity", 0); });
}
function dotHover(c, nodes) { nodes.forEach(([node, html]) => { node.addEventListener("mouseenter", () => c.show(html, +node.getAttribute("cx"), +node.getAttribute("cy"))); node.addEventListener("mouseleave", c.hide); }); }

// ---------- Navegación ----------
const secs = [...document.querySelectorAll("section")], nav = document.getElementById("nav");
secs.forEach(s => { const b = document.createElement("button"); b.textContent = s.dataset.label; b.setAttribute("role", "tab"); b.onclick = () => go(s.id); nav.appendChild(b); });
const drawn = {};
function go(id) { secs.forEach((s, i) => { s.classList.toggle("on", s.id === id); nav.children[i].setAttribute("aria-selected", s.id === id); });
  if (!drawn[id] && DRAW[id]) { DRAW[id](); drawn[id] = 1; } if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id); window.scrollTo(0, 0); }
document.querySelectorAll(".tabs2").forEach(t => t.addEventListener("click", e => { if (!e.target.dataset.k) return;
  t.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === e.target)); const pre = document.getElementById(t.dataset.for); pre.innerHTML = pre.dataset[e.target.dataset.k]; }));
document.querySelectorAll("pre[data-py]").forEach(p => p.innerHTML = p.dataset.py);
const $ = id => document.getElementById(id);

// ---------- Secciones ----------
const DRAW = {
inicio() {
  $("kpisInicio").innerHTML = [
    ["120 días", "1-mar-2023 a 28-jun-2023"],
    ["β = " + f(FIT.b), "por cada 1 % de L2, MATIC ≈ " + f(FIT.b, 2) + " %"],
    [AL2.length + " alertas", "días con |residuo| > 2σ"]].map(([v, l]) => `<div class="card kpi"><span class="v">${v}</span><span class="l">${l}</span></div>`).join("");
},
paso1() {
  const nulls = D.reduce((s, d) => s + [d.precio, d.rm, d.rl, d.rb, d.vol].filter(v => !isFinite(v)).length, 0);
  const dup = N - new Set(D.map(d => d.raw)).size, dupF = N - new Set(D.map(d => d.fs)).size;
  const gaps = D.slice(1).map((d, i) => Math.round((d.fecha - D[i].fecha) / DAY)); const all1 = gaps.every(g => g === 1);
  const lr = D.slice(1).map((d, i) => Math.abs(Math.log(d.precio / D[i].precio) - d.rm)); const mx = Math.max(...lr);
  const zeros = D.filter(d => d.rl === 0).length;
  const items = [
    [true, `<b>${N} filas × 6 columnas</b> (fecha, precio_matic, ret_matic, ret_indice_l2, ret_btc, volumen_musd).`],
    [true, `<b>Tipos:</b> fecha como fecha; las otras 5 columnas numéricas (decimales).`],
    [nulls === 0, `<b>${nulls} nulos</b> en todo el archivo.`],
    [dup === 0, `<b>${dup} filas duplicadas</b> y ${dupF} fechas repetidas.`],
    [all1, `<b>Fechas:</b> las ${gaps.length} diferencias son de exactamente 1 día (sin saltos).`],
    [true, `<b>Extra:</b> ret_matic coincide con ln(P<sub>hoy</sub>/P<sub>ayer</sub>) (diferencia máx. ${f(mx, 5)}, solo redondeo).`],
    [false, `<b>Llamativo:</b> ret_indice_l2 = 0.0 exacto en la fila 1 (${zeros} cero exacto en 120 días).`]];
  $("checks").innerHTML = items.map(([ok, t]) => `<div class="check"><span class="ok ${ok ? "" : "warn"}">${ok ? "✓" : "!"}</span><div>${t}</div></div>`).join("") +
    `<div class="note good" style="margin-bottom:0"><b>Punto de control ✔</b> 120 filas, 6 columnas, sin nulos, sin duplicados, fechas cada 1 día.</div>`;
  const upd = () => { const drop = $("dropFirst").checked; const d = drop ? D.slice(1) : D; const ff = ols(d.map(r => r.rl), d.map(r => r.rm));
    $("dropRes").innerHTML = `<table><tr><th></th><th>Con fila 1</th><th>Sin fila 1</th></tr>
    <tr><td>beta</td><td>${f(FIT.b, 4)}</td><td>${f(ols(D.slice(1).map(r => r.rl), D.slice(1).map(r => r.rm)).b, 4)}</td></tr>
    <tr><td>correlación</td><td>${f(R, 4)}</td><td>${f(corr(D.slice(1).map(r => r.rl), D.slice(1).map(r => r.rm)), 4)}</td></tr></table>
    <p style="margin:8px 0 0">${drop ? `Con la fila quitada: beta = <b>${f(ff.b, 4)}</b>. Cambia menos de 0,001: la decisión no altera las conclusiones.` : "Marca la casilla para ver el efecto."}</p>`; };
  $("dropFirst").onchange = upd; upd();
  const cols = [["fecha", "Día de la observación (frecuencia diaria)."], ["precio_matic", `Precio de MATIC en <b>USD</b> (de ${f(Math.min(...D.map(d => d.precio)), 4)} a ${f(Math.max(...D.map(d => d.precio)), 4)}).`],
    ["ret_matic", "Retorno diario <b>logarítmico</b> de MATIC, en <b>decimal</b>."], ["ret_indice_l2", "Retorno diario del índice L2 (mediana de tokens L2), en <b>decimal</b>."],
    ["ret_btc", "Retorno diario de Bitcoin, en <b>decimal</b>."], ["volumen_musd", `Volumen negociado en <b>millones de USD</b> por día (${f(Math.min(...D.map(d => d.vol)), 1)} a ${f(Math.max(...D.map(d => d.vol)), 1)}).`]];
  $("colTable").innerHTML = "<tr><th>Columna</th><th style='text-align:left'>Qué es y en qué unidad</th></tr>" + cols.map(([c, t]) => `<tr><td><code>${c}</code></td><td style="text-align:left">${t}</td></tr>`).join("");
  $("rawTable").innerHTML = "<tr><th>fecha</th><th>precio_matic</th><th>ret_matic</th><th>ret_indice_l2</th><th>ret_btc</th><th>volumen_musd</th></tr>" +
    D.map((d, i) => `<tr${i === 0 ? ' class="hl"' : ""}><td>${d.fs}</td><td>${d.precio.toFixed(4)}</td><td>${d.rm.toFixed(4)}</td><td>${d.rl.toFixed(4)}</td><td>${d.rb.toFixed(4)}</td><td>${d.vol.toFixed(1)}</td></tr>`).join("");
},
paso2() {
  const xs = D.map(d => dayIx(d.fecha));
  const c = chart($("chPrice"), { title: "Precio de MATIC (mar–jun 2023)", sub: `Baja de ${f(D[0].precio, 2)} a ${f(D[N - 1].precio, 2)} USD (${pcs(D[N - 1].precio / D[0].precio - 1)}) en 120 días`,
    w: 1100, h: 300, x: [0, 119], y: [0.7, 1.15], xticks: [0, 31, 61, 92, 119], xf: xfDay, yf: v => f(v, 2), xl: "Fecha", yl: "Precio de MATIC (USD)" });
  el("path", { d: path(D.map((d, i) => [c.sx(xs[i]), c.sy(d.precio)])), fill: "none", stroke: "var(--s1)", "stroke-width": 2 }, c.plot);
  lineHover(c, xs, i => [`<b>${fd(D[i].fecha)}</b><br>Precio: ${f(D[i].precio, 4)} USD<br>Retorno: ${pcs(D[i].rm, 2)}`, c.sy(D[i].precio)]);
  const s = chart($("chScatter"), { title: "Retorno diario: MATIC vs. índice L2", sub: "Cada punto es un día", w: 520, h: 420, x: [-0.05, 0.045], y: [-0.1, 0.1],
    xf: v => pc(v, 0), yf: v => pc(v, 0), xl: "Retorno del índice L2 (%, decimal ×100)", yl: "Retorno de MATIC (%)" });
  el("line", { x1: s.sx(0), x2: s.sx(0), y1: s.sy(-0.1), y2: s.sy(0.1), stroke: "var(--muted)", "stroke-dasharray": "2 3" }, s.plot);
  el("line", { x1: s.sx(-0.05), x2: s.sx(0.045), y1: s.sy(0), y2: s.sy(0), stroke: "var(--muted)", "stroke-dasharray": "2 3" }, s.plot);
  dotHover(s, D.map(d => [el("circle", { cx: s.sx(d.rl), cy: s.sy(d.rm), r: 4.5, fill: "var(--s1)", "fill-opacity": .6, stroke: "var(--surface)", "stroke-width": 1 }, s.plot),
    `<b>${fd(d.fecha)}</b><br>L2: ${pcs(d.rl, 2)}<br>MATIC: ${pcs(d.rm, 2)}`]));
  $("corrV").textContent = f(R, 3);
  $("ans2").innerHTML = `<b>Moderada.</b> La nube está inclinada hacia arriba (cuando L2 sube, MATIC tiende a subir), pero hay mucha dispersión: no es una línea.`;
},
paso3() {
  const xr = [-0.05, 0.045], yr = [-0.1, 0.1];
  const c = chart($("chFit"), { title: "MATIC vs. índice L2 con recta ajustada", w: 520, h: 420, x: xr, y: yr, xf: v => pc(v, 0), yf: v => pc(v, 0), xl: "Retorno del índice L2 (%)", yl: "Retorno de MATIC (%)",
    legend: [["var(--s1)", "días"], ["var(--s2)", "tu recta", 1], ["var(--crit)", "residuos", 1]] });
  const gres = el("g", {}, c.plot); const ln = el("line", { stroke: "var(--s2)", "stroke-width": 2.5 }, c.plot);
  const dots = D.map(d => el("circle", { cx: c.sx(d.rl), cy: c.sy(d.rm), r: 4, fill: "var(--s1)", "fill-opacity": .6, stroke: "var(--surface)", "stroke-width": 1 }, c.plot));
  const segs = D.map(() => el("line", { stroke: "var(--crit)", "stroke-width": 1, opacity: .55 }, gres));
  const MIN = sse(X, Y, FIT.a, FIT.b);
  $("sseMin").textContent = f(MIN, 4);
  const upd = () => { const b = +$("bS").value, a = +$("aS").value; $("bO").textContent = f(b, 3); $("aO").textContent = f(a, 4);
    ln.setAttribute("x1", c.sx(xr[0])); ln.setAttribute("x2", c.sx(xr[1])); ln.setAttribute("y1", c.sy(a + b * xr[0])); ln.setAttribute("y2", c.sy(a + b * xr[1]));
    D.forEach((d, i) => { const s = segs[i]; s.setAttribute("x1", c.sx(d.rl)); s.setAttribute("x2", c.sx(d.rl)); s.setAttribute("y1", c.sy(d.rm)); s.setAttribute("y2", c.sy(a + b * d.rl)); });
    gres.style.display = $("showRes").checked ? "" : "none";
    const e = sse(X, Y, a, b); $("sseV").textContent = f(e, 4); $("sseBar").firstChild.style.width = Math.min(100, MIN / e * 100) + "%"; };
  ["bS", "aS", "showRes"].forEach(id => $(id).oninput = upd);
  $("olsBtn").onclick = () => { $("bS").value = FIT.b; $("aS").value = FIT.a; upd(); };
  $("rstBtn").onclick = () => { $("bS").value = 0.2; $("aS").value = 0.004; upd(); };
  upd();
  $("kpis3").innerHTML = [["beta", f(FIT.b, 3)], ["alpha", f(FIT.a, 5)], ["R²", f(R2, 3)]].map(([l, v]) => `<div class="card kpi"><span class="l">${l}</span><span class="v">${v}</span></div>`).join("");
  $("invBtn").onclick = () => { const inv = ols(Y, X); $("invRes").innerHTML = `<br>Con X e Y invertidos sale <b>${f(inv.b, 3)}</b>, que responde otra pregunta (cuánto se mueve L2 por cada 1 % de MATIC). El orden correcto da <b>${f(FIT.b, 3)}</b>.`; };
  $("ans3a").innerHTML = `<span class="big">Por cada <b>1 %</b> que se mueve el mercado L2, MATIC se mueve en promedio <b>${f(FIT.b, 2)} %</b> en la misma dirección.</span><br>Beta &lt; 1: en estos datos MATIC es algo menos sensible que el índice L2. <b>Punto de control ✔</b> positiva y del orden de 1.`;
  const n = N, res = X.map((x, i) => Y[i] - FIT.a - FIT.b * x), mx = mean(X), se = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / (n - 2) / X.reduce((s, x) => s + (x - mx) ** 2, 0));
  $("ans3b").innerHTML = `El índice L2 explica solo el <b>${pc(R2, 0)}</b> del movimiento diario de MATIC; el <b>${pc(1 - R2, 0)}</b> restante viene de factores propios de MATIC (noticias, eventos del proyecto, ruido). Sirve para entender la tendencia, no para adivinar el retorno de un día.<br><span style="color:var(--ink2);font-size:13px">Extra: la beta es una estimación. Error estándar ${f(se, 2)} → rango razonable ≈ ${f(FIT.b - 1.98 * se, 2)} a ${f(FIT.b + 1.98 * se, 2)}.</span>`;
},
paso4() {
  const xs = D.map(d => dayIx(d.fecha));
  const c = chart($("chSplit"), { title: "Separación temporal: entrenamiento y prueba", sub: "Retorno diario de MATIC. El modelo solo ve la zona azul.", w: 1100, h: 230, x: [0, 119], y: [-0.1, 0.1],
    xticks: [0, 31, 61, 89, 119], xf: xfDay, yf: v => pc(v, 0), xl: "Fecha", yl: "Retorno MATIC (%)" });
  el("rect", { x: c.sx(-0.5), y: c.m.t, width: c.sx(89.5) - c.sx(-0.5), height: c.H - c.m.t - c.m.b, fill: "var(--band-train)" }, c.plot);
  el("rect", { x: c.sx(89.5), y: c.m.t, width: c.sx(119.5) - c.sx(89.5), height: c.H - c.m.t - c.m.b, fill: "var(--band-test)" }, c.plot);
  el("text", { x: c.sx(45), y: c.H - c.m.b - 8, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ink2)" }, c.plot).textContent = "ENTRENAMIENTO · días 1–90 (1-mar a 29-may)";
  el("text", { x: c.sx(104.5), y: c.H - c.m.b - 8, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ink2)" }, c.plot).textContent = "PRUEBA · días 91–120";
  el("path", { d: path(D.map((d, i) => [c.sx(xs[i]), c.sy(d.rm)])), fill: "none", stroke: "var(--ink2)", "stroke-width": 1.5 }, c.plot);
  lineHover(c, xs, i => [`<b>${fd(D[i].fecha)}</b> · día ${i + 1} (${i < 90 ? "entrenamiento" : "prueba"})<br>MATIC: ${pcs(D[i].rm, 2)}`, c.sy(D[i].rm)]);
  $("kpis4").innerHTML = [["beta (solo 90 días)", f(FTR.b, 3), `alpha = ${f(FTR.a, 5)} · beta con 120 días = ${f(FIT.b, 3)}`],
    ["RMSE modelo vs. línea base", `${f(RM, 4)} <span style="font-size:16px;color:var(--ink2)">vs ${f(RB, 4)}</span>`, "error típico en los 30 días de prueba"],
    ["Mejora sobre predecir 0", pc(MEJ), MEJ > 0 ? "el modelo gana… por poco" : "el modelo no gana"]].map(([l, v, s]) => `<div class="card kpi"><span class="l">${l}</span><span class="v">${v}</span><span class="l">${s}</span></div>`).join("");
  const tx = TE.map(d => dayIx(d.fecha));
  const t = chart($("chTest"), { title: "Los 30 días de prueba: real vs. predicho", w: 560, h: 330, x: [89.5, 119.5], y: [-0.05, 0.05], xticks: [90, 97, 104, 111, 118], xf: xfDay, yf: v => pc(v, 0), xl: "Fecha", yl: "Retorno MATIC (%)",
    legend: [["var(--s1)", "MATIC real", 1], ["var(--s2)", "predicción (alpha + beta·L2)", 1], ["var(--base)", "línea base: 0", 1]] });
  el("line", { x1: t.sx(89.5), x2: t.sx(119.5), y1: t.sy(0), y2: t.sy(0), stroke: "var(--base)", "stroke-dasharray": "5 4", "stroke-width": 1.5 }, t.plot);
  el("path", { d: path(TE.map((d, i) => [t.sx(tx[i]), t.sy(d.rm)])), fill: "none", stroke: "var(--s1)", "stroke-width": 2 }, t.plot);
  el("path", { d: path(PRED.map((p, i) => [t.sx(tx[i]), t.sy(p)])), fill: "none", stroke: "var(--s2)", "stroke-width": 2 }, t.plot);
  lineHover(t, tx, i => [`<b>${fd(TE[i].fecha)}</b><br>Real: ${pcs(TE[i].rm, 2)}<br>Predicho: ${pcs(PRED[i], 2)}<br>Error modelo: ${f(Math.abs(TE[i].rm - PRED[i]) * 100, 2)} pp · base: ${f(Math.abs(TE[i].rm) * 100, 2)} pp`, t.sy(TE[i].rm)]);
  $("leak").onchange = () => { if (!$("leak").checked) { $("leakRes").innerHTML = ""; return; }
    const p = TE.map(d => FIT.a + FIT.b * d.rl), r = rmse(TE.map(d => d.rm), p);
    $("leakRes").innerHTML = `Beta con los 120 días = ${f(FIT.b, 3)} → RMSE en prueba = ${f(r, 5)} (mejora ${pc(1 - r / RB)}). Ese número <b>no vale</b>: el modelo ya había visto los días con los que se le evalúa.`; };
  const days = TE.filter((d, i) => Math.abs(d.rm - PRED[i]) < Math.abs(d.rm)).length;
  const drawBoot = (vals) => {
    const bins = 30, lo = -0.4, hi = 0.5, w = (hi - lo) / bins, cnt = Array(bins).fill(0); vals.forEach(v => { const k = Math.floor((v - lo) / w); if (k >= 0 && k < bins) cnt[k]++; });
    const mx = Math.max(1, ...cnt);
    const h = chart($("chBoot"), { title: "Mejora del modelo en 5000 remuestreos de los 30 días", sub: vals.length ? "" : "Pulsa el botón para remuestrear", w: 560, h: 260, x: [lo, hi], y: [0, mx * 1.1], xticks: [-0.4, -0.2, 0, 0.2, 0.4], xf: v => pc(v, 0), ny: 4, yf: v => Math.round(v), xl: "Mejora sobre la línea base", yl: "Remuestreos" });
    cnt.forEach((c2, k) => { const x0 = lo + k * w; el("rect", { x: h.sx(x0) + 1, y: h.sy(c2), width: h.sx(x0 + w) - h.sx(x0) - 2, height: h.sy(0) - h.sy(c2), rx: 2, fill: x0 + w <= 0 ? "var(--crit)" : "var(--s1)", opacity: .8 }, h.plot); });
    el("line", { x1: h.sx(MEJ), x2: h.sx(MEJ), y1: h.m.t, y2: h.sy(0), stroke: "var(--ink)", "stroke-width": 2 }, h.plot);
    el("text", { x: h.sx(MEJ) + 6, y: h.m.t + 12, "font-size": 11, fill: "var(--ink)" }, h.plot).textContent = "observada: " + pc(MEJ);
  };
  drawBoot([]);
  $("bootBtn").onclick = () => { const r = rng(42), em = TE.map((d, i) => (d.rm - PRED[i]) ** 2), eb = TE.map(d => d.rm ** 2), out = [];
    for (let s = 0; s < 5000; s++) { let a = 0, b = 0; for (let j = 0; j < 30; j++) { const k = Math.floor(r() * 30); a += em[k]; b += eb[k]; } out.push(1 - Math.sqrt(a) / Math.sqrt(b)); }
    out.sort((a, b) => a - b); drawBoot(out);
    const neg = out.filter(v => v <= 0).length / out.length;
        $("ans4").innerHTML = base4 + `<br><br><b>Remuestreo:</b> la mejora va aproximadamente de <b>${pc(out[124], 0)}</b> a <b>${pc(out[4874], 0)}</b> (95 %), y en el <b>${pc(neg, 0)}</b> de los remuestreos el modelo no gana (barras rojas).`; };
  const base4 = `<b>Sí, gana, por un ${pc(MEJ)}</b>: el error típico baja de ${pc(RB, 2)} a ${pc(RM, 2)} diario, y el modelo se acerca más que la base en ${days} de 30 días.<br><br><b>¿Es grande? No.</b> Es una mejora <b>modesta</b> medida con solo 30 días; con tan pocos datos podría deberse en parte al azar. Además, el modelo usa el retorno de L2 del <i>mismo día</i>, que en la práctica no se conoce por adelantado.`;
  $("ans4").innerHTML = base4;
},
paso5() {
  const xmin = Math.min(...X), xmax = Math.max(...X), sdx = sd(X), dmin = D[X.indexOf(xmin)], dmax = D[X.indexOf(xmax)];
  const bins = 22, lo = -0.16, hi = 0.16, w = (hi - lo) / bins * 0.5; // bins finos solo en el rango de datos
  const hb = 0.005, cnt = {}; X.forEach(v => { const k = Math.floor(v / hb); cnt[k] = (cnt[k] || 0) + 1; }); const mx = Math.max(...Object.values(cnt));
  const h = chart($("chHist"), { title: "¿Qué tan extremo es el shock?", sub: "Distribución de los 120 retornos diarios del índice L2", w: 560, h: 280, x: [lo, hi], y: [0, mx * 1.15], xticks: [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15], xf: v => pc(v, 0), ny: 4, yf: v => Math.round(v), xl: "Retorno diario del índice L2", yl: "Días" });
  Object.entries(cnt).forEach(([k, c2]) => { const x0 = k * hb; el("rect", { x: h.sx(x0) + .5, y: h.sy(c2), width: h.sx(x0 + hb) - h.sx(x0) - 1, height: h.sy(0) - h.sy(c2), fill: "var(--s1)", opacity: .8 }, h.plot); });
  const mk = el("line", { y1: h.m.t, y2: h.sy(0), stroke: "var(--s2)", "stroke-width": 3 }, h.plot);
  const mkt = el("text", { y: h.m.t + 12, "font-size": 11.5, "font-weight": 700, fill: "var(--ink2)" }, h.plot);
  const upd = () => { const s = +$("shS").value; $("shO").textContent = pcs(s, 1); $("effV").textContent = pcs(FIT.b * s, 1);
    mk.setAttribute("x1", h.sx(s)); mk.setAttribute("x2", h.sx(s)); mkt.setAttribute("x", h.sx(s) + (s > 0.08 ? -6 : 6)); mkt.setAttribute("text-anchor", s > 0.08 ? "end" : "start"); mkt.textContent = "shock " + pcs(s, 1);
    const inside = s >= xmin && s <= xmax;
    $("extrap").innerHTML = inside ? `<div class="note good">Dentro del rango observado (${pc(xmin, 2)} a ${pc(xmax, 2)}): el modelo tiene datos parecidos.</div>`
      : `<div class="note alert"><b>Extrapolación.</b> En 120 días L2 solo se movió entre <b>${pc(xmin, 2)}</b> (${fd(dmin.fecha)}) y <b>${pc(xmax, 2)}</b> (${fd(dmax.fecha)}). Un ${pcs(s, 1)} son <b>${f(Math.abs(s) / sdx, 1)} desviaciones estándar</b> y ${f(Math.abs(s) / Math.abs(s < 0 ? xmin : xmax), 1)} veces el día más extremo. El resultado es un orden de magnitud, no una certeza.</div>`; };
  $("shS").oninput = upd; upd();
  // Alertas
  const xs = D.map(d => dayIx(d.fecha));
  const drawRes = () => { const k = +$("kS").value; $("kO").textContent = f(k, 1) + " σ"; const al = alertsFor(k); $("alCount").textContent = al.length + " días en alerta";
    const c = chart($("chRes"), { title: "Residuo de MATIC (lo que L2 no explica) con bandas de ±" + f(k, 1) + "σ", sub: `σ = ${f(SIG, 4)} · umbral = ${pc(k * SIG, 2)}`, w: 1100, h: 280, x: [0, 119], y: [-0.1, 0.1], xticks: [0, 31, 61, 92, 119], xf: xfDay, yf: v => pc(v, 0), xl: "Fecha", yl: "Residuo diario (%)",
      legend: [["var(--s1)", "residuo", 1], ["var(--crit)", "banda ±kσ / día en alerta"]] });
    [k * SIG, -k * SIG].forEach(v => el("line", { x1: c.sx(0), x2: c.sx(119), y1: c.sy(v), y2: c.sy(v), stroke: "var(--crit)", "stroke-dasharray": "6 4", "stroke-width": 1.5 }, c.plot));
    el("path", { d: path(RES.map((r, i) => [c.sx(xs[i]), c.sy(r)])), fill: "none", stroke: "var(--s1)", "stroke-width": 1.5 }, c.plot);
    dotHover(c, al.map(d => [el("circle", { cx: c.sx(xs[d.i]), cy: c.sy(d.res), r: 6, fill: "var(--crit)", stroke: "var(--surface)", "stroke-width": 2 }, c.plot), `<b>${fd(d.fecha)}</b> · ALERTA<br>Residuo: ${pcs(d.res, 2)}<br>MATIC ${pcs(d.rm, 2)} · L2 ${pcs(d.rl, 2)}`]));
    $("alTable").innerHTML = "<tr><th>Fecha</th><th>MATIC</th><th>L2</th><th>Residuo</th><th>Vol. (M USD)</th></tr>" + al.map(d => `<tr${EXT.some(e => e.i === d.i) ? ' class="hl"' : ""}><td>${fd(d.fecha)}</td><td>${pcs(d.rm, 2)}</td><td>${pcs(d.rl, 2)}</td><td><b>${pcs(d.res, 2)}</b></td><td>${f(d.vol, 1)}</td></tr>`).join("") +
      `<tr><td colspan="5" style="text-align:left;color:var(--ink2);font-size:12.5px">En rojo: los dos movimientos extremos propios de MATIC. Volumen medio del periodo: ${f(mean(D.map(d => d.vol)), 1)}.</td></tr>`; };
  $("kS").oninput = drawRes; drawRes();
  const p = chart($("chPriceAl"), { title: "Precio de MATIC con los días en alerta (2σ)", sub: "¿Qué hacen los días en alerta en el precio?", w: 1100, h: 300, x: [0, 119], y: [0.7, 1.15], xticks: [0, 31, 61, 92, 119], xf: xfDay, yf: v => f(v, 2), xl: "Fecha", yl: "Precio (USD)" });
  el("path", { d: path(D.map((d, i) => [p.sx(xs[i]), p.sy(d.precio)])), fill: "none", stroke: "var(--s1)", "stroke-width": 2 }, p.plot);
  AL2.forEach(d => { el("circle", { cx: p.sx(xs[d.i]), cy: p.sy(d.precio), r: 5.5, fill: "var(--crit)", stroke: "var(--surface)", "stroke-width": 2 }, p.plot);
    const below = d.i === 37; el("text", { x: p.sx(xs[d.i]) + (below ? 0 : 10), y: p.sy(d.precio) + (below ? 22 : -12), "text-anchor": below ? "middle" : "start", "font-size": 11, "font-weight": 600, fill: "var(--ink)" }, p.plot).textContent = fds(d.fecha) + " " + pcs(d.rm, 1); });
  lineHover(p, xs, i => [`<b>${fd(D[i].fecha)}</b><br>${f(D[i].precio, 4)} USD · ${pcs(D[i].rm, 2)}`, p.sy(D[i].precio)]);
  const [e1, e2] = EXT;
  $("ans5").innerHTML = `<b>${fd(e1.fecha)}</b>: MATIC ${pcs(e1.rm, 1)} con L2 casi plano (${pcs(e1.rl, 1)}); en el precio es un <b>salto hacia arriba</b> (${f(D[e1.i - 1].precio, 3)} → ${f(e1.precio, 3)} USD) que rompe la tendencia bajista, con el volumen más alto del periodo.<br>
  <b>${fd(e2.fecha)}</b>: MATIC ${pcs(e2.rm, 1)} cuando L2 solo cayó ${pc(e2.rl, 1)}; en el precio es una <b>caída en escalón</b> (${f(D[e2.i - 1].precio, 3)} → ${f(e2.precio, 3)} USD) que borra la subida de mayo.<br>
  Los otros dos días (${AL2.filter(d => !EXT.includes(d)).map(d => fds(d.fecha)).join(" y ")}) son caídas de MATIC mientras L2 <i>subía</i>. <b>Punto de control ✔</b> ${AL2.length} alertas, un entero pequeño, y aparecen los dos extremos.`;
},
bonus() {
  const fit = (cols, rows) => ols2(rows.map(d => [1, ...cols.map(c => d[c])]), rows.map(d => d.rm));
  const stats = cols => { const co = fit(cols, D), pr = D.map(d => co[0] + cols.reduce((s, c, j) => s + co[j + 1] * d[c], 0)); const my = mean(Y);
    const r2 = 1 - Y.reduce((s, y, i) => s + (y - pr[i]) ** 2, 0) / Y.reduce((s, y) => s + (y - my) ** 2, 0); const k = cols.length + 1;
    const ct = fit(cols, TR), pt = TE.map(d => ct[0] + cols.reduce((s, c, j) => s + ct[j + 1] * d[c], 0));
    return { co, r2, r2a: 1 - (1 - r2) * (N - 1) / (N - k), rm: rmse(TE.map(d => d.rm), pt), ct }; };
  const s1 = stats(["rl"]), s2 = stats(["rl", "rb"]), rlb = corr(X, B), rmb = corr(Y, B);
  $("bonusTable").innerHTML = `<tr><th>Modelo</th><th>R²</th><th>R² ajustado</th><th>RMSE prueba</th></tr>
    <tr><td>Solo L2</td><td>${f(s1.r2)}</td><td>${f(s1.r2a)}</td><td>${f(s1.rm, 5)}</td></tr>
    <tr><td><b>L2 + BTC</b></td><td>${f(s2.r2)}</td><td><b>${f(s2.r2a)}</b></td><td><b>${f(s2.rm, 5)}</b></td></tr>
    <tr><td colspan="4" style="text-align:left">Coeficientes L2 + BTC: alpha = ${f(s2.co[0], 4)} · <b>b1 (L2) = ${f(s2.co[1])}</b> · <b>b2 (BTC) = ${f(s2.co[2])}</b><br>Solo con 90 días: b1 = ${f(s2.ct[1])} · b2 = ${f(s2.ct[2])}</td></tr>`;
  const c = chart($("chLB"), { title: "Los dos factores se parecen: L2 vs. BTC", sub: "Correlación = " + f(rlb, 3), w: 520, h: 380, x: [-0.05, 0.045], y: [-0.04, 0.035], xf: v => pc(v, 0), yf: v => pc(v, 0), xl: "Retorno del índice L2 (%)", yl: "Retorno de BTC (%)" });
  dotHover(c, D.map(d => [el("circle", { cx: c.sx(d.rl), cy: c.sy(d.rb), r: 4, fill: "var(--s3)", "fill-opacity": .65, stroke: "var(--surface)", "stroke-width": 1 }, c.plot), `<b>${fd(d.fecha)}</b><br>L2 ${pcs(d.rl, 2)} · BTC ${pcs(d.rb, 2)}`]));
  $("ansB").innerHTML = `Agregar BTC <b>mejora un poco</b>: el R² ajustado sube de ${f(s1.r2a)} a ${f(s2.r2a)} (aun penalizando la variable extra) y el RMSE de prueba baja de ${f(s1.rm, 5)} a ${f(s2.rm, 5)}.<br><br>
  <b>Lo raro:</b> b2 sale <b>negativo</b> (${f(s2.co[2])}) aunque MATIC y BTC por sí solos tienen correlación positiva (${f(rmb, 2)}), y b1 sube de ${f(FIT.b)} a ${f(s2.co[1])}. La causa es que L2 y BTC tienen correlación <b>${f(rlb, 2)}</b>: <b>multicolinealidad</b>. El modelo no puede separar bien qué parte viene de cada factor, así que los coeficientes se vuelven inestables, pueden cambiar de signo y pierden interpretación. b2 &lt; 0 <i>no</i> significa que "MATIC baja cuando sube BTC". Para comunicar el resultado nos quedamos con el modelo simple.`;
},
resumen() {
  const [e1, e2] = EXT;
  $("sumTable").innerHTML = `<tr><th>Sección</th><th style="text-align:left">Frase</th></tr>
  <tr><td><b>Mi beta</b></td><td style="text-align:left">Por cada 1 % que se mueve el mercado L2, MATIC se mueve en promedio <span class="fill">${f(FIT.b, 2)} %</span>. La correlación es <span class="fill">${f(R, 2)}</span> y el R² es <span class="fill">${f(R2, 2)}</span>.</td></tr>
  <tr><td><b>Validación</b></td><td style="text-align:left">Con beta calculada solo con 90 días, el RMSE en los 30 días de prueba fue <span class="fill">${f(RM, 4)}</span> frente a <span class="fill">${f(RB, 4)}</span> de la línea base (predecir 0). Mi modelo <span class="fill">gana</span> por <span class="fill">${pc(MEJ)}</span>.</td></tr>
  <tr><td><b>Uso práctico</b></td><td style="text-align:left">(Escenario) Si L2 cae 10 %, MATIC cae ≈ <span class="fill">${pc(Math.abs(FIT.b * 0.1))}</span>. (Alertas) Encontré <span class="fill">${AL2.length}</span> días con |residuo| &gt; 2σ, entre ellos <span class="fill">${fd(e1.fecha)}</span> y <span class="fill">${fd(e2.fecha)}</span>.</td></tr>
  <tr><td><b>Limitación</b></td><td style="text-align:left">Una limitación importante de mi análisis es <span class="fill">que la prueba tiene solo 30 días</span> porque <span class="fill">con tan pocos días la mejora de ${pc(MEJ)} no es estable: al remuestrear puede ser negativa (en ~1 de cada 5 casos el modelo no gana)</span>. Además, el R² de ${f(R2, 2)} deja sin explicar el ${pc(1 - R2, 0)} del movimiento.</td></tr>`;
  $("errList").innerHTML = [
    "La recta se ajustó con <b>retornos</b>, no con precio_matic.",
    "X e Y en el orden correcto: <code>np.polyfit(x=L2, y=MATIC)</code>; en Excel <code>PENDIENTE(Y; X)</code>.",
    "La beta del paso 4 usa <b>solo los primeros 90 días</b>.",
    "Decimales: el shock de −10 % se escribió como −0.10.",
    "Todos los gráficos tienen título, nombre de ejes y unidades.",
    "No decimos que el modelo \"predice bien\" sin compararlo con la línea base."].map(t => `<div class="check"><span class="ok">✓</span><div>${t}</div></div>`).join("");
}};
const start = (location.hash || "#inicio").slice(1);
go(secs.some(s => s.id === start) ? start : "inicio");
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (secs.some(s => s.id === h)) go(h); });
