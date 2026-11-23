/* 鳴沙城（2026-11-23，熊：「第七座直接全部做完；要宏大絢麗、一般人想像不到的方式、由你創造、要有聲音」）
 * - 星光走了幾萬年，最後落在一面浮在星雲裡的巨大銅盤上，變成金色的沙。
 * - 銅盤被某個音震動時，沙會被震離會動的地方，停在完全不動的線上，排出圖案（克拉尼圖形，真的物理）。這些圖案就是城的街。
 * - 「調」：左右拖滑桿，替銅盤掃過不同的音；靠近共鳴點，沙開始跳、排出聲紋；停在最整齊的地方，就「定音」，收進聲紋譜（30 種）。
 * - 會長大：每天第一次來，銅盤會想唱一個聲紋（看玩家上次來之後的日子：記帳的類別、學習、玩）；把它定下來，那個聲紋就沿著節線結晶成一圈發光的塔，
 *   顏色跟著那段日子。每個人的鳴沙城，長出來的圖案、顏色都不一樣。來過的天數 → 繞著盤子的小月；晚上來過幾次 → 極光的亮度。
 * - 每天五件小事：接流星、敲石磬。三處要修：啞了的大鐘、斷了弦的天琴、停擺的節拍塔。三處修好，調音師講第七章。
 * 預覽：?day=YYYY-MM-DD、?nocut、?dbg（window.__ms）
 */
