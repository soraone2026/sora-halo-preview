/* 留白城的筆（2026-11-23，熊：「這一筆可以由玩家自己觸控、用滑鼠畫嗎？」）
 * - 拿起筆的時候，畫面上蓋一張透明的紙（canvas），手指／滑鼠畫過去留下墨跡：慢的地方粗、濃，快的地方細、有飛白。
 * - onMove(x, y, speed)：畫的當下每一點都通知（描稿用）；onStroke(stroke)：放開時把整筆交出去（閒筆、小事用）。
 * - classify(stroke)：點、圈、一橫、一豎、一道彎。墨跡放開後一秒多慢慢淡掉（3D 裡的東西接著長出來）。 */
export function createBrush({ onMove, onStroke }) {
  const cv = document.createElement("canvas"); cv.className = "brushcv"; document.body.append(cv);
  const c = cv.getContext("2d"); let W = 0, H = 0, dpr = 1, active = false, cur = null; const old = [];
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); addEventListener("resize", fit);
  /* 一段筆畫：主線＋幾條細的「毛」，速度越快越細、越淡、越容易斷 */
  function seg(a, b, alpha = 1) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, sp = d / Math.max(8, b[2] - a[2]) * 1000, w = Math.max(2.5, Math.min(14, 15 - sp / 120)), nx = -dy / d, ny = dx / d;
    for (let k = -2; k <= 2; k++) { if (Math.abs(k) === 2 && sp > 900 && ((a[0] * 7 + k) | 0) % 3 === 0) continue; const o = k * w * 0.22, ww = Math.max(0.8, w * (1 - Math.abs(k) * 0.28));
      c.strokeStyle = `rgba(22,19,17,${alpha * (0.85 - Math.abs(k) * 0.18) * Math.max(0.45, 1 - sp / 3000)})`; c.lineWidth = ww; c.lineCap = "round"; c.beginPath(); c.moveTo(a[0] + nx * o, a[1] + ny * o); c.lineTo(b[0] + nx * o, b[1] + ny * o); c.stroke(); } }
  function redraw() { c.clearRect(0, 0, W, H); for (const s of old) { for (let i = 1; i < s.pts.length; i++) seg(s.pts[i - 1], s.pts[i], s.a); if (s.pts.length === 1) { c.fillStyle = `rgba(22,19,17,${0.85 * s.a})`; c.beginPath(); c.arc(s.pts[0][0], s.pts[0][1], 7, 0, 7); c.fill(); } }
    if (cur) { for (let i = 1; i < cur.pts.length; i++) seg(cur.pts[i - 1], cur.pts[i], 1); if (cur.pts.length === 1) { c.fillStyle = "rgba(22,19,17,.85)"; c.beginPath(); c.arc(cur.pts[0][0], cur.pts[0][1], 7, 0, 7); c.fill(); } } }
  let raf = 0; const tick = () => { raf = 0; let any = false; for (let i = old.length - 1; i >= 0; i--) { old[i].a -= 0.03; if (old[i].a <= 0) old.splice(i, 1); else any = true; } redraw(); if (any || cur) raf = requestAnimationFrame(tick); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  cv.addEventListener("pointerdown", (e) => { if (!active) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) { } cur = { pts: [[e.clientX, e.clientY, performance.now()]], id: e.pointerId }; onMove && onMove(e.clientX, e.clientY, 0); kick(); });
  cv.addEventListener("pointermove", (e) => { if (!cur || e.pointerId !== cur.id) return; const p = cur.pts[cur.pts.length - 1], now = performance.now(), d = Math.hypot(e.clientX - p[0], e.clientY - p[1]); if (d < 3) return;
    const sp = d / Math.max(8, now - p[2]) * 1000; cur.pts.push([e.clientX, e.clientY, now]); onMove && onMove(e.clientX, e.clientY, sp); kick(); });
  const end = (e) => { if (!cur || e.pointerId !== cur.id) return; const s = cur; cur = null; s.a = 1; old.push(s); kick(); const st = summarize(s.pts); onStroke && onStroke(st); };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  return { get active() { return active; }, set(on) { active = !!on; cv.classList.toggle("on", active); if (!active) { cur = null; } }, el: cv };
}
function summarize(pts) { let len = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); if (i) len += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]); }
  const dur = pts.length > 1 ? (pts[pts.length - 1][2] - pts[0][2]) / 1000 : 0; return { pts, len, box: [x0, y0, x1, y1], dur, speed: dur > 0 ? len / dur : 0 }; }
export function classify(st) { const [x0, y0, x1, y1] = st.box, w = x1 - x0, h = y1 - y0, big = Math.max(w, h), a = st.pts[0], b = st.pts[st.pts.length - 1], chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (st.pts.length < 3 || big < 16) return { kind: "dot", cx: a[0], cy: a[1] };
  if (chord < big * 0.35 && st.len > big * 2.2) return { kind: "circle", cx, cy, r: big / 2 };
  if (chord / st.len > 0.78) { const ang = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0])) * 180 / Math.PI, deg = ang > 90 ? 180 - ang : ang;
    if (deg > 58) return { kind: "vert", cx, cy, top: [x0 + (a[1] < b[1] ? a[0] - x0 : b[0] - x0), y0], bottom: a[1] > b[1] ? [a[0], a[1]] : [b[0], b[1]] };
    if (deg < 30) return { kind: "horiz", cx, cy, a: [a[0], a[1]], b: [b[0], b[1]] }; }
  return { kind: "curve", cx, cy, pts: st.pts.filter((_, i) => i % Math.max(1, Math.floor(st.pts.length / 8)) === 0).concat([b]).map((p) => [p[0], p[1]]) }; }
