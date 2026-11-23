/* 留白城（2026-11-23，熊：「整體設定不滿意、畫面不夠漂亮、生成的意象太直白沒有美感」→ 選了「水墨留白」）
 * - 第六座星際城市：一座畫在霧上的水墨山水城。這座城本來就沒畫完——留白的地方，等來的人一筆一筆添上。
 * - 會長大：每天第一次來，畫師問「今天的留白，要添哪一筆？」，兩句四字題詞選一句（竹窗聽雨、孤舟遠影……），城就多一筆。
 *   哪兩句、墨的濃淡，看玩家上次來之後的日子（只看記帳的項目、類別、日期與學習、玩的紀錄），但畫面上不說破——只有一句像「硯裡的墨，今天磨得特別細」的話。
 *   晚上來過的次數 → 月亮越來越圓；來過的天數 → 落款石上的朱印越來越多。所以每個人的留白城都長得不一樣。
 * - 每天五件小事：點石燈、追墨蝶。做完一件 1 B＋1 份松煙墨。
 * - 三處要修：空白的匾額、褪色的石拱橋、斷流的瀑布。修好一處拍一張海報；三處都修好，畫師講第六章。
 * 預覽：?day=YYYY-MM-DD、?nocut、?dbg（window.__ink）
 */
import { finAvatar, makePerson, animatePerson } from "../city/city-people.js";
import { createInkAudio } from "./ink-audio.js";
import { createRepair } from "../city/repair.js";
import { makeTrio } from "../city/cityx.js";
import { makeGames } from "../city/minigame.js";
import { makeNameTag, playerName } from "../city/nametag.js";
import { NIKO_LOOK, makeFigure, tickFigure, tourLink, invitePanel, makeCard, cardPanel } from "../city/together.js";
import { growStart, storyCard, BUCKETS } from "../city/grow.js";
import { createBrush, classify } from "./brush.js";
import { createAlbum, PEOPLE, POEM_ORDER } from "./album.js";
try { if (window.parent !== window) document.body.classList.add("embed"); } catch (e) { document.body.classList.add("embed"); }

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
const $ = (s) => document.querySelector(s);
const I18N = window.SLE_I18N || { lang: "zh" };
const L = (zh, en) => (I18N.lang === "en" ? en : zh);
const QS = new URLSearchParams(location.search);
const SMALL = Math.min(innerWidth, innerHeight) < 600;
const CITY = "liubai";
let toastT = 0, sayT = 0;
function toast(m, ms = 3600) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms); }
function say(m, who, ms = 5600) { const t = $("#say"); t.textContent = m; if (who) { const s = document.createElement("small"); s.textContent = "— " + who; t.append(s); } t.classList.add("show"); clearTimeout(sayT); sayT = setTimeout(() => t.classList.remove("show"), ms); }
function todayStr() { const q = QS.get("day"); if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q; const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
function seedOf(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; }
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const DAY = todayStr(), rnd = rngOf(seedOf(CITY + ":" + DAY)), LAND = 60, WIND_T = 26;   /* 熊 2026-11-23：原本 40，活動範圍太小、沒地方畫 */
const PAPER = "#ece4d4", INK = "#1d1a18", CINNABAR = "#c03a2b";
/* 天氣（跟著日期）：晴、雨、霧；冬天才會下雪。?wx=rain 可以預覽 */
const WX = (() => { const q = QS.get("wx"); if (["clear", "rain", "mist", "snow"].includes(q)) return q; const r = rngOf(seedOf("wx:" + DAY))(), m = +DAY.slice(5, 7), winter = m === 12 || m <= 2; return r < 0.58 ? "clear" : r < 0.78 ? "rain" : r < 0.9 ? "mist" : winter ? "snow" : "rain"; })();
const WXN = { clear: ["晴", "clear"], rain: ["雨", "rain"], mist: ["霧", "mist"], snow: ["雪", "snow"] };
const FS = window.FinSave && FinSave.ok() ? FinSave : null, ST0 = FS && FS.starState ? FS.starState(CITY) : { got: [], n: 0, days: 0 };
const audio = createInkAudio(seedOf(CITY + ":" + DAY));
const sndLabel = () => { const b = $("#snd"); if (b) { b.textContent = "♪"; b.title = audio.on ? L("關掉聲音", "Mute") : L("打開聲音", "Sound on"); b.classList.toggle("off", !audio.on); } };
addEventListener("pointerdown", (e) => { if (!(e.target && e.target.id === "snd")) audio.gesture(); }, { capture: true });
addEventListener("keydown", () => audio.gesture());
document.addEventListener("visibilitychange", () => { if (document.hidden) audio.pause(); else audio.resume(); });
window.__sleSound = (on) => { if (on === false) audio.pause(true); else audio.resume(true); };

/* 可以添的十二筆（每一種生活對應兩種，畫面上只看得到題詞，不說是哪一種生活） */
const STROKE = {
  plum: { ch: "梅", name: ["梅邊小立", "Beside the plum"], desc: ["雪還沒化，梅先開了幾點紅。", "The snow hasn't melted, but the plum has opened a few red dots."] },
  cot: { ch: "炊", name: ["山居炊煙", "Smoke from a mountain hut"], desc: ["有人在山裡煮飯，煙慢慢散進霧裡。", "Someone is cooking in the hills; the smoke drifts into the mist."] },
  boat: { ch: "舟", name: ["孤舟遠影", "A lone boat, far off"], desc: ["一葉小舟，泊在看不清的水邊。", "A single small boat, moored where the water fades."] },
  crane: { ch: "鶴", name: ["鶴歸晚晴", "Cranes home in clear dusk"], desc: ["幾隻鶴繞著城，飛了一圈才落下。", "A few cranes circle the city once before they settle."] },
  pav: { ch: "亭", name: ["半山閒亭", "An idle pavilion"], desc: ["多了一座亭子，可以坐下來。", "A pavilion appears — somewhere to sit down."] },
  court: { ch: "院", name: ["月門深院", "Moon gate, deep courtyard"], desc: ["一道圓圓的門，門後還有門。", "A round gate, and beyond it, another."] },
  rock: { ch: "石", name: ["石上清泉", "Spring over stone"], desc: ["一塊老石頭，泉水從它身上流過。", "An old stone with a spring running over it."] },
  hill: { ch: "山", name: ["遠山一抹", "A brushstroke of far hills"], desc: ["遠處多了一道山，淡得快看不見。", "A new ridge in the distance, so pale it's almost not there."] },
  bamboo: { ch: "竹", name: ["竹窗聽雨", "Rain through bamboo"], desc: ["一片竹林，風一來就沙沙作響。", "A stand of bamboo that rustles whenever the wind comes."] },
  pagoda: { ch: "塔", name: ["孤塔凌雲", "A tower into the clouds"], desc: ["一座細細的塔，塔尖沒進雲裡。", "A slender tower, its tip lost in cloud."] },
  kite: { ch: "鳶", name: ["紙鳶東風", "Kites on the east wind"], desc: ["幾隻紙鳶在城上飄。", "A few paper kites drift over the city."] },
  lamp: { ch: "燈", name: ["燈火闌珊", "Lanterns, here and there"], desc: ["霧裡亮起幾盞紅燈籠。", "A few red lanterns glow in the mist."] },
};
const BUCKET_STROKES = { food: ["plum", "cot"], move: ["boat", "crane"], home: ["pav", "court"], save: ["rock", "hill"], learn: ["bamboo", "pagoda"], play: ["kite", "lamp"] };
const WHY = { food: ["硯裡的墨，今天帶著一點飯香。", "The ink in the stone smells faintly of supper today."], move: ["墨在硯裡流個不停，像要出門。", "The ink won't stay still in the stone, as if it wants to go somewhere."],
  home: ["墨色很暖，像屋裡留著的燈。", "The ink is warm today, like a lamp left on at home."], save: ["墨沉在硯底，很穩，很深。", "The ink has settled at the bottom of the stone — steady and deep."],
  learn: ["墨磨得特別細，像寫了很多字。", "The ink is ground very fine, as if many words were written with it."], play: ["幾滴墨濺出了硯台，像在笑。", "A few drops of ink splashed out of the stone, as if laughing."] };
const strokeOf = (id) => { const [k, rest] = String(id).split("@"), [d, c] = String(rest || "").split("~"); return { k, d: Math.max(1, Math.min(3, +d || 2)), c: c || null }; };   /* plum@3~cin：第三種濃淡、朱砂 */
const NAMES = [["硯翁", "Old Inkstone"], ["墨娘", "Ink Maid"], ["小毫", "Little Brush"], ["紙伯", "Uncle Paper"], ["阿印", "Seal"]];
const LINES = [["這城本來就沒畫完。留白的地方，是給後來的人的。", "This city was never finished. The blank places are for whoever comes after."],
  ["墨要慢慢磨。急了，畫出來的山會發抖。", "Grind the ink slowly. Rush it, and the mountains you paint will tremble."],
  ["匾額上本來有兩個字，被雨洗掉了。", "There used to be two characters on the plaque. The rain washed them away."],
  ["石橋的墨淡了，走上去會掉進紙裡。", "The ink on the stone bridge has faded. Step on it and you'd fall into the paper."],
  ["瀑布斷了以後，連霧都安靜下來。", "Since the waterfall stopped, even the mist has gone quiet."],
  ["你添的每一筆，城都記得是哪一天。", "Every stroke you add, the city remembers which day it was."],
  ["墨蝶怕人，可是喜歡跟著人走。", "Ink butterflies are shy, but they like to follow people."],
  ["你身上有燈芯的味道，還有苔光。", "You smell of lamp wicks, and of mossglow."]];

(async function main() {
  let THREE;
  try { THREE = await import(THREE_URL); } catch { $("#loading").textContent = L("留白城需要網路載入 3D。", "Liubai needs the internet to load 3D."); return; }
  const V3 = THREE.Vector3;
  let cut = QS.has("nocut") ? null : { ph: "wait", t: 0 };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) { const b = $("#loading"); b.style.pointerEvents = "auto"; b.textContent = L("這個瀏覽器目前無法顯示 3D 城市（WebGL 沒有開啟或顯示卡不支援）。", "This browser can't show the 3D city right now (WebGL is off or unsupported)."); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.6 : 2)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(PAPER);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $("#stage").append(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(PAPER, 34, 210);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 1600);
  scene.add(new THREE.HemisphereLight("#fffaf0", "#b8ae9e", 1.6)); { const dl = new THREE.DirectionalLight("#ffffff", 1.0); dl.position.set(-30, 60, 40); scene.add(dl); }   /* 只照到人物（其他都是不打光的水墨材質） */
  const canvasTex = (w, h, draw) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const ease = (k) => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const dummy = new THREE.Object3D(), _c1 = new THREE.Color(), _c2 = new THREE.Color();
  const R0 = rngOf(seedOf("liubai-land"));

  /* ---------- 水墨的材質：不打光、有筆觸的紋理；邊緣用反面放大的黑殼描一圈 ---------- */
  const brushT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); const r = rngOf(9); for (let k = 0; k < 160; k++) { const y = r() * h, x = r() * w, len = 30 + r() * 120; c.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.1})`; c.lineWidth = 1 + r() * 5; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 8, x + len * 0.7, y + (r() - 0.5) * 8, x + len, y + (r() - 0.5) * 6); c.stroke(); }
    for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(0,0,0,${r() * 0.05})`; c.fillRect(r() * w, r() * h, 1.5, 1.5); } });
  brushT.wrapS = brushT.wrapT = THREE.RepeatWrapping;
  const inkCol = (shade) => _c1.set(PAPER).lerp(_c2.set(INK), Math.max(0, Math.min(1, shade))).clone();
  const MAT = {}; const inkM = (shade, o = {}) => { const key = shade.toFixed(2) + JSON.stringify(o); return MAT[key] || (MAT[key] = new THREE.MeshBasicMaterial({ color: inkCol(shade), map: brushT, ...o })); };
  const OUT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), OUT_SOFT = new THREE.MeshBasicMaterial({ color: "#3a3430", side: THREE.BackSide, transparent: true, opacity: 0.55 });
  const outline = (m, w = 0.05, soft = false) => { const o = new THREE.Mesh(m.geometry, soft ? OUT_SOFT : OUT); o.scale.setScalar(1 + w); o.userData.outline = true; m.add(o); return m; };
  const mesh = (geo, shade, o = {}) => new THREE.Mesh(geo, inkM(shade, o));
  const softT = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const blotT = canvasTex(256, 256, (c) => { const r = rngOf(31); c.translate(128, 128); for (let k = 0; k < 60; k++) { const a = r() * Math.PI * 2, d = r() * 60, s = 10 + r() * 40; c.fillStyle = `rgba(20,18,16,${0.05 + r() * 0.12})`; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, 7); c.fill(); }
    for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 70 + r() * 50; c.fillStyle = `rgba(20,18,16,${0.2 + r() * 0.3})`; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 4, 0, 7); c.fill(); } });
  const blotW = canvasTex(256, 256, (c) => { const r = rngOf(31); c.translate(128, 128); for (let k = 0; k < 60; k++) { const a = r() * Math.PI * 2, d = r() * 60, s = 10 + r() * 40; c.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.22})`; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, 7); c.fill(); }
    for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 70 + r() * 50; c.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 4, 0, 7); c.fill(); } });   /* 彩色的墨暈：白的形狀，再乘上顏色 */
  const spr = (map, color, s, op = 1, o = {}) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: op, depthWrite: false, ...o })); sp.scale.setScalar(s); return sp; };

  /* ---------- 毛筆字（熊：匾額要是書法，不能是電腦字型）：照筆順一筆一筆寫；起筆頓、行筆略細、撇收尖、末端有飛白 ---------- */
  const CALLI = {
    "白": [[[54, 3], [48, 12], [41, 21]], [[23, 27], [24, 60], [25, 96]], [[23, 27], [50, 25], [77, 23], [76, 60], [75, 96]], [[26, 59], [50, 58], [73, 57]], [[26, 93], [50, 93], [74, 92]]],
    "留": [[[32, 3], [23, 13], [11, 22]], [[19, 12], [16, 25], [13, 37], [26, 33], [39, 28]], [[25, 22], [30, 27], [34, 32]], [[52, 9], [68, 8], [85, 8], [84, 23], [82, 38], [75, 33]], [[67, 11], [63, 24], [55, 37]],
      [[24, 46], [25, 71], [26, 96]], [[24, 46], [50, 45], [76, 45], [75, 71], [74, 96]], [[26, 70], [50, 70], [73, 69]], [[50, 46], [50, 70], [50, 94]], [[26, 94], [50, 94], [74, 93]]] };
  function calli(c, ch, x0, y0, size, k, seed) { const S = CALLI[ch]; if (!S || k <= 0) return; const r = rngOf(seed), sc = size / 100, W = size * 0.083;
    const lens = S.map((P) => P.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0)), tot = lens.reduce((a, b) => a + b, 0); let left = tot * k;
    c.save(); c.translate(x0, y0); c.transform(1, 0, -0.06, 1, 4, 0);
    S.forEach((P, si) => { if (left <= 0) return; const L0 = lens[si], show = Math.min(1, left / L0); left -= L0; const last = P[P.length - 1], prev = P[P.length - 2], dx = last[0] - prev[0], dy = last[1] - prev[1];
      const pie = dx < -2 && dy > 2, dot = L0 < 16, hook = P.length > 3 && dy < 0;   /* 撇收尖、點像水滴、鉤往回挑 */
      const pts = []; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.8); for (let j = 0; j < n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } pts.push(last);
      const m = Math.max(2, Math.floor(pts.length * show)), jx = (r() - 0.5) * 1.2, jy = (r() - 0.5) * 1.2;
      for (let pass = 0; pass < 2; pass++) { c.fillStyle = pass ? "rgba(22,19,17,.92)" : "rgba(22,19,17,.16)";
        for (let i = 0; i < m; i++) { const t = i / (pts.length - 1); let wv = t < 0.08 ? 1.25 - t * 2.5 : 0.82 + 0.1 * Math.sin(t * 9 + si);
          if (pie) wv *= Math.max(0.12, 1 - Math.max(0, t - 0.35) * 1.4); else if (dot) wv = 0.7 + Math.sin(t * Math.PI) * 0.7; else if (t > 0.9 && !hook) wv *= 1.18;
          if (hook && t > 0.86) wv *= Math.max(0.15, 1 - (t - 0.86) * 6);
          const rad = W * wv * (pass ? 1 : 1.3), [px, py] = pts[i], hx = (px + jx) * sc, hy = (py + jy) * sc;   /* 扁的筆尖斜斜地拿：橫畫細、豎畫粗 */
          c.beginPath(); c.ellipse(hx, hy, Math.max(0.6, rad * 0.62), Math.max(0.5, rad * 0.3), -0.38, 0, 7); c.fill();
          if (pass && (i === 0 || (i === m - 1 && show >= 1 && !pie && !dot && !hook))) { c.beginPath(); c.ellipse(hx + rad * 0.1, hy + rad * 0.12, rad * 0.42, rad * 0.3, 0.6, 0, 7); c.fill(); } } }   /* 起筆、收筆的頓 */
      /* 飛白：行筆快、墨少的地方留幾道細細的紙色 */
      c.save(); c.globalCompositeOperation = "destination-out"; c.strokeStyle = "rgba(0,0,0,.55)"; c.lineWidth = 0.9;
      for (let q = 0; q < 3; q++) { const off = (r() - 0.5) * W * 0.6, a0 = Math.floor(m * (0.45 + r() * 0.3)); if (a0 >= m - 2) continue; c.beginPath(); for (let i = a0; i < m; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], ex = p1[0] - p0[0], ey = p1[1] - p0[1], el = Math.hypot(ex, ey) || 1; const X = (p1[0] + jx - ey / el * off / sc) * sc, Y = (p1[1] + jy + ex / el * off / sc) * sc; i === a0 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.stroke(); }
      c.restore(); });
    c.restore(); }

  /* 熊：「新的墨色，比較亮的顏色，可以在比較少的印就解鎖」 */
  const INKS = [["ink", "墨", "Ink", INK, 0], ["cin", "朱砂", "Cinnabar", "#c8382a", 3], ["azu", "石青", "Azurite", "#2f6fb0", 6], ["mal", "石綠", "Malachite", "#2a9470", 10], ["gam", "藤黃", "Gamboge", "#e3a514", 15], ["gold", "金泥", "Gold", "#c99a32", 22]];
  const sealN = () => Object.keys((FS && FS.paintState && FS.paintState().seals) || {}).filter((k) => !k.startsWith("d:")).length, inkOpen = (k) => { const q = INKS.find((x) => x[0] === k); return !!q && sealN() >= q[4]; };
  let curInk = "ink"; try { curInk = localStorage.getItem("liubai-ink") || "ink"; } catch (e) { } if (!INKS.some((x) => x[0] === curInk)) curInk = "ink";
  const inkNow = () => (inkOpen(curInk) ? curInk : "ink");
  function tintBy(g, c) { const q = c && c !== "ink" && INKS.find((x) => x[0] === c); if (!q) return; const hue = new THREE.Color(q[3]), pc = new THREE.Color(PAPER), hsl = {};
    g.traverse((o) => { if (!o.isMesh || o.userData.outline || !o.material || Array.isArray(o.material) || !o.material.color) return; const m = o.material.clone(); m.color.getHSL(hsl); m.color.copy(pc).lerp(hue, Math.min(1, (1 - hsl.l) * 1.35 + 0.2)); o.material = m; }); }
  function inkChips() { return `<div class="ichips">${INKS.map(([k, zh, en, col, need]) => inkOpen(k) ? `<button type="button" class="${inkNow() === k ? "on" : ""}" data-ink="${k}"><i data-col="${col}"></i>${L(zh, en)}</button>` : `<span class="lock"><i data-col="${col}"></i>${L(`${need} 印`, `${need} seals`)}</span>`).join("")}</div>`; }

  /* ---------- 紙色的天、一輪朱紅的日、層層淡去的遠山 ---------- */
  { const sky = canvasTex(4, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); [[0, "#d8cfbe"], [0.4, "#e6dece"], [0.5, PAPER], [1, PAPER]].forEach(([k, col]) => g.addColorStop(k, col)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false })));
    const sunT = canvasTex(256, 256, (c) => { c.fillStyle = CINNABAR; c.beginPath(); c.arc(128, 128, 110, 0, 7); c.fill(); const r = rngOf(5); for (let k = 0; k < 500; k++) { c.fillStyle = `rgba(236,228,212,${r() * 0.25})`; c.fillRect(r() * 256, r() * 256, 2, 2); } });
    const sun = spr(sunT, "#ffffff", 70, 0.92, { fog: false }); sun.position.set(-260, 150, -620); scene.add(sun);
    const ridge = (seed, amp, base, steps) => canvasTex(2048, 256, (c, w, h) => { const r = rngOf(seed); c.clearRect(0, 0, w, h); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(30,26,24,.95)"); g.addColorStop(0.55, "rgba(30,26,24,.55)"); g.addColorStop(1, "rgba(30,26,24,0)"); c.fillStyle = g;
      c.beginPath(); c.moveTo(0, h); let y = base; for (let x = 0; x <= w; x += w / steps) { y = Math.max(20, Math.min(h * 0.75, y + (r() - 0.5) * amp)); c.lineTo(x, y + Math.sin(x * 0.02) * 6); } c.lineTo(w, h); c.closePath(); c.fill(); });
    [[150, 0.42, 1, 60, 90, 90], [240, 0.26, 2, 80, 70, 120], [360, 0.14, 3, 110, 80, 70]].forEach(([R, op, sd, H, amp, steps]) => { const t = ridge(sd + 40, amp, 120, steps); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, side: THREE.BackSide, depthWrite: false, fog: false })); m.position.y = H / 2 - 18; m.rotation.y = sd; scene.add(m); }); }

  /* ---------- 地面：一張紙，邊上散進霧裡 ---------- */
  const groundT = canvasTex(512, 512, (c, w, h) => { c.fillStyle = "#e6ddca"; c.fillRect(0, 0, w, h); const r = rngOf(12); for (let k = 0; k < 1400; k++) { c.fillStyle = `rgba(60,52,44,${r() * 0.07})`; const s = 4 + r() * 30; c.beginPath(); c.ellipse(r() * w, r() * h, s, s * 0.35, r() * 3, 0, 7); c.fill(); } });
  groundT.wrapS = groundT.wrapT = THREE.RepeatWrapping; groundT.repeat.set(10, 10);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(LAND + 70, 72), new THREE.MeshBasicMaterial({ map: groundT })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const court = new THREE.Mesh(new THREE.CircleGeometry(8.5, 48), new THREE.MeshBasicMaterial({ color: "#f3eee4", map: groundT })); court.rotation.x = -Math.PI / 2; court.position.y = 0.02; scene.add(court);
  { const ring = new THREE.Mesh(new THREE.RingGeometry(8.4, 8.7, 64), new THREE.MeshBasicMaterial({ color: "#5a524a", transparent: true, opacity: 0.5 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; scene.add(ring); }
  const mist = []; for (let k = 0; k < (SMALL ? 14 : 22); k++) { const a = k / 22 * Math.PI * 2 + R0() * 0.3, d = LAND + 4 + R0() * 20, s = spr(softT, "#f4efe6", 38 + R0() * 26, 0.85, { fog: false }); s.position.set(Math.cos(a) * d, 2 + R0() * 5, Math.sin(a) * d); s.scale.y *= 0.35; scene.add(s); mist.push({ s, a, d, v: (R0() - 0.5) * 0.01 }); }

  /* ---------- 小溪（東邊，由北往南），只有石拱橋過得去 ---------- */
  const streamX = (z) => 22 + Math.sin(z * 0.08) * 3;
  const waterT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#c9cfcc"; c.fillRect(0, 0, w, h); const r = rngOf(51); for (let k = 0; k < 70; k++) { c.strokeStyle = `rgba(40,50,56,${0.08 + r() * 0.16})`; c.lineWidth = 1 + r() * 1.6; const y = r() * h, x = r() * w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18, y - 3, x + 36, y); c.stroke(); } });
  waterT.wrapS = waterT.wrapT = THREE.RepeatWrapping;
  { const pos = [], uv = [], idx = []; let acc = 0, prev = null; const N = 84;
    for (let i = 0; i <= N; i++) { const z = -70 + i / N * 140, x = streamX(z); if (prev) acc += Math.hypot(x - prev[0], z - prev[1]); prev = [x, z]; pos.push(x - 2.2, 0.04, z, x + 2.2, 0.04, z); uv.push(0, acc / 6, 1, acc / 6); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: waterT, side: THREE.DoubleSide })));
    for (const side of [-1, 1]) { const pts = []; for (let i = 0; i <= N; i++) { const z = -70 + i / N * 140; pts.push(new V3(streamX(z) + side * 2.3, 0.07, z)); }
      const bank = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.09, 4, false), new THREE.MeshBasicMaterial({ color: "#2a2622" })); scene.add(bank); } }

  const obstacles = [];
  let bridgeOn = false;
  const walkable = (x, z) => { if (Math.hypot(x, z) > LAND) return false; const sx = streamX(z); if (Math.abs(x - sx) < 2.5) return bridgeOn && Math.abs(z) < 1.5; if (x > sx && !bridgeOn) return false; return true; };
  const freeOK = (x, z, gap) => obstacles.every((o) => !(o.r > 0) || Math.hypot(o.x - x, o.z - z) > o.r + gap);
  const tog = (o, on) => { if (o.r0 == null) { o.r0 = o.r; o.h0 = o.h; } o.r = on ? o.r0 : 0; o.h = on ? o.h0 : -9; };

  /* ---------- 會用到的形狀：中式的屋頂（四角翹起）、松、石 ---------- */
  function roof(r, h, shade = 0.6) { shade = Math.min(0.58, shade); const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(new THREE.Vector2(0.02 + r * Math.pow(k, 1.6), h * (1 - k) + (k > 0.85 ? (k - 0.85) * h * 1.8 : 0))); }
    const m = mesh(new THREE.LatheGeometry(pts, 4), shade, { side: THREE.DoubleSide }); m.rotation.y = Math.PI / 4; return m; }   /* 屋頂是開口的曲面：不描邊（背面的黑殼從上面看會變成一整塊黑） */
  function pine(s = 1, shade = 0.82) { const g = new THREE.Group(), r = rngOf(seedOf("pine" + s + shade)), pts = []; let x = 0, z = 0; for (let i = 0; i <= 5; i++) { pts.push(new V3(x, i * 1.1 * s, z)); x += (r() - 0.5) * 0.9 * s; z += (r() - 0.5) * 0.6 * s; }
    const trunk = outline(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.22 * s, 6, false), shade), 0.06); g.add(trunk);
    for (let k = 0; k < 4; k++) { const p = pts[2 + Math.min(3, k)], pad = mesh(new THREE.SphereGeometry(1, 14, 8), Math.min(0.95, shade + 0.05)); pad.scale.set((1.8 - k * 0.25) * s, 0.42 * s, (1.3 - k * 0.15) * s); pad.position.set(p.x + (r() - 0.5) * 1.6 * s, p.y + 0.3 * s, p.z + (r() - 0.5) * s); outline(pad, 0.05, true); g.add(pad); }
    return g; }
  /* 石頭、山壁：圓潤的形狀，上淡下濃、帶幾道皴紋（頂點顏色），不打光也看得出體積 */
  function stone(s = 1, shade = 0.6, tall = 1) { const geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position, r = rngOf(seedOf("stone" + s + tall + shade)), ph = [r() * 6, r() * 6, r() * 6], col = [], pc = new THREE.Color(PAPER), ic = new THREE.Color(INK), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + 0.2 * Math.sin(x * 2.1 + ph[0]) * Math.cos(z * 1.7 + ph[1]) + 0.1 * Math.sin(y * 3.3 + ph[2]) + 0.05 * Math.sin((x + z) * 6 + ph[0]);
      x *= n; z *= n; y = y * tall * n; if (y < -0.3 * tall) y = -0.3 * tall + (y + 0.3 * tall) * 0.25; p.setXYZ(i, x, y, z);
      const yn = Math.max(0, Math.min(1, (y / tall + 0.3) / 1.3)), cun = Math.max(0, Math.sin(x * 6 + z * 4 + ph[1] + y * 2)) * 0.18, v = Math.max(0, Math.min(1, shade * (0.3 + 0.75 * (1 - yn)) + cun));
      cc.copy(pc).lerp(ic, v); col.push(cc.r, cc.g, cc.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = outline(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, map: brushT })), 0.035, true); m.scale.setScalar(s); return m; }

  /* ---------- 一開始就在的：廣場的老松、落款石、幾塊石頭 ---------- */
  { const p = pine(1.3, 0.86); p.position.set(-5.5, 0, -4); scene.add(p); obstacles.push({ x: -5.5, z: -4, r: 1.1, h: 8 });
    const p2 = pine(0.9, 0.78); p2.position.set(-30, 0, 20); scene.add(p2);
    for (const [x, z, s] of [[6, -6, 0.9], [-26, -16, 1.4], [12, 24, 1.1], [-14, 26, 0.8]]) { const st = stone(s, 0.55, 1.2); st.position.set(x, s * 0.34, z); scene.add(st); obstacles.push({ x, z, r: s * 1.1, h: s * 2 }); } }
  const sealStone = stone(1.1, 0.5, 1.5); sealStone.position.set(5.5, 0.48, 4.5); scene.add(sealStone); obstacles.push({ x: 5.5, z: 4.5, r: 1.3, h: 3 });

  /* ---------- 修補：空白的匾額（北邊的牌坊）、褪色的石拱橋（東邊）、斷流的瀑布（西邊） ---------- */
  const pickables = [], fixSites = {}, proxy = (r, kind, ref, parent, y = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = y; m.userData = { kind, ref }; parent.add(m); pickables.push(m); return m; };
  const FIXPOS = { plaque: [0, -19], bridge: [streamX(0) - 4.2, 0], fall: [-24, -3] };
  const TX_FIX = canvasTex(128, 128, (c) => { c.font = "bold 84px 'Noto Serif TC','Microsoft JhengHei',serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = CINNABAR; c.fillRect(22, 22, 84, 84); c.fillStyle = "#f4ede0"; c.fillText("修", 64, 68); });
  const fixInfo = {
    plaque: { name: ["空白的匾額", "The blank plaque"], short: ["匾額", "The plaque"], desc: ["牌坊上的匾額被雨洗白了，原本的兩個字一點都看不出來。", "The rain has washed the plaque on the gate blank; not a trace of its two characters remains."],
      fixed: ["墨一筆一筆回到匾上，寫的是「留白」。", "Stroke by stroke the ink returns to the plaque. It reads: Liubai — leave the blank."], thanks: ["好字。這城總算有名字了。", "Fine brushwork. The city has its name back."], who: ["硯翁・畫師", "Old Inkstone, the painter"] },
    bridge: { name: ["褪色的石拱橋", "The faded stone bridge"], short: ["石拱橋", "The stone bridge"], desc: ["石拱橋的墨淡掉了，中間幾塊石頭只剩下一點影子，走上去會掉進紙裡。", "The ink of the stone bridge has faded; its middle stones are mere shadows. Step on them and you'd fall into the paper."],
      fixed: ["石頭一塊塊描回來，橋又拱起來了。", "Stone by stone the bridge is inked back, and it arches over the stream again."], thanks: ["過橋去看看吧，那邊的留白最多。", "Cross and have a look — the far bank has the most blank space."], who: ["紙伯・畫裡的人", "Uncle Paper, of the painting"] },
    fall: { name: ["斷流的瀑布", "The stopped waterfall"], short: ["瀑布", "The waterfall"], desc: ["山壁上的瀑布斷了，潭底乾成一片灰白。", "The waterfall on the cliff has stopped; the pool below has dried to a pale grey."],
      fixed: ["水又從山頂落下來，潭裡起了霧。", "Water falls from the cliff top again, and mist rises from the pool."], thanks: ["聽，整座城都有聲音了。", "Listen — the whole city has a voice again."], who: ["墨娘・畫裡的人", "Ink Maid, of the painting"] },
    _all: ["三個地方都修好了。畫師說，這幅畫總算可以落款。", "All three are repaired. The painter says the picture can finally be signed."] };
  const mkSite = (id, g, py) => { const [x, z] = FIXPOS[id]; g.position.set(x, 0, z); scene.add(g); proxy(3.2, "fix", id, g, py);
    const mk = spr(TX_FIX, "#ffffff", 1.8, 1, { depthTest: false }); mk.renderOrder = 12; g.add(mk);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 48), new THREE.MeshBasicMaterial({ color: CINNABAR, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    return (fixSites[id] = { id, g, x, z, mk, ring, my: py + 3.6, k: 0, kt: 0, done: false }); };
  { /* 牌坊：兩根柱、兩層翹角屋頂、中間一塊匾；修好時「留白」兩個字一筆一筆寫上去 */
    const g = new THREE.Group(), S = mkSite("plaque", g, 2), gate = new THREE.Group(); gate.position.z = -3; g.add(gate);
    for (const sx of [-3, 3]) { const col = outline(mesh(new THREE.CylinderGeometry(0.3, 0.34, 6, 10), 0.8), 0.06); col.position.set(sx, 3, 0); gate.add(col); obstacles.push({ x: S.x + sx, z: S.z - 3, r: 0.6, h: 6 }); }
    const beam = outline(mesh(new THREE.BoxGeometry(7.4, 0.4, 0.5), 0.82), 0.04); beam.position.y = 5.6; gate.add(beam);
    const rf = roof(5.2, 1.4, 0.88); rf.scale.set(1, 1, 0.35); rf.position.y = 6.2; gate.add(rf);
    const plCv = document.createElement("canvas"); plCv.width = 512; plCv.height = 192; const plT = new THREE.CanvasTexture(plCv); plT.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshBasicMaterial({ map: plT })); plaque.position.set(0, 4.6, 0.28); gate.add(plaque);
    const frame = outline(mesh(new THREE.BoxGeometry(3.8, 1.55, 0.18), 0.85), 0.03); frame.position.set(0, 4.6, 0.16); gate.add(frame);
    let drawnK = -1; const drawPlaque = (k) => { const c = plCv.getContext("2d"), w = 512, h = 192; c.fillStyle = "#efe6d2"; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(60,50,40,.08)"; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % w, (i * 53) % h, 30, 2);
      if (k > 0) { const kk = Math.min(1, k * 1.05); calli(c, "留", 286, 22, 150, Math.min(1, kk * 2), 11); if (kk > 0.5) calli(c, "白", 74, 24, 146, (kk - 0.5) * 2, 23); }   /* 匾額由右往左讀：先寫「留」 */
      if (k >= 1) { c.fillStyle = CINNABAR; c.fillRect(w - 60, h - 64, 40, 40); } plT.needsUpdate = true; };
    drawPlaque(0); S.draw = (k, done) => { const q = done ? 1 : Math.round(S.k * 20) / 20; if (q !== drawnK) { drawnK = q; drawPlaque(q); } }; }
  let bridgeArch = null;
  { /* 石拱橋：十一塊拱石，中間五塊淡掉、掉在溪裡；修好時一塊塊描回去 */
    const g = new THREE.Group(), S = mkSite("bridge", g, 1.5), bg = new THREE.Group(), sx0 = streamX(0); bg.position.set(sx0 - S.x, 0, -S.z); g.add(bg); bridgeArch = bg;
    const N = 11, stones = []; for (let i = 0; i < N; i++) { const k = i / (N - 1), a = Math.PI * (1 - k), x = Math.cos(a) * 4, y = Math.sin(a) * 1.6, broken = i >= 3 && i <= 7;
      const m = outline(mesh(new THREE.BoxGeometry(0.85, 0.32, 2.6), 0.62, { transparent: true }), 0.05); m.material = m.material.clone(); m.position.set(x, y, 0); m.rotation.z = Math.atan2(Math.cos(a) * 1.6, -Math.sin(a) * 4);   /* 沿著拱的切線 */ bg.add(m);
      stones.push({ m, broken, home: m.position.clone(), rz: m.rotation.z, fall: new V3(x * 0.4, -0.6, (i - 5) * 0.4), cur: null }); }
    S.draw = (k, done) => { let bi = 0; for (const s of stones) { if (!s.broken) continue; const want = done ? 1 : Math.min(1, Math.max(0, S.k * 5 - bi)); bi++; s.cur = s.cur == null ? want : s.cur + (want - s.cur) * (S.snap ? 1 : 0.05); const q = ease(s.cur);
        s.m.position.lerpVectors(s.fall, s.home, q); s.m.rotation.z = s.rz * q + (1 - q) * 0.6; s.m.material.opacity = 0.15 + q * 0.85; s.m.children.forEach((o) => { o.visible = q > 0.9; }); } bridgeOn = done; }; }
  let fallRibbon = null, pool = null, fallMist = [];
  { /* 瀑布：一面山壁、一條白練、下面一個潭；修好時水流下來、起霧 */
    const g = new THREE.Group(), S = mkSite("fall", g, 1.5);
    const cliff = stone(5, 0.72, 2.4); cliff.position.set(-8, 3.5, -2); g.add(cliff); obstacles.push({ x: S.x - 8, z: S.z - 2, r: 5.5, h: 18 });
    const fT = canvasTex(64, 256, (c, w, h) => { c.fillStyle = "rgba(250,248,242,.9)"; c.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(120,128,130,${0.1 + Math.random() * 0.25})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 20 + Math.random() * 60); } }); fT.wrapT = THREE.RepeatWrapping;
    fallRibbon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 12), new THREE.MeshBasicMaterial({ map: fT, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); fallRibbon.position.set(-2.1, 6, -1.5); fallRibbon.rotation.y = Math.PI / 2; g.add(fallRibbon);
    pool = new THREE.Mesh(new THREE.CircleGeometry(2.8, 40), new THREE.MeshBasicMaterial({ color: "#d8d2c6", transparent: true, opacity: 0.9 })); pool.rotation.x = -Math.PI / 2; pool.position.set(0.4, 0.05, -1.5); g.add(pool); obstacles.push({ x: S.x + 0.4, z: S.z - 1.5, r: 2.6, h: 0.6 });
    for (let k = 0; k < 4; k++) { const m = spr(softT, "#ffffff", 5, 0); m.position.set(-1.6 + k * 0.7, 0.8 + k * 0.6, -1.5); g.add(m); fallMist.push(m); }
    S.draw = (k, done, t) => { fallRibbon.material.opacity = done ? 0.9 : S.k * 0.25; pool.material.color.set(done ? "#b8c4c6" : "#d8d2c6"); if (done) fT.offset.y = -(t * 0.6) % 1; fallMist.forEach((m, i) => { m.material.opacity = done ? 0.35 + Math.sin(t + i) * 0.1 : 0; }); audio.water(done ? 1 : WX === "rain" ? 0.6 : 0); }; }

  /* ---------- 添的每一筆：十二種畫法（濃淡 d：1 淡、2 中、3 濃） ---------- */
  const SLOTS = [[-12, -10], [12, -11], [-15, 8], [-7, 17], [8, 16], [14, 4], [-20, -24], [16, -26], [-30, 8], [30, -12], [31, 12], [0, 30]];
  const strokes = [];   /* { i, id, g, mats:[], rev, x, z } */
  const tagged = (g) => { const mats = []; g.traverse((o) => { if (o.material && !o.userData.outline) { o.material = o.material.clone(); o.material.transparent = true; mats.push([o.material, o.material.opacity]); } else if (o.userData.outline) { o.material = o.material.clone(); o.material.transparent = true; mats.push([o.material, o.material.opacity]); } }); return mats; };
  function paint(id, x, z) { const { k, d } = strokeOf(id), sh = 0.45 + d * 0.15, g = new THREE.Group(), r = rngOf(seedOf(id + x + z)), obs = [];
    const put = (o, px, py, pz, ob) => { o.position.set(px, py, pz); g.add(o); if (ob) obs.push({ dx: px, dz: pz, r: ob[0], h: ob[1] }); return o; };
    if (k === "plum") { for (let b = 0; b < 3; b++) { const pts = []; let px = (b - 1) * 1.2, py = 0, pz = 0; for (let i = 0; i < 6; i++) { pts.push(new V3(px, py, pz)); px += (r() - 0.5) * 1.2; py += 0.6 + r() * 0.5; pz += (r() - 0.5) * 0.8; }
        put(outline(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.12 - b * 0.02, 5, false), sh + 0.1), 0.05), 0, 0, 0);
        const blo = []; for (let i = 0; i < 26; i++) { const p = pts[2 + Math.floor(r() * 4)]; blo.push(p.x + (r() - 0.5) * 1.4, p.y + (r() - 0.5) * 0.9, p.z + (r() - 0.5) * 1.2); }
        const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(blo, 3)); put(new THREE.Points(bg, new THREE.PointsMaterial({ map: softT, color: b % 2 ? "#f6eee8" : CINNABAR, size: 0.55, transparent: true, depthWrite: false })), 0, 0, 0); } obs.push({ dx: 0, dz: 0, r: 1.4, h: 4 }); }
    else if (k === "cot") { const body = outline(mesh(new THREE.BoxGeometry(3, 2, 2.4), 0.12), 0.03); put(body, 0, 1, 0, [2, 3]); const rf = roof(2.6, 1.3, sh + 0.1); rf.scale.set(1.2, 1, 0.95); put(rf, 0, 2, 0);
      g.userData.smoke = []; for (let i = 0; i < 6; i++) { const s = spr(softT, "#8a8480", 1.6, 0.4); put(s, 0.8, 3.5 + i, 0); g.userData.smoke.push({ s, ph: i / 6 }); } }
    else if (k === "boat") { const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), new THREE.MeshBasicMaterial({ map: waterT, color: "#ffffff" })); pond.rotation.x = -Math.PI / 2; put(pond, 0, 0.04, 0, [3.4, 0.4]);
      const hull = outline(mesh(new THREE.CylinderGeometry(0.6, 0.25, 0.4, 10, 1, false, 0, Math.PI), sh), 0.06); hull.rotation.set(Math.PI / 2, 0, Math.PI / 2); hull.scale.set(1, 3, 1); const bt = new THREE.Group(); bt.add(hull); const man = outline(mesh(new THREE.ConeGeometry(0.4, 0.9, 10), sh + 0.1), 0.06); man.position.set(0.4, 0.55, 0); bt.add(man); put(bt, 0, 0.25, 0); g.userData.boat = bt; }
    else if (k === "crane") { const cT = craneT; g.userData.cranes = []; for (let i = 0; i < 3 + d; i++) { const s = spr(cT, "#ffffff", 1.3, 0.85); put(s, 0, 12, 0); g.userData.cranes.push({ s, a: r() * 6, rr: 5 + r() * 8, h: 11 + r() * 7, v: 0.2 + r() * 0.15 }); } const st = stone(0.6, sh - 0.1, 0.8); put(st, 0, 0.4, 0, [0.8, 1]); }
    else if (k === "pav") { const base = outline(mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.4, 6), 0.2), 0.03); put(base, 0, 0.2, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, col = outline(mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 6), sh + 0.15), 0.08); put(col, Math.cos(a) * 1.8, 1.7, Math.sin(a) * 1.8, [0.3, 3]); }
      const rf = roof(3.2, 1.8, sh + 0.15); put(rf, 0, 3, 0); const tip = outline(mesh(new THREE.SphereGeometry(0.18, 8, 6), sh + 0.2), 0.08); put(tip, 0, 4.85, 0); }
    else if (k === "court") { const sh2 = new THREE.Shape(); sh2.moveTo(-4, 0); sh2.lineTo(4, 0); sh2.lineTo(4, 3.4); sh2.lineTo(-4, 3.4); sh2.closePath(); const hole = new THREE.Path(); hole.absarc(0, 1.7, 1.35, 0, Math.PI * 2, true); sh2.holes.push(hole);
      const wall = outline(mesh(new THREE.ExtrudeGeometry(sh2, { depth: 0.4, bevelEnabled: false, curveSegments: 24 }), 0.1), 0.02); put(wall, 0, 0, -0.2); obs.push({ dx: -2.9, dz: 0, r: 1.1, h: 3.5 }, { dx: 2.9, dz: 0, r: 1.1, h: 3.5 });
      const cap = outline(mesh(new THREE.BoxGeometry(8.4, 0.3, 0.8), sh + 0.15), 0.04); put(cap, 0, 3.55, 0); const tr = pine(0.6, sh); put(tr, 1.5, 0, -3); }
    else if (k === "rock") { const st = stone(1.4, sh, 2.2); put(st, 0, 0.9, 0, [1.6, 4]); const fT2 = canvasTex(32, 128, (c, w, h) => { c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(0, 0, w, h); }); const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.4), new THREE.MeshBasicMaterial({ map: fT2, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); put(rib, 1.2, 1.7, 0.6); }
    else if (k === "hill") { const h = stone(9, sh - 0.2, 1.3); const dir = Math.atan2(z, x); put(h, Math.cos(dir) * 26, 2, Math.sin(dir) * 26); h.scale.z *= 0.6; }   /* 遠一點、淡一點的一道山 */
    else if (k === "bamboo") { const n = 10 + d * 4, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 1, 6), inkM(sh + 0.05), n); g.userData.bamboo = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 2.4, hh = 5 + r() * 4; dummy.position.set(Math.cos(a) * rr, hh / 2, Math.sin(a) * rr); dummy.rotation.set((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1); dummy.scale.set(1, hh, 1); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix); }
      put(poles, 0, 0, 0, [2.4, 6]); const lv = []; for (let i = 0; i < 60 + d * 20; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 3; lv.push(Math.cos(a) * rr, 3.5 + r() * 5, Math.sin(a) * rr); } const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lv, 3)); put(new THREE.Points(lg, new THREE.PointsMaterial({ map: leafT, color: inkCol(sh + 0.1), size: 1.1, transparent: true, depthWrite: false })), 0, 0, 0); }
    else if (k === "pagoda") { for (let i = 0; i < 5; i++) { const s = 1 - i * 0.14, body = outline(mesh(new THREE.CylinderGeometry(1.1 * s, 1.2 * s, 1.5, 8), 0.12), 0.03); put(body, 0, 0.75 + i * 2.1, 0); const rf = roof(2.2 * s, 0.8, sh + 0.15); put(rf, 0, 1.55 + i * 2.1, 0); }
      const sp = outline(mesh(new THREE.CylinderGeometry(0.04, 0.08, 2, 6), sh + 0.2), 0.1); put(sp, 0, 12.2, 0); obs.push({ dx: 0, dz: 0, r: 1.5, h: 12 }); }
    else if (k === "kite") { g.userData.kites = []; for (let i = 0; i < 2 + d; i++) { const s = spr(kiteT, "#ffffff", 1.8, 0.95); put(s, 0, 12, 0); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), new THREE.LineBasicMaterial({ color: "#5a524a", transparent: true, opacity: 0.6 })); g.add(ln); g.userData.kites.push({ s, ln, a: r() * 6, rr: 2 + r() * 5, h: 10 + r() * 6 }); }
      const post = outline(mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6), sh), 0.1); put(post, 0, 0.7, 0, [0.4, 1.4]); }
    else { /* 燈：兩根竹竿之間一條垂下來的繩，掛一排紅燈籠 */
      for (const sx of [-3.2, 3.2]) { const post = outline(mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), sh), 0.1); put(post, sx, 1.7, 0, [0.35, 3.4]); }
      const rope = new THREE.CatmullRomCurve3([new V3(-3.2, 3.3, 0), new V3(-1.2, 2.75, 0), new V3(1.2, 2.75, 0), new V3(3.2, 3.3, 0)]); put(new THREE.Mesh(new THREE.TubeGeometry(rope, 24, 0.025, 4, false), inkM(0.85)), 0, 0, 0);
      const n = 3 + d * 2; for (let i = 0; i < n; i++) { const p = rope.getPoint((i + 0.5) / n), lan = outline(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshBasicMaterial({ color: CINNABAR, map: brushT })), 0.08); lan.scale.y = 1.25;
        put(lan, p.x, p.y - 0.42, p.z); const cap = mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 10), 0.9); put(cap, p.x, p.y - 0.1, p.z); const gl = spr(softT, "#ffb08a", 1.2, 0.35); put(gl, p.x, p.y - 0.42, p.z); } }
    g.position.set(x, 0, z); g.rotation.y = r() * Math.PI * 2; scene.add(g);
    const ca = Math.cos(g.rotation.y), sa = Math.sin(g.rotation.y), wobs = obs.map((o) => { const ob = { x: x + o.dx * ca + o.dz * sa, z: z - o.dx * sa + o.dz * ca, r: o.r, h: o.h }; obstacles.push(ob); return ob; });
    return { g, wobs }; }
  const craneT = canvasTex(128, 64, (c) => { c.strokeStyle = INK; c.fillStyle = INK; c.lineCap = "round"; c.lineWidth = 5; c.beginPath(); c.moveTo(10, 34); c.quadraticCurveTo(40, 8, 64, 30); c.quadraticCurveTo(88, 8, 118, 34); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(64, 30); c.lineTo(64, 44); c.stroke(); c.fillStyle = CINNABAR; c.beginPath(); c.arc(64, 28, 3, 0, 7); c.fill(); });
  const kiteT = canvasTex(64, 96, (c) => { c.fillStyle = "#f4ede2"; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 4); c.lineTo(58, 34); c.lineTo(32, 64); c.lineTo(6, 34); c.closePath(); c.fill(); c.stroke(); c.fillStyle = CINNABAR; c.beginPath(); c.arc(32, 34, 7, 0, 7); c.fill(); c.beginPath(); c.moveTo(32, 64); c.quadraticCurveTo(22, 78, 34, 92); c.stroke(); });
  const leafT = canvasTex(64, 64, (c) => { c.fillStyle = INK; c.translate(32, 32); for (let k = 0; k < 3; k++) { c.rotate(0.9); c.beginPath(); c.ellipse(10, 0, 14, 3.2, 0, 0, 7); c.fill(); } });
  function addStroke(i, id, reveal) { if (i >= SLOTS.length) return null; const [x, z] = SLOTS[i]; if (!walkable(x, z) && !(x > 0 && Math.abs(x - streamX(z)) > 2.5)) return null; const { g, wobs } = paint(id, x, z); tintBy(g, strokeOf(id).c); const mats = reveal ? tagged(g) : null;
    if (mats) { mats.forEach(([m]) => { m.opacity = 0; }); wobs.forEach((o) => tog(o, false)); }
    const st = { i, id, g, mats, wobs, rev: reveal ? { t: 0 } : null, x, z }; strokes.push(st); if (reveal) { const b = spr(blotT, "#ffffff", 1, 0.9); b.position.set(x, 0.3, z); b.material.depthTest = false; scene.add(b); st.blot = b; } return st; }

  /* ---------- 畫裡的人 ---------- */
  const folks = [];
  /* 熊：城民跟玩家太像——改成畫裡的人：沒有腿的長袍、寬袖、紙白的臉，戴斗笠、方巾或挽髻；全身是墨的濃淡 */
  function inkFolk(hat = "straw", shade = 0.5, r = rnd) { const g = new THREE.Group(), robe = outline(mesh(new THREE.CylinderGeometry(0.2, 0.44, 1.2, 14, 1, true), shade, { side: THREE.DoubleSide }), 0.04); robe.position.y = 0.6; g.add(robe);
    const body = outline(mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.5, 12), Math.max(0.15, shade - 0.12)), 0.05); body.position.y = 1.42; g.add(body);
    for (const sd of [-1, 1]) { const sl = outline(mesh(new THREE.CylinderGeometry(0.07, 0.17, 0.62, 10), shade + 0.08), 0.05); sl.position.set(sd * 0.26, 1.22, 0.02); sl.rotation.z = sd * 0.22; g.add(sl); }
    const sash = mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 12), 0.9); sash.position.y = 1.2; g.add(sash);
    const head = outline(mesh(new THREE.SphereGeometry(0.15, 14, 10), 0.05), 0.06); head.position.y = 1.83; g.add(head);
    if (hat === "straw") { const h = outline(mesh(new THREE.ConeGeometry(0.46, 0.26, 18), 0.55 + r() * 0.1), 0.03); h.position.y = 2.02; g.add(h); }
    else if (hat === "cap") { const h = outline(mesh(new THREE.BoxGeometry(0.26, 0.16, 0.26), 0.92), 0.05); h.position.y = 2.0; g.add(h); const t = mesh(new THREE.BoxGeometry(0.04, 0.2, 0.3), 0.92); t.position.set(0, 1.92, -0.17); g.add(t); }
    else if (hat === "bun") { const h = mesh(new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.7), 0.95); h.position.y = 1.85; g.add(h); const b = outline(mesh(new THREE.SphereGeometry(0.085, 10, 8), 0.95), 0.05); b.position.set(0, 2.02, -0.05); g.add(b); }
    else { const h = mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.6), shade + 0.05, { side: THREE.DoubleSide }); h.position.y = 1.85; g.add(h); }
    return g; }
  { const desk = outline(mesh(new THREE.BoxGeometry(1.8, 0.7, 0.9), 0.75), 0.04); desk.position.set(2.6, 0.35, -2.4); scene.add(desk); obstacles.push({ x: 2.6, z: -2.4, r: 1.1, h: 1 });
    const inkstone = mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.1, 16), 0.95); inkstone.position.set(2.3, 0.75, -2.4); scene.add(inkstone); }
  const FOLKPOS = [[2.6, -3.6], [-9, 4], [10, 9], [-6, -14], [-18, 16]];
  for (let i = 0; i < NAMES.length; i++) { const [x, z] = FOLKPOS[i];
    const p = inkFolk(["straw", "bun", "cap", "straw", "hood"][i % 5], [0.62, 0.3, 0.75, 0.45, 0.35][i % 5]); p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -z); scene.add(p);
    proxy(1.2, "folk", folks.length, p, 1.0); obstacles.push({ x, z, r: 0.6, h: 2 }); folks.push({ p, i, x, z, ph: rnd() * 6, tap: -99, face: 0 }); }
  function talk(f, now) { if (now - f.tap < 2) return; f.tap = now; f.face = 2.5; audio.voice(f.i); const line = LINES[(seedOf(DAY + f.i) + Math.floor(now / 9)) % LINES.length]; say(L(line[0], line[1]), L(`${NAMES[f.i][0]}・畫裡的人`, `${NAMES[f.i][1]}, of the painting`), 6500); }

  /* ---------- 會長大：已經添的筆、月亮（晚上來過幾次）、落款石上的朱印（來過幾天） ---------- */
  const G0 = FS && FS.growState ? FS.growState(CITY) : { slots: [], lv: {}, night: 0, visits: 0, steps: 0 };
  (G0.slots || []).forEach((id, i) => { if (STROKE[strokeOf(id).k]) addStroke(i, id, false); });
  const moonT = (n) => canvasTex(256, 256, (c) => { const f = Math.min(1, (n || 0) / 12); c.fillStyle = "#f8f4ea"; c.beginPath(); c.arc(128, 128, 100, 0, 7); c.fill(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(128 + 200 * f + 18, 128, 100, 0, 7); c.fill(); c.globalCompositeOperation = "source-over"; c.strokeStyle = "rgba(40,36,32,.6)"; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 100, 0, 7); c.stroke(); });
  const moon = spr(moonT(G0.night), "#ffffff", 40, 0.9, { fog: false }); moon.position.set(300, 170, -520); scene.add(moon);
  let sealMesh = null; const placeSeals = (n) => { if (sealMesh) { sealStone.remove(sealMesh); sealMesh = null; } const N = Math.min(24, n || 0); if (!N) return; sealMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.04), new THREE.MeshBasicMaterial({ color: CINNABAR }), N);
    for (let i = 0; i < N; i++) { const a = -0.6 + (i % 6) * 0.24, y = 0.9 - Math.floor(i / 6) * 0.3; dummy.position.set(Math.sin(a) * 0.98, y, Math.cos(a) * 0.98); dummy.rotation.set(0, a, (i % 3 - 1) * 0.1); dummy.scale.setScalar(1); dummy.updateMatrix(); sealMesh.setMatrixAt(i, dummy.matrix); } sealStone.add(sealMesh); };
  placeSeals(G0.visits);

  /* ---------- 每天五件小事：點石燈、追墨蝶 ---------- */
  const got = new Set(ST0.got || []);
  const kinds = ["lamp", "moth", "lamp", ["lamp", "moth"][Math.floor(rnd() * 2)], "moth"]; for (let k = kinds.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [kinds[k], kinds[j]] = [kinds[j], kinds[k]]; }
  const used = [[0, 0, 9], ...SLOTS.map(([x, z]) => [x, z, 5])];
  const freeSpot = () => { for (let tries = 0; tries < 200; tries++) { const a = rnd() * Math.PI * 2, d = 9 + Math.sqrt(rnd()) * 16, x = Math.cos(a) * d, z = Math.sin(a) * d; if (walkable(x, z) && freeOK(x, z, 2) && used.every(([sx, sz, gp]) => Math.hypot(sx - x, sz - z) > (gp || 5))) { used.push([x, z]); return [x, z]; } } return [rnd() * 6 - 3, 10]; };
  const mothT = canvasTex(64, 64, (c) => { c.fillStyle = INK; c.beginPath(); c.ellipse(20, 26, 16, 10, -0.5, 0, 7); c.ellipse(44, 26, 16, 10, 0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(24, 42, 9, 6, -0.3, 0, 7); c.ellipse(40, 42, 9, 6, 0.3, 0, 7); c.fill(); });
  const evs = kinds.map((kind, i) => { const e = { i, kind, state: got.has(i) ? "done" : "wait", t: 0, g: new THREE.Group() };
    if (kind === "lamp") { const [x, z] = freeSpot(); Object.assign(e, { x, z }); const base = outline(mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.2, 8), 0.55), 0.06); base.position.y = 0.6; e.g.add(base);
      const hood = roof(0.75, 0.5, 0.8); hood.position.y = 1.75; e.g.add(hood); const box = mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), 0.2); box.position.y = 1.45; e.g.add(box); e.box = box;
      const gl = spr(softT, "#ffb07a", 2, 0); gl.position.y = 1.45; e.g.add(gl); e.gl = gl; e.g.position.set(x, 0, z); proxy(1.5, "ev", i, e.g, 1.2); obstacles.push(e.obs = { x, z, r: 0.7, h: 2 }); }
    else { const r = 9 + rnd() * 10, a0 = rnd() * Math.PI * 2; Object.assign(e, { r, a0, w: (rnd() < 0.5 ? -1 : 1) * (0.14 + rnd() * 0.08), x: Math.cos(a0) * r, z: Math.sin(a0) * r, ph: rnd() * 6 });
      const m = spr(mothT, "#ffffff", 1.1, 0.95); e.g.add(m); e.m = m; proxy(1.6, "ev", i, e.g, 0); }
    if (e.state === "done" && kind === "lamp") { e.gl.material.opacity = 0.6; e.box.material = new THREE.MeshBasicMaterial({ color: "#ffd8a8" }); } else e.g.visible = e.state !== "done";
    scene.add(e.g); return e; });
  const showCount = () => { const n = evs.filter((e) => e.state !== "wait").length, el = $("#echo"); el.textContent = L(`小事 ${n} / 5`, `Tasks ${n} / 5`);   /* 熊：「墨2/5是什麼意思」——跟畫筆的墨分開 */ el.classList.toggle("full", n >= 5); };
  showCount();
  function finish(e) { if (e.state !== "wait") return;
    if (!QS.get("day") && todayStr() !== DAY) { toast(L("過了午夜，畫換了一頁。重新整理……", "Midnight has passed — the painting turns a page. Reloading…")); setTimeout(() => location.reload(), 1600); return; }
    e.state = "go"; e.t = 0; audio.task();
    const r = FS && FS.starDone ? FS.starDone(CITY, e.i) : null, cnt = evs.filter((x) => x.state !== "wait").length; showCount(); try { bar(); } catch (er) { }
    const what = e.kind === "lamp" ? L("石燈亮了", "The stone lantern is lit") : L("墨蝶停在你的指尖", "The ink butterfly rests on your fingertip");
    if (r) { toast(L(`${what}（${r.count}/5）　+1 B・松煙墨 +${r.mat || 1}`, `${what} (${r.count}/5)  +1 B · pine-soot ink +${r.mat || 1}`), 4200); fixes.refresh();
      if (r.bonus) setTimeout(() => { const b = r.bonus; say(L("五件事都做完了。整幅畫的墨色，像是深了一點。", "All five are done. The ink of the whole painting seems a shade deeper."), b.type === "ore" ? L("回響：一顆原石", "Echo: a raw gem") : b.type === "dew" ? L(`回響：元液 +${b.n}`, `Echo: essence +${b.n}`) : L(`回響：+${b.n} B`, `Echo: +${b.n} B`), 7500); audio.fix(); }, 2600); }
    else toast(L(`${what}（${cnt}/5）`, `${what} (${cnt}/5)`)); }

  /* ---------- 修補面板＋海報＋故事 ---------- */
  let fixes = { refresh() { } }, fixGo = null;
  fixes = createRepair({ city: CITY, L, toast, say, FS, info: fixInfo, sound: (n) => { if (n === 1) audio.task(); else { audio.fix(); if (n === 2) setTimeout(() => audio.hum(), 900); } },
    onUpdate: (id, k, done, just) => { const S = fixSites[id]; S.kt = k; S.done = done; S.mk.visible = !done; unstick(); if (just) setTimeout(() => makePoster(id), 3600); if (just && Object.values(fixSites).every((x) => x.done)) setTimeout(() => tellStory(), 19000); } });
  function tellStory(force) { if (!force && !(FS && FS.growStory && FS.growStory(CITY))) return; audio.fix();
    storyCard({ L, chapter: L("第六章", "Chapter 6"), title: L("留白", "The blank space"),
      paras: [L("匾額上的字寫好了。老畫師退後一步，看了很久：「這城，本來就沒畫完。」", "The characters on the plaque are finished. The old painter steps back and looks for a long while. \"This city was never finished.\""),
        L("「畫它的人說，留白的地方是給後來的人的。每一個好好過完一天的人，都會在這裡添一筆。」", "\"Whoever painted it said the blank spaces were for those who came after. Everyone who gets through a day well adds one stroke here.\""),
        L("你回頭看。那片竹、那座亭、那艘小舟——你想起自己是在哪些日子把它們添上的。", "You look back — the bamboo, the pavilion, the little boat — and you remember which days you added them."),
        L("老畫師捲起一幅舊畫遞給你。畫的最邊上，有一座城只勾了輪廓，旁邊寫著一行小字：「光要回去的地方」。", "He rolls up an old scroll and hands it to you. At its very edge is a city drawn only in outline, and beside it a line of small writing: \"Where the light goes home.\"")],
      sign: L("— 硯翁・留白城的畫師", "— Old Inkstone, painter of Liubai"), next: L("畫軸的下一段，還沒有展開。（下一座城，還在路上）", "The next length of the scroll is still rolled up. (The next city is on its way.)"), keep: L("收好這一章", "Keep this chapter"),
      onClose: () => { storyBtn(); toast(L("想再讀一次，點右上角的「卷」", "Tap 卷 at the top right to read it again")); } }); }
  let sBtn = null; function storyBtn() { if (sBtn) return; const b = document.createElement("button"); b.className = "btn snd seal"; b.type = "button"; b.textContent = "卷"; b.title = L("第六章", "Chapter 6"); b.onclick = (e) => { e.stopPropagation(); tellStory(true); }; $(".hud").insertBefore(b, $("#snd")); sBtn = b; }
  function unstick() { for (let it = 0; it < 4; it++) for (const o of obstacles) { if (!(o.r > 0)) continue; const ox = P.x - o.x, oz = P.z - o.z, od = Math.hypot(ox, oz) || 0.001; if (od < o.r) { P.x = o.x + ox / od * (o.r + 0.05); P.z = o.z + oz / od * (o.r + 0.05); } } }
  const fixNear = (S) => Math.hypot(P.x - S.x, P.z - S.z);
  function fixTap(id) { const S = fixSites[id]; if (fixNear(S) < 6.5) { fixes.open(id); return; } fixGo = id; P.stuck = 0;
    const cand = [[-4.4, 0], [4.4, 0], [0, -4.4], [0, 4.4], [-3, 3], [3, 3], [0, 3]].map(([dx, dz]) => [S.x + dx, S.z + dz]).filter(([x, z]) => walkable(x, z) && freeOK(x, z, 0.4)).sort((p, q) => Math.hypot(p[0] - P.x, p[1] - P.z) - Math.hypot(q[0] - P.x, q[1] - P.z));
    if (!cand.length) { fixGo = null; return; } [P.tx, P.tz] = cand[0]; markAt(P.tx, P.tz); }
  const _mw = new V3();
  function fixFrame(t, dt) { for (const S of Object.values(fixSites)) { if (S.snap) S.k = S.kt; S.k += (S.kt - S.k) * 0.04; S.draw(S.k, S.done, t, dt); S.snap = false; S.ring.visible = S.mk.visible;
      if (S.mk.visible) { S.mk.position.y = S.my + Math.sin(t * 2 + S.x) * 0.2; S.mk.getWorldPosition(_mw); S.mk.material.opacity = Math.min(1, Math.max(0, (_mw.distanceTo(camera.position) - 5) / 4)); S.ring.material.opacity = 0.3 + Math.sin(t * 2.2 + S.x) * 0.12; } }
    if (fixGo) { const S = fixSites[fixGo]; if (fixNear(S) < 5.4) { fixes.open(fixGo); fixGo = null; } }
    else if (fixes.isOpen && Object.values(fixSites).every((S) => fixNear(S) > 9)) fixes.close(); }
  const POSTER_CAM = { plaque: [[0, 4.2, -9], [0, 4.4, -22]], bridge: [[16, 3.5, 9], [22, 1, 0]], fall: [[-14, 5, 6], [-30, 6, -5]] };
  function makePoster(id) { try {
      const [cp, lk] = POSTER_CAM[id], oldP = camera.position.clone(), oldQ = camera.quaternion.clone(), oldA = camera.aspect, oldF = camera.fov;
      const W = 360, H = 480, rt = new THREE.WebGLRenderTarget(W * 2, H * 2, { colorSpace: THREE.SRGBColorSpace }); camera.position.set(...cp); camera.lookAt(...lk); camera.aspect = W / H; camera.fov = 52; camera.updateProjectionMatrix();
      const nm = nameTag.visible; nameTag.visible = false; renderer.setRenderTarget(rt); renderer.render(scene, camera); const px = new Uint8Array(W * 2 * H * 2 * 4); renderer.readRenderTargetPixels(rt, 0, 0, W * 2, H * 2, px); renderer.setRenderTarget(null); rt.dispose(); nameTag.visible = nm;
      camera.position.copy(oldP); camera.quaternion.copy(oldQ); camera.aspect = oldA; camera.fov = oldF; camera.updateProjectionMatrix();
      const src = document.createElement("canvas"); src.width = W * 2; src.height = H * 2; const sc = src.getContext("2d"), id2 = sc.createImageData(W * 2, H * 2); for (let y = 0; y < H * 2; y++) id2.data.set(px.subarray((H * 2 - 1 - y) * W * 8, (H * 2 - y) * W * 8), y * W * 8); sc.putImageData(id2, 0, 0);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"); c.fillStyle = "#efe7d6"; c.fillRect(0, 0, W, H); c.drawImage(src, 0, 0, W * 2, H * 2 * 0.8, 16, 16, W - 32, (H - 32) * 0.8);
      c.strokeStyle = "rgba(30,26,24,.6)"; c.lineWidth = 1.2; c.strokeRect(16, 16, W - 32, (H - 32) * 0.8); c.fillStyle = INK; c.textAlign = "center";
      const I = fixInfo[id]; c.font = "700 24px 'Noto Serif TC','Microsoft JhengHei',serif"; c.fillText(L(`${I.short[0]}・留白城`, `${I.short[1]} · Liubai`), W / 2, H - 58);
      c.font = "12px Georgia, serif"; c.fillStyle = "#6a5e52"; c.fillText(DAY.replace(/-/g, "."), W / 2, H - 30); c.fillStyle = CINNABAR; c.fillRect(W - 58, H - 70, 30, 30); c.fillStyle = "#f4ede0"; c.font = "bold 18px serif"; c.fillText("修", W - 43, H - 49);
      const url = cv.toDataURL("image/jpeg", 0.8), ok = FS && FS.cityPoster ? FS.cityPoster(CITY, id, url, `${I.short[0]}修好了・留白城`, `${I.short[1]} repaired · Liubai`) : false;
      const ov = document.createElement("div"); ov.className = "posterov"; ov.innerHTML = `<div class="pcard"><small>${L("送你一張修復紀念", "A souvenir of the repair")}</small><img alt=""><p>${ok ? L("已經收進家裡的海報冊。", "It's in the poster album at home.") : L("（從遊戲裡進來，才會收進海報冊）", "(Enter from the game to keep it in your poster album)")}</p><button class="btn primary" type="button">${L("好", "OK")}</button></div>`;
      ov.querySelector("img").src = url; ov.addEventListener("pointerdown", (e) => e.stopPropagation()); ov.querySelector("button").onclick = () => ov.remove(); document.body.append(ov);
    } catch (e) { console.warn(e); } }

  /* ---------- 玩家 ---------- */
  const me = new THREE.Group(); scene.add(me);
  const av = finAvatar(THREE) || makePerson(THREE, { top: "#f0eee8", bottom: "#4a4a52", longHair: true, hair: "#1d1a18", skin: "#f1d3bd" }, Math.random); me.add(av);
  const nameTag = makeNameTag(THREE, playerName(), null, { color: INK, glow: "#ffffff", size: 0.42 }); nameTag.position.y = 1.98; me.add(nameTag);
  const P = { x: 0, z: 6, tx: null, tz: null }, cam = { yaw: 0, pitch: 0.28, dist: 60, want: SMALL ? 14 : 12.5 };
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 32), new THREE.MeshBasicMaterial({ color: CINNABAR, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); mark.rotation.x = -Math.PI / 2; scene.add(mark);
  const markAt = (x, z) => { mark.position.set(x, 0.06, z); mark.material.opacity = 0.9; $("#hint").classList.add("off"); };
  for (const id of Object.keys(fixSites)) { const S = fixSites[id], st = fixes.site(id); S.k = S.kt = st.k; S.done = st.done; S.mk.visible = !st.done; S.snap = true; S.draw(S.k, S.done, 0, 0); }
  unstick(); if (G0.story) storyBtn();

  /* ---------- 每天的小事：亭簷三個小鈴；小遊戲：接落梅、印章配對 ---------- */
  const MZ = { lux: ["曦晶", "halo crystal"], sand: ["時砂", "time sand"], pearl: ["潮珠", "tide pearl"], moss: ["苔光", "moss light"], ink: ["松煙墨", "pine-soot ink"] };
  const cx = makeTrio({ THREE, scene, pickables, spots: [[-7.6, 1.6, -1.5], [7.4, 1.6, 0.8], [-1.6, 1.6, 7.8]], color: "#e8c8a0", done: !!(FS && FS.cityxState && FS.cityxState(CITY).done),
    onLight: (n, N) => { if (n < N) toast(L(`簷鈴（${n}/${N}）`, `Eave bells (${n}/${N})`), 2000); },
    onAll: () => { audio.fix(); say(L("三個小鈴一起響了一聲，霧好像散開了一點。", "The three little bells chime together, and the mist seems to part a little."), L("簷鈴", "Eave bells"), 6500); const r = FS && FS.cityxDo ? FS.cityxDo(CITY) : null; if (r) setTimeout(() => toast(L(`✨ 今天的小事完成了　+${r.b} B${r.matN ? `・${MZ[r.mat][0]} +${r.matN}` : ""}${r.ess ? `・元液 +${r.ess}` : ""}`, `✨ Today's little thing is done  +${r.b} B${r.matN ? ` · ${MZ[r.mat][1]} +${r.matN}` : ""}${r.ess ? ` · essence +${r.ess}` : ""}`), 4200), 1800); } });
  const mg = makeGames({ THREE, scene, pickables, city: CITY, L, toast, list: [
    { key: "plum", type: "catch", pos: [-10.5, 0, -4.5], icon: "🌸", color: "#e8a8a0", title: ["接落梅", "Falling Plum"], intro: ["風把梅花吹下來了。拖著小籃子接住紅色的梅花，別接到黑色的墨滴。", "The wind is shaking down the plum blossom. Drag the basket to catch the red blossoms — not the black ink drops."], how: ["左右拖動畫面移動籃子", "Drag left and right to move the basket"], theme: { bg: "#efe6d4", bg2: "#cfc2a8", fg: "#3a2a22", good: ["梅"], bad: ["墨"], basket: "🧺", speed: 0.8, paint: (c, q, t) => { c.save(); c.translate(q.x, q.y);   /* 熊：從頭到尾看不到梅花——改成自己畫：朱紅五瓣梅、黑色墨滴 */
      if (q.bad) { c.fillStyle = "#1d1a18"; c.beginPath(); c.moveTo(0, -18); c.bezierCurveTo(13, -2, 11, 15, 0, 15); c.bezierCurveTo(-11, 15, -13, -2, 0, -18); c.fill(); }
      else { c.rotate(q.r + t * 0.8); c.fillStyle = "#c03a2b"; for (let i = 0; i < 5; i++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.ellipse(0, -11, 8, 10, 0, 0, 7); c.fill(); } c.fillStyle = "#f2d27a"; c.beginPath(); c.arc(0, 0, 4.5, 0, 7); c.fill(); c.fillStyle = "#1d1a18"; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(Math.cos(i * 1.257) * 7, Math.sin(i * 1.257) * 7, 1.4, 0, 7); c.fill(); } }
      c.restore(); } } },
    { key: "seals", type: "memory", pos: [10.5, 0, -3.5], icon: "🀄", color: "#c03a2b", title: ["印章配對", "Seal Pairs"], intro: ["畫師的印章散了一桌。翻開兩方，找到一樣的。", "The painter's seals are scattered across the desk. Turn over two and find the matching ones."], how: ["一次翻兩張", "Turn over two at a time"], theme: { bg: "#e8e0d0", bg2: "#d0c4b0", fg: "#3a2a22", card: "#c03a2b", back: "印", pairs: ["🌸", "🎋", "🏮", "🪷", "🍵", "🌙"] } }] });
  window.__mg = { play: (i) => mg.play(i), cur: () => mg.cur, pos: (i) => mg.pos(i).toArray().map((v) => +v.toFixed(2)) };

  /* ---------- 一起：週末的 Niko、共遊的朋友、合照小卡 ---------- */
  const together = { niko: null, others: {} }, NLN = [["A city that waits for people to finish it. I like its manners.", "一座等人來畫完的城。我喜歡它的禮貌。"], ["You chose the bamboo. I would have chosen the bamboo too. Probably.", "妳選了竹子。我也會選竹子。大概。"], ["The ink smells like rain. Or rain smells like ink.", "墨聞起來像雨。還是雨聞起來像墨。"]];
  if (QS.get("niko") === "1") { const n = makeFigure(THREE, NIKO_LOOK, "Niko"); n.x = P.x - 1.2; n.z = P.z + 1.2; n.say = 7; scene.add(n.p); together.niko = n; }
  const tourOn = !!FS && /^https?:/.test(location.protocol) && !window.StarDemo;   /* 靜態試玩版沒有伺服器：不開邀請 */
  if (tourOn) tourLink({ city: CITY, L, toast, getMe: () => ({ x: P.x, z: P.z, ry: av.rotation.y, m: P.tx !== null ? "walk" : "idle" }), onSync: (list) => {
    const seen = new Set(); for (const o of list) { seen.add(o.uid); let f = together.others[o.uid];
      if (!f) { f = together.others[o.uid] = makeFigure(THREE, o.look || {}, o.name || "?"); f.uid = o.uid; f.name = o.name; f.x = o.x; f.z = o.z; scene.add(f.p); toast(L(`✨ ${o.name} 來了`, `✨ ${o.name} is here`)); }
      f.tx = o.x; f.tz = o.z; f.try = o.ry || 0; }
    for (const u of Object.keys(together.others)) if (!seen.has(u)) { scene.remove(together.others[u].p); delete together.others[u]; } } });
  function togetherFrame(t, dt) {
    const n = together.niko; if (n) { const ry = av.rotation.y, tx = P.x + Math.cos(ry) * 0.9, tz = P.z - Math.sin(ry) * 0.9, dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
      if (d > 14) { n.x = tx; n.z = tz; } else if (d > 0.1) { const v = Math.min(d, Math.max(2, d * 2.2) * dt); const nx = n.x + dx / d * v, nz = n.z + dz / d * v; if (walkable(nx, nz)) { n.x = nx; n.z = nz; } else if (walkable(nx, n.z)) n.x = nx; else if (walkable(n.x, nz)) n.z = nz; n.ry = Math.atan2(dx, dz); }
      n.moving = d > 0.1; n.p.position.set(n.x, 0, n.z); n.p.rotation.y = n.moving ? n.ry : ry; tickFigure(n, t);
      n.say -= dt; if (n.say <= 0 && !cut) { n.say = 24 + Math.random() * 26; const ln = NLN[Math.floor(Math.random() * NLN.length)]; say(L(ln[1], ln[0]), "Niko", 6000); } }
    for (const f of Object.values(together.others)) { const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz);
      if (d > 12) { f.x = f.tx; f.z = f.tz; } else if (d > 0.02) { const v = Math.min(d, Math.max(2.4, d * 2.5) * dt); f.x += dx / d * v; f.z += dz / d * v; f.ry = Math.atan2(dx, dz); }
      f.moving = d > 0.05; f.p.position.set(f.x, 0, f.z); f.p.rotation.y = f.moving ? f.ry : f.try; tickFigure(f, t); } }
  { const hud = $(".hud"), snd = $("#snd"), mk = (txt, title, fn) => { const b = document.createElement("button"); b.className = "btn snd"; b.type = "button"; b.textContent = txt; b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); }; hud.insertBefore(b, snd); return b; };
    if (tourOn) { const inv = invitePanel({ city: CITY, L, toast }); mk("👥", L("邀請朋友一起逛", "Invite a friend"), () => inv.open()); }
    mk("🖼", L("合照小卡", "Photo card"), async () => { const names = [playerName(), ...(together.niko ? ["Niko"] : []), ...Object.values(together.others).map((f) => f.name)];
      const card = await makeCard({ snap: () => window.__sleSnap && window.__sleSnap(), cityName: L("留白城", "Liubai"), names, palette: ["#ece4d4", "#1d1a18", "#c03a2b"], L });
      if (!card) { toast(L("拍不到畫面，再試一次", "Couldn't capture the view — try again")); return; } audio.task();
      cardPanel({ card, cityName: L("留白城", "Liubai"), mates: Object.values(together.others).map((f) => ({ uid: f.uid, name: f.name })), L, toast }); }); }

  const ray = new THREE.Raycaster(), _h = new V3(), _nd = new THREE.Vector2(), groundPl = new THREE.Plane(new V3(0, 1, 0), 0);
  /* ---------- 收藏：印譜、題詩、長卷 ---------- */
  const album = createAlbum({ L, FS, toast, sound: () => audio.seal(), inks: () => INKS, onGrant: (n) => { const q = INKS.find((x) => x[4] === n); if (q) setTimeout(() => toast(L(`解鎖新的墨色「${q[1]}」！拿起筆，在下面的色票換顏色；之後畫的東西就是這個顏色。`, `New ink unlocked: ${q[2]}! Pick it from the swatches when you hold the brush — what you paint next will be in that colour.`), 7000), 2600); } });
  /* ---------- 天氣（跟著日期）：晴、雨、霧；冬天才會下雪 ---------- */
  let wxPts = null, wxPos = null, wxN = 0;
  if (WX === "mist") { scene.fog.near = 12; scene.fog.far = 110; }
  if (WX === "rain" || WX === "snow") { wxN = SMALL ? 360 : 700; wxPos = new Float32Array(wxN * 3); for (let i = 0; i < wxN; i++) wxPos.set([(R0() - 0.5) * 70, R0() * 34, (R0() - 0.5) * 70], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(wxPos, 3));
    const rainT = canvasTex(8, 64, (c) => { const gr = c.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(30,26,24,0)"); gr.addColorStop(1, "rgba(30,26,24,.7)"); c.fillStyle = gr; c.fillRect(3, 0, 2, 64); });
    wxPts = new THREE.Points(g, new THREE.PointsMaterial(WX === "rain" ? { map: rainT, size: 1.6, transparent: true, opacity: 0.55, depthWrite: false } : { map: softT, color: "#ffffff", size: 0.55, transparent: true, opacity: 0.95, depthWrite: false })); wxPts.frustumCulled = false; scene.add(wxPts);
    ground.material.color.set(WX === "rain" ? "#cfc6b4" : "#f8f5ef"); }

  /* ---------- 墨點滲開的小特效（描稿、閒筆共用一組，輪流用） ---------- */
  const blots = Array.from({ length: 28 }, () => { const b = spr(blotT, "#ffffff", 1, 0); b.material.depthTest = false; b.renderOrder = 8; b.visible = false; scene.add(b); return { b, t: 9 }; }); let blotI = 0;   /* 沒在用就不畫 */
  const blotAt = (p, s = 1.2, col = "#ffffff") => { const q = blots[blotI++ % blots.length]; q.b.position.copy(p); q.t = 0; q.s = s; q.b.material.color.set(col); const mp = col === "#ffffff" ? blotT : blotW; if (q.b.material.map !== mp) { q.b.material.map = mp; q.b.material.needsUpdate = true; } q.b.visible = true; };

  /* ---------- 今天的一筆：畫師依你的日子起好稿（淡淡的鉛筆線），你拿起筆沿著稿刷過去，墨才滲開 ---------- */
  const pick = (feed, r) => { const b = (feed && feed.b) || {}, have = new Set((FS.growState(CITY).slots || []).map((s) => strokeOf(s).k)), order = BUCKETS.slice().sort((x, y) => (b[y] || 0) - (b[x] || 0) || r() - 0.5);
    const top = (b[order[0]] || 0) > 0 ? order[0] : null, from = (bk) => { const c = BUCKET_STROKES[bk], fresh = c.filter((k) => !have.has(k)); const pool = fresh.length ? fresh : c; return pool[Math.floor(r() * pool.length)]; };
    let k = from(top || order[Math.floor(r() * 6)]); if (have.has(k)) { const rest = Object.keys(STROKE).filter((x) => !have.has(x)); if (rest.length && !top) k = rest[Math.floor(r() * rest.length)]; }
    return { offer: [k], top }; };
  let sketch = null, mode = null, why = "";
  const PENCIL = new THREE.Color("#9a9286");
  function makeSketch(base) { const slot = (FS.growState(CITY).slots || []).length; if (slot >= SLOTS.length) return null; const [x, z] = SLOTS[slot], { g, wobs } = paint(base + "@2", x, z);
    wobs.forEach((o) => tog(o, false)); const mats = []; g.traverse((o) => { if (o.userData.outline) { o.visible = false; return; } if (!o.material) return; o.material = o.material.clone(); o.material.transparent = true;
      mats.push({ m: o.material, col: o.material.color ? o.material.color.clone() : null, op: o.material.opacity }); if (o.material.color) o.material.color.copy(PENCIL); o.material.opacity = 0.5; });
    g.updateMatrixWorld(true); const pts = [], _v = new V3(), _m = new THREE.Matrix4();
    g.traverse((o) => { if (o.userData.outline) return; if (o.isInstancedMesh) { for (let i = 0; i < o.count; i += 2) { o.getMatrixAt(i, _m); _v.setFromMatrixPosition(_m); const sy = new V3().setFromMatrixScale(_m).y; for (const f of [-0.3, 0.1, 0.4]) pts.push(_v.clone().add(new V3(0, sy * f, 0)).applyMatrix4(o.matrixWorld)); } }
      else if (o.isMesh || o.isPoints) { const p = o.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / (o.isPoints ? 6 : 10))); for (let i = 0; i < p.count; i += step) pts.push(new V3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(o.matrixWorld)); }
      else if (o.isSprite) pts.push(o.getWorldPosition(new V3())); });
    void pts; const bb = new THREE.Box3().setFromObject(g), sph = bb.getBoundingSphere(new THREE.Sphere());
    return { base, g, wobs, mats, pts: [], lines: [], hit: [], k: 0, speeds: [], slot, x, z, c: sph.center.clone(), r: Math.max(1.2, sph.radius) }; }
  /* 熊：「才下筆一點，樹就畫好了」——以前是物件上 70 個點、每點半徑 46px，一刷就八成。
   * 現在依鏡頭的方向，把每個部件拉成一條稿線（高的直著拉、扁的橫著拉；成排的小東西串成一條），
   * 每條線上平均取點，筆刷半徑小一點，要刷到 85% 才算描完。 */
  function buildGuides(S, yaw) { const px = Math.cos(yaw), pz = -Math.sin(yaw), lines = [], loose = [], bb = new THREE.Box3(), c = new V3(), sz = new V3(), m4 = new THREE.Matrix4();
    const chain = (ps) => { const b2 = new THREE.Box3().setFromPoints(ps), s2 = b2.getSize(new V3()), along = (p) => s2.y > Math.hypot(s2.x, s2.z) ? p.y : p.x * px + p.z * pz; return ps.slice().sort((a, b) => along(a) - along(b)); };
    S.g.updateMatrixWorld(true);
    S.g.traverse((o) => { if (o.userData.outline || !o.visible && o !== S.g) return;
      if (o.isInstancedMesh) { const ps = []; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); ps.push(new V3().setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld)); } if (ps.length > 1) lines.push(chain(ps)); else loose.push(...ps); return; }
      if (o.isSprite) { loose.push(o.getWorldPosition(new V3())); return; }
      if (!(o.isMesh || o.isPoints) || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.getCenter(c); bb.getSize(sz);
      const hz = Math.abs(sz.x * px) + Math.abs(sz.z * pz);
      if (Math.max(sz.y, hz) < 0.35) { loose.push(c.clone()); return; }
      if (sz.y >= hz * 0.9) lines.push([new V3(c.x, bb.min.y + sz.y * 0.05, c.z), new V3(c.x, bb.max.y - sz.y * 0.05, c.z)]);
      else lines.push([new V3(c.x - px * hz * 0.36, c.y, c.z - pz * hz * 0.36), new V3(c.x + px * hz * 0.36, c.y, c.z + pz * hz * 0.36)]); });
    if (loose.length > 1) lines.push(chain(loose)); else if (loose.length) lines.push([loose[0], loose[0].clone().add(new V3(px * 0.4, 0, pz * 0.4))]);
    const len = (L2) => L2.reduce((a, p, i) => a + (i ? p.distanceTo(L2[i - 1]) : 0), 0);
    const uniq = []; for (const L2 of lines.sort((a, b) => len(b) - len(a))) { const m = L2[Math.floor(L2.length / 2)]; if (uniq.some((u) => u[Math.floor(u.length / 2)].distanceTo(m) < 0.25 && Math.abs(len(u) - len(L2)) < 0.3)) continue; uniq.push(L2); if (uniq.length >= 7) break; }
    S.lines = []; S.pts = []; for (const L2 of uniq) { const tot = len(L2), n = Math.max(5, Math.min(16, Math.round(tot / 0.22))), smp = [];
      for (let i = 0; i < n; i++) { let d = tot * i / (n - 1), j = 1; while (j < L2.length - 1 && d > L2[j - 1].distanceTo(L2[j])) { d -= L2[j - 1].distanceTo(L2[j]); j++; } const a = L2[j - 1], b = L2[Math.min(j, L2.length - 1)], seg = a.distanceTo(b) || 1; smp.push(S.pts.length); S.pts.push(a.clone().lerp(b, Math.min(1, d / seg))); }
      S.lines.push(smp); }
    S.hit = S.pts.map(() => false); S.yaw = yaw; }
  /* 稿線畫在一張透明的紙上：沒描到的是鉛筆虛線、描過的變成墨；每條線的起筆有個小圈 */
  const guideCv = document.createElement("canvas"); guideCv.className = "guidecv"; document.body.append(guideCv); const gc = guideCv.getContext("2d"); let gW = 0, gH = 0, gOn = false;
  const gFit = () => { const d = Math.min(2, devicePixelRatio || 1); gW = innerWidth; gH = innerHeight; guideCv.width = gW * d; guideCv.height = gH * d; gc.setTransform(d, 0, 0, d, 0, 0); }; gFit(); addEventListener("resize", gFit);
  const _gv = new V3();
  function drawGuides(t) { const S = sketch, show = S && S.lines.length && !cut && (mode === "trace" || focus);
    if (!show && !(mode === "free")) { if (gOn) { gc.clearRect(0, 0, gW, gH); gOn = false; } return; } gc.clearRect(0, 0, gW, gH); gOn = true;
    if (mode === "free") { _gv.set(camera.position.x - Math.sin(cam.yaw) * 80, 0, camera.position.z - Math.cos(cam.yaw) * 80).project(camera); const hy = (1 - _gv.y) / 2 * gH;   /* 天和地的分界 */
      if (hy > 30 && hy < gH - 30) { gc.setLineDash([3, 7]); gc.strokeStyle = "rgba(90,80,70,.45)"; gc.lineWidth = 1.5; gc.beginPath(); gc.moveTo(0, hy); gc.lineTo(gW, hy); gc.stroke(); gc.setLineDash([]);
        gc.font = "600 15px 'Noto Serif TC', serif"; gc.fillStyle = "rgba(60,52,44,.65)"; gc.fillText(L("天", "sky"), 14, hy - 10); gc.fillText(L("地", "ground"), 14, hy + 22); } }
    if (!show) return; const pulse = mode === "trace" ? 1 : 0.55 + 0.45 * Math.sin(t * 3);
    const sp = S.pts.map((p) => { _gv.copy(p).project(camera); return _gv.z > 1 ? null : [(_gv.x + 1) / 2 * gW, (1 - _gv.y) / 2 * gH]; });
    for (const L2 of S.lines) { const q = L2.map((i) => sp[i]); if (q.some((x) => !x)) continue;
      gc.lineCap = "round"; gc.setLineDash([7, 7]); gc.strokeStyle = `rgba(120,108,96,${0.75 * pulse})`; gc.lineWidth = 2.2; gc.beginPath(); q.forEach((p, i) => i ? gc.lineTo(p[0], p[1]) : gc.moveTo(p[0], p[1])); gc.stroke(); gc.setLineDash([]);
      gc.strokeStyle = "rgba(22,19,17,.85)"; gc.lineWidth = 6; for (let i = 1; i < L2.length; i++) if (S.hit[L2[i]] && S.hit[L2[i - 1]]) { gc.beginPath(); gc.moveTo(q[i - 1][0], q[i - 1][1]); gc.lineTo(q[i][0], q[i][1]); gc.stroke(); }
      if (!S.hit[L2[0]]) { gc.strokeStyle = `rgba(192,58,43,${0.85 * pulse})`; gc.lineWidth = 2; gc.beginPath(); gc.arc(q[0][0], q[0][1], 7, 0, 7); gc.stroke(); } } }
  /* 鏡頭對準稿：進城時拉近給你看，拿起筆時再靠近一點，讓稿差不多佔半個畫面 */
  let focus = null, fk = 0; const _fp = new V3(), _fb = new V3();
  /* 熊：鏡頭被前面的松樹擋住、稿看起來很遠——繞著稿找一個看得清楚的角度，依稿線的大小拉近 */
  const _ro = new V3(), _rd = new V3(), _rc = new THREE.Raycaster();
  function clearYaw(c, D, pit, prefer, r = 1) { let best = prefer, bs = Infinity; const hits = scene.children.filter((o) => o !== ground && o !== court && o !== sketch.g && !o.isSprite && !o.isPoints && o.visible);
    for (let i = 0; i < 16; i++) { const yaw = prefer + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8; const cpx = Math.cos(yaw), cpz = -Math.sin(yaw); let blocked = 0;   /* 稿的中心和上下左右各拉一條視線到鏡頭，有幾條被擋住 */
      for (const [u, v] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.6], [0, -0.5]]) { _ro.set(c.x + cpx * u * r, c.y + v * r, c.z + cpz * u * r); const cam2 = new V3(c.x + Math.sin(yaw) * Math.cos(pit) * D, c.y + Math.sin(pit) * D, c.z + Math.cos(yaw) * Math.cos(pit) * D); _rd.copy(cam2).sub(_ro); const dd = _rd.length(); _rd.normalize();
        _rc.set(_ro, _rd); _rc.far = dd; _rc.camera = camera; try { if (_rc.intersectObjects(hits, true).some((h) => h.object.isMesh && !h.object.userData.outline && h.distance > 0.4)) blocked++; } catch (e) { } }
      const score = blocked * 10 + Math.ceil(i / 2) * 0.3; if (score < bs) { bs = score; best = yaw; } if (!blocked) break; }
    return best; }
  function focusSketch(near) { if (!sketch) return; const fv = camera.fov * Math.PI / 360, fh = Math.atan(Math.tan(fv) * camera.aspect), pit = near ? 0.2 : 0.26;
    let yaw = Math.atan2(P.x - sketch.x, P.z - sketch.z); if (!sketch.lines.length) buildGuides(sketch, yaw);
    const sph = new THREE.Sphere().setFromPoints(sketch.pts.length > 1 ? sketch.pts : [sketch.c]), r = Math.max(1.1, sph.radius), D = Math.max(5, Math.min(34, r / Math.tan(Math.min(fv, fh)) * (near ? 1.35 : 2.1)));
    yaw = clearYaw(sph.center, D, pit, sketch.focusYaw != null ? sketch.focusYaw : yaw, r); sketch.focusYaw = yaw; if (Math.abs(Math.atan2(Math.sin(sketch.yaw - yaw), Math.cos(sketch.yaw - yaw))) > 0.3) buildGuides(sketch, yaw);
    cam.yaw = yaw; cam.pitch = pit; cam.want = D; focus = { x: sph.center.x, y: Math.max(1, sph.center.y), z: sph.center.z }; _fp.set(focus.x, focus.y, focus.z); }
  function unfocus() { if (!focus) return; focus = null; cam.want = SMALL ? 14 : 12.5; cam.pitch = 0.28; }
  function sketchShow(k) { for (const q of sketch.mats) { if (q.col) q.m.color.copy(PENCIL).lerp(q.col, k); q.m.opacity = 0.5 + (q.op - 0.5) * k; } if (k > 0.55) sketch.g.traverse((o) => { if (o.userData.outline) o.visible = true; }); }
  const _sv = new V3();
  function traceAt(x, y, sp) { if (!sketch) return; const R = Math.max(16, Math.min(26, Math.min(innerWidth, innerHeight) * 0.032)); let n = 0;
    sketch.pts.forEach((p, i) => { if (sketch.hit[i]) return; _sv.copy(p).project(camera); if (_sv.z > 1) return; const sx = (_sv.x + 1) / 2 * innerWidth, sy = (1 - _sv.y) / 2 * innerHeight; if (Math.hypot(sx - x, sy - y) < R) { sketch.hit[i] = true; n++; if (n < 3) blotAt(p, 0.8 + rnd() * 0.8); } });
    if (sp > 0) sketch.speeds.push(sp); const k = sketch.hit.filter(Boolean).length / sketch.hit.length; if (k !== sketch.k) { sketch.k = k; sketchShow(k); bar(); if (n) audio.dab(); } if (k >= 0.85) inkDone(); }
  function inkDone() { const S = sketch; if (!S || S.done) return; S.done = true; const sp = S.speeds.length ? S.speeds.reduce((a, b) => a + b, 0) / S.speeds.length : 900, d = sp < 650 ? 3 : sp < 1500 ? 2 : 1, id = `${S.base}@${d}` + (inkNow() !== "ink" ? "~" + inkNow() : "");
    const r = FS.growChoose(CITY, S.base, SLOTS.length, id); scene.remove(S.g); sketch = null; setMode(null); unfocus(); if (!r) { bar(); return; }
    addStroke(r.slot >= 0 ? r.slot : S.slot, id, true); audio.stroke(); const N = STROKE[S.base];
    say(L(`「${N.name[0]}」${d === 3 ? "——墨下得又沉又滿。" : d === 1 ? "——幾筆飛白，很輕。" : "——墨色正好。"}`, `"${N.name[1]}" — ${d === 3 ? "the ink went down deep and full." : d === 1 ? "a few light, dry strokes." : "the ink is just right."}`), L("硯翁", "Old Inkstone"), 6500);
    album.grant("e:" + S.base); checkAll(); showGrowth(); bar(); }

  /* ---------- 閒筆：在留白的地方隨手畫，畫的樣子變成小東西（每天能畫幾筆看墨夠不夠） ---------- */
  const marks = [];   /* { m, g, rev, anim } */
  const groundAt = (sx, sy) => { _nd.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(_nd, camera); if (!ray.ray.intersectPlane(groundPl, _h)) return null; const d = _h.distanceTo(camera.position); return d < 90 && Math.hypot(_h.x, _h.z) < LAND + 6 ? _h.clone() : null; };
  const skyAt = (sx, sy) => { _nd.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(_nd, camera); return camera.position.clone().addScaledVector(ray.ray.direction, 42); };
  const lotusT = canvasTex(64, 64, (c) => { c.fillStyle = "#6a7468"; c.beginPath(); c.arc(32, 32, 28, 0.3, Math.PI * 2 - 0.1); c.lineTo(32, 32); c.fill(); c.strokeStyle = "rgba(20,20,18,.6)"; c.lineWidth = 2; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); c.stroke(); } });
  const cloudT = canvasTex(256, 128, (c) => { c.strokeStyle = "rgba(30,26,24,.55)"; c.lineWidth = 6; c.lineCap = "round"; for (const [x, y, r] of [[80, 70, 34], [130, 56, 40], [180, 72, 30]]) { c.beginPath(); c.arc(x, y, r, Math.PI * 0.9, Math.PI * 2.2); c.stroke(); c.beginPath(); c.arc(x + 6, y + 4, r * 0.5, Math.PI, Math.PI * 2.3); c.stroke(); } });
  function buildMark(m, reveal) { const g = new THREE.Group(), r = rngOf(seedOf(m.id || "m")); let anim = null;
    if (m.k === "plum") { const tw = outline(mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.1, 5), 0.85), 0.1); tw.position.y = 0.55; tw.rotation.z = (r() - 0.5) * 0.6; g.add(tw); const bl = []; for (let i = 0; i < 9; i++) bl.push((r() - 0.5) * 0.9, 0.6 + r() * 0.8, (r() - 0.5) * 0.9);
      const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(bl, 3)); g.add(new THREE.Points(bg, new THREE.PointsMaterial({ map: softT, color: CINNABAR, size: 0.5, transparent: true, depthWrite: false }))); g.position.set(m.x, 0, m.z); }
    else if (m.k === "lantern") { const lan = outline(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: CINNABAR, map: brushT })), 0.06); lan.scale.y = 1.3; g.add(lan); const gl = spr(softT, "#ffb08a", 2.6, 0.5); g.add(gl); g.position.set(m.x, m.y, m.z); anim = (t) => { g.position.y = m.y + Math.sin(t * 0.6 + m.x) * 0.5; }; }
    else if (m.k === "lotus") { const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.5, 40), new THREE.MeshBasicMaterial({ color: "#3a3430", transparent: true, opacity: 0.7, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      const pond = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ map: waterT })); pond.rotation.x = -Math.PI / 2; pond.position.y = 0.04; g.add(pond);
      for (let i = 0; i < 3; i++) { const lf = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ map: lotusT, transparent: true })); lf.rotation.set(-Math.PI / 2, 0, r() * 6); lf.position.set((r() - 0.5) * 1.6, 0.07, (r() - 0.5) * 1.6); g.add(lf); }
      const bud = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), new THREE.MeshBasicMaterial({ color: "#e8a0a0" })); bud.position.set(0.3, 0.45, 0.2); g.add(bud); g.position.set(m.x, 0, m.z); }
    else if (m.k === "shoot") { for (let i = 0; i < 3; i++) { const s = outline(mesh(new THREE.ConeGeometry(0.16, 0.7 + r() * 0.6, 7), 0.7), 0.08); s.position.set((r() - 0.5) * 1, 0.4, (r() - 0.5) * 1); g.add(s); } g.position.set(m.x, 0, m.z); }
    else if (m.k === "reed") { const n = Math.max(3, Math.min(14, Math.round(Math.hypot(m.x2 - m.x, m.z2 - m.z) / 0.6))); for (let i = 0; i < n; i++) { const f = i / (n - 1 || 1), h = 1 + r() * 0.9, st = mesh(new THREE.CylinderGeometry(0.015, 0.03, h, 4), 0.8); st.position.set(m.x + (m.x2 - m.x) * f + (r() - 0.5) * 0.3, h / 2, m.z + (m.z2 - m.z) * f + (r() - 0.5) * 0.3); st.rotation.z = (r() - 0.5) * 0.3; g.add(st);
        const pl = mesh(new THREE.ConeGeometry(0.06, 0.32, 5), 0.55); pl.position.set(st.position.x, h + 0.1, st.position.z); g.add(pl); } }
    else if (m.k === "geese") { for (let i = 0; i < 5; i++) { const s = spr(craneT, "#ffffff", 1.1, 0.85); s.position.set(m.x + (i - 2) * 1.3, m.y - Math.abs(i - 2) * 0.6, m.z + Math.abs(i - 2) * 0.8); g.add(s); } anim = (t) => { g.position.x = Math.sin(t * 0.05 + m.x) * 6; }; }
    else if (m.k === "path") { const P2 = m.pts || []; for (let i = 0; i < P2.length; i++) { const st = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.08, 9), 0.45); st.scale.set(1 + r() * 0.3, 1, 0.75 + r() * 0.3); st.rotation.y = r() * 3; st.position.set(P2[i][0], 0.05, P2[i][1]); g.add(st); } }
    else { const s = spr(cloudT, "#ffffff", 9, 0.8); s.scale.y = 4.5; g.add(s); g.position.set(m.x, m.y, m.z); anim = (t) => { g.position.x = m.x + Math.sin(t * 0.04 + m.z) * 4; }; }
    tintBy(g, m.c); scene.add(g); const mats = reveal ? tagged(g) : null; if (mats) mats.forEach(([mt]) => { mt.opacity = 0; }); const it = { m, g, anim, rev: reveal ? { t: 0, mats } : null }; marks.push(it); return it; }
  const PU = [["plum", "•", "gnd"], ["lotus", "○", "gnd"], ["shoot", "|", "gnd"], ["reed", "—", "gnd"], ["path", "∿", "gnd"], ["lantern", "•", "sky"], ["geese", "—", "sky"], ["cloud", "○", "sky"]];   /* 筆譜：點、圈、豎、橫、彎 × 天、地 */
  const MARK_NAME = { plum: ["一枝梅", "a sprig of plum"], lantern: ["一盞天燈", "a sky lantern"], lotus: ["一池蓮", "a lotus pond"], shoot: ["幾根竹筍", "a few bamboo shoots"], reed: ["一排蘆葦", "a row of reeds"], geese: ["一行雁", "a line of geese"], path: ["一條石徑", "a stone path"], cloud: ["一朵雲", "a cloud"] };
  function freeStroke(st) { const cl = classify(st);
    /* 先看是不是今天的小事：在石燈上畫個圈、沿著墨蝶描一筆 */
    for (const e of evs) { if (e.state !== "wait") continue; const wp = e.kind === "lamp" ? new V3(e.x, 1.45, e.z) : e.g.position.clone(); _sv.copy(wp).project(camera); if (_sv.z > 1) continue; const sx = (_sv.x + 1) / 2 * innerWidth, sy = (1 - _sv.y) / 2 * innerHeight;
      if (e.kind === "lamp" && cl.kind === "circle" && Math.hypot(cl.cx - sx, cl.cy - sy) < Math.max(80, cl.r * 1.2)) { finish(e); return; }
      if (e.kind === "moth" && st.pts.filter((p) => Math.hypot(p[0] - sx, p[1] - sy) < 55).length >= 2) { finish(e); return; } }
    let m = null;
    if (cl.kind === "dot") { const g = groundAt(cl.cx, cl.cy); m = g ? { k: "plum", x: g.x, z: g.z } : (() => { const s = skyAt(cl.cx, cl.cy); return { k: "lantern", x: s.x, y: Math.max(8, s.y), z: s.z }; })(); }
    else if (cl.kind === "circle") { const g = groundAt(cl.cx, cl.cy); if (g) m = { k: "lotus", x: g.x, z: g.z }; else { const s = skyAt(cl.cx, cl.cy); m = { k: "cloud", x: s.x, y: Math.max(14, s.y), z: s.z }; } }
    else if (cl.kind === "vert") { const g = groundAt(cl.bottom[0], cl.bottom[1]); if (g) m = { k: "shoot", x: g.x, z: g.z }; else { const s = skyAt(cl.cx, cl.cy); m = { k: "cloud", x: s.x, y: Math.max(14, s.y), z: s.z }; } }
    else if (cl.kind === "horiz") { const a = groundAt(cl.a[0], cl.a[1]), b = groundAt(cl.b[0], cl.b[1]); if (a && b) m = { k: "reed", x: a.x, z: a.z, x2: b.x, z2: b.z }; else { const s = skyAt(cl.cx, cl.cy); m = { k: "geese", x: s.x, y: Math.max(12, s.y), z: s.z }; } }
    else { const gp = cl.pts.map((p) => groundAt(p[0], p[1])).filter(Boolean); if (gp.length >= 3) m = { k: "path", x: gp[0].x, z: gp[0].z, pts: gp.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]) }; else { const s = skyAt(cl.cx, cl.cy); m = { k: "cloud", x: s.x, y: Math.max(14, s.y), z: s.z }; } }
    for (const key of ["x", "y", "z", "x2", "z2"]) if (m[key] != null) m[key] = +m[key].toFixed(2);
    if (inkNow() !== "ink") m.c = inkNow();
    if (pend) keepPend();   /* 熊：「筆觸不符合就浪費一滴墨」——畫完先給你看，按「留下」或過幾秒才真的用掉墨；「這筆不要」就收回 */
    if (inkLeft() <= 0) { toast(L("今天的墨用完了。墨會隨著時間慢慢回來；做一件小事、記一筆帳、完成畫題也會多一點。", "You're out of ink for now. It comes back through the day — little tasks, a record, or today's theme add more."), 4600); return; }
    m.id = "M" + Date.now().toString(36) + Math.floor(Math.random() * 1e4); const it = buildMark(m, true); const c = it.g.position.clone(); if (m.k === "reed" || m.k === "path") c.set(m.x, 0.3, m.z); blotAt(c, 2.4); audio.dab(); audio.stroke();
    pend = { m, it, tm: setTimeout(keepPend, 7000) }; bar(); }
  let pend = null, puOpen = false; try { puOpen = localStorage.getItem("liubai-pu") === "1"; } catch (e) { }
  const inkLeft = () => (FS && FS.paintState ? Math.max(0, FS.paintAllow() - (FS.paintState().used || 0)) : 9) - (pend ? 1 : 0);
  function keepPend() { const P = pend; if (!P) return; pend = null; clearTimeout(P.tm); const m = P.m, r = FS && FS.paintMark ? FS.paintMark(m) : { ok: true, left: 9, id: m.id };
    if (!r || !r.ok) { dropMark(P.it); toast(L("今天的墨用完了。", "You're out of ink for today."), 3000); bar(); return; }
    toast(L(`留下了${MARK_NAME[m.k][0]}　（今天還能畫 ${r.left} 筆）`, `Kept ${MARK_NAME[m.k][1]}  (${r.left} strokes left today)`), 2800); album.grant("m:" + m.k); themeCheck(m.k); checkAll(); showGrowth(); bar(); }
  function dropMark(it) { scene.remove(it.g); const i = marks.indexOf(it); if (i >= 0) marks.splice(i, 1); }
  function undoPend() { const P = pend; if (!P) return; pend = null; clearTimeout(P.tm); dropMark(P.it); audio.dab(); toast(L("收回了這一筆，墨還給你。", "Taken back — the ink is yours again."), 2400); bar(); }
  /* 每日畫題：畫師每天出一句詩，畫出詩裡的東西就完成（記成 d:日期 這方「印」，不算在印譜裡），當天多 2 滴墨 */
  const THEMES = [["plum", "牆角數枝梅，凌寒獨自開。", "王安石", "A few sprigs of plum by the wall, blooming alone in the cold."], ["lotus", "接天蓮葉無窮碧。", "楊萬里", "Lotus leaves meet the sky in endless green."],
    ["shoot", "新竹高於舊竹枝。", "鄭板橋", "The new bamboo outgrows the old."], ["reed", "蒹葭蒼蒼，白露為霜。", "詩經", "Reeds grey-green, the white dew turned to frost."], ["geese", "雁字回時，月滿西樓。", "李清照", "When the geese write their way home, the moon fills the west tower."],
    ["path", "曲徑通幽處。", "常建", "A winding path leads somewhere secluded."], ["cloud", "行到水窮處，坐看雲起時。", "王維", "Walk to where the water ends; sit and watch the clouds rise."], ["lantern", "東風夜放花千樹。", "辛棄疾", "The east wind sets a thousand trees of light in bloom tonight."]];
  const THEME = THEMES[seedOf("theme:" + DAY) % THEMES.length];
  const themeDone = () => !!(((FS && FS.paintState && FS.paintState().seals) || {})["d:" + DAY]);
  function themeCheck(k) { if (k !== THEME[0] || themeDone() || !FS || !FS.paintSeal) return; FS.paintSeal("d:" + DAY); audio.seal();
    setTimeout(() => toast(L(`今天的畫題完成了！「${THEME[1]}」——畫師多給你 2 滴墨。`, `Today's theme is done! "${THEME[3]}" — the painter gives you 2 more drops of ink.`), 6000), 1600); }

  /* ---------- 畫中人：畫裡湊齊某些景，就有人走進來；跟他說話，他送你一句詩 ---------- */
  const folkIn = {};   /* id → { p, x, z, mk } */
  function counts() { const el = new Set(strokes.map((s) => strokeOf(s.id).k)), mk = {}; for (const q of marks) mk[q.m.k] = (mk[q.m.k] || 0) + 1; return { el, mk }; }
  function wantPeople() { const { el, mk } = counts(), out = [];
    if ((el.has("bamboo") && el.has("pav")) || (el.has("bamboo") && (mk.shoot || 0) >= 3)) out.push("scholar");
    if (el.has("boat") || ((mk.lotus || 0) >= 1 && (mk.reed || 0) >= 1)) out.push("fisher");
    if (el.has("plum") || (mk.plum || 0) >= 5 || (WX === "snow" && (mk.plum || 0) >= 1)) out.push("plum");
    if (el.has("kite") || ((mk.geese || 0) >= 1 && (mk.path || 0) >= 1)) out.push("kite"); return out; }
  const NEAR = { scholar: ["bamboo", "pav"], fisher: ["boat"], plum: ["plum"], kite: ["kite"] };
  function placePeople() { const met = (album.state().met) || {};
    for (const id of wantPeople()) { if (folkIn[id]) continue; const anchor = strokes.find((s) => NEAR[id].includes(strokeOf(s.id).k)); let x = anchor ? anchor.x + 2.8 : -3 + Object.keys(folkIn).length * 2, z = anchor ? anchor.z + 1.5 : 10;
      if (!walkable(x, z)) { x = anchor ? anchor.x - 2.8 : x; } const p = inkFolk({ scholar: "cap", fisher: "straw", plum: "bun", kite: "hood" }[id], { scholar: 0.18, fisher: 0.6, plum: 0.38, kite: 0.5 }[id]);
      if (id === "fisher") { const rod = mesh(new THREE.CylinderGeometry(0.015, 0.025, 2.6, 6), 0.85); rod.position.set(0.35, 1.6, 0.4); rod.rotation.x = 0.9; p.add(rod); }
      p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -z); scene.add(p); const mk = spr(sealDot, "#ffffff", 0.7, met[id] ? 0 : 0.95, { depthTest: false }); mk.position.y = 2.3; mk.renderOrder = 11; p.add(mk);
      proxy(1.2, "person", id, p, 1); obstacles.push({ x, z, r: 0.6, h: 2 }); folkIn[id] = { p, x, z, mk, ph: rnd() * 6, face: 0 };
      if (!met[id]) setTimeout(() => toast(L(`畫裡好像有人走進來了……`, `Someone seems to have walked into the painting…`), 3600), 1200); } }
  const sealDot = canvasTex(64, 64, (c) => { c.fillStyle = CINNABAR; c.fillRect(8, 8, 48, 48); c.fillStyle = "#f4ede0"; c.font = "bold 34px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("人", 32, 35); });
  function meet(id) { const F = folkIn[id], I = PEOPLE[id]; F.face = 3; audio.voice(3); say(L(I.say[0], I.say[1]), L(I.name[0], I.name[1]), 5200);
    setTimeout(() => { say(L(`「${I.line[0]}」`, `"${I.line[1]}"`), L(`${I.name[0]}送你的一句`, `a line from ${I.name[1]}`), 7000); if (FS && FS.paintMet && FS.paintMet(id)) { F.mk.material.opacity = 0; album.grant("p:" + id);
        const met = album.state().met || {}; if (POEM_ORDER.every((k) => met[k])) setTimeout(() => { album.grant("poem"); audio.fix(); album.open("poem"); }, 3800); } }, 4800); }
  /* 每次多了東西就看一下：組合的印、筆數的印、該不該有人走進來 */
  function checkAll() { const { el, mk } = counts(), n = strokes.length + marks.length, dense = strokes.filter((s) => strokeOf(s.id).d === 3).length, light = strokes.filter((s) => strokeOf(s.id).d === 1).length;
    if (el.has("boat") && el.has("lamp")) album.grant("c:night"); if (el.has("bamboo") && el.has("pav")) album.grant("c:study"); if (WX === "snow" && (el.has("plum") || mk.plum)) album.grant("c:snowplum"); if (el.has("crane") && el.has("pagoda")) album.grant("c:cloudcrane");
    if (n >= 10) album.grant("n:10"); if (n >= 30) album.grant("n:30"); if (dense >= 3) album.grant("d:dark"); if (light >= 3) album.grant("d:light"); placePeople(); }

  /* ---------- 長卷：每個禮拜第一次來，自動拍一段整座城 ---------- */
  const weekOf = (d) => { const t = new Date(d + "T12:00:00"), day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day + 3); const y = t.getFullYear(), f = new Date(y, 0, 4); return `${y}-W${String(1 + Math.round(((t - f) / 864e5 - 3 + ((f.getDay() + 6) % 7)) / 7)).padStart(2, "0")}`; };
  function scrollCheck() { if (!FS || !FS.paintScroll) return; const wk = weekOf(DAY); if ((album.state().scrolls || []).some((x) => x.wk === wk)) return;
    try { const oldP = camera.position.clone(), oldQ = camera.quaternion.clone(), oldA = camera.aspect, oldF = camera.fov, W = 720, H = 240, rt = new THREE.WebGLRenderTarget(W * 2, H * 2, { colorSpace: THREE.SRGBColorSpace });
      camera.position.set(0, 26, 50); camera.lookAt(0, 3, -6); camera.aspect = 3; camera.fov = 40; camera.updateProjectionMatrix(); const nm = nameTag.visible; nameTag.visible = false; renderer.setRenderTarget(rt); renderer.render(scene, camera);
      const px = new Uint8Array(W * 2 * H * 2 * 4); renderer.readRenderTargetPixels(rt, 0, 0, W * 2, H * 2, px); renderer.setRenderTarget(null); rt.dispose(); nameTag.visible = nm; camera.position.copy(oldP); camera.quaternion.copy(oldQ); camera.aspect = oldA; camera.fov = oldF; camera.updateProjectionMatrix();
      const src = document.createElement("canvas"); src.width = W * 2; src.height = H * 2; const sc = src.getContext("2d"), id2 = sc.createImageData(W * 2, H * 2); for (let y = 0; y < H * 2; y++) id2.data.set(px.subarray((H * 2 - 1 - y) * W * 8, (H * 2 - y) * W * 8), y * W * 8); sc.putImageData(id2, 0, 0);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"); c.drawImage(src, 0, 0, W, H); c.fillStyle = CINNABAR; c.fillRect(W - 44, H - 44, 28, 28); c.fillStyle = "#f4ede0"; c.font = "bold 16px serif"; c.textAlign = "center"; c.fillText("卷", W - 30, H - 25);
      if (FS.paintScroll(wk, cv.toDataURL("image/jpeg", 0.72))) toast(L("這個禮拜的長卷，收進印譜了。", "This week's scroll is in your album."), 3200); } catch (e) { console.warn(e); } }

  /* ---------- 下面那一條：起好的稿、描到幾成、今天還能畫幾筆 ---------- */
  const barEl = document.createElement("div"); barEl.className = "inkbar"; barEl.addEventListener("pointerdown", (e) => e.stopPropagation()); barEl.addEventListener("pointerup", (e) => e.stopPropagation()); document.body.append(barEl);
  function bar() { const left = Math.max(0, inkLeft());
    if (mode === "trace" && sketch) { barEl.innerHTML = `<p>${L("從紅色小圈起筆，沿著每一條虛線刷過去", "Start at each red circle and brush along every dashed line")}<b>${Math.round(sketch.k * 100)}%</b></p><div class="ib-bar"><i></i></div>${inkChips()}<button class="btn" data-a="down" type="button">${L("先放下筆", "Put the brush down")}</button>`; barEl.querySelector(".ib-bar i").style.width = Math.round(sketch.k / 0.85 * 100) + "%"; }
    else if (mode === "free") { const se = (FS && FS.paintState && FS.paintState().seals) || {};
      const pu = PU.map(([k, g, w]) => `<span class="${se["m:" + k] ? "has" : ""}"><b>${g}</b><i>${w === "sky" ? L("天", "sky") : L("地", "gnd")}</i>${se["m:" + k] ? L(MARK_NAME[k][0].replace(/^一(枝|盞|池|條|排|行|朵)|^幾根/, ""), MARK_NAME[k][1].replace(/^(a|an) (sprig of |line of |row of |few )?/, "")) : "？"}</span>`).join("");
      const th = `<p class="ithem ${themeDone() ? "ok" : ""}">${L(`今日畫題：「${THEME[1]}」（${THEME[2]}）${themeDone() ? "　✓ 完成" : ""}`, `Today's theme: "${THEME[3]}"${themeDone() ? "  ✓ done" : ""}`)}</p>`;
      const pd = pend ? `<div class="ipend"><b>${L(`畫成了${MARK_NAME[pend.m.k][0]}`, `It became ${MARK_NAME[pend.m.k][1]}`)}</b><button class="btn primary" data-a="keep" type="button">${L("留下", "Keep")}</button><button class="btn" data-a="undo" type="button">${L("這筆不要", "Take it back")}</button></div>` : "";
      barEl.innerHTML = `${pd}${th}<p class="ifree">${L(`虛線上面是「天」、下面是「地」・還能畫 <b>${left}</b> 筆`, `Above the dashed line is sky, below is ground · <b>${left}</b> left`)}</p>${puOpen ? `<div class="ipu">${pu}</div>` : ""}${inkChips()}<div class="irow"><button class="btn" data-a="pu" type="button">${L("筆譜", "Brush guide")} ${puOpen ? "▴" : "▾"}</button><button class="btn" data-a="down" type="button">${L("放下筆", "Put the brush down")}</button></div>`; }   /* 熊試玩：這一條太高、擋到畫的地方 → 筆譜收起來 */
    else if (sketch) barEl.innerHTML = `<p><small>${why}</small>${L(`畫師起好了稿：「${STROKE[sketch.base].name[0]}」。這一筆，你來描。`, `The painter has sketched "${STROKE[sketch.base].name[1]}". This stroke is yours to ink.`)}</p><button class="btn primary" data-a="trace" type="button">${L("拿起筆", "Pick up the brush")}</button>`;
    else barEl.innerHTML = "";
    barEl.classList.toggle("on", !!barEl.innerHTML); const b1 = barEl.querySelector('[data-a="trace"]'), b2 = barEl.querySelector('[data-a="down"]');
    if (b1) b1.onclick = () => { setMode("trace"); }; if (b2) b2.onclick = () => setMode(null);
    barEl.querySelectorAll("[data-col]").forEach((e) => { e.style.background = e.dataset.col; });
    const bp = barEl.querySelector('[data-a="pu"]'); if (bp) bp.onclick = () => { puOpen = !puOpen; try { localStorage.setItem("liubai-pu", puOpen ? "1" : "0"); } catch (e) { } bar(); };
    const bk = barEl.querySelector('[data-a="keep"]'), bu = barEl.querySelector('[data-a="undo"]'); if (bk) bk.onclick = () => keepPend(); if (bu) bu.onclick = () => undoPend();
    barEl.querySelectorAll("[data-ink]").forEach((b) => { b.onclick = () => { curInk = b.dataset.ink; try { localStorage.setItem("liubai-ink", curInk); } catch (e) { } audio.dab(); bar(); }; });
    if (penBtn) penBtn.textContent = L(`筆 ${left}`, `Brush ${left}`); }
  let penBtn = null;
  { const hud = $(".hud"), snd = $("#snd"), mk = (txt, title, fn, cls) => { const b = document.createElement("button"); b.className = "btn snd " + cls; b.type = "button"; b.textContent = txt; b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); }; hud.insertBefore(b, snd); return b; };
    penBtn = mk(L("筆", "Brush"), L("拿起筆隨手畫", "Pick up the brush"), () => setMode(mode === "free" ? null : "free"), "pen"); mk("印", L("印譜・題詩・長卷", "Seals · poem · scrolls"), () => album.open(), "seal"); }
  function setMode(m) { if (m !== "free" && pend) keepPend(); mode = m; brush.set(!!m); document.body.classList.toggle("brushing", !!m);
    if (m === "trace" && sketch) focusSketch(true);
    else if (m === "free") { unfocus(); cam.pitch = Math.min(cam.pitch, 0.13); cam.want = Math.max(cam.want, SMALL ? 15 : 13); }   /* 低一點，天和地各佔一半 */
    else if (!m && sketch && focus) focusSketch(false);
    if (penBtn) penBtn.classList.toggle("on", m === "free"); bar(); }
  const brush = createBrush({ onMove: (x, y, sp) => { if (mode === "trace") traceAt(x, y, sp); }, onStroke: (st) => { if (mode === "free") freeStroke(st); else if (mode === "trace" && sketch && !sketch.done) toast(L(`描了 ${Math.round(sketch.k * 100)}%，繼續沿著稿線刷。`, `${Math.round(sketch.k * 100)}% inked — keep brushing along the lines.`), 1600); } });
  const showGrowth = () => { const n = strokes.length + marks.length, c = $("#clock"); c.textContent = L(`${n} 筆・${WXN[WX][0]}`, `${n} strokes · ${WXN[WX][1]}`); c.title = L(`這幅畫已經有 ${n} 筆`, `${n} strokes in the painting`); };
  /* 進城：今天的天氣、月亮、朱印；有沒有起好的稿；每週的長卷 */
  function arrive() { if (cut) return; let g = { state: null, offer: null, top: null }; if (FS) g = growStart({ city: CITY, map: pick, rnd });
    placeSeals(g.state && g.state.visits); if (g.state) { moon.material.map = moonT(g.state.night); moon.material.needsUpdate = true; }
    if (WX !== "clear") setTimeout(() => album.grant("w:" + WX), 2500);
    why = g.top ? L(WHY[g.top][0], WHY[g.top][1]) : L("硯台很安靜，今天這一筆是風送來的。", "The inkstone is quiet; today's stroke came on the wind.");
    if (g.offer && g.offer[0]) { sketch = makeSketch(strokeOf(g.offer[0]).k); if (sketch) focusSketch(false); }
    checkAll(); bar(); showGrowth(); setTimeout(scrollCheck, 6000);
    if (!themeDone()) setTimeout(() => say(L(`今天的畫題：「${THEME[1]}」——拿起右上角的「筆」，畫出詩裡的東西。`, `Today's theme: "${THEME[3]}" — pick up the Brush (top right) and paint what the poem describes.`), L("硯翁", "Old Inkstone"), 8000), 9000); }

  /* ---------- 紙紋：整個畫面蓋一層紙的纖維 ---------- */
  { const cv = document.createElement("canvas"); cv.width = cv.height = 256; const c = cv.getContext("2d"), r = rngOf(77); c.fillStyle = "#808080"; c.fillRect(0, 0, 256, 256); for (let k = 0; k < 9000; k++) { const v = 110 + r() * 40; c.fillStyle = `rgba(${v},${v},${v},.5)`; c.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
    for (let k = 0; k < 220; k++) { c.strokeStyle = `rgba(90,86,80,${0.15 + r() * 0.2})`; c.lineWidth = 0.6; c.beginPath(); const x = r() * 256, y = r() * 256; c.moveTo(x, y); c.quadraticCurveTo(x + r() * 20, y + r() * 6, x + 10 + r() * 30, y + (r() - 0.5) * 8); c.stroke(); }
    const ov = document.createElement("div"); ov.className = "paper"; ov.style.backgroundImage = `url(${cv.toDataURL()})`; document.body.append(ov); const vg = document.createElement("div"); vg.className = "vig"; document.body.append(vg); }

  /* ---------- 操作：點地面走、拖曳轉視角、滾輪／雙指縮放 ---------- */
  let drag = null, pinch = 0; const ptr = new Map(), _sp = new V3();
  const el = renderer.domElement;
  function groundHit() { return ray.ray.intersectPlane(groundPl, _h) ? _h.clone() : null; }
  function nearPick(cx0, cy0) { let best = null, bd = Math.max(42, Math.min(innerWidth, innerHeight) * 0.09);
    for (const m of pickables) { if (!m.parent || m.parent.visible === false) continue; const u = m.userData; if (u.kind === "fix") continue; m.getWorldPosition(_sp); if (_sp.distanceTo(camera.position) > 45) continue; _sp.project(camera); if (_sp.z > 1) continue;
      const d = Math.hypot((_sp.x + 1) / 2 * innerWidth - cx0, (1 - _sp.y) / 2 * innerHeight - cy0); if (d < bd) { bd = d; best = m; } } return best; }
  function tap(cx0, cy0) { if (cut || mode) return; unfocus(); _nd.set(cx0 / innerWidth * 2 - 1, -(cy0 / innerHeight) * 2 + 1); ray.setFromCamera(_nd, camera); const gh = groundHit(), gd = gh ? gh.distanceTo(camera.position) : Infinity;
    const hit = ray.intersectObjects(pickables, false).find((h) => h.object.parent && h.object.parent.visible !== false && h.distance < gd + 2); const obj = hit ? hit.object : nearPick(cx0, cy0);
    if (obj) { const u = obj.userData;
      if (u.kind === "fix") { fixTap(u.ref); return; }
      if (u.kind === "cx") { if (cx.tap(u.ref, [P.x, P.z]) === "far") { const p = cx.pos(u.ref); goNear(p.x, p.z, 1.4); } return; }
      if (u.kind === "mg") { if (mg.tap(u.ref, [P.x, P.z]) === "far") { const p = mg.pos(u.ref); goNear(p.x, p.z, 1.6); } return; }
      if (u.kind === "folk") { const f = folks[u.ref]; if (Math.hypot(P.x - f.x, P.z - f.z) < 9) { talk(f, performance.now() / 1000); return; } goNear(f.x, f.z, 1.6); return; }
      if (u.kind === "ev") { const e = evs[u.ref]; if (e.state !== "wait") return; setMode("free"); toast(e.kind === "lamp" ? L("拿起筆了：在石燈上畫一個圈，它就會亮。", "Brush in hand: draw a circle around the stone lantern to light it.") : L("拿起筆了：沿著墨蝶飛的路描一筆。", "Brush in hand: trace a stroke along the ink butterfly's path."), 4200); return; }
      if (u.kind === "person") { const F = folkIn[u.ref]; if (Math.hypot(P.x - F.x, P.z - F.z) < 9) { const met = album.state().met || {}; if (met[u.ref]) { const I = PEOPLE[u.ref]; say(L(`「${I.line[0]}」`, `"${I.line[1]}"`), L(I.name[0], I.name[1]), 5000); F.face = 3; } else meet(u.ref); return; } goNear(F.x, F.z, 1.6); return; } }
    if (!gh || !walkable(gh.x, gh.z)) { if (gh && !bridgeOn && gh.x > streamX(gh.z) - 2.5 && Math.hypot(gh.x, gh.z) < LAND) toast(L("石拱橋的墨淡了，過不去。", "The stone bridge has faded — you can't cross yet.")); return; }
    fixGo = null; P.stuck = 0; P.tx = gh.x; P.tz = gh.z; markAt(gh.x, gh.z); }
  function goNear(x, z, off) { const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz) || 1; let tx = x + dx / d * off, tz = z + dz / d * off; if (!walkable(tx, tz)) { tx = x; tz = z; } if (!walkable(tx, tz)) return;
    fixGo = null; P.stuck = 0; P.tx = tx; P.tz = tz; markAt(tx, tz); }
  const endPtr = (e) => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (drag && !drag.turning && e.type === "pointerup") tap(e.clientX, e.clientY); if (ptr.size === 0) { drag = null; pinch = 0; } };
  el.addEventListener("pointerdown", (e) => { if (e.isPrimary) { ptr.clear(); pinch = 0; drag = null; } try { el.setPointerCapture(e.pointerId); } catch (er) { }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0, turning: false }; else if (ptr.size === 2) { const p = [...ptr.values()]; pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); drag = null; } });
  el.addEventListener("pointermove", (e) => { if (!ptr.has(e.pointerId)) return; const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const p = [...ptr.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (pinch) cam.want = Math.max(4, Math.min(70, cam.want * pinch / d)); pinch = d; return; }
    if (!drag) return; const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    if (drag.moved > 16) { drag.turning = true; cam.yaw -= dx * 0.0045; cam.pitch = Math.max(-1.1, Math.min(1.35, cam.pitch + dy * 0.004)); } });
  el.addEventListener("pointerup", endPtr); el.addEventListener("pointercancel", endPtr); el.addEventListener("lostpointercapture", endPtr);
  el.addEventListener("wheel", (e) => { e.preventDefault(); cam.want = Math.max(4, Math.min(70, cam.want * (e.deltaY > 0 ? 1.12 : 0.89))); }, { passive: false });
  const normalFov = () => innerWidth / innerHeight < 0.8 ? 62 : 50;
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; if (!cut) camera.fov = normalFov(); camera.updateProjectionMatrix(); }

  /* ---------- 過場（熊 2026-11-23 第二版：「旁邊要是星際宇宙」「畫卷由單一邊拉開，轉動的時候上面的東西一個一個立起來」）----------
   * 一、深色的宇宙、星星、遠處一顆帶環的星球；整座城捲成一卷畫，直直立在太空裡。
   * 二、按「穿過星門」：畫卷從左邊那一端被拉開，城裡的東西平平地畫在紙上。
   * 三、整幅畫往後倒、轉成平放；轉的時候，紙上的東西從中間往外一個一個立起來。
   * 四、天從宇宙變回紙色，遠山、日、霧淡進來；鏡頭俯衝進畫裡，接到你站的地方。每次都播，「略過」一直按得到。 */
  const CUT_T = { unroll: 2.6, tilt: 2.7, tiltDur: 2.8, sky: 5.3, skyDur: 1.4, dive: 6.5, end: 9.0 }, SHEET = LAND + 6, SPACE = new THREE.Color("#10131f"), PAPER_C = new THREE.Color(PAPER);
  let space = null, spaceMats = [], townRoot = null, sheetG = null, cutItems = null, cutFar = null, skyMesh = null, savedFog = null, roll = null, sheetMesh = null, skyOp = null;
  function buildSpace() { space = new THREE.Group(); scene.add(space); const r = rngOf(88), add = (o) => { space.add(o); const m = o.material; m.transparent = true; spaceMats.push([m, m.opacity]); return o; };
    { const n = 1600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = Math.acos(r() * 2 - 1), d = 800 + r() * 500; pos.set([Math.sin(b) * Math.cos(a) * d, Math.cos(b) * d, Math.sin(b) * Math.sin(a) * d], i * 3); const w = 0.7 + r() * 0.3, g = r() < 0.15; col.set(g ? [1, 0.85 * w, 0.55 * w] : [w, w, w * 1.05], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }))); }
    for (const [x, y, z, sc, c, op] of [[-500, 300, -900, 900, "#3a3f6a", 0.35], [600, -100, -800, 700, "#5a3a52", 0.28], [100, 500, -700, 600, "#2f4a5a", 0.3]]) { const n = spr(softT, c, sc, op, { fog: false, depthWrite: false }); n.position.set(x, y, z); add(n); }
    const pl = add(new THREE.Mesh(new THREE.SphereGeometry(210, 48, 32), new THREE.MeshBasicMaterial({ color: "#8a8f9c", map: brushT, fog: false }))); pl.position.set(-160, -330, -720);
    const rg = add(new THREE.Mesh(new THREE.RingGeometry(270, 380, 120), new THREE.MeshBasicMaterial({ color: "#c9b892", map: brushT, side: THREE.DoubleSide, opacity: 0.55, fog: false, depthWrite: false }))); rg.position.copy(pl.position); rg.rotation.set(-1.2, 0.25, 0.35);
    const mo = add(new THREE.Mesh(new THREE.SphereGeometry(38, 32, 20), new THREE.MeshBasicMaterial({ color: "#d8d0c0", map: brushT, fog: false }))); mo.position.set(420, 220, -760);
    const sn = spr(canvasTex(128, 128, (c) => { c.fillStyle = CINNABAR; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); }), "#ffffff", 70, 0.95, { fog: false }); sn.position.set(-520, 260, -820); add(sn); }
  /* 城裡每樣東西搬進一個「畫卷」群組，平平地畫在紙上 */
  function prepCut() { skyMesh = scene.children.find((o) => o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 1000); if (skyMesh) { skyOp = [skyMesh.material.opacity, skyMesh.material.transparent]; skyMesh.visible = false; }
    savedFog = [scene.fog.near, scene.fog.far]; scene.fog.near = 5000; scene.fog.far = 9000; scene.background = SPACE.clone(); buildSpace();
    townRoot = new THREE.Group(); cutItems = []; cutFar = []; const colOf = new Map(); marks.forEach((q) => { if (q.m.c) colOf.set(q.g, q.m.c); }); strokes.forEach((st) => { const c = strokeOf(st.id).c; if (c) colOf.set(st.g, c); }); const bb = new THREE.Box3(), sz = new V3(), ct = new V3(), hr = rngOf(5150);
    for (const o of scene.children.slice()) { if (o === skyMesh || o === space || o.isLight || o === wxPts || o === ground) continue;
      const mt = o.material; if (mt && mt.fog === false) { cutFar.push({ m: mt, op: mt.opacity, tr: mt.transparent }); mt.transparent = true; mt.opacity = 0; continue; }
      if (o.isSprite && !o.visible) continue; bb.setFromObject(o); if (bb.isEmpty()) continue; bb.getSize(sz); bb.getCenter(ct); if (Math.hypot(ct.x, ct.z) > SHEET + 4) continue;
      const tall = !o.isSprite && sz.y > 0.6, d = Math.min(1, Math.hypot(ct.x, ct.z) / SHEET), cq = INKS.find((q) => q[0] === colOf.get(o));
      cutItems.push({ o, tall, col: cq ? cq[3] : null, spr: !!o.isSprite, x: ct.x, ts: CUT_T.tilt + 0.25 + (d * 0.85 + hr() * 0.15) * CUT_T.tiltDur, s: o.scale.clone(), rx: o.rotation.x, py: o.position.y, pz: o.position.z, base: bb.min.y, off: o.position.y - bb.min.y, vis: o.visible }); townRoot.add(o); }
    ground.visible = false;
    /* 紙、裱邊、左邊固定的軸、右邊捲著的那一卷 */
    sheetG = new THREE.Group(); townRoot.add(sheetG); const pt = groundT.clone(); pt.repeat.set(5, 5); pt.needsUpdate = true;
    const sg = new THREE.PlaneGeometry(2 * SHEET, 2 * SHEET); sg.rotateX(-Math.PI / 2); sg.translate(SHEET, 0, 0); sheetMesh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: pt, side: THREE.DoubleSide })); sheetMesh.position.set(-SHEET, -0.15, 0); sheetG.add(sheetMesh);
    const silk = new THREE.MeshBasicMaterial({ color: "#8f8676", map: brushT }); for (const zz of [-SHEET - 1.5, SHEET + 1.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2 * SHEET, 0.2, 3), silk); b.geometry.translate(SHEET, 0, 0); b.position.set(-SHEET, -0.1, zz); sheetMesh.add(b); b.position.set(0, 0.05, zz); }
    const rodM = new THREE.MeshBasicMaterial({ color: "#4a3220" }), knob = (g, z) => { const k = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), rodM); k.position.z = z; g.add(k); };
    const rodL = new THREE.Group(); rodL.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2 * SHEET + 10, 14).rotateX(Math.PI / 2), rodM)); knob(rodL, SHEET + 5); knob(rodL, -SHEET - 5); rodL.position.set(-SHEET, 0.6, 0); sheetG.add(rodL);
    roll = new THREE.Group(); const rb = outline(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2 * SHEET + 3, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#e9e0cc", map: brushT })), 0.03); roll.add(rb);
    roll.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2 * SHEET + 10, 14).rotateX(Math.PI / 2), rodM)); knob(roll, SHEET + 5); knob(roll, -SHEET - 5); sheetG.add(roll);
    scene.add(townRoot); townRoot.rotation.x = Math.PI / 2; unrollTo(0.015); cutPose(0); }
  function unrollTo(u) { const xe = -SHEET + 2 * SHEET * u; sheetMesh.scale.x = Math.max(0.002, u); roll.position.set(xe + 4, 4, 0); roll.rotation.z = -u * 2 * SHEET / 4;
    for (const it of cutItems) it.o.visible = it.vis && it.x < xe - 1; }
  const backOut = (k) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  function cutPose(T) { for (const it of cutItems) { const o = it.o, k = Math.max(0, Math.min(1, (T - it.ts) / 0.7));
      if (!it.tall && !it.spr) continue; if (k >= 1) { o.scale.copy(it.s); o.rotation.x = it.rx; o.position.y = it.py; o.position.z = it.pz; continue; } const b = k <= 0 ? 0.002 : Math.max(0.002, backOut(k));
      if (it.tall) { const a = Math.PI / 2 * (1 - (k <= 0 ? 0 : backOut(k)));   /* 立體書：平躺在紙上（側面朝外），轉起來站好 */
        o.scale.copy(it.s); o.rotation.x = it.rx - a; o.position.y = it.base + it.off * Math.cos(a); o.position.z = it.pz - it.off * Math.sin(a); } else o.scale.copy(it.s).multiplyScalar(b); } }
  function cutRestore() { if (cutItems) { for (const it of cutItems) { const o = it.o; o.scale.copy(it.s); o.rotation.x = it.rx; o.position.y = it.py; o.position.z = it.pz; o.visible = it.vis; scene.add(o); } cutItems = null; }
    if (townRoot) { scene.remove(townRoot); townRoot = null; } if (cutFar) { for (const f of cutFar) { f.m.opacity = f.op; f.m.transparent = f.tr; } cutFar = null; }
    if (space) { scene.remove(space); space = null; spaceMats = []; } scene.background = null; if (savedFog) { scene.fog.near = savedFog[0]; scene.fog.far = savedFog[1]; savedFog = null; }
    if (skyMesh) { skyMesh.visible = true; if (skyOp) { skyMesh.material.opacity = skyOp[0]; skyMesh.material.transparent = skyOp[1]; } }
    ground.visible = true; ground.material.transparent = false; ground.material.opacity = 1; }
  const _ca = new V3(), _cb = new V3(), _cc = new V3();
  function endCut() { if (!cut) return; cut = null; cutRestore(); camera.fov = normalFov(); camera.updateProjectionMatrix(); $("#gate").hidden = true; document.body.classList.remove("cutting"); const h = $("#hint"); h.classList.remove("off"); setTimeout(() => h.classList.add("off"), 12000); setTimeout(arrive, 900); }
  function runCut(dt, fpos, flook) { cut.t += dt; const T = cut.t; if (!townRoot) prepCut();
    camera.aspect = innerWidth / innerHeight; const fv = camera.fov * Math.PI / 360, fh = Math.atan(Math.tan(fv) * camera.aspect), Dfit = 0.8 * SHEET / Math.tan(Math.min(fv, fh)), H0 = camera.aspect < 0.8 ? [0, 85, 110] : [0, 52, 72];
    if (cut.ph === "wait") { const a = Math.sin(T * 0.12) * 0.55; camera.position.set(-SHEET + Math.sin(a) * Dfit * 0.75, 8 + Math.sin(T * 0.2) * 4, Math.cos(a) * Dfit * 0.75); camera.lookAt(-SHEET + 6, 0, 0); townRoot.position.y = Math.sin(T * 0.6) * 1.2; return; }
    /* 二、從左邊那一端拉開 */
    const ku = ease(Math.min(1, T / CUT_T.unroll)); unrollTo(Math.max(0.015, ku)); townRoot.position.y *= 0.95;
    const kt = ease(Math.max(0, Math.min(1, (T - CUT_T.tilt) / CUT_T.tiltDur))); townRoot.rotation.x = Math.PI / 2 * (1 - kt);
    if (T >= CUT_T.tilt && !cut.tilted) { cut.tilted = true; audio.stroke(); }
    cutPose(T); if (cutItems.some((it) => it.tall && T > it.ts && T - dt <= it.ts)) audio.dab();
    for (const it of cutItems) if (it.col && T > it.ts && T - dt <= it.ts) blotAt(it.o.getWorldPosition(new V3()).setY(1), 9, it.col);   /* 上了色的東西立起來時，原地暈開一團同色的墨 */
    /* 四、宇宙變回紙色 */
    const ks = Math.max(0, Math.min(1, (T - CUT_T.sky) / CUT_T.skyDur)); scene.background.copy(SPACE).lerp(PAPER_C, ks); for (const [m, op] of spaceMats) m.opacity = op * (1 - ks); for (const f of cutFar) f.m.opacity = f.op * ks;
    if (ks > 0) { if (skyMesh) { skyMesh.visible = true; skyMesh.material.transparent = true; skyMesh.material.opacity = ks; } ground.visible = true; ground.material.transparent = true; ground.material.opacity = ks; }
    /* 鏡頭：跟著拉開的那一端 → 正面看整幅 → 跟著倒下去變俯瞰 → 俯衝進畫裡 */
    const cx = -SHEET * (1 - ku) * 0.9; _ca.set(cx, 0, Dfit * (1.15 - 0.15 * ku)); _cb.set(cx, 0, 0);
    if (kt > 0) { _ca.lerp(_cc.set(...H0), kt); _ca.y += Math.sin(kt * Math.PI) * 25; }
    const kv = ease(Math.max(0, Math.min(1, (T - CUT_T.dive) / (CUT_T.end - CUT_T.dive)))); if (kv > 0) { _ca.lerp(fpos, kv); _cb.lerp(flook, kv); const kf = kv * kv; scene.fog.near = 5000 + (savedFog[0] - 5000) * kf; scene.fog.far = 9000 + (savedFog[1] - 9000) * kf; }   /* 霧等鏡頭衝下去才回來，不然整幅畫會白掉 */
    camera.position.copy(_ca); camera.lookAt(_cb); if (T >= CUT_T.end) endCut(); }
  if (cut) { $("#gate").hidden = false; document.body.classList.add("cutting"); $("#hint").classList.add("off");
    $("#gGo").textContent = L("🌀 穿過星門", "🌀 Through the star gate"); $("#gSub").textContent = L("訊號從一幅沒畫完的畫裡傳來。", "The signal comes from inside an unfinished painting."); $("#gTitle").textContent = L("留白城", "LIUBAI"); $("#gSkip").textContent = L("略過 ›", "Skip ›");
    $("#gGo").onclick = (e) => { e.stopPropagation(); audio.gesture(); audio.fall(); cut.ph = "run"; cut.t = 0; $("#gate").classList.add("running"); };
    $("#gSkip").onclick = (e) => { e.stopPropagation(); audio.gesture(); endCut(); }; }
  else setTimeout(arrive, 900);
  addEventListener("resize", resize); resize();

  if (FS && FS.paintState) FS.paintState().marks.forEach((m) => buildMark(m, false));
  $("#place").textContent = L("留白城", "Liubai"); showGrowth(); bar();
  $("#hint").textContent = L("點地面走過去 · 拖曳轉視角 · 右上角「筆」可以在畫裡隨手畫 · 「印」是你收集的印譜 · 朱紅的「修」是壞掉的地方", "Tap the ground to walk · drag to turn · \"Brush\" (top right) lets you draw into the painting · 印 is your seal album · the red 修 marks something broken");
  if (!cut) setTimeout(() => $("#hint").classList.add("off"), 14000);
  window.__sleSnap = () => { try { renderer.render(scene, camera); const c = renderer.domElement; return { url: c.toDataURL("image/jpeg", 0.9), w: c.width, h: c.height, place: $("#place") ? $("#place").textContent : "" }; } catch (e) { return null; } };
  $("#loading").remove(); sndLabel(); $("#snd").onclick = (e) => { e.stopPropagation(); audio.toggle(); sndLabel(); toast(audio.on ? L("♪ 聲音打開了", "♪ Sound on") : L("聲音關掉了", "Sound off"), 1800); };
  const perf = { n: 0, sum: 0, max: 0 };
  if (QS.has("dbg")) window.__ink = { P, cam, strokes: () => strokes.map((s) => ({ i: s.i, id: s.id, rev: !!s.rev })), ev: () => evs.map((e) => ({ i: e.i, kind: e.kind, x: +e.x.toFixed(1), z: +e.z.toFixed(1), state: e.state })),
    go: (x, z) => { P.x = x; P.z = z; P.tx = P.tz = null; return [x, z, walkable(x, z)]; }, finish: (i) => { finish(evs[i]); return evs[i].state; }, cutT: () => cut && { ph: cut.ph, t: +cut.t.toFixed(2), n: cutItems ? cutItems.length : -1 }, cutSet: (t) => { if (cut) { cut.ph = "run"; cut.t = t; } return !!cut; }, sketch: () => sketch && { base: sketch.base, k: +sketch.k.toFixed(2), n: sketch.pts.length, lines: sketch.lines.length, x: sketch.x, z: sketch.z, cy: +sketch.c.y.toFixed(2), r: +sketch.r.toFixed(2) }, focus: () => focus, guideScr: () => sketch ? sketch.lines.map((L2) => L2.map((i) => { _sv.copy(sketch.pts[i]).project(camera); return [Math.round((_sv.x + 1) / 2 * innerWidth), Math.round((1 - _sv.y) / 2 * innerHeight)]; })) : null, mode: () => mode, setMode,
    traceAll: (speed = 500) => { if (!sketch) return null; setMode("trace"); sketch.hit = sketch.pts.map(() => true); sketch.speeds.push(speed); sketch.k = 1; sketchShow(1); inkDone(); return strokes.length; },
    traceAt, free: (st) => freeStroke(st), scr: (x, y, z) => { _sv.set(x, y, z).project(camera); return [Math.round((_sv.x + 1) / 2 * innerWidth), Math.round((1 - _sv.y) / 2 * innerHeight)]; }, marks: () => marks.map((q) => q.m.k), people: () => Object.keys(folkIn), meet, album, arrive, WX: () => WX, scrollCheck,
    paintAll: (d = 2) => { Object.keys(STROKE).forEach((k, i) => { if (!strokes.some((s) => s.i === i)) addStroke(i, `${k}@${d}`, false); }); checkAll(); showGrowth(); return strokes.length; },
    fix: () => Object.values(fixSites).map((S) => ({ id: S.id, k: +S.kt.toFixed(2), done: S.done })), fixAt: (id, off = 4.4) => { const S = fixSites[id]; P.x = S.x - off; P.z = S.z; P.tx = P.tz = null; return [S.x, S.z]; }, fixTap: (id) => { fixTap(id); return fixes.isOpen; }, plq: (k) => { const S = fixSites.plaque; S.k = S.kt = k; S.done = k >= 1; return 1; }, inkNow: () => inkNow(), markCols: () => marks.map((q) => { const c = []; q.g.traverse((o) => { if (o.isMesh && o.material && o.material.color && !o.userData.outline) c.push(o.material.color.getHexString()); }); return q.m.k + ":" + q.m.c + ":" + c.slice(0, 3).join(","); }),
    calliTest: () => { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 192; const c = cv.getContext("2d"); c.fillStyle = "#efe6d2"; c.fillRect(0, 0, 512, 192); calli(c, "留", 286, 22, 150, 1, 11); calli(c, "白", 74, 24, 146, 1, 23); return cv.toDataURL(); },
    poster: (id) => { makePoster(id); return 1; }, story: () => { tellStory(true); return 1; }, tap, walkable,
    perf: () => ({ avgMs: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, maxMs: +perf.max.toFixed(1), n: perf.n, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }), resetPerf: () => { perf.n = perf.sum = perf.max = 0; return 1; }, cut: () => cut && cut.ph };

  /* ---------- 每一格 ---------- */
  const windAt = (t) => Math.pow(0.5 + 0.5 * Math.sin(t / WIND_T * Math.PI * 2), 3);
  let last = performance.now(); const _p = new V3(), _q = new V3(), _look = new V3();
  function frame(now) { requestAnimationFrame(frame); const raw = Math.min(0.25, (now - last) / 1000), dt = Math.min(0.05, raw), t = now / 1000; last = now; const f0 = performance.now();
    let moving = 0; const px0 = P.x, pz0 = P.z;
    if (!cut && P.tx !== null) { const dx = P.tx - P.x, dz = P.tz - P.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { P.tx = P.tz = null; } else { const v = Math.min(d, 6 * dt); let nx = P.x + dx / d * v, nz = P.z + dz / d * v;
        for (const o of obstacles) { if (!(o.r > 0)) continue; const ox = nx - o.x, oz = nz - o.z, od = Math.hypot(ox, oz); if (od < o.r) { const k = (o.r - od) / (od || 1); nx += ox * k; nz += oz * k; } }
        if (walkable(nx, nz)) { P.x = nx; P.z = nz; } else if (walkable(nx, P.z)) P.x = nx; else if (walkable(P.x, nz)) P.z = nz;
        av.rotation.y = Math.atan2(dx, dz); moving = 1; } }
    if (P.tx !== null) { P.stuck = Math.hypot(P.x - px0, P.z - pz0) < 6 * dt * 0.2 ? (P.stuck || 0) + dt : 0; if (P.stuck > 0.35) { P.tx = P.tz = null; P.stuck = 0; fixGo = null; moving = 0; } }
    me.position.set(P.x, 0, P.z); animatePerson(av, t, moving ? 2 : 0); nameTag.userData.tick(t); mark.material.opacity = Math.max(0, mark.material.opacity - dt * 0.6);
    const wind = windAt(t); audio.breeze(wind); waterT.offset.y = -(t * 0.05) % 1;
    for (const m of mist) { m.a += m.v * dt; m.s.position.x = Math.cos(m.a) * m.d; m.s.position.z = Math.sin(m.a) * m.d; }
    /* 添上去的筆：墨慢慢滲開；各自的小動作 */
    for (const s of strokes) {
      if (s.rev) { s.rev.t += dt; const k = ease(Math.min(1, s.rev.t / 3.2)); s.mats.forEach(([m, op]) => { m.opacity = op * k; }); if (s.blot) { s.blot.scale.setScalar(2 + k * 14); s.blot.material.opacity = 0.9 * (1 - k); }
        if (k >= 1) { s.rev = null; s.mats.forEach(([m, op]) => { m.opacity = op; if (op >= 1) m.transparent = false; }); s.wobs.forEach((o) => tog(o, true)); if (s.blot) { scene.remove(s.blot); s.blot = null; } unstick(); } }
      const u = s.g.userData;
      if (u.smoke) u.smoke.forEach((q) => { const k = (t * 0.12 + q.ph) % 1; q.s.position.set(0.8 + Math.sin(k * 6) * 0.4 + wind * k, 3.3 + k * 6, 0); q.s.material.opacity = 0.35 * (1 - k); q.s.scale.setScalar(1 + k * 3); });
      if (u.boat) { u.boat.position.y = 0.25 + Math.sin(t * 0.9) * 0.06; u.boat.rotation.y = Math.sin(t * 0.2) * 0.5; }
      if (u.cranes) u.cranes.forEach((q) => { q.a += q.v * dt; q.s.position.set(Math.cos(q.a) * q.rr, q.h + Math.sin(t + q.a) * 0.6, Math.sin(q.a) * q.rr); q.s.material.rotation = Math.sin(t * 3 + q.a) * 0.15; });
      if (u.kites) u.kites.forEach((q) => { const x = Math.cos(q.a + t * 0.1) * q.rr, y = q.h + Math.sin(t * 0.7 + q.a) * 0.8 + wind, z = Math.sin(q.a + t * 0.1) * q.rr; q.s.position.set(x, y, z); q.s.material.rotation = Math.sin(t * 1.3 + q.a) * 0.3; q.ln.geometry.setFromPoints([new V3(0, 1.4, 0), new V3(x, y - 0.6, z)]); }); }
    for (const q of blots) { if (q.t < 1.4) { q.t += dt; const k = q.t / 1.4; q.b.scale.setScalar(q.s * (0.5 + k * 1.8)); q.b.material.opacity = 0.85 * (1 - k); } else if (q.b.visible) q.b.visible = false; }
    for (const it of marks) { if (it.rev) { it.rev.t += dt; const k = ease(Math.min(1, it.rev.t / 2.2)); it.rev.mats.forEach(([m, op]) => { m.opacity = op * k; }); if (k >= 1) { it.rev.mats.forEach(([m, op]) => { m.opacity = op; }); it.rev = null; } } if (it.anim) it.anim(t); }
    if (wxPts) { const sp = WX === "rain" ? 22 : 1.6; for (let i = 0; i < wxN; i++) { let y = wxPos[i * 3 + 1] - sp * dt; if (y < 0) { y += 34; wxPos[i * 3] = P.x + (R0() - 0.5) * 70; wxPos[i * 3 + 2] = P.z + (R0() - 0.5) * 70; } wxPos[i * 3 + 1] = y; if (WX === "snow") wxPos[i * 3] += Math.sin(t + i) * dt * 0.4; } wxPts.geometry.attributes.position.needsUpdate = true; }
    for (const F of Object.values(folkIn)) { F.p.position.y = Math.sin(t * 1.2 + F.ph) * 0.02; if (F.mk.material.opacity > 0) F.mk.position.y = 2.3 + Math.sin(t * 2 + F.ph) * 0.12; if (F.face > 0) { F.face -= dt; const want = Math.atan2(P.x - F.x, P.z - F.z); let dy = want - F.p.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); F.p.rotation.y += dy * Math.min(1, dt * 4); } }
    for (const f of folks) { f.p.position.y = Math.sin(t * 1.3 + f.ph) * 0.02; if (f.face > 0) { f.face -= dt; const want = Math.atan2(P.x - f.x, P.z - f.z); let dy = want - f.p.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.p.rotation.y += dy * Math.min(1, dt * 4); } }
    for (const e of evs) {
      if (e.state === "wait") { if (e.kind === "moth") { const a = e.a0 + t * e.w; e.x = Math.cos(a) * e.r; e.z = Math.sin(a) * e.r; e.g.position.set(e.x, 1.4 + Math.sin(t * 2.3 + e.ph) * 0.5, e.z); e.m.scale.set(1.1 * (0.6 + Math.abs(Math.sin(t * 9 + e.ph)) * 0.4), 1.1, 1);
          if (!cut && Math.hypot(P.x - e.x, P.z - e.z) < 1.9) finish(e); } }
      else if (e.state === "go") { e.t += dt; const k = Math.min(1, e.t / 3);
        if (e.kind === "lamp") { e.gl.material.opacity = 0.6 * k; if (k > 0.2 && !e.lit) { e.lit = true; e.box.material = new THREE.MeshBasicMaterial({ color: "#ffd8a8" }); } }
        else { e.g.position.y += dt * (1.5 + k * 6); e.m.material.opacity = 0.95 * (1 - k); }
        if (k >= 1) { e.state = "done"; if (e.kind !== "lamp") e.g.visible = false; } } }
    if (!cut) fixFrame(t, dt); togetherFrame(t, dt); cx.tick(t); mg.tick(t);
    /* 鏡頭 */
    cam.dist += (cam.want - cam.dist) * Math.min(1, dt * 1.6);
    fk = Math.max(0, Math.min(1, fk + (focus ? dt : -dt) * 1.4)); const base = _q.set(P.x, 1.6, P.z); if (fk > 0) base.lerp(_fp, ease(fk)); drawGuides(t); const pit = Math.max(0.06, cam.pitch), lift = Math.max(0, 0.06 - cam.pitch), cp = Math.cos(pit); let D = cam.dist;
    for (let tries = 0; tries < 7; tries++) { _p.set(base.x + Math.sin(cam.yaw) * cp * D, base.y + Math.sin(pit) * D, base.z + Math.cos(cam.yaw) * cp * D); let inside = false;
      const ns = Math.max(6, Math.ceil(D / 1.5)); for (let k = 1; k <= ns && !inside; k++) { const f = k / ns, qx = base.x + (_p.x - base.x) * f, qy = base.y + (_p.y - base.y) * f, qz = base.z + (_p.z - base.z) * f;
        for (const o of obstacles) if (o.r > 0 && qy < o.h + 0.6 && Math.hypot(qx - o.x, qz - o.z) < o.r + 0.5) { inside = true; break; } }
      if (!inside || D < 1.5) break; D *= 0.78; }
    if (_p.y < 0.6) _p.y = 0.6;
    _look.copy(base); _look.y += lift * 3.2 * D;
    if (cut) runCut(raw, _p, _look); else { camera.position.copy(_p); camera.lookAt(_look); }
    renderer.render(scene, camera);
    const ms = performance.now() - f0; if (!cut) { perf.n++; perf.sum += ms; if (ms > perf.max) perf.max = ms; } }
  requestAnimationFrame(frame);
})();
