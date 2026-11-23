/* 鳴沙城的「聲紋」（2026-11-23）：克拉尼圖形。
 * 一塊金屬板被某個音震動時，板上會有幾條完全不動的線（節線）；撒在板上的沙被震得亂跳，最後全都停在節線上，排出圖案。
 * 這裡用方板的公式：Z(x, y) = cos(nπx)·cos(mπy) + s·cos(mπx)·cos(nπy)，Z = 0 的地方就是節線。
 * MODES：依頻率（m² + n²）排好的 30 個聲紋；每個有名字。 */
const NAMES = [["初鳴", "First Tone"], ["十字", "Cross"], ["雙環", "Twin Rings"], ["星芒", "Starburst"], ["棋盤", "Chessboard"], ["花窗", "Lattice"], ["蛛網", "Web"], ["重瓣", "Double Bloom"],
  ["迴紋", "Meander"], ["冰裂", "Ice Crackle"], ["蜂巢", "Honeycomb"], ["雪片", "Snowflake"], ["漣漪", "Ripples"], ["鳳尾", "Phoenix Tail"], ["龜甲", "Tortoiseshell"], ["織錦", "Brocade"],
  ["萬花", "Kaleidoscope"], ["雲雷", "Cloud & Thunder"], ["蓮座", "Lotus Throne"], ["星門", "Star Gate"], ["螺鈿", "Mother-of-Pearl"], ["羽扇", "Feather Fan"], ["珊瑚", "Coral"], ["鱗波", "Scale Waves"],
  ["琉璃", "Glaze"], ["天網", "Sky Net"], ["繁星", "Myriad Stars"], ["鐘紋", "Bell Script"], ["曼陀", "Mandala"], ["萬籟", "All Sounds"]];
export const MODES = (() => { const L = [];
  for (let m = 1; m <= 9; m++) for (let n = 0; n < m; n++) for (const s of [1, -1]) { if ((m + n) % 2 === 1 && s === -1 && n === 0) continue; L.push({ m, n, s, f: m * m + n * n + (s < 0 ? 0.35 : 0) }); }
  L.sort((a, b) => a.f - b.f); const out = []; for (const q of L) { if (out.length >= 30) break; if (out.some((o) => o.m === q.m && o.n === q.n && o.s === q.s)) continue; out.push(q); }
  return out.map((q, i) => ({ ...q, i, key: `${q.m}${q.n}${q.s > 0 ? "p" : "q"}`, name: NAMES[i], a: Math.PI * q.n, b: Math.PI * q.m, pos: 0.04 + i / 29 * 0.92 })); })();
export const modeByKey = (k) => MODES.find((q) => q.key === k) || null;
/* x、y 在 -1…1 */
export function Z(q, x, y) { return Math.cos(q.a * x) * Math.cos(q.b * y) + q.s * Math.cos(q.b * x) * Math.cos(q.a * y); }
/* 掃到 v（0…1）時，每個聲紋震得多大：越靠近它的共鳴點越大（很窄的尖峰） */
export const WIDTH = 0.011;
export function response(v) { const out = []; for (const q of MODES) { const d = (v - q.pos) / WIDTH, a = 1 / (1 + d * d); if (a > 0.04) out.push([q, a]); } return out.sort((x, y) => y[1] - x[1]).slice(0, 2); }
/* 把一個聲紋畫成小圖：深色的盤，金色的沙排在節線上 */
export function figure(q, size = 96, col = "#f2c86a", bg = "#1a1424") { const cv = document.createElement("canvas"); cv.width = cv.height = size; const c = cv.getContext("2d"), R = size / 2;
  c.fillStyle = bg; c.beginPath(); c.arc(R, R, R - 1, 0, 7); c.fill(); const img = c.getImageData(0, 0, size, size), d = img.data, [cr, cg, cb] = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16));
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) { const x = px / R - 1, y = py / R - 1; if (x * x + y * y > 0.94) continue; const z = Math.abs(Z(q, x * 0.95, y * 0.95)), k = Math.exp(-z * 9) * 0.95; if (k < 0.04) continue;
    const o = (py * size + px) * 4; d[o] = d[o] + (cr - d[o]) * k; d[o + 1] = d[o + 1] + (cg - d[o + 1]) * k; d[o + 2] = d[o + 2] + (cb - d[o + 2]) * k; }
  c.putImageData(img, 0, 0); c.strokeStyle = "rgba(242,200,106,.55)"; c.lineWidth = Math.max(1, size / 60); c.beginPath(); c.arc(R, R, R - 1.5, 0, 7); c.stroke(); return cv; }
/* 鳴沙城的節線上的點（給「結晶」用）：在半徑 r0…r1 的環裡找 |Z| 很小的地方 */
export function nodalPoints(q, r0, r1, scale, n, rnd) { const out = []; for (let k = 0; k < n * 60 && out.length < n; k++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(r0 * r0 + rnd() * (r1 * r1 - r0 * r0)), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(Z(q, x / scale, z / scale)) < 0.05 && out.every((p) => Math.hypot(p[0] - x, p[1] - z) > 1.6)) out.push([x, z]); } return out; }