import { finAvatar, makePerson, animatePerson } from "../city/city-people.js";
import { createRepair } from "../city/repair.js";
import { makeTrio } from "../city/cityx.js";
import { makeGames } from "../city/minigame.js";
import { makeNameTag, playerName } from "../city/nametag.js";
import { NIKO_LOOK, makeFigure, tickFigure, tourLink, invitePanel, makeCard, cardPanel } from "../city/together.js";
import { growStart, storyCard, BUCKETS } from "../city/grow.js";
import { MODES, modeByKey, Z, response, figure, nodalPoints, WIDTH } from "./chladni.js";
import { createSandAudio } from "./sand-audio.js";
try { if (window.parent !== window) document.body.classList.add("embed"); } catch (e) { document.body.classList.add("embed"); }

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
const $ = (s) => document.querySelector(s);
const I18N = window.SLE_I18N || { lang: "zh" };
const L = (zh, en) => (I18N.lang === "en" ? en : zh);
const QS = new URLSearchParams(location.search);
const SMALL = Math.min(innerWidth, innerHeight) < 600;
const CITY = "mingsha";
let toastT = 0, sayT = 0;
function toast(m, ms = 3600) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms); }
function say(m, who, ms = 5600) { const t = $("#say"); t.textContent = m; if (who) { const s = document.createElement("small"); s.textContent = "— " + who; t.append(s); } t.classList.add("show"); clearTimeout(sayT); sayT = setTimeout(() => t.classList.remove("show"), ms); }
function todayStr() { const q = QS.get("day"); if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q; const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
function seedOf(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; }
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DAY = todayStr(), rnd = rngOf(seedOf(CITY + ":" + DAY));
const PLATE = 70, WALK = 66, SANDR = 30, GOLD = "#f2c86a";
const FS = window.FinSave && FinSave.ok() ? FinSave : null, ST0 = FS && FS.starState ? FS.starState(CITY) : { got: [], n: 0, days: 0 };
const audio = createSandAudio(seedOf(CITY + ":" + DAY));
const sndLabel = () => { const b = $("#snd"); if (b) { b.textContent = "♪"; b.title = audio.on ? L("關掉聲音", "Mute") : L("打開聲音", "Sound on"); b.classList.toggle("off", !audio.on); } };
addEventListener("pointerdown", (e) => { if (!(e.target && e.target.id === "snd")) audio.gesture(); }, { capture: true });
addEventListener("keydown", () => audio.gesture());
document.addEventListener("visibilitychange", () => { if (document.hidden) audio.pause(); else audio.resume(); });
window.__sleSound = (on) => { if (on === false) audio.pause(true); else audio.resume(true); };

/* 每一種生活一個顏色（結晶的顏色）；銅盤今天的「心情」一句話（不說破是哪一種生活） */
const BCOL = { food: "#ffb35c", move: "#6fd6ff", home: "#ff8fb1", save: "#7dffb0", learn: "#b49bff", play: "#ffe066", none: "#fff2d0" };
const WHY = { food: ["銅盤今天有點溫，像剛煮過一鍋湯。", "The plate is a little warm today, like a pot of soup just simmered."], move: ["沙一直往盤邊跑，像想出門。", "The sand keeps drifting to the rim, as if it wants to go somewhere."],
  home: ["今天的低鳴很安靜，像屋裡關了燈。", "Today's hum is quiet, like a house with the lights turned low."], save: ["沙沉得很穩，一粒都不肯多跳。", "The sand has settled deep and steady; not a grain will jump more than it must."],
  learn: ["盤上的刻紋今天特別清楚，像被人一行一行讀過。", "The engravings are unusually clear today, as if someone read them line by line."], play: ["幾粒沙自己跳了起來，像在笑。", "A few grains hop up on their own, as if laughing."],
  none: ["盤子很安靜。今天的聲紋，是星光自己帶來的。", "The plate is quiet. Today's pattern came down with the starlight."] };
const SANDS = [["gold", "星砂金", "Star gold", "#f2c86a", 0], ["silver", "月銀", "Moon silver", "#dfe8ff", 3], ["rose", "霞粉", "Dawn rose", "#ff9ec4", 6], ["azure", "天青", "Sky azure", "#7fd8ff", 10], ["jade", "翠", "Jade", "#8df5b6", 15], ["aurora", "極光", "Aurora", "#c08bff", 22]];
const NAMES = [["阿律", "Lu"], ["小粒", "Grain"], ["老鈞", "Old Jun"], ["弦婆", "Grandma Strings"], ["阿拍", "Beat"]];
const ROLES = [["調音師", "the tuner"], ["拾砂的孩子", "sand-gathering child"], ["守鐘人", "bell keeper"], ["撥弦的人", "string player"], ["數拍子的人", "beat counter"]];
const LINES = [["星光走了好幾萬年，到這裡才停下來。停下來，就變成沙。", "Starlight travels for tens of thousands of years, and stops only here. When it stops, it turns to sand."],
  ["沙不怕吵。它怕的是沒有人唱。", "The sand doesn't mind noise. What it fears is no one singing."],
  ["大鐘裂了以後，盤子只會發抖，排不出形狀。", "Since the great bell cracked, the plate only shivers; it can't make any shapes."],
  ["天琴的弦斷了十三根。風吹過去，聽起來像少了一句話。", "Thirteen strings of the sky harp are broken. When the wind passes, it sounds like a missing sentence."],
  ["節拍塔停了，整座城就不知道現在是什麼時候。", "Since the beat tower stopped, the whole city has lost track of time."],
  ["每一粒沙都記得自己是從哪顆星來的。", "Every grain remembers which star it came from."],
  ["你身上有墨的味道。留白城的畫師也來過這裡。", "You smell of ink. The painter of Liubai came here once too."],
  ["慢慢掃，不要急。沙排得最整齊的那一刻，就是對的音。", "Sweep slowly; don't rush. The moment the sand lines up best — that's the right note."]];

(async function main() {
  let THREE;
  try { THREE = await import(THREE_URL); } catch { $("#loading").textContent = L("鳴沙城需要網路載入 3D。", "Mingsha needs the internet to load 3D."); return; }
  const V3 = THREE.Vector3;
  let renderer = null, cut = QS.has("nocut") ? null : { ph: "wait", t: 0 };
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) { const b = $("#loading"); b.style.pointerEvents = "auto"; b.textContent = L("這個瀏覽器目前無法顯示 3D 城市（WebGL 沒有開啟或顯示卡不支援）。", "This browser can't show the 3D city right now (WebGL is off or unsupported)."); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.6 : 2)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor("#07040f"); renderer.outputColorSpace = THREE.SRGBColorSpace;
  $("#stage").append(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2("#120a22", 0.0011);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 4000);
  scene.add(new THREE.HemisphereLight("#ffe8c8", "#3a2a5a", 1.5)); { const dl = new THREE.DirectionalLight("#ffffff", 1.0); dl.position.set(-30, 60, 40); scene.add(dl); }
  const canvasTex = (w, h, draw) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const ease = (k) => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k), clamp01 = (k) => Math.max(0, Math.min(1, k));
  const dummy = new THREE.Object3D(), R0 = rngOf(seedOf("mingsha-land"));
  const softT = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const dotT = canvasTex(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.7)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
  const ADD = THREE.AdditiveBlending;
  const spr = (map, color, s, op = 1, o = {}) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: op, depthWrite: false, ...o })); sp.scale.setScalar(s); return sp; };
  const bronze = (c = "#8a5a2a") => new THREE.MeshStandardMaterial({ color: c, metalness: 0.75, roughness: 0.35 });
  const glowM = (c, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: ADD, depthWrite: false });

  /* ---------- 天：深紫的宇宙、星、星雲、一顆帶環的巨行星、極光 ---------- */
  { const sky = canvasTex(4, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); [[0, "#04020a"], [0.3, "#0e0824"], [0.46, "#2a1446"], [0.5, "#4a1f52"], [0.54, "#1a0d2c"], [1, "#04020a"]].forEach(([k, col]) => g.addColorStop(k, col)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false }))); }
  { const n = SMALL ? 2600 : 4200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = rngOf(7); for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = Math.acos(r() * 1.9 - 0.9), d = 1300 + r() * 450; pos.set([Math.sin(b) * Math.cos(a) * d, Math.cos(b) * d, Math.sin(b) * Math.sin(a) * d], i * 3);
      const w = 0.55 + r() * 0.45, k = r(); col.set(k < 0.12 ? [1, 0.8 * w, 0.5 * w] : k < 0.24 ? [0.6 * w, 0.8 * w, 1] : [w, w, w], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }))); }
  for (const [x, y, z, s, c, op] of [[-900, 300, -1200, 1500, "#5a2cff", 0.3], [900, 200, -1100, 1300, "#ff3f9a", 0.22], [200, 600, -1300, 1200, "#1fc8ff", 0.2], [-300, -50, 1300, 1400, "#8a2cff", 0.22], [1200, 100, 600, 1000, "#ff9a3c", 0.15]]) { const n = spr(softT, c, s, op, { fog: false, blending: ADD }); n.position.set(x, y, z); scene.add(n); }
  { const bandT = canvasTex(64, 512, (c, w, h) => { const r = rngOf(31); for (let y = 0; y < h; y += 2) { const k = r(), cc = k < 0.3 ? [214, 140, 90] : k < 0.6 ? [150, 90, 140] : k < 0.85 ? [240, 200, 150] : [90, 60, 120]; c.fillStyle = `rgb(${cc.join(",")})`; c.fillRect(0, y, w, 2 + Math.floor(r() * 6)); } });
    const gp = new THREE.Mesh(new THREE.SphereGeometry(300, 64, 40), new THREE.MeshBasicMaterial({ map: bandT, fog: false })); gp.position.set(-820, 160, -1250); gp.rotation.z = 0.35; scene.add(gp);
    const shade = new THREE.Mesh(new THREE.SphereGeometry(302, 64, 40), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.55, fog: false, side: THREE.FrontSide })); shade.position.copy(gp.position); shade.scale.set(1, 1, 0.98); shade.position.x += 60; shade.position.z += 40; scene.add(shade);
    const ringT = canvasTex(512, 8, (c, w) => { const r = rngOf(9); for (let x = 0; x < w; x++) { const a = 0.15 + r() * 0.5 * (0.5 + 0.5 * Math.sin(x * 0.05)); c.fillStyle = `rgba(240,210,170,${a})`; c.fillRect(x, 0, 1, 8); } });
    const rg = new THREE.Mesh(new THREE.RingGeometry(380, 620, 160, 1), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    { const p = rg.geometry.attributes.position, uv = rg.geometry.attributes.uv; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, (r - 380) / 240, 0.5); } }
    rg.position.copy(gp.position); rg.rotation.set(-1.25, 0.2, 0.35); scene.add(rg); }
  /* 極光：三條會飄的光帶（晚上來過越多次越亮） */
  const auroraT = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(120,255,200,0)"); g.addColorStop(0.55, "rgba(90,255,190,.55)"); g.addColorStop(0.8, "rgba(160,120,255,.35)"); g.addColorStop(1, "rgba(160,120,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const auroras = [0, 1, 2].map((k) => { const g = new THREE.PlaneGeometry(1400, 260, 90, 1), m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: auroraT, transparent: true, opacity: 0.35, blending: ADD, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    m.position.set(-200 + k * 250, 330 + k * 60, -900 + k * 180); m.rotation.y = -0.3 + k * 0.35; scene.add(m); return { m, base: Float32Array.from(g.attributes.position.array), ph: k * 2.1 }; });

  /* ---------- 銅盤：刻著同心圓、星圖、銅綠；底下是倒過來的錐，盤緣一圈光 ---------- */
  const plateT = canvasTex(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048, (c, w) => { const R = w / 2, r = rngOf(51); c.translate(R, R);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, "#b07a40"); g.addColorStop(SANDR / PLATE, "#9a6834"); g.addColorStop(SANDR / PLATE + 0.01, "#6e4622"); g.addColorStop(0.85, "#5a381c"); g.addColorStop(1, "#3a2410"); c.fillStyle = g; c.fillRect(-R, -R, w, w);
    for (let k = 0; k < 900; k++) { const a = r() * 7, d = r() * R, s = 4 + r() * 40; c.fillStyle = `rgba(${r() < 0.5 ? "60,150,130" : "40,20,10"},${r() * 0.08})`; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, 7); c.fill(); }   /* 銅綠和舊痕 */
    for (let k = 0; k < 46; k++) { const rr = R * (0.2 + k / 46 * 0.79); c.strokeStyle = k % 5 === 0 ? "rgba(255,220,160,.28)" : "rgba(20,10,4,.25)"; c.lineWidth = k % 5 === 0 ? 2.5 : 1.2; c.beginPath(); c.arc(0, 0, rr, 0, 7); c.stroke(); }
    c.strokeStyle = "rgba(255,225,170,.35)"; for (let k = 0; k < 360; k += 2) { const a = k * Math.PI / 180, l = k % 30 === 0 ? 0.06 : k % 10 === 0 ? 0.035 : 0.018; c.lineWidth = k % 30 === 0 ? 3 : 1.2; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94); c.lineTo(Math.cos(a) * R * (0.94 - l), Math.sin(a) * R * (0.94 - l)); c.stroke(); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.26, x = Math.cos(a) * R * 0.78, y = Math.sin(a) * R * 0.78, rr = R * 0.055; c.strokeStyle = "rgba(255,220,160,.4)"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke();
      const pts = []; for (let s = 0; s < 4 + (k % 3); s++) pts.push([x + (r() - 0.5) * rr * 1.4, y + (r() - 0.5) * rr * 1.4]); c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.stroke(); pts.forEach(([px, py]) => { c.fillStyle = "rgba(255,240,200,.8)"; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill(); }); }
    c.strokeStyle = "rgba(255,225,170,.5)"; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, R * SANDR / PLATE, 0, 7); c.stroke(); });
  plateT.anisotropy = 4;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(PLATE, 128), new THREE.MeshBasicMaterial({ map: plateT })); plate.rotation.x = -Math.PI / 2; scene.add(plate);
  { const rim = new THREE.Mesh(new THREE.TorusGeometry(PLATE, 1.1, 14, 160), bronze("#c08a40")); rim.rotation.x = Math.PI / 2; scene.add(rim);
    const under = new THREE.Mesh(new THREE.CylinderGeometry(PLATE, 22, 26, 96, 1, true), bronze("#4a2e18")); under.position.y = -13; scene.add(under);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(22, 30, 48), bronze("#3a2414")); tip.rotation.x = Math.PI; tip.position.y = -41; scene.add(tip);
    const glow = spr(softT, "#ffb060", 260, 0.35, { blending: ADD }); glow.position.y = -40; scene.add(glow);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(PLATE + 1.4, 0.18, 6, 200), glowM(GOLD, 0.8)); edge.rotation.x = Math.PI / 2; edge.position.y = 0.5; scene.add(edge);
    const plaza = new THREE.Mesh(new THREE.TorusGeometry(SANDR + 0.6, 0.12, 6, 120), glowM(GOLD, 0.7)); plaza.rotation.x = Math.PI / 2; plaza.position.y = 0.08; scene.add(plaza); }
  const walkable = (x, z) => Math.hypot(x, z) < WALK;

  /* ---------- 星砂：撒在中間的圓裡；銅盤被震動時，沙被震離會動的地方，停在節線上 ---------- */
  const N = SMALL ? 15000 : 32000, sx = new Float32Array(N), sz = new Float32Array(N), sb = new Float32Array(N), sPos = new Float32Array(N * 3), sCol = new Float32Array(N * 3), sBase = new Float32Array(N * 3);
  const sandGeo = new THREE.BufferGeometry(); sandGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3)); sandGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
  const sand = new THREE.Points(sandGeo, new THREE.PointsMaterial({ size: SMALL ? 0.5 : 0.42, map: dotT, vertexColors: true, transparent: true, depthWrite: false, blending: ADD, sizeAttenuation: true })); sand.frustumCulled = false; scene.add(sand);
  function sandPlace(q, tight = 0.07) { for (let i = 0; i < N; i++) { let x = 0, z = 0; for (let k = 0; k < 40; k++) { x = Math.random() * 2 - 1; z = Math.random() * 2 - 1; if (x * x + z * z > 0.97) continue; if (!q || Math.abs(Z(q, x, z)) < tight) break; } sx[i] = x; sz[i] = z; sb[i] = 0; } sandWrite(0, true); }
  let sandCol = "gold"; try { sandCol = localStorage.getItem("mingsha-sand") || "gold"; } catch (e) { }
  function sandTint() { const q = SANDS.find((s) => s[0] === sandCol) || SANDS[0], c = new THREE.Color(q[3]), h = new THREE.Color();
    for (let i = 0; i < N; i++) { if (q[0] === "aurora") { const a = Math.atan2(sz[i], sx[i]); h.setHSL(((a / Math.PI + 1) * 0.5 + i * 0.00002) % 1, 0.85, 0.65); } else h.copy(c); const v = 0.55 + (i % 7) * 0.06; sBase.set([h.r * v, h.g * v, h.b * v], i * 3); } }
  function sandWrite(t, all) { for (let i = 0; i < N; i++) { const b = sb[i]; sPos[i * 3] = sx[i] * SANDR; sPos[i * 3 + 1] = 0.12 + b * 1.4 * Math.abs(Math.sin(i * 12.9 + t * 23)); sPos[i * 3 + 2] = sz[i] * SANDR;
      const k = 0.75 + Math.min(1.6, b * 5); sCol[i * 3] = sBase[i * 3] * k; sCol[i * 3 + 1] = sBase[i * 3 + 1] * k; sCol[i * 3 + 2] = sBase[i * 3 + 2] * k; }
    sandGeo.attributes.position.needsUpdate = true; sandGeo.attributes.color.needsUpdate = true; void all; }
  let sandIdle = false;
  /* 一格：每粒沙照它那裡震得多大，隨機跳一下；在節線上（Z≈0）就不動 */
  function sandStep(resp, gain, t) { if (!resp.length || gain < 0.01) { if (!sandIdle) { for (let i = 0; i < N; i++) sb[i] *= 0.8; sandWrite(t); if (sb[0] < 0.001) sandIdle = true; } return 0; } sandIdle = false; let tot = 0;
    for (let i = 0; i < N; i++) { let x = sx[i], z = sz[i], zz = 0; for (const [q, a] of resp) zz += a * Z(q, x, z); const amp = Math.abs(zz) * gain; tot += amp;
      if (amp > 0.003) { x += (Math.random() - 0.5) * amp * 0.11; z += (Math.random() - 0.5) * amp * 0.11; const d = x * x + z * z; if (d > 0.97) { const s = 0.97 / Math.sqrt(d) * (0.995 - Math.random() * 0.02); x *= s; z *= s; } sx[i] = x; sz[i] = z; }
      sb[i] = sb[i] * 0.7 + Math.min(0.6, amp) * 0.3; }
    sandWrite(t); return tot / N; }

  /* ---------- 天弦：從盤緣拉到高空的 36 根光弦，像一座看不見的大琴；有聲音的時候會震 ---------- */
  const STR_N = 36, SEG = 26, APEX = new V3(0, 300, 0);
  const strings = Array.from({ length: STR_N }, (_, i) => { const a = i / STR_N * Math.PI * 2, base = new V3(Math.cos(a) * (PLATE + 1.4), 0.5, Math.sin(a) * (PLATE + 1.4)), out = new V3(Math.cos(a), 0, Math.sin(a)), side = new V3(-Math.sin(a), 0, Math.cos(a));
    const g = new THREE.BufferGeometry(), arr = new Float32Array((SEG + 1) * 3); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: i % 3 === 0 ? "#ffe6a8" : i % 3 === 1 ? "#a8e8ff" : "#ffb8e0", transparent: true, opacity: 0.38, blending: ADD, depthWrite: false })); ln.frustumCulled = false; scene.add(ln);
    return { a, base, out, side, ln, arr, amp: 0, ph: i * 1.7, grow: 1 }; });
  const _sv0 = new V3();
  function stringsFrame(t, energy) { for (const s of strings) { s.amp += (energy - s.amp) * 0.08; for (let k = 0; k <= SEG; k++) { const f = k / SEG, g = Math.min(1, s.grow * 1.0001), ff = f * g;
        const p = _sv0.lerpVectors(s.base, APEX, ff), bulge = Math.sin(ff * Math.PI) * 36, vib = Math.sin(ff * Math.PI * 3) * Math.sin(t * 19 + s.ph) * s.amp * 2.2;
        p.addScaledVector(s.out, bulge).addScaledVector(s.side, vib); s.arr[k * 3] = p.x; s.arr[k * 3 + 1] = p.y; s.arr[k * 3 + 2] = p.z; }
      s.ln.geometry.attributes.position.needsUpdate = true; s.ln.material.opacity = 0.25 + s.amp * 0.6 + (s.flash || 0); if (s.flash) s.flash = Math.max(0, s.flash - 0.02); } }

  /* ---------- 中央懸著一支巨大的金音叉（跟著共鳴發光） ---------- */
  const fork = new THREE.Group(); { const m = bronze("#d8a248"); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 16), m); h.position.y = -2.5; fork.add(h);
    const u = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 12, 32, Math.PI), m); u.rotation.z = Math.PI; fork.add(u);
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7, 16), m); p.position.set(sd * 1.6, 3.5, 0); fork.add(p); }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), m); ball.position.y = -5.2; fork.add(ball); fork.position.y = 15; scene.add(fork); }
  const forkGlow = spr(softT, "#ffd890", 18, 0.2, { blending: ADD }); forkGlow.position.y = 16; scene.add(forkGlow);

  /* ---------- 波紋：鐘響、定音、節拍時，從中心往外推開的光圈 ---------- */
  const ripples = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), glowM(GOLD, 0)); m.rotation.x = -Math.PI / 2; m.position.y = 0.2; scene.add(m); return { m, t: 9, d: 4 }; }); let ripI = 0;
  const ripple = (col = GOLD, d = 3.2, x = 0, z = 0) => { const q = ripples[ripI++ % ripples.length]; q.m.material.color.set(col); q.t = 0; q.d = d; q.m.position.x = x; q.m.position.z = z; };

  /* ---------- 結晶：定下來的聲紋沿著節線長成一圈發光的塔（每個人的顏色、圖案都不一樣） ---------- */
  const CR_MAX = 12 * 110, crGeo = new THREE.CylinderGeometry(0.04, 0.42, 1, 6); crGeo.translate(0, 0.5, 0);
  const crT = canvasTex(4, 128, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "rgba(255,255,255,.08)"); g.addColorStop(0.6, "rgba(255,255,255,.45)"); g.addColorStop(0.92, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,.9)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });   /* 光塔：底部透明、往上越來越亮 */
  const crys = new THREE.InstancedMesh(crGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", map: crT, transparent: true, blending: ADD, depthWrite: false, side: THREE.DoubleSide }), CR_MAX); crys.count = 0; crys.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(crys);
  const tipPos = new Float32Array(CR_MAX * 3), tipCol = new Float32Array(CR_MAX * 3), tipGeo = new THREE.BufferGeometry(); tipGeo.setAttribute("position", new THREE.BufferAttribute(tipPos, 3)); tipGeo.setAttribute("color", new THREE.BufferAttribute(tipCol, 3)); tipGeo.setDrawRange(0, 0);
  const tips = new THREE.Points(tipGeo, new THREE.PointsMaterial({ size: 1.6, map: softT, vertexColors: true, transparent: true, blending: ADD, depthWrite: false })); tips.frustumCulled = false; scene.add(tips);
  const crList = [];   /* { x, z, h, col, rev, slot } */
  const _c = new THREE.Color();
  function addCrystal(slot, id, reveal) { const [key, bk] = String(id).split("@"), q = modeByKey(key); if (!q) return 0; const col = BCOL[bk] || BCOL.none, r = rngOf(seedOf(id + ":" + slot));
    const pts = nodalPoints(q, SANDR + 5, WALK - 3, WALK - 3, 110, r); let n = 0;
    for (const [x, z] of pts) { if (crList.length >= CR_MAX) break; const d = Math.hypot(x, z), h = 1.4 + r() * 2.6 + (d - SANDR) / 30 * 2.5 + slot * 0.18; crList.push({ x, z, h, col, rev: reveal ? -(d - SANDR) / 30 * 1.6 - r() * 0.4 : 1, slot }); n++; }
    crWrite(); return n; }
  function crWrite() { crys.count = crList.length; tipGeo.setDrawRange(0, crList.length);
    crList.forEach((c, i) => { const k = clamp01(c.rev), s = k < 1 ? Math.max(0.001, 1 - Math.pow(1 - k, 3) * 1.0 + Math.sin(k * Math.PI) * 0.15) : 1; dummy.position.set(c.x, 0, c.z); dummy.rotation.set(0, i * 0.7, 0); dummy.scale.set(1, c.h * s, 1); dummy.updateMatrix(); crys.setMatrixAt(i, dummy.matrix);
      _c.set(c.col); crys.setColorAt(i, _c); tipPos.set([c.x, c.h * s + 0.1, c.z], i * 3); const b = k < 1 ? k : 0.75; tipCol.set([_c.r * b, _c.g * b, _c.b * b], i * 3); });
    crys.instanceMatrix.needsUpdate = true; if (crys.instanceColor) crys.instanceColor.needsUpdate = true; tipGeo.attributes.position.needsUpdate = true; tipGeo.attributes.color.needsUpdate = true; }

  /* ---------- 修補：啞了的大鐘（北）、斷了弦的天琴（東）、停擺的節拍塔（西） ---------- */
  const pickables = [], fixSites = {}, obstacles = [], proxy = (r, kind, ref, parent, y = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = y; m.userData = { kind, ref }; parent.add(m); pickables.push(m); return m; };
  const FIXPOS = { bell: [0, -50], harp: [50, 0], metro: [-50, 0] };
  const TX_FIX = canvasTex(128, 128, (c) => { c.font = "bold 74px 'Noto Serif TC','Microsoft JhengHei',serif"; c.textAlign = "center"; c.textBaseline = "middle"; const g = c.createRadialGradient(64, 64, 10, 64, 64, 60); g.addColorStop(0, "#fff2c8"); g.addColorStop(1, "#c98a2c"); c.fillStyle = g; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill(); c.fillStyle = "#3a2008"; c.fillText("修", 64, 68); });
  const fixInfo = {
    bell: { name: ["啞了的大鐘", "The silent great bell"], short: ["大鐘", "The great bell"], desc: ["盤子北邊的大鐘裂了一道縫，歪歪地吊著。敲下去只有悶悶的一聲，盤上的沙動也不動。", "The great bell on the north of the plate has a crack and hangs crooked. Strike it and there's only a dull thud; the sand doesn't stir."],
      fixed: ["裂縫被一點一點補起來，鐘慢慢擺正——第一聲響起，整面銅盤都跟著嗡了起來。", "The crack closes bit by bit and the bell swings true — at its first note the whole plate hums along."], thanks: ["聽見了嗎？盤子記得這個音。", "Hear that? The plate remembers this note."], who: ["老鈞・守鐘人", "Old Jun, bell keeper"] },
    harp: { name: ["斷了弦的天琴", "The sky harp with broken strings"], short: ["天琴", "The sky harp"], desc: ["盤子東邊的天琴，十五根光弦斷了大半，垂在地上發灰。", "On the east of the plate stands the sky harp; most of its fifteen strings of light have snapped and hang grey."],
      fixed: ["一根一根接回去，每接好一根，就亮一根。最後一根接上，整座琴自己彈了一段。", "One by one the strings are joined, each one lighting as it mends. When the last is fixed, the harp plays a phrase all by itself."], thanks: ["從它旁邊走過，它會跟你打招呼。", "Walk past it — it will say hello."], who: ["弦婆・撥弦的人", "Grandma Strings"] },
    metro: { name: ["停擺的節拍塔", "The stopped beat tower"], short: ["節拍塔", "The beat tower"], desc: ["盤子西邊的節拍塔，擺錘卡在半空。沒有拍子，沙跳起來總是亂的。", "On the west of the plate stands the beat tower, its pendulum stuck in mid-air. Without a beat, the sand always jumps out of time."],
      fixed: ["塔身一層一層亮起來，擺錘終於落下、擺回去——滴、答。整座城又知道時間了。", "The tower lights up tier by tier and the pendulum finally swings — tick, tock. The city knows the time again."], thanks: ["跟著拍子走路，會比較不累。", "Walk in time with the beat; you'll tire less."], who: ["阿拍・數拍子的人", "Beat, the beat counter"] },
    _all: ["三處都修好了。調音師說，今天的盤子會唱得特別亮。", "All three are repaired. The tuner says the plate will sing especially bright today."] };
  const mkSite = (id, g, py) => { const [x, z] = FIXPOS[id]; g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); scene.add(g); proxy(4, "fix", id, g, py);
    const mk = spr(TX_FIX, "#ffffff", 2.2, 1, { depthTest: false }); mk.renderOrder = 12; g.add(mk);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.9, 64), glowM(GOLD, 0.5)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; g.add(ring);
    return (fixSites[id] = { id, g, x, z, mk, ring, my: py + 5, k: 0, kt: 0, done: false }); };
  /* 大鐘 */
  { const g = new THREE.Group(), S = mkSite("bell", g, 4), m = bronze("#6a4a2a");
    for (const sx2 of [-4.6, 4.6]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 12, 12), m); col.position.set(sx2, 6, 0); g.add(col); obstacles.push({ x: S.x + sx2, z: S.z, r: 0.9, h: 12 }); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 0.9, 1.1), m); beam.position.y = 12.2; g.add(beam);
    const prof = [[0, 0], [2.9, 0], [2.7, 0.4], [2.2, 1.6], [1.9, 3.2], [1.8, 4.4], [1.5, 5.2], [0.6, 5.6], [0, 5.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const bellM = new THREE.MeshStandardMaterial({ color: "#4a3a30", metalness: 0.85, roughness: 0.4 }), bell = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), bellM); const pivot = new THREE.Group(); pivot.position.y = 11.8; g.add(pivot); bell.position.y = -5.8; pivot.add(bell);
    const crackG = new THREE.BufferGeometry().setFromPoints([[0.3, 0.6], [-0.2, 1.4], [0.4, 2.2], [-0.1, 3.0], [0.3, 3.9], [0, 4.6]].map(([x, y]) => new V3(x, y, 2.3 - y * 0.12))); const crack = new THREE.Line(crackG, new THREE.LineBasicMaterial({ color: "#000000", transparent: true })); bell.add(crack);
    const bg = spr(softT, "#ffd890", 14, 0, { blending: ADD }); bg.position.y = 8.5; g.add(bg); let rung = 0;
    S.draw = (k, done, t = 0) => { pivot.rotation.z = done ? Math.sin(t * 0.9) * 0.05 : 0.32 * (1 - k); bellM.color.set("#4a3a30").lerp(_c.set("#e0b060"), k); crack.material.opacity = 1 - k; bg.material.opacity = done ? 0.28 + Math.sin(t * 2) * 0.06 : k * 0.15;
      if (done && t - rung > 42) { rung = t; if (t > 5) { audio.bell(); ripple("#ffd890", 4); strings.forEach((s) => { s.flash = 0.35; }); } } }; }
  /* 天琴 */
  { const g = new THREE.Group(), S = mkSite("harp", g, 4), m = bronze("#a07838"); const arc = new THREE.Mesh(new THREE.TorusGeometry(7, 0.45, 10, 60, Math.PI), m); arc.position.y = 1; g.add(arc);
    const base = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 1.4), m); base.position.y = 0.5; g.add(base); obstacles.push({ x: S.x, z: S.z, r: 3.4, h: 8 });
    const NS = 15, harpStr = Array.from({ length: NS }, (_, i) => { const x = -6.3 + i * 0.9, top = 1 + Math.sqrt(Math.max(0, 49 - x * x)) - 0.3; const geo = new THREE.BufferGeometry().setFromPoints([new V3(x, 1, 0), new V3(x, top, 0)]);
      const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#ffe6a8", transparent: true, opacity: 0.9, blending: ADD })); g.add(ln); return { ln, x, top, geo, v: 0 }; });
    let lastPl = 0;
    S.draw = (k, done, t = 0, dt = 0) => { const n = Math.round(NS * k); harpStr.forEach((s, i) => { const ok = i < n || done, p = s.geo.attributes.position; s.v = Math.max(0, s.v - dt * 1.5);
        if (ok) { p.setXYZ(0, s.x, 1, 0); p.setXYZ(1, s.x + Math.sin(t * 40 + i) * s.v * 0.15, s.top, 0); s.ln.material.color.set("#ffe6a8"); s.ln.material.opacity = 0.55 + s.v * 0.45; } else { p.setXYZ(0, s.x, s.top, 0); p.setXYZ(1, s.x + 0.4, s.top - 2 - (i % 3), 0.3); s.ln.material.color.set("#5a5050"); s.ln.material.opacity = 0.7; }
        p.needsUpdate = true; });
      if (done && Math.hypot(P.x - S.x, P.z - S.z) < 11 && t - lastPl > 0.35) { lastPl = t; const i = Math.floor(Math.random() * NS); harpStr[i].v = 1; audio.string(i, 0.8); } }; }
  /* 節拍塔 */
  let beatOn = false;
  { const g = new THREE.Group(), S = mkSite("metro", g, 5), m = bronze("#5a3a20"); const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.8, 17, 4), m); tower.position.y = 8.5; tower.rotation.y = Math.PI / 4; g.add(tower); obstacles.push({ x: S.x, z: S.z, r: 3, h: 17 });
    const bands = Array.from({ length: 6 }, (_, i) => { const b = new THREE.Mesh(new THREE.TorusGeometry(2.55 - i * 0.27, 0.12, 6, 4), glowM(GOLD, 0.1)); b.rotation.x = Math.PI / 2; b.rotation.z = Math.PI / 4; b.position.y = 2 + i * 2.5; g.add(b); return b; });
    const pend = new THREE.Group(); pend.position.set(0, 15.5, 2.9); g.add(pend); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 10, 8), bronze("#d8a248")); rod.position.y = -5; pend.add(rod);
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 24), bronze("#e0b060")); bob.rotation.x = Math.PI / 2; bob.position.y = -9.5; pend.add(bob); let lastSide = 0;
    S.draw = (k, done, t = 0) => { bands.forEach((b, i) => { b.material.opacity = i < Math.round(k * 6) || done ? 0.7 + (done ? Math.sin(t * 3.4 - i) * 0.25 : 0) : 0.08; });
      if (done) { beatOn = true; const a = Math.sin(t * Math.PI / 0.9) * 0.42; pend.rotation.z = a; const side = Math.sign(Math.cos(t * Math.PI / 0.9)); if (side !== lastSide) { lastSide = side; if (Math.hypot(P.x - S.x, P.z - S.z) < 24) audio.tick(side > 0); } }
      else pend.rotation.z = 0.5 * (1 - k) + 0.05; }; }

  /* ---------- 聲靈（城裡的人）：半透明發光的長袍、頭上一顆光、繞著一圈小光環——跟玩家不一樣 ---------- */
  const folks = [];
  function spirit(col, r = rnd) { const g = new THREE.Group(); const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.7, 18, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: ADD, depthWrite: false })); robe.position.y = 0.95; g.add(robe);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.3, 12), new THREE.MeshBasicMaterial({ color: col })); core.position.y = 0.95; g.add(core);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff6e0" })); head.position.y = 1.95; g.add(head);
    const hl = spr(softT, col, 1.6, 0.7, { blending: ADD }); hl.position.y = 1.95; g.add(hl);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 40), glowM("#fff2c8", 0.8)); halo.position.y = 2.35; halo.rotation.x = Math.PI / 2 + 0.3; g.add(halo); g.userData.halo = halo; void r; return g; }
  const FOLKPOS = [[4, 33], [-26, 26], [30, -24], [-6, -38], [40, 22]], FOLKCOL = ["#ffd890", "#9ee8ff", "#ffb0d8", "#b8ffcf", "#c8b0ff"];
  for (let i = 0; i < NAMES.length; i++) { const [x, z] = FOLKPOS[i], p = spirit(FOLKCOL[i]); p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -z); scene.add(p);
    proxy(1.3, "folk", folks.length, p, 1.1); obstacles.push({ x, z, r: 0.7, h: 2 }); folks.push({ p, i, x, z, ph: rnd() * 6, tap: -99, face: 0 }); }
  function talk(f, now) { if (now - f.tap < 2) return; f.tap = now; f.face = 2.5; audio.voice(f.i); const line = LINES[(seedOf(DAY + f.i) + Math.floor(now / 9)) % LINES.length]; say(L(line[0], line[1]), L(`${NAMES[f.i][0]}・${ROLES[f.i][0]}`, `${NAMES[f.i][1]}, ${ROLES[f.i][1]}`), 6500); }

  /* ---------- 會長大：已經結晶的聲紋、繞著盤子的小月（來過的天數）、極光（晚上來過幾次） ---------- */
  const G0 = FS && FS.growState ? FS.growState(CITY) : { slots: [], lv: {}, night: 0, visits: 0, steps: 0 };
  (G0.slots || []).forEach((id, i) => addCrystal(i, id, false));
  let moonlets = []; function placeMoonlets(n) { moonlets.forEach((m) => scene.remove(m.s)); moonlets = []; const N2 = Math.min(14, n || 0);
    for (let i = 0; i < N2; i++) { const s = spr(softT, ["#ffe6a8", "#a8e8ff", "#ffb8e0", "#c8ffd8"][i % 4], 4.5, 0.9, { blending: ADD }); scene.add(s); moonlets.push({ s, r: 84 + (i % 4) * 7, a: i / N2 * Math.PI * 2, v: 0.05 + (i % 3) * 0.02, y: 6 + (i % 5) * 4 }); } }
  placeMoonlets(G0.visits);
  const auroraLv = (n) => auroras.forEach((q, k) => { q.m.material.opacity = 0.18 + Math.min(1, (n || 0) / 10) * 0.45 - k * 0.04; }); auroraLv(G0.night);
  const figsOf = () => { const lv = (FS && FS.growState ? FS.growState(CITY).lv : {}) || {}; return new Set(Object.keys(lv).filter((k) => k.startsWith("f:")).map((k) => k.slice(2)).concat(QS.has("dbg") ? Object.keys(dbgFigs) : [])); };
  const dbgFigs = {};
  const cityKeys = () => new Set(((FS && FS.growState ? FS.growState(CITY).slots : G0.slots) || []).map((s) => String(s).split("@")[0]));

  /* ---------- 每天五件小事：接流星、敲石磬 ---------- */
  const got = new Set(ST0.got || []);
  const kinds = ["star", "chime", "star", ["star", "chime"][Math.floor(rnd() * 2)], "chime"]; for (let k = kinds.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [kinds[k], kinds[j]] = [kinds[j], kinds[k]]; }
  const used = [[0, 0, SANDR + 3], ...Object.values(FIXPOS).map(([x, z]) => [x, z, 9]), ...FOLKPOS.map(([x, z]) => [x, z, 4])];
  const freeSpot = () => { for (let tries = 0; tries < 300; tries++) { const a = rnd() * Math.PI * 2, d = SANDR + 5 + Math.sqrt(rnd()) * (WALK - SANDR - 10), x = Math.cos(a) * d, z = Math.sin(a) * d; if (used.every(([sx2, sz2, gp]) => Math.hypot(sx2 - x, sz2 - z) > (gp || 6))) { used.push([x, z]); return [x, z]; } } return [rnd() * 6 - 3, 40]; };
  const starT = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#ffffff"); g.addColorStop(0.2, "#fff2c0"); g.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 2); c.lineTo(32, 62); c.moveTo(2, 32); c.lineTo(62, 32); c.stroke(); });
  const evs = kinds.map((kind, i) => { const e = { i, kind, state: got.has(i) ? "done" : "wait", t: 0, g: new THREE.Group() };
    if (kind === "chime") { const [x, z] = freeSpot(); Object.assign(e, { x, z }); const m = bronze("#5a3a22"); for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8), m); p.position.set(sd * 1, 1.3, 0); e.g.add(p); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.18), m); top.position.y = 2.6; e.g.add(top); const stone = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.14), new THREE.MeshStandardMaterial({ color: "#3a4a52", metalness: 0.2, roughness: 0.6 })); stone.position.y = 1.7; e.g.add(stone); e.stone = stone;
      const gl = spr(softT, "#9ee8ff", 3, 0, { blending: ADD }); gl.position.y = 1.7; e.g.add(gl); e.gl = gl; e.g.position.set(x, 0, z); e.g.rotation.y = Math.atan2(-x, -z); proxy(1.6, "ev", i, e.g, 1.5); obstacles.push({ x, z, r: 0.9, h: 2.6 }); }
    else { const r = SANDR + 6 + rnd() * (WALK - SANDR - 14), a0 = rnd() * Math.PI * 2; Object.assign(e, { r, a0, w: (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.04), x: Math.cos(a0) * r, z: Math.sin(a0) * r, ph: rnd() * 6 });
      const m = spr(starT, "#ffffff", 1.6, 1, { blending: ADD }); e.g.add(m); e.m = m; const tail = spr(softT, "#ffd890", 3.2, 0.5, { blending: ADD }); tail.position.y = 0.6; e.g.add(tail); proxy(1.8, "ev", i, e.g, 0); }
    if (e.state === "done" && kind === "chime") { e.gl.material.opacity = 0.5; e.stone.material = new THREE.MeshBasicMaterial({ color: "#9ee8ff" }); } else e.g.visible = e.state !== "done";
    scene.add(e.g); return e; });
  const showCount = () => { const n = evs.filter((e) => e.state !== "wait").length, el = $("#echo"); el.textContent = L(`小事 ${n} / 5`, `Tasks ${n} / 5`); el.classList.toggle("full", n >= 5); };
  showCount();
  function finish(e) { if (e.state !== "wait") return;
    if (!QS.get("day") && todayStr() !== DAY) { toast(L("過了午夜，盤子換了一個音。重新整理……", "Midnight has passed — the plate has changed its note. Reloading…")); setTimeout(() => location.reload(), 1600); return; }
    e.state = "go"; e.t = 0; audio.task(); if (e.kind === "chime") { audio.bell(); ripple("#9ee8ff", 2.4, e.x, e.z); }
    const r = FS && FS.starDone ? FS.starDone(CITY, e.i) : null, cnt = evs.filter((x) => x.state !== "wait").length; showCount();
    const what = e.kind === "chime" ? L("石磬響了", "The stone chime rings") : L("接住了一顆流星", "You caught a falling star");
    if (r) { toast(L(`${what}（${r.count}/5）　+1 B・音晶 +${r.mat || 1}`, `${what} (${r.count}/5)  +1 B · tone crystal +${r.mat || 1}`), 4200); fixes.refresh();
      if (r.bonus) setTimeout(() => { const b = r.bonus; say(L("五件事都做完了。盤上的沙，今天跳得特別高。", "All five are done. The sand on the plate leaps especially high today."), b.type === "ore" ? L("回響：一顆原石", "Echo: a raw gem") : b.type === "dew" ? L(`回響：元液 +${b.n}`, `Echo: essence +${b.n}`) : L(`回響：+${b.n} B`, `Echo: +${b.n} B`), 7500); audio.fix(); }, 2600); }
    else toast(L(`${what}（${cnt}/5）`, `${what} (${cnt}/5)`)); }

  /* ---------- 修補面板＋海報＋故事 ---------- */
  let fixes = { refresh() { } }, fixGo = null;
  fixes = createRepair({ city: CITY, L, toast, say, FS, info: fixInfo, sound: (n) => { if (n === 1) audio.task(); else { audio.fix(); if (n === 2) setTimeout(() => audio.hum(), 900); } },
    onUpdate: (id, k, done, just) => { const S = fixSites[id]; S.kt = k; S.done = done; S.mk.visible = !done; unstick(); if (just) { ripple(GOLD, 4); setTimeout(() => makePoster(id), 3600); } if (just && Object.values(fixSites).every((x) => x.done)) setTimeout(() => tellStory(), 19000); } });
  function tellStory(force) { if (!force && !(FS && FS.growStory && FS.growStory(CITY))) return; audio.fix();
    storyCard({ L, chapter: L("第七章", "Chapter 7"), title: L("光回家的地方", "Where the light goes home"),
      paras: [L("大鐘又響了。整面銅盤跟著它嗡了一聲，沙全跳了起來，落成一朵你從沒看過的花。", "The great bell rings again. The whole plate hums with it; every grain leaps and lands as a flower you have never seen."),
        L("調音師阿律說：「這裡是光回家的地方。星星的光走了幾萬年，最後都落在這面盤上，變成沙。」", "Lu the tuner says, \"This is where the light comes home. Starlight travels for tens of thousands of years, and in the end it all falls on this plate and turns to sand.\""),
        L("「每一粒沙都記得自己是從哪顆星來的。盤子唱對了音，它們就排回星星原本的樣子。」", "\"Every grain remembers which star it came from. When the plate sings the right note, they line up into the shape of their star again.\""),
        L("你想起留白城那幅畫軸——邊上那座只勾了輪廓的城。原來那不是一幅畫，是一張聲紋。", "You remember the scroll from Liubai — the city drawn only in outline at its edge. It was never a painting. It was a sound figure.")],
      sign: L("— 阿律・鳴沙城的調音師", "— Lu, tuner of Mingsha"), next: L("盤子底下傳來另一個很低的音，低到聽不見，只覺得腳底在發熱。（下一座城，還在路上）", "From under the plate comes another note, so low you can't hear it — you only feel your feet grow warm. (The next city is on its way.)"), keep: L("收好這一章", "Keep this chapter"),
      onClose: () => { storyBtn(); toast(L("想再讀一次，點右上角的「卷」", "Tap 卷 at the top right to read it again")); } }); }
  let sBtn = null; function storyBtn() { if (sBtn) return; const b = document.createElement("button"); b.className = "btn snd"; b.type = "button"; b.textContent = "卷"; b.title = L("第七章", "Chapter 7"); b.onclick = (e) => { e.stopPropagation(); tellStory(true); }; $(".hud").insertBefore(b, $("#snd")); sBtn = b; }
  function unstick() { for (let it = 0; it < 4; it++) for (const o of obstacles) { if (!(o.r > 0)) continue; const ox = P.x - o.x, oz = P.z - o.z, od = Math.hypot(ox, oz) || 0.001; if (od < o.r) { P.x = o.x + ox / od * (o.r + 0.05); P.z = o.z + oz / od * (o.r + 0.05); } } }
  const fixNear = (S) => Math.hypot(P.x - S.x, P.z - S.z);
  const freeOK = (x, z, pad = 0.4) => obstacles.every((o) => !(o.r > 0) || Math.hypot(x - o.x, z - o.z) > o.r + pad);
  function fixTap(id) { const S = fixSites[id]; if (fixNear(S) < 8) { fixes.open(id); return; } fixGo = id; P.stuck = 0;
    const cand = [[0, 6], [-5, 5], [5, 5], [-6, 0], [6, 0]].map(([dx, dz]) => { const c2 = Math.cos(S.g.rotation.y), s2 = Math.sin(S.g.rotation.y); return [S.x + dx * c2 + dz * s2, S.z - dx * s2 + dz * c2]; }).filter(([x, z]) => walkable(x, z) && freeOK(x, z)).sort((p, q) => Math.hypot(p[0] - P.x, p[1] - P.z) - Math.hypot(q[0] - P.x, q[1] - P.z));
    if (!cand.length) { fixGo = null; return; } [P.tx, P.tz] = cand[0]; markAt(P.tx, P.tz); }
  const _mw = new V3();
  function fixFrame(t, dt) { for (const S of Object.values(fixSites)) { if (S.snap) S.k = S.kt; S.k += (S.kt - S.k) * 0.04; S.draw(S.k, S.done, t, dt); S.snap = false; S.ring.visible = S.mk.visible;
      if (S.mk.visible) { S.mk.position.y = S.my + Math.sin(t * 2 + S.x) * 0.25; S.mk.getWorldPosition(_mw); S.mk.material.opacity = Math.min(1, Math.max(0, (_mw.distanceTo(camera.position) - 6) / 4)); S.ring.material.opacity = 0.35 + Math.sin(t * 2.2 + S.x) * 0.15; } }
    if (fixGo) { const S = fixSites[fixGo]; if (fixNear(S) < 7.5) { fixes.open(fixGo); fixGo = null; } }
    else if (fixes.isOpen && Object.values(fixSites).every((S) => fixNear(S) > 12)) fixes.close(); }
  const POSTER_CAM = { bell: [[0, 7, -34], [0, 7, -52]], harp: [[34, 5, 4], [52, 4, 0]], metro: [[-34, 9, 6], [-52, 9, 0]] };
  function makePoster(id) { try {
      const [cp, lk] = POSTER_CAM[id], oldP = camera.position.clone(), oldQ = camera.quaternion.clone(), oldA = camera.aspect, oldF = camera.fov;
      const W = 360, H = 480, rt = new THREE.WebGLRenderTarget(W * 2, H * 2, { colorSpace: THREE.SRGBColorSpace }); camera.position.set(...cp); camera.lookAt(...lk); camera.aspect = W / H; camera.fov = 56; camera.updateProjectionMatrix();
      const nm = nameTag.visible; nameTag.visible = false; renderer.setRenderTarget(rt); renderer.render(scene, camera); const px = new Uint8Array(W * 2 * H * 2 * 4); renderer.readRenderTargetPixels(rt, 0, 0, W * 2, H * 2, px); renderer.setRenderTarget(null); rt.dispose(); nameTag.visible = nm;
      camera.position.copy(oldP); camera.quaternion.copy(oldQ); camera.aspect = oldA; camera.fov = oldF; camera.updateProjectionMatrix();
      const src = document.createElement("canvas"); src.width = W * 2; src.height = H * 2; const sc = src.getContext("2d"), id2 = sc.createImageData(W * 2, H * 2); for (let y = 0; y < H * 2; y++) id2.data.set(px.subarray((H * 2 - 1 - y) * W * 8, (H * 2 - y) * W * 8), y * W * 8); sc.putImageData(id2, 0, 0);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"); const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1d1530"); bg.addColorStop(1, "#0c0816"); c.fillStyle = bg; c.fillRect(0, 0, W, H); c.drawImage(src, 0, 0, W * 2, H * 2 * 0.8, 16, 16, W - 32, (H - 32) * 0.8);
      c.strokeStyle = GOLD; c.lineWidth = 1.5; c.strokeRect(16, 16, W - 32, (H - 32) * 0.8); c.fillStyle = "#fff2d0"; c.textAlign = "center";
      const I = fixInfo[id]; c.font = "700 24px 'Noto Serif TC','Microsoft JhengHei',serif"; c.fillText(L(`${I.short[0]}・鳴沙城`, `${I.short[1]} · Mingsha`), W / 2, H - 58);
      c.font = "12px Georgia, serif"; c.fillStyle = "#c8b8dc"; c.fillText(DAY.replace(/-/g, "."), W / 2, H - 30);
      const url = cv.toDataURL("image/jpeg", 0.82), ok = FS && FS.cityPoster ? FS.cityPoster(CITY, id, url, `${I.short[0]}修好了・鳴沙城`, `${I.short[1]} repaired · Mingsha`) : false;
      const ov = document.createElement("div"); ov.className = "posterov"; ov.innerHTML = `<div class="pcard"><small>${L("送你一張修復紀念", "A souvenir of the repair")}</small><img alt=""><p>${ok ? L("已經收進家裡的海報冊。", "It's in the poster album at home.") : L("（從遊戲裡進來，才會收進海報冊）", "(Enter from the game to keep it in your poster album)")}</p><button class="btn primary" type="button">${L("好", "OK")}</button></div>`;
      ov.querySelector("img").src = url; ov.addEventListener("pointerdown", (e) => e.stopPropagation()); ov.querySelector("button").onclick = () => ov.remove(); document.body.append(ov);
    } catch (e) { console.warn(e); } }

  /* ---------- 玩家 ---------- */
  const me = new THREE.Group(); scene.add(me);
  const av = finAvatar(THREE) || makePerson(THREE, { top: "#f0eee8", bottom: "#4a3a6a", longHair: true, hair: "#1d1a18", skin: "#f1d3bd" }, Math.random); me.add(av);
  const nameTag = makeNameTag(THREE, playerName(), null, { color: "#fff2d0", glow: "#2a1840", size: 0.42 }); nameTag.position.y = 1.98; me.add(nameTag);
  const P = { x: 0, z: SANDR + 6, tx: null, tz: null }, cam = { yaw: 0, pitch: 0.3, dist: 60, want: SMALL ? 16 : 14 };
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 32), glowM(GOLD, 0)); mark.rotation.x = -Math.PI / 2; scene.add(mark);
  const markAt = (x, z) => { mark.position.set(x, 0.2, z); mark.material.opacity = 0.9; $("#hint").classList.add("off"); };
  for (const id of Object.keys(fixSites)) { const S = fixSites[id], st = fixes.site(id); S.k = S.kt = st.k; S.done = st.done; S.mk.visible = !st.done; S.snap = true; S.draw(S.k, S.done, 0, 0); }
  unstick(); if (G0.story) storyBtn();

  /* ---------- 小事三連、兩個小遊戲 ---------- */
  const MZ = { lux: ["曦晶", "halo crystal"], sand: ["時砂", "time sand"], pearl: ["潮珠", "tide pearl"], moss: ["苔光", "moss light"], ink: ["松煙墨", "pine-soot ink"], tone: ["音晶", "tone crystal"] };
  const cx = makeTrio({ THREE, scene, pickables, spots: [[-22, 1.6, 22], [25, 1.6, 16], [-8, 1.6, -31]], color: GOLD, done: !!(FS && FS.cityxState && FS.cityxState(CITY).done),
    onLight: (n, N2) => { audio.string(n * 3, 1); if (n < N2) toast(L(`音叉（${n}/${N2}）`, `Tuning forks (${n}/${N2})`), 2000); },
    onAll: () => { audio.fix(); ripple(GOLD, 3); say(L("三支小音叉一起嗡了一聲，盤上的沙輕輕跳了一下。", "The three little tuning forks hum together, and the sand on the plate gives a little hop."), L("音叉", "Tuning forks"), 6500); const r = FS && FS.cityxDo ? FS.cityxDo(CITY) : null; if (r) setTimeout(() => toast(L(`✨ 今天的小事完成了　+${r.b} B${r.matN ? `・${MZ[r.mat][0]} +${r.matN}` : ""}${r.ess ? `・元液 +${r.ess}` : ""}`, `✨ Today's little thing is done  +${r.b} B${r.matN ? ` · ${MZ[r.mat][1]} +${r.matN}` : ""}${r.ess ? ` · essence +${r.ess}` : ""}`), 4200), 1800); } });
  const mg = makeGames({ THREE, scene, pickables, city: CITY, L, toast, list: [
    { key: "beat", type: "rhythm", pos: [-14, 0, 38], icon: "🥁", color: GOLD, title: ["鳴沙節拍", "Singing Sand Beat"], intro: ["沙跟著拍子跳。光圈落到線上的時候點一下。", "The sand hops to the beat. Tap when the ring lands on the line."], how: ["跟著拍子點畫面", "Tap in time"], theme: { bg: "#140c24", bg2: "#2a1840", fg: "#f6ecd6" } },
    { key: "stars", type: "order", pos: [16, 0, -40], icon: "✨", color: "#9ee8ff", title: ["星序", "Star Order"], intro: ["這幾顆星原本的順序亂了。照著亮起來的順序點回去。", "These stars have lost their order. Tap them back in the order they light up."], how: ["照順序點", "Tap in order"], theme: { bg: "#0c0a20", bg2: "#1e1640", fg: "#f6ecd6", nodes: ["✦", "✧", "✦", "✧", "✦"] } }] });
  window.__mg = { play: (i) => mg.play(i), cur: () => mg.cur, pos: (i) => mg.pos(i).toArray().map((v) => +v.toFixed(2)) };

  /* ---------- 一起：週末的 Niko、共遊的朋友、合照小卡 ---------- */
  const together = { niko: null, others: {} }, NLN = [["A city that sings itself into shape. Show-off.", "一座自己唱出形狀的城。愛現。"], ["If you sweep slowly, the sand forgives you.", "慢慢掃，沙會原諒妳。"], ["I tried to catch a star. It caught me instead.", "我想接一顆流星。結果是它接住我。"]];
  if (QS.get("niko") === "1") { const n = makeFigure(THREE, NIKO_LOOK, "Niko"); n.x = P.x - 1.2; n.z = P.z + 1.2; n.say = 7; scene.add(n.p); together.niko = n; }
  const tourOn = !!FS && /^https?:/.test(location.protocol) && !window.StarDemo;
  if (tourOn) tourLink({ city: CITY, L, toast, getMe: () => ({ x: P.x, z: P.z, ry: av.rotation.y, m: P.tx !== null ? "walk" : "idle" }), onSync: (list) => {
    const seen = new Set(); for (const o of list) { seen.add(o.uid); let f = together.others[o.uid];
      if (!f) { f = together.others[o.uid] = makeFigure(THREE, o.look || {}, o.name || "?"); f.uid = o.uid; f.name = o.name; f.x = o.x; f.z = o.z; scene.add(f.p); toast(L(`✨ ${o.name} 來了`, `✨ ${o.name} is here`)); }
      f.tx = o.x; f.tz = o.z; f.try = o.ry || 0; }
    for (const u of Object.keys(together.others)) if (!seen.has(u)) { scene.remove(together.others[u].p); delete together.others[u]; } } });
  function togetherFrame(t, dt) {
    const n = together.niko; if (n) { const ry = av.rotation.y, tx = P.x + Math.cos(ry) * 0.9, tz = P.z - Math.sin(ry) * 0.9, dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
      if (d > 14) { n.x = tx; n.z = tz; } else if (d > 0.1) { const v = Math.min(d, Math.max(2, d * 2.2) * dt); const nx = n.x + dx / d * v, nz = n.z + dz / d * v; if (walkable(nx, nz)) { n.x = nx; n.z = nz; } n.ry = Math.atan2(dx, dz); }
      n.moving = d > 0.1; n.p.position.set(n.x, 0, n.z); n.p.rotation.y = n.moving ? n.ry : ry; tickFigure(n, t);
      n.say -= dt; if (n.say <= 0 && !cut) { n.say = 24 + Math.random() * 26; const ln = NLN[Math.floor(Math.random() * NLN.length)]; say(L(ln[1], ln[0]), "Niko", 6000); } }
    for (const f of Object.values(together.others)) { const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz);
      if (d > 12) { f.x = f.tx; f.z = f.tz; } else if (d > 0.02) { const v = Math.min(d, Math.max(2.4, d * 2.5) * dt); f.x += dx / d * v; f.z += dz / d * v; f.ry = Math.atan2(dx, dz); }
      f.moving = d > 0.05; f.p.position.set(f.x, 0, f.z); f.p.rotation.y = f.moving ? f.ry : f.try; tickFigure(f, t); } }
  let tuneBtn = null, figBtn = null;
  { const hud = $(".hud"), snd = $("#snd"), mk = (txt, title, fn) => { const b = document.createElement("button"); b.className = "btn snd"; b.type = "button"; b.textContent = txt; b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); }; hud.insertBefore(b, snd); return b; };
    if (tourOn) { const inv = invitePanel({ city: CITY, L, toast }); mk("👥", L("邀請朋友一起逛", "Invite a friend"), () => inv.open()); }
    mk("🖼", L("合照小卡", "Photo card"), async () => { const names = [playerName(), ...(together.niko ? ["Niko"] : []), ...Object.values(together.others).map((f) => f.name)];
      const card = await makeCard({ snap: () => window.__sleSnap && window.__sleSnap(), cityName: L("鳴沙城", "Mingsha"), names, palette: ["#1d1530", GOLD, "#9ee8ff"], L });
      if (!card) { toast(L("拍不到畫面，再試一次", "Couldn't capture the view — try again")); return; } audio.task();
      cardPanel({ card, cityName: L("鳴沙城", "Mingsha"), mates: Object.values(together.others).map((f) => ({ uid: f.uid, name: f.name })), L, toast }); });
    tuneBtn = mk(L("調", "Tune"), L("替銅盤調音", "Tune the plate"), () => setTune(!tune.on)); tuneBtn.classList.add("gold");
    figBtn = mk(L("紋", "Figures"), L("聲紋譜", "Sound figures"), () => openFigs()); }

  /* ---------- 調音：左右拖滑桿掃過不同的音；靠近共鳴點，沙排出聲紋；停住不動就「定音」 ---------- */
  let target = null, targetBk = "none", why = "";
  const tune = { on: false, v: 0.5, drag: false, res: 0, lockT: 0, lastKey: null, gain: 0 };
  const barEl = document.createElement("div"); barEl.className = "tunebar"; for (const ev of ["pointerdown", "pointerup", "click"]) barEl.addEventListener(ev, (e) => e.stopPropagation()); document.body.append(barEl);
  const figCache = {}; const figOf = (q, col = (SANDS.find((s) => s[0] === sandCol) || SANDS[0])[3]) => { const k = q.key + col; if (!figCache[k]) figCache[k] = figure(q, 112, col === "#c08bff" ? GOLD : col); return figCache[k]; };
  const sandOpen = (k) => { const q = SANDS.find((s) => s[0] === k); return !!q && figsOf().size >= q[4]; };
  function chipsHTML() { return `<div class="chips">${SANDS.map(([k, zh, en, col, need]) => sandOpen(k) ? `<button type="button" class="${sandCol === k ? "on" : ""}" data-sand="${k}"><i data-col="${col}"></i>${L(zh, en)}</button>` : `<span class="lock"><i data-col="${col}"></i>${L(`${need} 紋`, `${need} figs`)}</span>`).join("")}</div>`; }
  function bar() {
    if (tune.on) { barEl.innerHTML = `<div class="trow">${target ? `<canvas class="tfig" width="112" height="112"></canvas>` : ""}<div class="ttxt">${target ? L(`今天銅盤想唱的：<b>「${target.name[0]}」</b>`, `Today the plate wants to sing: <b>"${target.name[1]}"</b>`) : L("自由調音：每找到一種新的聲紋，就收進聲紋譜。", "Free tuning: every new figure you find goes into your album.")}<small>${L("左右拖動，慢慢掃；沙排得最整齊時停住不動，就會定音。", "Drag left and right, slowly; when the sand lines up best, hold still and it locks.")}</small></div></div>
        <div class="track"><div class="ticks"></div>${target ? `<div class="zone"></div>` : ""}<div class="knob"></div></div><div class="meter"><i></i></div>${chipsHTML()}<div class="tbtns"><button class="btn" data-a="close" type="button">${L("收起", "Done")}</button></div>`; }
    else if (target) barEl.innerHTML = `<div class="trow"><canvas class="tfig" width="112" height="112"></canvas><div class="ttxt"><small>${why}</small>${L(`今天銅盤想唱這個聲紋：<b>「${target.name[0]}」</b>。替它找到那個音，它就會在城裡結晶。`, `Today the plate wants to sing this figure: <b>"${target.name[1]}"</b>. Find its note and it will crystallise in the city.`)}</div></div><div class="tbtns"><button class="btn primary" data-a="tune" type="button">${L("開始調音", "Start tuning")}</button></div>`;
    else barEl.innerHTML = "";
    barEl.classList.toggle("on", !!barEl.innerHTML);
    const fc = barEl.querySelector(".tfig"); if (fc && target) fc.getContext("2d").drawImage(figOf(target), 0, 0);
    barEl.querySelectorAll("[data-col]").forEach((e) => { e.style.background = e.dataset.col; });
    barEl.querySelectorAll("[data-sand]").forEach((b) => { b.onclick = () => { sandCol = b.dataset.sand; try { localStorage.setItem("mingsha-sand", sandCol); } catch (e) { } sandTint(); sandWrite(performance.now() / 1000); bar(); }; });
    const bt = barEl.querySelector('[data-a="tune"]'), bc = barEl.querySelector('[data-a="close"]'); if (bt) bt.onclick = () => setTune(true); if (bc) bc.onclick = () => setTune(false);
    const tr = barEl.querySelector(".track"); if (tr) { const z = tr.querySelector(".zone"); if (z && target) { z.style.left = ((target.pos - 0.08) * 100) + "%"; z.style.width = "16%"; } bindTrack(tr); knobDraw(); }
    if (tuneBtn) tuneBtn.classList.toggle("on", tune.on); }
  function knobDraw() { const k = barEl.querySelector(".knob"), m = barEl.querySelector(".meter i"); if (k) { k.style.left = (tune.v * 100) + "%"; k.style.setProperty("--res", tune.res.toFixed(2)); } if (m) m.style.width = Math.round(tune.res * 100) + "%"; }
  function bindTrack(tr) { let lastX = 0;
    tr.addEventListener("pointerdown", (e) => { e.preventDefault(); try { tr.setPointerCapture(e.pointerId); } catch (er) { } const r = tr.getBoundingClientRect(), kx = r.left + tune.v * r.width;
      if (Math.abs(e.clientX - kx) > 34) tune.v = clamp01((e.clientX - r.left) / r.width); tune.drag = true; lastX = e.clientX; knobDraw(); });
    tr.addEventListener("pointermove", (e) => { if (!tune.drag) return; const r = tr.getBoundingClientRect(); tune.v = clamp01(tune.v + (e.clientX - lastX) / r.width * 0.45); lastX = e.clientX; knobDraw(); });   /* 拖的時候放慢一點，比較好對準 */
    const up = () => { tune.drag = false; }; tr.addEventListener("pointerup", up); tr.addEventListener("pointercancel", up); }
  addEventListener("keydown", (e) => { if (!tune.on) return; if (e.key === "ArrowLeft") tune.v = clamp01(tune.v - 0.0025); else if (e.key === "ArrowRight") tune.v = clamp01(tune.v + 0.0025); else return; knobDraw(); });
  let focus = null, fk = 0; const _fp = new V3();
  function setTune(on) { if (cut) return; tune.on = on; tune.lockT = 0; if (on) { focus = { x: 0, y: 0, z: 0 }; _fp.set(0, 0, 0); cam.want = SMALL ? 84 : 54; cam.pitch = 1.12; if (!target) toast(L("自由調音：找找看還有哪些聲紋。", "Free tuning: see what other figures you can find."), 3000); }
    else { focus = null; cam.want = SMALL ? 16 : 14; cam.pitch = 0.3; } bar(); }
  function onLock(q) { tune.lastKey = q.key; audio.lock(tune.v); ripple(GOLD, 2.6); strings.forEach((s, i) => { s.flash = 0.5 * Math.abs(Math.sin(i + q.i)); });
    const figs = figsOf(), isNew = !figs.has(q.key); if (isNew) { if (FS && FS.growMark) FS.growMark(CITY, "f:" + q.key); else dbgFigs[q.key] = 1; }
    const n = figsOf().size; showGrowth();
    if (target && q.key === target.key) { crystallize(q); return; }
    if (isNew) { toast(L(`定音！新的聲紋「${q.name[0]}」　（聲紋譜 ${n} / ${MODES.length}）`, `Locked! New figure: "${q.name[1]}"  (${n} / ${MODES.length})`), 4200); audio.seal(); const u = SANDS.find((s) => s[4] === n); if (u) setTimeout(() => toast(L(`解鎖新的沙色「${u[1]}」！在調音的那一條換顏色。`, `New sand colour unlocked: ${u[2]}! Change it on the tuning bar.`), 6000), 2400); bar(); }
    else toast(L(`定音：「${q.name[0]}」`, `Locked: "${q.name[1]}"`), 2000); }
  function crystallize(q) { const id = `${q.key}@${targetBk}`; const r = FS && FS.growChoose ? FS.growChoose(CITY, q.key, 12, id) : { slot: crList.length ? Math.max(...crList.map((c) => c.slot)) + 1 : 0 };
    target = null; audio.grow(); setTimeout(showGrowth, 300); ripple(BCOL[targetBk] || GOLD, 5); ripple(GOLD, 4);
    if (r) { const slot = r.slot >= 0 ? r.slot : (G0.slots || []).length; const n = addCrystal(slot, id, true); crRev = true;
      say(L(`「${q.name[0]}」結晶了——${n} 座光塔沿著它的節線，從盤上長了出來。`, `"${q.name[1]}" has crystallised — ${n} towers of light rise along its nodal lines.`), L("阿律・調音師", "Lu, the tuner"), 7000); }
    setTimeout(() => setTune(false), 2600); bar(); }
  let crRev = false;
  function openFigs() { const figs = figsOf(), city = cityKeys(), got2 = figs.size, ov = document.createElement("div"); ov.className = "figov";
    ov.innerHTML = `<div class="fbox"><div class="fhead"><b>${L("聲紋譜", "Sound figures")}</b><small>${got2} / ${MODES.length}</small><button class="btn" type="button" data-x>✕</button></div>
      <p class="flead">${L("用「調」替銅盤掃過不同的音，沙排出來的每一種圖案都是一個聲紋。每天銅盤想唱的那一個，定下來就會在城裡結晶（名字是金色的）。集得越多，能換的沙色越多。", "Use Tune to sweep the plate through different notes; every pattern the sand makes is a sound figure. The one the plate wants each day crystallises in the city when you lock it (gold names). The more you collect, the more sand colours you unlock.")}</p>
      <div class="fcols">${SANDS.filter((s) => s[4] > 0).map(([k, zh, en, col, need]) => `<span class="${got2 >= need ? "has" : ""}"><i data-col="${col}"></i>${L(zh, en)} ${got2 >= need ? L("已解鎖", "unlocked") : L(`${need} 紋`, `${need} figs`)}</span>`).join("")}</div>
      <div class="fgrid">${MODES.map((q) => `<div class="fcell ${target && target.key === q.key ? "today" : ""} ${city.has(q.key) ? "city" : ""}" data-k="${q.key}">${figs.has(q.key) ? `<canvas width="112" height="112"></canvas><b>${L(q.name[0], q.name[1])}</b>` : `<div class="q">？</div><span>${target && target.key === q.key ? L("今天", "today") : "　"}</span>`}</div>`).join("")}</div></div>`;
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); }); ov.addEventListener("pointerdown", (e) => e.stopPropagation()); ov.querySelector("[data-x]").onclick = () => ov.remove();
    ov.querySelectorAll("[data-col]").forEach((e) => { e.style.background = e.dataset.col; });
    document.body.append(ov); ov.querySelectorAll(".fcell canvas").forEach((cv) => { const q = modeByKey(cv.parentElement.dataset.k); cv.getContext("2d").drawImage(figOf(q), 0, 0); }); }

  /* ---------- 進城：今天銅盤想唱的聲紋（看最近的日子） ---------- */
  const pick = (feed, r) => { const b = (feed && feed.b) || {}, order = BUCKETS.slice().sort((x, y) => (b[y] || 0) - (b[x] || 0) || r() - 0.5), top = (b[order[0]] || 0) > 0 ? order[0] : null;
    const have = cityKeys(), lim = Math.min(MODES.length, 8 + have.size * 2), pool = MODES.slice(0, lim).filter((q) => !have.has(q.key)), all = MODES.filter((q) => !have.has(q.key)), P2 = pool.length ? pool : all;
    if (!P2.length) return { offer: [], top }; const q = P2[Math.floor(r() * P2.length)]; return { offer: [`${q.key}@${top || "none"}`], top }; };
  function arrive() { if (cut) return; let g = { state: null, offer: null, top: null }; if (FS) g = growStart({ city: CITY, map: pick, rnd });
    if (g.state) { placeMoonlets(g.state.visits); auroraLv(g.state.night); }
    if (g.offer && g.offer[0]) { const [k, bk] = String(g.offer[0]).split("@"); target = modeByKey(k); targetBk = bk || "none"; }
    why = L(WHY[targetBk] ? WHY[targetBk][0] : WHY.none[0], WHY[targetBk] ? WHY[targetBk][1] : WHY.none[1]);
    bar(); showGrowth(); if (target) setTimeout(() => say(L("今天銅盤想唱一個聲紋。點下面的「開始調音」，慢慢掃，沙排出它的樣子時停住。", "The plate wants to sing a figure today. Tap Start tuning below and sweep slowly; hold still when the sand takes its shape."), L("阿律・調音師", "Lu, the tuner"), 8000), 1600); }
  const showGrowth = () => { const n = cityKeys().size, c = $("#clock"); c.textContent = L(`${n} 圈光塔・${figsOf().size} 紋`, `${n} rings · ${figsOf().size} figures`); };

  /* ---------- 操作：點地面走、拖曳轉視角、滾輪／雙指縮放 ---------- */
  const ray = new THREE.Raycaster(), _h = new V3(), _nd = new THREE.Vector2(), groundPl = new THREE.Plane(new V3(0, 1, 0), 0), _sp = new V3();
  let drag = null, pinch = 0; const ptr = new Map(); const el = renderer.domElement;
  function groundHit() { return ray.ray.intersectPlane(groundPl, _h) ? _h.clone() : null; }
  function nearPick(cx0, cy0) { let best = null, bd = Math.max(42, Math.min(innerWidth, innerHeight) * 0.09);
    for (const m of pickables) { if (!m.parent || m.parent.visible === false) continue; const u = m.userData; if (u.kind === "fix") continue; m.getWorldPosition(_sp); if (_sp.distanceTo(camera.position) > 55) continue; _sp.project(camera); if (_sp.z > 1) continue;
      const d = Math.hypot((_sp.x + 1) / 2 * innerWidth - cx0, (1 - _sp.y) / 2 * innerHeight - cy0); if (d < bd) { bd = d; best = m; } } return best; }
  function tap(cx0, cy0) { if (cut) return; if (tune.on) { setTune(false); return; } _nd.set(cx0 / innerWidth * 2 - 1, -(cy0 / innerHeight) * 2 + 1); ray.setFromCamera(_nd, camera); ray.camera = camera; const gh = groundHit(), gd = gh ? gh.distanceTo(camera.position) : Infinity;
    const hit = ray.intersectObjects(pickables, false).find((h) => h.object.parent && h.object.parent.visible !== false && h.distance < gd + 2); const obj = hit ? hit.object : nearPick(cx0, cy0);
    if (obj) { const u = obj.userData;
      if (u.kind === "fix") { fixTap(u.ref); return; }
      if (u.kind === "cx") { if (cx.tap(u.ref, [P.x, P.z]) === "far") { const p = cx.pos(u.ref); goNear(p.x, p.z, 1.4); } return; }
      if (u.kind === "mg") { if (mg.tap(u.ref, [P.x, P.z]) === "far") { const p = mg.pos(u.ref); goNear(p.x, p.z, 1.6); } return; }
      if (u.kind === "folk") { const f = folks[u.ref]; if (Math.hypot(P.x - f.x, P.z - f.z) < 9) { talk(f, performance.now() / 1000); return; } goNear(f.x, f.z, 1.6); return; }
      if (u.kind === "ev") { const e = evs[u.ref]; if (e.state !== "wait") return; if (e.kind === "chime") { if (Math.hypot(P.x - e.x, P.z - e.z) < 4.5) { finish(e); return; } goNear(e.x, e.z, 2); return; } goNear(e.x, e.z, 0); return; } }
    if (!gh || !walkable(gh.x, gh.z)) return;
    fixGo = null; P.stuck = 0; P.tx = gh.x; P.tz = gh.z; markAt(gh.x, gh.z); }
  function goNear(x, z, off) { const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz) || 1; let tx = x + dx / d * off, tz = z + dz / d * off; if (!walkable(tx, tz)) { tx = x; tz = z; } if (!walkable(tx, tz)) return;
    fixGo = null; P.stuck = 0; P.tx = tx; P.tz = tz; markAt(tx, tz); }
  const endPtr = (e) => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (drag && !drag.turning && e.type === "pointerup") tap(e.clientX, e.clientY); if (ptr.size === 0) { drag = null; pinch = 0; } };
  el.addEventListener("pointerdown", (e) => { if (e.isPrimary) { ptr.clear(); pinch = 0; drag = null; } try { el.setPointerCapture(e.pointerId); } catch (er) { }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0, turning: false }; else if (ptr.size === 2) { const p = [...ptr.values()]; pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); drag = null; } });
  el.addEventListener("pointermove", (e) => { if (!ptr.has(e.pointerId)) return; const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const p = [...ptr.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (pinch) cam.want = Math.max(5, Math.min(110, cam.want * pinch / d)); pinch = d; return; }
    if (!drag) return; const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    if (drag.moved > 16) { drag.turning = true; cam.yaw -= dx * 0.0045; cam.pitch = Math.max(-0.2, Math.min(1.4, cam.pitch + dy * 0.004)); } });
  el.addEventListener("pointerup", endPtr); el.addEventListener("pointercancel", endPtr); el.addEventListener("lostpointercapture", endPtr);
  el.addEventListener("wheel", (e) => { e.preventDefault(); cam.want = Math.max(5, Math.min(110, cam.want * (e.deltaY > 0 ? 1.12 : 0.89))); }, { passive: false });
  const normalFov = () => innerWidth / innerHeight < 0.8 ? 62 : 50;
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = normalFov(); camera.updateProjectionMatrix(); }

  /* ---------- 過場（每次都播，「略過」一直按得到）----------
   * 一、遠遠看見星雲裡一面銅盤，天弦還收著，沙散成一片。
   * 二、按「穿過星門」：一顆流星從天上直直落下來，砸在盤中央——大鐘一樣的一聲。
   * 三、光圈一圈圈推開，沙全部跳起來，落成你上次定下的聲紋；天弦一根根往天上拉開，光塔從盤上長出來。
   * 四、鏡頭俯衝下去，接到你站的地方。 */
  const CUT_T = { fall: 1.5, rise: 1.9, crys: 2.6, dive: 4.6, end: 7.4 };
  const cutMode = (() => { const s = (G0.slots || []).slice(-1)[0]; return modeByKey(s ? String(s).split("@")[0] : MODES[3].key); })();
  const meteor = spr(starT, "#ffffff", 8, 0, { blending: ADD, depthTest: false }), meteorTail = spr(softT, "#ffd890", 26, 0, { blending: ADD, depthTest: false }); meteor.renderOrder = meteorTail.renderOrder = 20; scene.add(meteor); scene.add(meteorTail);
  const M0 = new V3(260, 520, -380);
  function cutSet(T) { const kr = (i) => clamp01((T - CUT_T.rise - i * 0.035) / 0.9); strings.forEach((s, i) => { s.grow = ease(kr(i)); });
    crList.forEach((c) => { c.rev = (T - CUT_T.crys) / 1.6 + (c.rev0 != null ? c.rev0 : 0); }); crWrite(); }
  function endCut() { if (!cut) return; const settled = !!cut.sandOff; cut = null; if (!settled) sandPlace(cutMode); strings.forEach((s) => { s.grow = 1; }); crList.forEach((c) => { c.rev = 1; delete c.rev0; }); crWrite(); meteor.material.opacity = meteorTail.material.opacity = 0; const fl = $("#flash"); if (fl) fl.style.opacity = 0;
    $("#gate").hidden = true; document.body.classList.remove("cutting"); const h = $("#hint"); h.classList.remove("off"); setTimeout(() => h.classList.add("off"), 12000); setTimeout(arrive, 900); }
  function runCut(dt, fpos, flook) { cut.t += dt; const T = cut.t, fl = $("#flash");
    if (cut.ph === "wait") { const a = T * 0.06 + 0.8; camera.position.set(Math.cos(a) * 240, 95 + Math.sin(T * 0.1) * 12, Math.sin(a) * 240); camera.lookAt(0, 30, 0); return; }
    if (!cut.prep) { cut.prep = true; crList.forEach((c) => { c.rev0 = -Math.hypot(c.x, c.z) / 60 * 1.2; }); cut.from = camera.position.clone(); audio.whoosh(); }
    /* 流星 */
    const km = clamp01(T / CUT_T.fall); meteor.position.copy(M0).lerp(new V3(0, 2, 0), km * km); meteorTail.position.copy(meteor.position).addScaledVector(M0.clone().normalize(), 10); meteor.material.opacity = T < CUT_T.fall ? 1 : 0; meteorTail.material.opacity = T < CUT_T.fall ? 0.7 : 0;
    if (T >= CUT_T.fall && !cut.hit) { cut.hit = true; audio.strike(1); ripple("#ffffff", 2.2); setTimeout(() => ripple(GOLD, 3), 250); setTimeout(() => ripple("#9ee8ff", 3.6), 550); }
    if (fl) fl.style.opacity = T >= CUT_T.fall ? Math.max(0, 0.75 - (T - CUT_T.fall) * 1.6) : 0;
    if (T >= CUT_T.fall && T < CUT_T.fall + 2.6) { cut.sand = sandStep([[cutMode, 1]], 1.6 * (1 - (T - CUT_T.fall) / 2.6) + 0.2, T); audio.sand(0.8 * (1 - (T - CUT_T.fall) / 2.6)); } else if (T >= CUT_T.fall + 2.6 && !cut.sandOff) { cut.sandOff = true; audio.sand(0); }
    if (T > CUT_T.rise && !cut.arp) { cut.arp = true; for (let i = 0; i < 9; i++) setTimeout(() => audio.string(i, 0.9), i * 90); }
    cutSet(T);
    /* 鏡頭：跟著流星靠近 → 盤上空 → 俯衝 */
    const k1 = ease(clamp01(T / CUT_T.fall)), over = new V3(0, 120, 150), kd = ease(clamp01((T - CUT_T.dive) / (CUT_T.end - CUT_T.dive)));
    const cp = cut.from.clone().lerp(over, k1); if (kd > 0) cp.lerp(fpos, kd); camera.position.copy(cp); const lk = new V3(0, 10, 0); if (kd > 0) lk.lerp(flook, kd); camera.lookAt(lk);
    if (T >= CUT_T.end) endCut(); }
  if (cut) { $("#gate").hidden = false; document.body.classList.add("cutting"); $("#hint").classList.add("off");
    $("#gGo").textContent = L("🌀 穿過星門", "🌀 Through the star gate"); $("#gSub").textContent = L("星光落下來的地方，沙在唱歌。", "Where starlight falls, the sand sings."); $("#gTitle").textContent = L("鳴沙城", "MINGSHA"); $("#gSkip").textContent = L("略過 ›", "Skip ›");
    $("#gGo").onclick = (e) => { e.stopPropagation(); audio.gesture(); cut.ph = "run"; cut.t = 0; $("#gate").classList.add("running"); };
    $("#gSkip").onclick = (e) => { e.stopPropagation(); audio.gesture(); endCut(); };
    sandPlace(null); strings.forEach((s) => { s.grow = 0.001; }); crList.forEach((c) => { c.rev = 0; }); crWrite(); }
  else { sandPlace(cutMode); setTimeout(arrive, 900); }
  sandTint(); sandWrite(0);
  addEventListener("resize", resize); resize();

  $("#place").textContent = L("鳴沙城", "Mingsha"); showGrowth();
  $("#hint").textContent = L("點地面走過去 · 拖曳轉視角 · 金色的「調」替銅盤調音，沙會排出聲紋 · 「紋」是你收集的聲紋譜 · 「修」是壞掉的地方", "Tap the ground to walk · drag to turn · the gold Tune button sets the plate singing and the sand forms figures · Figures is your album · 修 marks something broken");
  if (!cut) setTimeout(() => $("#hint").classList.add("off"), 14000);
  { const vg = document.createElement("div"); vg.className = "vig"; document.body.append(vg); }
  window.__sleSnap = () => { try { renderer.render(scene, camera); const c = renderer.domElement; return { url: c.toDataURL("image/jpeg", 0.9), w: c.width, h: c.height, place: $("#place") ? $("#place").textContent : "" }; } catch (e) { return null; } };
  $("#loading").remove(); sndLabel(); $("#snd").onclick = (e) => { e.stopPropagation(); audio.toggle(); sndLabel(); toast(audio.on ? L("♪ 聲音打開了", "♪ Sound on") : L("聲音關掉了", "Sound off"), 1800); };
  const perf = { n: 0, sum: 0, max: 0 };
  if (QS.has("dbg")) window.__ms = { P, cam, tune, setTune, target: () => target && target.key, MODES: () => MODES.map((q) => [q.key, +q.pos.toFixed(3)]), figs: () => [...figsOf()], city: () => [...cityKeys()], crys: () => crList.length,
    go: (x, z) => { P.x = x; P.z = z; P.tx = P.tz = null; return [x, z, walkable(x, z)]; }, ev: () => evs.map((e) => ({ i: e.i, kind: e.kind, x: +e.x.toFixed(1), z: +e.z.toFixed(1), state: e.state })), finish: (i) => { finish(evs[i]); return evs[i].state; },
    cutT: () => cut && { ph: cut.ph, t: +cut.t.toFixed(2) }, cutSet: (t) => { if (cut) { cut.ph = "run"; cut.t = t; } return !!cut; }, arrive, openFigs, bar,
    fix: () => Object.values(fixSites).map((S) => ({ id: S.id, k: +S.kt.toFixed(2), done: S.done })), fixAt: (id, off = 7) => { const S = fixSites[id]; P.x = S.x * (1 - off / 50); P.z = S.z * (1 - off / 50); P.tx = P.tz = null; return [S.x, S.z]; }, fixTap: (id) => { fixTap(id); return fixes.isOpen; },
    fixSim: (id, k) => { const S = fixSites[id]; S.k = S.kt = k; S.done = k >= 1; S.mk.visible = k < 1; return 1; }, poster: (id) => { makePoster(id); return 1; }, story: () => { tellStory(true); return 1; }, tap, walkable,
    perf: () => ({ avgMs: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, maxMs: +perf.max.toFixed(1), n: perf.n, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }), resetPerf: () => { perf.n = perf.sum = perf.max = 0; return 1; } };

  /* ---------- 每一格 ---------- */
  let last = performance.now(); const _p = new V3(), _q = new V3(), _look = new V3();
  function frame(now) { requestAnimationFrame(frame); const raw = Math.min(0.25, (now - last) / 1000), dt = Math.min(0.05, raw), t = now / 1000; last = now; const f0 = performance.now();
    let moving = 0; const px0 = P.x, pz0 = P.z;
    if (!cut && P.tx !== null) { const dx = P.tx - P.x, dz = P.tz - P.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { P.tx = P.tz = null; } else { const v = Math.min(d, 7 * dt); let nx = P.x + dx / d * v, nz = P.z + dz / d * v;
        for (const o of obstacles) { if (!(o.r > 0)) continue; const ox = nx - o.x, oz = nz - o.z, od = Math.hypot(ox, oz); if (od < o.r) { const k = (o.r - od) / (od || 1); nx += ox * k; nz += oz * k; } }
        if (walkable(nx, nz)) { P.x = nx; P.z = nz; } av.rotation.y = Math.atan2(dx, dz); moving = 1; } }
    if (P.tx !== null) { P.stuck = Math.hypot(P.x - px0, P.z - pz0) < 7 * dt * 0.2 ? (P.stuck || 0) + dt : 0; if (P.stuck > 0.35) { P.tx = P.tz = null; P.stuck = 0; fixGo = null; moving = 0; } }
    me.position.set(P.x, 0, P.z); animatePerson(av, t, moving ? 2 : 0); nameTag.userData.tick(t); mark.material.opacity = Math.max(0, mark.material.opacity - dt * 0.6);
    /* 調音 → 沙、聲音、天弦、音叉 */
    let energy = 0;
    if (!cut) { if (tune.on) { const resp = response(tune.v), best = resp[0]; tune.res = best ? best[1] : 0;
        if (!tune.drag && best && best[1] > 0.45) { tune.v += (best[0].pos - tune.v) * Math.min(1, dt * 2.6); }   /* 手放開時，輕輕吸到最近的共鳴點 */
        if (best && best[1] > 0.86) { if (best[0].key !== tune.lastKey) { tune.lockT += dt; if (tune.lockT > 1.1) { tune.lockT = 0; onLock(best[0]); } } } else { tune.lockT = 0; if (!best || best[1] < 0.3) tune.lastKey = null; }
        tune.gain += (1 - tune.gain) * Math.min(1, dt * 3); const s = sandStep(resp, tune.gain, t); energy = Math.min(1, tune.res); audio.tune(tune.v, tune.res, true); void s; knobDraw(); }
      else { tune.gain = Math.max(0, tune.gain - dt * 2); tune.res *= 0.9; sandStep([], 0, t); audio.tune(tune.v, 0, false); } }
    stringsFrame(t, energy * 0.9 + (beatOn ? 0.04 : 0)); fork.rotation.y = t * 0.2; fork.position.y = 15 + Math.sin(t * 0.8) * 0.4; forkGlow.material.opacity = 0.15 + energy * 0.6; forkGlow.position.y = fork.position.y + 1;
    for (const q of ripples) { if (q.t < q.d) { q.t += dt; const k = q.t / q.d; q.m.scale.setScalar(2 + k * (PLATE - 2)); q.m.material.opacity = 0.75 * (1 - k); } else if (q.m.material.opacity) q.m.material.opacity = 0; }
    if (crRev && !cut) { let any = false; for (const c of crList) if (c.rev < 1) { c.rev = Math.min(1, c.rev + dt / 1.8); any = true; } crWrite(); if (!any) crRev = false; }
    for (const m of moonlets) { m.a += m.v * dt; m.s.position.set(Math.cos(m.a) * m.r, m.y + Math.sin(t * 0.7 + m.a) * 2, Math.sin(m.a) * m.r); }
    for (const q of auroras) { const p = q.m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = q.base[i * 3]; p.setZ(i, Math.sin(x * 0.006 + t * 0.25 + q.ph) * 70 + Math.sin(x * 0.017 - t * 0.4) * 22); } p.needsUpdate = true; }
    for (const f of folks) { f.p.position.y = 0.15 + Math.sin(t * 1.3 + f.ph) * 0.12; f.p.userData.halo.rotation.z = t * 0.8; if (f.face > 0) { f.face -= dt; const want = Math.atan2(P.x - f.x, P.z - f.z); let dy = want - f.p.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.p.rotation.y += dy * Math.min(1, dt * 4); } }
    for (const e of evs) {
      if (e.state === "wait") { if (e.kind === "star") { const a = e.a0 + t * e.w; e.x = Math.cos(a) * e.r; e.z = Math.sin(a) * e.r; e.g.position.set(e.x, 1.6 + Math.sin(t * 1.7 + e.ph) * 0.6, e.z); e.m.material.rotation = t * 1.5;
          if (!cut && Math.hypot(P.x - e.x, P.z - e.z) < 2.2) finish(e); } }
      else if (e.state === "go") { e.t += dt; const k = Math.min(1, e.t / 3);
        if (e.kind === "chime") { e.gl.material.opacity = 0.5 * k; if (k > 0.2 && !e.lit) { e.lit = true; e.stone.material = new THREE.MeshBasicMaterial({ color: "#9ee8ff" }); } e.stone.rotation.z = Math.sin(e.t * 18) * 0.12 * (1 - k); }
        else { e.g.position.y += dt * (2 + k * 10); e.m.material.opacity = 1 - k; }
        if (k >= 1) { e.state = "done"; if (e.kind !== "chime") e.g.visible = false; } } }
    if (!cut) fixFrame(t, dt); togetherFrame(t, dt); cx.tick(t); mg.tick(t);
    /* 鏡頭 */
    cam.dist += (cam.want - cam.dist) * Math.min(1, dt * 1.6);
    fk = clamp01(fk + (focus ? dt : -dt) * 1.2); const base = _q.set(P.x, 1.6, P.z); if (fk > 0) base.lerp(_fp, ease(fk));
    const pit = Math.max(0.04, cam.pitch), cp = Math.cos(pit); let D = cam.dist;
    for (let tries = 0; tries < 7; tries++) { _p.set(base.x + Math.sin(cam.yaw) * cp * D, base.y + Math.sin(pit) * D, base.z + Math.cos(cam.yaw) * cp * D); let inside = false;
      const ns = Math.max(6, Math.ceil(D / 1.5)); for (let k = 1; k <= ns && !inside; k++) { const f = k / ns, qx = base.x + (_p.x - base.x) * f, qy = base.y + (_p.y - base.y) * f, qz = base.z + (_p.z - base.z) * f;
        for (const o of obstacles) if (o.r > 0 && qy < o.h + 0.6 && Math.hypot(qx - o.x, qz - o.z) < o.r + 0.5) { inside = true; break; } }
      if (!inside || D < 1.5) break; D *= 0.78; }
    if (_p.y < 0.8) _p.y = 0.8;
    _look.copy(base);
    if (cut) runCut(raw, _p, _look); else { camera.position.copy(_p); camera.lookAt(_look); }
    renderer.render(scene, camera);
    const ms = performance.now() - f0; if (!cut) { perf.n++; perf.sum += ms; if (ms > perf.max) perf.max = ms; } }
  requestAnimationFrame(frame);
})();
