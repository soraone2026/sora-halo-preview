/* 浮燈渡（2026-11-23，熊：「接著做剩下的星際城市；會逐漸長大、依每個玩家不同的行為長成不同樣子；修復完要有故事的延續」）
 * - 第六座星際城市：一片永遠在黃昏的雲海上，一座浮島是渡口，四周的浮島用吊橋接起來。遠方一直有天燈往上漂。
 * - 會長大：每天第一次來，兩座浮島從雲海漂過來，挑一座靠岸（/city/grow.js）。漂來的是哪兩座，看玩家上次來之後的生活。
 *   六種島（市集、渡口、屋簷、星庫、書燈、鈴鐺）；十一個位置停滿以後，再選同一種就讓那種島長大一級（最多三級）。
 *   晚上來過的次數 → 吊橋上的燈串；來過的天數 → 你放上天的天燈。所以每個玩家的浮燈渡都長得不一樣。
 * - 每天五件小事：放天燈（走到燈台點一下）、接紙鶴（走到繞圈飛的紙鶴旁邊）。做完一件 1 B＋1 份燈芯。
 * - 三處要修：大燈塔、渡口的鐵鏈橋、雲渡船。修好一處拍一張海報；三處都修好，船長講下一段故事（第六章）。
 * 預覽：?day=YYYY-MM-DD、?nocut、?fx=0|1、?dbg（window.__ferry）
 */
import { finAvatar, makePerson, animatePerson } from "../city/city-people.js";
import { createFerryAudio } from "./ferry-audio.js";
import { createRepair } from "../city/repair.js";
import { makeTrio } from "../city/cityx.js";
import { makeGames } from "../city/minigame.js";
import { makeNameTag, playerName } from "../city/nametag.js";
import { NIKO_LOOK, makeFigure, tickFigure, tourLink, invitePanel, makeCard, cardPanel } from "../city/together.js";
import { growStart, growPanel, storyCard } from "../city/grow.js";
try { if (window.parent !== window) document.body.classList.add("embed"); } catch (e) { document.body.classList.add("embed"); }

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
const FX_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/";
const $ = (s) => document.querySelector(s);
const I18N = window.SLE_I18N || { lang: "zh" };
const L = (zh, en) => (I18N.lang === "en" ? en : zh);
const QS = new URLSearchParams(location.search);
const SMALL = Math.min(innerWidth, innerHeight) < 600;
let toastT = 0, sayT = 0;
function toast(m, ms = 3600) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms); }
function say(m, who, ms = 5600) { const t = $("#say"); t.textContent = m; if (who) { const s = document.createElement("small"); s.textContent = "— " + who; t.append(s); } t.classList.add("show"); clearTimeout(sayT); sayT = setTimeout(() => t.classList.remove("show"), ms); }
function todayStr() { const q = QS.get("day"); if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q; const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
function seedOf(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; }
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const segDist = (px, pz, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, k = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)); return Math.hypot(px - ax - vx * k, pz - az - vz * k); };

const DAY = todayStr(), rnd = rngOf(seedOf("ferry:" + DAY)), HUB = 17, ISL = 7.5, SLOT_R = 42, WIND_T = 24;
const FS = window.FinSave && FinSave.ok() ? FinSave : null, ST0 = FS && FS.starState ? FS.starState("ferry") : { got: [], n: 0, days: 0 };
const audio = createFerryAudio(seedOf("ferry:" + DAY));
const sndLabel = () => { const b = $("#snd"); if (b) { b.textContent = "♪"; b.title = audio.on ? L("關掉聲音", "Mute") : L("打開聲音", "Sound on"); b.classList.toggle("off", !audio.on); } };
addEventListener("pointerdown", (e) => { if (!(e.target && e.target.id === "snd")) audio.gesture(); }, { capture: true });
addEventListener("keydown", () => audio.gesture());
document.addEventListener("visibilitychange", () => { if (document.hidden) audio.pause(); else audio.resume(); });
window.__sleSound = (on) => { if (on === false) audio.pause(true); else audio.resume(true); };

/* 六種會靠岸的浮島（記帳的六類 → 島） */
const GROW_MAP = { food: "market", move: "dock", home: "eaves", save: "vault", learn: "lamp", play: "bell" };
const ISLE = {
  market: { icon: "🏮", name: ["市集島", "Market Isle"], desc: ["攤子一攤攤亮起來，空氣裡有湯的味道。", "Stalls light up one by one; the air smells of soup."], why: ["其中一座聞起來，像你最近吃過的那些飯。", "One of them smells like the meals you've had lately."], col: "#e0a060",
    lines: [["今天的湯是雲海裡撈上來的星芹熬的。喝一口？", "Today's soup is made with star-celery fished from the clouds. A sip?"], ["吃飽的人走路比較輕，在這裡很重要。", "A full belly makes you light on your feet. That matters, up here."]] },
  dock: { icon: "⛵", name: ["渡口島", "Ferry Isle"], desc: ["小船一艘艘靠過來，要去哪裡都有船。", "Little boats come in; there's a boat to anywhere."], why: ["其中一座的船很忙，跟你最近搭的車一樣。", "One of them has busy boats — as busy as your own commute."], col: "#6aa8d8",
    lines: [["每一艘船都記得自己載過誰。", "Every boat remembers who it carried."], ["要出門的人，路會自己變短一點。", "For someone who sets out, the road gets a little shorter."]] },
  eaves: { icon: "🏡", name: ["屋簷島", "Eaves Isle"], desc: ["幾間小屋，窗子都亮著。", "A few small houses, every window lit."], why: ["其中一座的窗子亮著，跟你家一樣。", "One of them has its windows lit, like your home."], col: "#c8a0d0",
    lines: [["把家裡顧好的人，身上有一種很安靜的光。", "People who take care of home carry a very quiet kind of light."], ["你也住在一間會亮燈的房子裡吧？", "You live in a house with its lights on too, don't you?"]] },
  vault: { icon: "💠", name: ["星庫島", "Vault Isle"], desc: ["一座水晶塔，存著一點一點攢下來的光。", "A crystal tower, storing light saved bit by bit."], why: ["其中一座裡面，有你這陣子存下來的光。", "One of them holds the light you've been saving lately."], col: "#6ad8c8",
    lines: [["存下來的光不會跑掉，它只是在等你。", "Saved light never leaves. It just waits for you."], ["塔又高了一點。你看得出來嗎？", "The tower grew a little taller. Can you tell?"]] },
  lamp: { icon: "📚", name: ["書燈島", "Booklamp Isle"], desc: ["一疊疊的書堆成燈塔，旁邊有一架望遠鏡。", "Books stacked into a lighthouse, with a telescope beside it."], why: ["其中一座在翻書頁——你最近讀了不少。", "One of them is turning pages — you've been reading a lot."], col: "#e8d890",
    lines: [["學會一個字，燈就亮一格。", "Learn one word and the lamp brightens one notch."], ["望遠鏡看得到很遠的城。有一座還沒有名字。", "The telescope can see far-off cities. One of them has no name yet."]] },
  bell: { icon: "🔔", name: ["鈴鐺島", "Bell Isle"], desc: ["一棵掛滿鈴鐺的樹，旁邊的旋轉木馬慢慢轉。", "A tree hung with bells, a carousel turning slowly beside it."], why: ["其中一座在響——你最近玩得很開心。", "One of them is ringing — you've been having fun lately."], col: "#f0a0b8",
    lines: [["鈴鐺是笑聲變的。", "The bells are made of laughter."], ["玩得開心的人，城會長得比較快。真的。", "When people have fun, the city grows faster. Truly."]] },
};
const NAMES = [["老槳", "Old Oar"], ["燈婆", "Granny Wick"], ["雲雀", "Lark"], ["阿纜", "Rope"], ["小渡", "Little Ferry"]];
const LINES = [["雲海底下什麼都沒有。所以我們把燈往上放。", "There's nothing below the clouds. So we send our lanterns up."],
  ["風大的時候，所有的風鈴會一起響。站著聽一下。", "When the wind is strong every chime rings at once. Stand and listen."],
  ["大燈塔暗掉以後，晚上的船都找不到渡口。", "Since the great lantern went dark, the night boats can't find the ferry."],
  ["浮島是會漂過來的。哪一座會停下來，要看你。", "Islands drift in. Which one stays depends on you."],
  ["紙鶴繞著渡口飛，牠們在找要帶信的人。", "Paper cranes circle the ferry. They're looking for someone to carry a letter."],
  ["那座鐵鏈橋斷了，渡船停在那頭過不來。", "The chain bridge broke, and the ferry is stuck on the far side."],
  ["每一盞天燈，都是有人好好過完一天。", "Every sky lantern is someone who got through a day well."],
  ["你身上有苔光的味道，還有潮水。你從很遠的地方來。", "You smell of mossglow, and of the tide. You've come a long way."]];

(async function main() {
  let THREE;
  try { THREE = await import(THREE_URL); } catch { $("#loading").textContent = L("浮燈渡需要網路載入 3D。", "Lanternferry needs the internet to load 3D."); return; }
  const V3 = THREE.Vector3;
  let cut = QS.has("nocut") ? null : { ph: "wait", t: 0 };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !SMALL, powerPreference: "high-performance" }); }
  catch (e) { const b = $("#loading"); b.style.pointerEvents = "auto"; b.textContent = L("這個瀏覽器目前無法顯示 3D 城市（WebGL 沒有開啟或顯示卡不支援）。", "This browser can't show the 3D city right now (WebGL is off or unsupported)."); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.5 : 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  $("#stage").append(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog("#d89a8a", 160, 700);
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 1800);
  const canvasTex = (w, h, draw) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const glowTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const sprite = (color, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(s); return sp; };
  const ease = (k) => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const dummy = new THREE.Object3D();
  const R0 = rngOf(seedOf("ferry-land"));

  /* ---------- 黃昏的天空、低低的太陽、雲海 ---------- */
  { const sky = canvasTex(4, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); [[0, "#1a1440"], [0.25, "#3a2a6a"], [0.42, "#a0587a"], [0.5, "#f0a070"], [0.53, "#ffd8a0"], [0.6, "#e8b0a0"], [1, "#6a4a6a"]].forEach(([k, col]) => g.addColorStop(k, col)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 24), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false })));
    const sun = sprite("#ffd890", 220, 0.85); sun.position.set(120, 10, -700); sun.material.fog = false; scene.add(sun);
    const N = SMALL ? 500 : 900, pos = new Float32Array(N * 3), r = rngOf(seedOf("sky6")); for (let i = 0; i < N; i++) { const a = r() * Math.PI * 2, y = 0.35 + r() * 0.65, rr = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * rr * 900, y * 900, Math.sin(a) * rr * 900], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: "#fff0e0", size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7, depthWrite: false }))); }
  scene.add(new THREE.HemisphereLight("#ffd0b0", "#6a4a7a", 1.05)); scene.add(new THREE.AmbientLight("#ffe0d0", 0.18));
  const dl = new THREE.DirectionalLight("#ffd8a8", 1.3); dl.position.set(100, 60, -260); scene.add(dl);
  const cloudT = canvasTex(512, 512, (c, w, h) => { c.fillStyle = "#b07a98"; c.fillRect(0, 0, w, h); const r = rngOf(66); for (let k = 0; k < 420; k++) { const x = r() * w, y = r() * h, s = 20 + r() * 70, g = c.createRadialGradient(x, y, 0, x, y, s); const l = 70 + r() * 18; g.addColorStop(0, `hsla(${340 + r() * 40},${35 + r() * 20}%,${l}%,.6)`); g.addColorStop(1, "hsla(350,40%,75%,0)"); c.fillStyle = g; c.fillRect(x - s, y - s, s * 2, s * 2); } });
  cloudT.wrapS = cloudT.wrapT = THREE.RepeatWrapping; cloudT.repeat.set(6, 6);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ map: cloudT, transparent: true, opacity: 0.95 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -24; scene.add(sea);
  const puffT = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, "rgba(255,236,226,.95)"); g.addColorStop(0.6, "rgba(250,214,206,.5)"); g.addColorStop(1, "rgba(250,214,206,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const puffs = []; for (let k = 0; k < (SMALL ? 12 : 18); k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, opacity: 0.75, depthWrite: false })); const a = R0() * Math.PI * 2, d = 110 + R0() * 260; sp.position.set(Math.cos(a) * d, -22 + R0() * 5, Math.sin(a) * d); sp.scale.set(30 + R0() * 34, 9 + R0() * 6, 1);   /* 雲朵只在遠處、比島低，不會擋到鏡頭 */ scene.add(sp); puffs.push({ sp, a, d, v: 0.004 + R0() * 0.006 }); }

  /* ---------- 浮島的做法：上面一片地，下面倒過來的岩石 ---------- */
  const rockM = M("#6a5a6a", { flatShading: true }), soilM = M("#7a8a5a"), plankM = M("#8a6a4a"), ropeM = M("#4a3a30"), stoneM = M("#a89aa8", { roughness: 0.9 });
  function floatIsland(r, top = "#7a8a5a", depth = 9) { const g = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, 1.2, 28), M(top, { roughness: 0.95 })); cap.position.y = -0.6; g.add(cap);
    const under = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, depth, 14, 1), rockM); under.position.y = -1.2 - depth / 2; under.rotation.x = Math.PI; g.add(under);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + r, d = r * (1.2 + k * 0.15), rk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + k * 0.3, 0), rockM); rk.position.set(Math.cos(a) * d, -3 - k * 2, Math.sin(a) * d); rk.userData.bob = k; g.add(rk); }
    return g; }
  const obstacles = [], areas = [];   /* areas：走得到的地方（圓、帶子）；obstacles：擋路的東西 */
  const walkable = (x, z) => areas.some((a) => a.on !== false && (a.r != null ? Math.hypot(x - a.x, z - a.z) < a.r : segDist(x, z, a.ax, a.az, a.bx, a.bz) < a.w));
  const freeOK = (x, z, gap) => obstacles.every((o) => !(o.r > 0) || Math.hypot(o.x - x, o.z - z) > o.r + gap);
  const tog = (o, on) => { if (o.r0 == null) { o.r0 = o.r; o.h0 = o.h; } o.r = on ? o.r0 : 0; o.h = on ? o.h0 : -9; };

  /* ---------- 中央的渡口浮島 ---------- */
  const hub = floatIsland(HUB, "#8a8a62", 14); scene.add(hub); areas.push({ x: 0, z: 0, r: HUB - 0.8 });
  { const ringT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#b8a89a"; c.fillRect(0, 0, w, h); const r = rngOf(7); for (let k = 0; k < 400; k++) { c.fillStyle = `rgba(${90 + r() * 40},${80 + r() * 30},${90 + r() * 30},.35)`; c.fillRect(r() * w, r() * h, 6 + r() * 14, 3); } }); ringT.wrapS = ringT.wrapT = THREE.RepeatWrapping; ringT.repeat.set(6, 1);
    const plaza = new THREE.Mesh(new THREE.RingGeometry(3, 11, 48), M("#ffffff", { map: ringT })); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; scene.add(plaza); }
  const glowPts = [], glowCols = [];
  { /* 渡民的小屋（北邊半圈）＋欄杆柱燈 */
    const n = 5, bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M("#e8d8c4"), n), roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 4), M("#b86a5a"), n);
    for (let k = 0; k < n; k++) { const a = Math.PI + 0.45 + k / (n - 1) * (Math.PI - 0.9), x = Math.cos(a) * 13.4, z = Math.sin(a) * 13.4, w = 2.6;
      dummy.position.set(x, 1.3, z); dummy.rotation.set(0, -a, 0); dummy.scale.set(w, 2.6, w); dummy.updateMatrix(); bodies.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x, 3.4, z); dummy.rotation.set(0, -a + Math.PI / 4, 0); dummy.scale.set(w * 0.95, 1.8, w * 0.95); dummy.updateMatrix(); roofs.setMatrixAt(k, dummy.matrix);
      glowPts.push(x - Math.cos(a) * 1.4, 1.6, z - Math.sin(a) * 1.4); glowCols.push(1, 0.8, 0.45); obstacles.push({ x, z, r: 2.2, h: 4.5 }); }
    scene.add(bodies, roofs);
    const NL = 14, posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 1.6, 6), ropeM, NL);
    for (let k = 0; k < NL; k++) { const a = k / NL * Math.PI * 2 + 0.11, x = Math.cos(a) * (HUB - 0.6), z = Math.sin(a) * (HUB - 0.6); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.position.set(x, 0.8, z); dummy.updateMatrix(); posts.setMatrixAt(k, dummy.matrix); glowPts.push(x, 1.75, z); glowCols.push(1, 0.75, 0.4); }
    scene.add(posts); }

  /* ---------- 修補：大燈塔（中間）、鐵鏈橋（往南到渡船島）、雲渡船 ---------- */
  const pickables = [], fixSites = {}, proxy = (r, kind, ref, parent, y = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = y; m.userData = { kind, ref }; parent.add(m); pickables.push(m); return m; };
  const PIER = [0, 36], FIXPOS = { beacon: [0, 0], chain: [0, 19.5], boat: [4.5, 37] };
  const TX_FIX = canvasTex(128, 128, (c) => { c.font = "80px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.shadowColor = "#ffd890"; c.shadowBlur = 16; c.fillText("🔧", 64, 68); });
  const fixInfo = {
    beacon: { name: ["暗掉的大燈塔", "The darkened great lantern"], short: ["大燈塔", "The great lantern"], desc: ["渡口中央的大燈塔熄了，燈罩的玻璃一片片掉在地上。晚上的船找不到這裡。", "The great lantern at the heart of the ferry has gone out; its glass panes lie scattered. The night boats can't find their way."],
      fixed: ["玻璃一片片裝回去，燈塔又把光轉向雲海。", "The panes are back. The lantern sweeps its light across the clouds again."], thanks: ["看，遠方的船在轉頭了。", "Look — the far-off boats are turning towards us."], who: ["燈婆・渡民", "Granny Wick, of the ferry"] },
    chain: { name: ["斷掉的鐵鏈橋", "The broken chain bridge"], short: ["鐵鏈橋", "The chain bridge"], desc: ["往渡船島的鐵鏈橋中間斷了，橋板掉在岸邊。船停在那頭，過不來。", "The chain bridge to the ferry pier has snapped in the middle; its planks lie by the edge. The ferry is stranded on the far side."],
      fixed: ["橋板一塊塊鋪回去，鐵鏈繃緊了。", "Plank by plank the bridge is laid again, and the chains pull taut."], thanks: ["走過去吧，渡船在等你。", "Go on across — the ferry is waiting for you."], who: ["阿纜・渡民", "Rope, of the ferry"] },
    boat: { name: ["擱淺的雲渡船", "The stranded cloud ferry"], short: ["雲渡船", "The cloud ferry"], desc: ["雲渡船歪在渡口邊，帆破了，船上的燈全暗。", "The cloud ferry lists against the pier, its sail torn, every lantern aboard dark."],
      fixed: ["帆補好了，船身扶正，船上的燈一盞盞亮起來。", "The sail is mended, the hull set straight, and the lanterns aboard light one by one."], thanks: ["好久沒有這麼想開船了。", "I haven't wanted to sail this much in a long time."], who: ["老槳・雲渡船長", "Old Oar, captain of the cloud ferry"] },
    _all: ["三個地方都修好了。今晚雲海上的燈，多得像另一片星空。", "All three are repaired. Tonight there are so many lanterns over the clouds it looks like a second sky."] };
  const mkSite = (id, g, py) => { const [x, z] = FIXPOS[id]; g.position.set(x, 0, z); scene.add(g); proxy(3.2, "fix", id, g, py);
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX_FIX, transparent: true, depthWrite: false, depthTest: false })); mk.renderOrder = 12; mk.scale.setScalar(2.4); g.add(mk);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.7, 48), new THREE.MeshBasicMaterial({ color: "#ffd890", transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    return (fixSites[id] = { id, g, x, z, mk, ring, my: py + 4, k: 0, kt: 0, done: false }); };
  let beam = null, beaconGlow = null;
  { /* 大燈塔：石塔＋燈籠；八片玻璃掉在地上，修好後飛回去、光束轉起來 */
    const g = new THREE.Group(), S = mkSite("beacon", g, 6);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 8, 12), stoneM); tower.position.y = 4; g.add(tower); obstacles.push({ x: 0, z: 0, r: 2.3, h: 11 });
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 12), ropeM); cage.position.y = 8.1; g.add(cage);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 12), M("#b86a5a")); roof.position.y = 11.3; g.add(roof);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 12), new THREE.MeshStandardMaterial({ color: "#fff0c8", emissive: "#ffb040", emissiveIntensity: 0.05 })); core.position.y = 9.4; g.add(core);
    beaconGlow = sprite("#ffd080", 16, 0); beaconGlow.position.y = 9.4; g.add(beaconGlow);
    beam = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 20, 1, true), new THREE.MeshBasicMaterial({ color: "#ffe0a0", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); beam.geometry.translate(0, -30, 0); beam.rotation.z = Math.PI / 2; const bp = new THREE.Group(); bp.position.y = 9.4; bp.add(beam); g.add(bp); beam.userData.pivot = bp;
    const panes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: "#ffe8c0", emissive: "#ffc070", emissiveIntensity: 0.1, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 8); g.add(panes);
    const PN = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return { a, home: new V3(Math.cos(a) * 1.35, 9.3, Math.sin(a) * 1.35), fall: new V3(Math.cos(a * 1.7) * (3 + (i % 3)), 0.06, Math.sin(a * 1.7) * (3 + (i % 3))), cur: null }; });
    S.draw = (k, done, t) => { PN.forEach((p, i) => { const want = done ? 1 : Math.min(1, Math.max(0, S.k * 8 - i)); p.cur = p.cur == null ? want : p.cur + (want - p.cur) * (S.snap ? 1 : 0.05); const q = ease(p.cur);
        dummy.position.lerpVectors(p.fall, p.home, q); if (q > 0.02 && q < 0.98) dummy.position.y += Math.sin(q * Math.PI) * 3; dummy.rotation.set((1 - q) * -Math.PI / 2, -p.a + Math.PI / 2, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); panes.setMatrixAt(i, dummy.matrix); });
      panes.instanceMatrix.needsUpdate = true; core.material.emissiveIntensity = 0.05 + S.k * 0.6 + (done ? 0.9 + Math.sin(t * 2) * 0.15 : 0); beaconGlow.material.opacity = done ? 0.75 : S.k * 0.3; beam.material.opacity = done ? 0.16 : 0; if (done) bp.rotation.y = t * 0.35; }; }
  /* 鐵鏈橋：中央島南邊 → 渡船島（中間 6 公尺斷掉，橋板掉在岸邊） */
  const pierIsle = floatIsland(6.5, "#8a7a5a", 8); pierIsle.position.set(PIER[0], 0, PIER[1]); scene.add(pierIsle);
  const pierArea = { x: PIER[0], z: PIER[1], r: 5.8, on: false }, chainArea = { ax: 0, az: HUB - 1, bx: 0, bz: PIER[1] - 5.5, w: 1.15, on: false }, stubArea = { ax: 0, az: HUB - 1, bx: 0, bz: 20.6, w: 1.15 };
  areas.push(pierArea, chainArea, stubArea);
  { const g = new THREE.Group(), S = mkSite("chain", g, 1.5), pg = new THREE.Group(); scene.add(pg); void S;   /* 橋板、鐵鏈放在世界座標（pg）；修補標記留在 FIXPOS */
    const z0 = HUB - 1, z1 = PIER[1] - 5.5, NP = 16, len = (z1 - z0) / NP;
    const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.18, len * 0.9), plankM, NP); pg.add(planks);
    for (const sx of [-1.25, 1.25]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, z1 - z0), new THREE.MeshStandardMaterial({ color: "#5a4a40", emissive: "#ffb060", emissiveIntensity: 0 })); rail.position.set(sx, 1.0, (z0 + z1) / 2); pg.add(rail); rail.userData.rail = true; }
    const PL = Array.from({ length: NP }, (_, i) => { const z = z0 + (i + 0.5) * len, broken = z > 20.6 && z < 26.8; return { broken, home: new V3(0, -0.05, z), fall: new V3(-3 - (i % 3) * 0.8, 0.1, 14.2 - (i % 4) * 0.7), cur: null }; });
    S.draw = (k, done) => { let bi = 0; const nb = PL.filter((p) => p.broken).length; PL.forEach((p, i) => { let q = 1; if (p.broken) { const want = done ? 1 : Math.min(1, Math.max(0, S.k * nb - bi)); bi++; p.cur = p.cur == null ? want : p.cur + (want - p.cur) * (S.snap ? 1 : 0.05); q = ease(p.cur); }
        dummy.position.lerpVectors(p.broken ? p.fall : p.home, p.home, q); if (p.broken && q > 0.02 && q < 0.98) dummy.position.y += Math.sin(q * Math.PI) * 2.5; dummy.rotation.set(0, p.broken ? (1 - q) * 0.8 : 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); planks.setMatrixAt(i, dummy.matrix); });
      planks.instanceMatrix.needsUpdate = true; pg.children.forEach((c) => { if (c.userData.rail) c.material.emissiveIntensity = done ? 0.4 : 0; }); chainArea.on = done; pierArea.on = done; }; }
  let boatG = null;
  { const g = new THREE.Group(), S = mkSite("boat", g, 1.5), bg = new THREE.Group(); bg.position.set(3.2, 0, 2.2); g.add(bg); boatG = bg;
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.0, 1.4, 16, 1, false, 0, Math.PI), plankM); hull.rotation.set(Math.PI / 2, 0, Math.PI / 2); hull.scale.set(1, 3.2, 1); hull.position.y = 0.2; bg.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), ropeM); mast.position.y = 3.4; bg.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), new THREE.MeshStandardMaterial({ color: "#f8ecd8", side: THREE.DoubleSide, roughness: 0.9 })); sail.position.set(0, 3.8, 0.2); sail.rotation.y = Math.PI / 2; bg.add(sail);
    const lamps = []; for (let k = 0; k < 4; k++) { const s = sprite("#ffd080", 1.4, 0); s.position.set(0, 1.2, -3.6 + k * 2.4); bg.add(s); lamps.push(s); }
    obstacles.push({ x: S.x + 3.2, z: S.z + 2.2, r: 1.6, h: 6 });
    S.draw = (k, done, t) => { const q = ease(Math.min(1, S.k)); bg.rotation.z = (1 - q) * 0.45; sail.scale.set(1, 0.35 + q * 0.65, 1); sail.material.color.set(q > 0.99 ? "#fff4e0" : "#b8aa98"); lamps.forEach((s, i) => { s.material.opacity = done ? 0.8 + Math.sin(t * 3 + i) * 0.15 : 0; }); if (done) { bg.position.y = Math.sin(t * 0.9) * 0.18; bg.rotation.x = Math.sin(t * 0.7) * 0.03; } }; }

  /* ---------- 會靠岸的浮島（十一個位置；南邊留給渡船島） ---------- */
  const SLOT_ANG = [9, 8, 10, 7, 11, 6, 0, 5, 1, 4, 2].map((i) => i / 12 * Math.PI * 2);
  const slotXZ = (i) => [Math.cos(SLOT_ANG[i]) * SLOT_R, Math.sin(SLOT_ANG[i]) * SLOT_R];
  const isles = [];   /* { type, g, area, bridge, ang, x, z, fly, folk } */
  const bridgeM = new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.9 });
  function buildIsle(type, lv) { const I = ISLE[type], g = floatIsland(ISL, I.col === "#6ad8c8" ? "#7a9a8a" : "#86906a", 10), r = rngOf(seedOf(type + lv)), obs = [], c = new THREE.Color(I.col);
    const add = (m, x, y, z, ob) => { m.position.set(x, y, z); g.add(m); if (ob) obs.push({ dx: x, dz: z, r: ob[0], h: ob[1] }); return m; };
    const glow = (x, y, z, col, s = 1.4) => { const sp = sprite(col, s, 0.85); sp.position.set(x, y, z); g.add(sp); return sp; };
    const n = 3 + lv;
    if (type === "market") for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, x = Math.cos(a) * 4, z = Math.sin(a) * 4;
        add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.2), M("#a07050")), x, 0.5, z, [1.1, 2.4]); const aw = add(new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.8, 4), M(["#d84a4a", "#e8b84a", "#4a9ad8"][k % 3])), x, 1.9, z); aw.rotation.y = Math.PI / 4; glow(x, 1.3, z, "#ffb060", 1.8); }
    else if (type === "dock") { add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 6), plankM), 0, 0.1, ISL + 2); for (let k = 0; k < 2 + lv; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 0.5, 10, 1, false, 0, Math.PI), M(["#c86a4a", "#4a8ac8", "#e8d8a8"][k % 3])); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); b.scale.set(1, 2.4, 1); b.userData.boat = k; add(b, (k % 2 ? 1.8 : -1.8), -0.4, ISL + 1 + k * 1.4); }
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), ropeM), 1.2, 1.2, 2, [0.4, 2.4]); glow(1.2, 2.5, 2, "#a8d8ff", 1.6); }
    else if (type === "eaves") for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + 0.4, x = Math.cos(a) * 3.8, z = Math.sin(a) * 3.8, h = 1.6 + (k % 2) * 0.6;
        add(new THREE.Mesh(new THREE.BoxGeometry(1.8, h, 1.8), M("#efe0cc")), x, h / 2, z, [1.4, h + 1.4]); const rf = add(new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 4), M("#8a5a8a")), x, h + 0.55, z); rf.rotation.y = Math.PI / 4; glow(x * 0.8, h * 0.55, z * 0.8, "#ffd090", 1.5); }
    else if (type === "vault") { for (let k = 0; k < 2 + lv * 2; k++) { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(1.1 - k * 0.06, 0), new THREE.MeshStandardMaterial({ color: "#a8f0e8", emissive: "#40c8b8", emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.2, flatShading: true })); cr.scale.set(1, 1.3, 1); add(cr, 0, 1.4 + k * 1.9, 0); }
      obs.push({ dx: 0, dz: 0, r: 1.5, h: 4 + lv * 4 }); const disc = []; for (let k = 0; k < 4 + lv * 2; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14), new THREE.MeshStandardMaterial({ color: "#ffe08a", emissive: "#ffc040", emissiveIntensity: 0.6, metalness: 0.5 })); d.rotation.x = Math.PI / 2; d.userData.orb = k; add(d, 0, 2, 0); disc.push(d); } g.userData.discs = disc; glow(0, 3 + lv * 2, 0, "#80fff0", 5); }
    else if (type === "lamp") { const cols = ["#c85a4a", "#4a7ac8", "#e8c84a", "#5aa86a", "#a86ac8"]; for (let k = 0; k < 4 + lv * 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2 - (k % 2) * 0.2, 0.5, 1.4), M(cols[k % cols.length])); b.rotation.y = k * 0.35; add(b, -1, 0.25 + k * 0.5, -1); }
      obs.push({ dx: -1, dz: -1, r: 1.6, h: 2 + lv }); glow(-1, 0.6 + (4 + lv * 2) * 0.5, -1, "#fff0b0", 4); const tel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 10), M("#c8a870", { metalness: 0.5 })), 2.4, 1.5, 1.6, [0.6, 2]); tel.rotation.set(0.9, 0.4, 0); }
    else { const tr = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 4, 8), M("#6a4a3a")), -1.5, 2, 0, [0.9, 5]); void tr; const crown = add(new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), M("#e8a0b8", { flatShading: true })), -1.5, 4.6, 0); void crown;
      for (let k = 0; k < 4 + lv * 3; k++) { const a = k * 2.4, bell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: "#ffd860", metalness: 0.7, roughness: 0.3, emissive: "#ffb020", emissiveIntensity: 0.25 })); bell.userData.swing = k; add(bell, -1.5 + Math.cos(a) * 1.8, 3.2 + (k % 3) * 0.4, Math.sin(a) * 1.8); }
      const car = new THREE.Group(); car.position.set(2.6, 0, 1.4); g.add(car); g.userData.carousel = car; obs.push({ dx: 2.6, dz: 1.4, r: 1.8, h: 3 });
      car.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 16), M("#f0e0c8")), {})); const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 16), M("#e86a8a")); top.position.y = 2.4; car.add(top);
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2, h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.7), M(["#fff", "#ffd0e0", "#d0e8ff", "#fff0c0"][k])); h.position.set(Math.cos(a) * 1.1, 0.8, Math.sin(a) * 1.1); car.add(h); } glow(2.6, 2.2, 1.4, "#ffb0d0", 3); }
    g.traverse((o) => { if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity === 0) { o.material = o.material.clone(); o.material.emissive = c; o.material.emissiveIntensity = 0.04; } });
    return { g, obs }; }
  function placeIsle(i, type, lv, fly) { const [x, z] = slotXZ(i), ang = SLOT_ANG[i], { g, obs } = buildIsle(type, lv); g.position.set(x, 0, z); g.rotation.y = -ang + Math.PI / 2; scene.add(g);
    const area = { x, z, r: ISL - 0.9, on: !fly }, bridgeArea = { ax: Math.cos(ang) * (HUB - 1), az: Math.sin(ang) * (HUB - 1), bx: Math.cos(ang) * (SLOT_R - ISL + 1), bz: Math.sin(ang) * (SLOT_R - ISL + 1), w: 1.15, on: !fly }; areas.push(area, bridgeArea);
    const bl = SLOT_R - ISL - HUB + 1.6, br = new THREE.Group(), deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, bl), bridgeM); deck.position.y = -0.05; br.add(deck);
    for (const sx of [-1.25, 1.25]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, bl), ropeM); rail.position.set(sx, 1.0, 0); br.add(rail); }
    const mid = (HUB + SLOT_R - ISL) / 2; br.position.set(Math.cos(ang) * mid, 0, Math.sin(ang) * mid); br.rotation.y = Math.atan2(Math.cos(ang), Math.sin(ang)); br.scale.z = fly ? 0.001 : 1; scene.add(br);
    const wobs = obs.map((o) => { const ca = Math.cos(g.rotation.y), sa = Math.sin(g.rotation.y); const ob = { x: x + o.dx * ca + o.dz * sa, z: z - o.dx * sa + o.dz * ca, r: o.r, h: o.h }; obstacles.push(ob); return ob; });
    const I = ISLE[type], fp = makePerson(THREE, { top: I.col, bottom: "#3a3040", longHair: rnd() < 0.5, hair: "#2a1d18", skin: "#ecd0b8" }, rnd), fa = ang + Math.PI + 0.75;   /* 站在橋頭旁邊，不擋路 */
    fp.position.set(x + Math.cos(fa) * 4.6, 0, z + Math.sin(fa) * 4.6); fp.rotation.y = Math.atan2(-Math.cos(fa), -Math.sin(fa)) + Math.PI; scene.add(fp);
    const folk = { p: fp, i: 10 + isles.length, x: fp.position.x, z: fp.position.z, ph: rnd() * 6, tap: -99, face: 0, type }; folks.push(folk); proxy(1.2, "folk", folks.length - 1, fp, 1.0); obstacles.push({ x: folk.x, z: folk.z, r: 0.6, h: 2 });
    const it = { i, type, g, area, bridgeArea, br, ang, x, z, wobs, fly: fly ? { t: 0 } : null }; isles.push(it); if (fly) { wobs.forEach((o) => tog(o, false)); } return it; }

  /* ---------- 渡民 ---------- */
  const folks = [];
  for (let i = 0; i < NAMES.length; i++) { const a = Math.PI + 0.7 + i * 0.5, d = 9.5, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const p = makePerson(THREE, { top: ["#c86a5a", "#8a6aa8", "#5a8ab8", "#c8a04a", "#6a9a7a"][i], bottom: "#3a3040", longHair: i % 2 === 1, hair: "#2a1d18", skin: "#ecd0b8" }, rnd); p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -z); scene.add(p);
    const lan = sprite("#ffc070", 1.4, 0.85); lan.position.set(0.45, 1.0, 0.25); p.add(lan); proxy(1.2, "folk", folks.length, p, 1.0); obstacles.push({ x, z, r: 0.6, h: 2 }); folks.push({ p, i, x, z, ph: rnd() * 6, tap: -99, face: 0 }); }
  function talk(f, now) { if (now - f.tap < 2) return; f.tap = now; f.face = 2.5; audio.voice(f.i);
    if (f.type) { const I = ISLE[f.type], ln = I.lines[(seedOf(DAY + f.i) + Math.floor(now / 9)) % I.lines.length]; say(L(ln[0], ln[1]), L(`${I.name[0]}的人`, `of the ${I.name[1]}`), 6500); return; }
    const line = LINES[(seedOf(DAY + f.i) + Math.floor(now / 9)) % LINES.length]; say(L(line[0], line[1]), L(`${NAMES[f.i][0]}・渡民`, `${NAMES[f.i][1]}, of the ferry`), 6500); }

  /* ---------- 會長大：已經靠岸的島、晚上來過的燈串、來過的天數放的天燈 ---------- */
  const G0 = FS && FS.growState ? FS.growState("ferry") : { slots: [], lv: {}, night: 0, visits: 0, steps: 0 };
  setTimeout(() => { if (G0.story) storyBtn(); }, 0);   /* 已經聽過第六章：右上角可以再讀 */
  (G0.slots || []).forEach((type, i) => { if (i < SLOT_ANG.length && ISLE[type]) placeIsle(i, type, Math.min(3, (G0.lv || {})[type] || 0), false); });
  const NSTR = 260, strPos = new Float32Array(NSTR * 3), strGeo = new THREE.BufferGeometry(); strGeo.setAttribute("position", new THREE.BufferAttribute(strPos, 3)); strGeo.setDrawRange(0, 0);
  const strMat = new THREE.PointsMaterial({ map: glowTex, color: "#ffd890", size: 0.7, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }), strings = new THREE.Points(strGeo, strMat); strings.frustumCulled = false; scene.add(strings);
  function layStrings(night) { const want = Math.min(NSTR, (night || 0) * 6); let n = 0; const spans = [[-Math.PI, Math.PI, null]];
    for (const it of isles) { if (it.fly) continue; for (let k = 0; k < 9 && n < want; k++) { for (const sx of [-1.25, 1.25]) { if (n >= want) break; const f = (k + 0.5) / 9, d = HUB - 1 + f * (SLOT_R - ISL - HUB + 2), px = -Math.sin(it.ang) * sx, pz = Math.cos(it.ang) * sx;
          strPos.set([Math.cos(it.ang) * d + px, 1.1 + Math.sin(f * Math.PI) * 0.25, Math.sin(it.ang) * d + pz], n * 3); n++; } } }
    for (let k = 0; n < want && k < 120; k++) { const a = k / 120 * Math.PI * 2; strPos.set([Math.cos(a) * (HUB - 0.6), 1.7 + Math.sin(k * 0.9) * 0.08, Math.sin(a) * (HUB - 0.6)], n * 3); n++; } void spans;
    strGeo.attributes.position.needsUpdate = true; strGeo.setDrawRange(0, n); }
  layStrings(G0.night);
  const NSL = Math.min(80, 6 + (G0.visits || 0) * 3), slPos = new Float32Array(NSL * 3), slBase = new Float32Array(NSL * 4);
  for (let i = 0; i < NSL; i++) { const a = R0() * Math.PI * 2, d = 30 + R0() * 140; slBase.set([Math.cos(a) * d, R0() * 120, Math.sin(a) * d, 0.6 + R0() * 1.2], i * 4); }
  const slGeo = new THREE.BufferGeometry(); slGeo.setAttribute("position", new THREE.BufferAttribute(slPos, 3)); const skyLan = new THREE.Points(slGeo, new THREE.PointsMaterial({ map: glowTex, color: "#ffb060", size: 2.4, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); skyLan.frustumCulled = false; scene.add(skyLan);

  /* ---------- 每天五件小事：放天燈（燈台）、接紙鶴（繞圈飛） ---------- */
  const got = new Set(ST0.got || []);
  const kinds = ["sky", "crane", "sky", ["sky", "crane"][Math.floor(rnd() * 2)], "crane"]; for (let k = kinds.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [kinds[k], kinds[j]] = [kinds[j], kinds[k]]; }
  const spots = [[0, 0, 5], [FIXPOS.chain[0], 16.5, 3]];
  const freeSpot = () => { for (let tries = 0; tries < 200; tries++) { const a = rnd() * Math.PI * 2, d = 4 + Math.sqrt(rnd()) * (HUB - 6), x = Math.cos(a) * d, z = Math.sin(a) * d; if (freeOK(x, z, 1.6) && spots.every(([sx, sz, gp]) => Math.hypot(sx - x, sz - z) > (gp || 4.5))) { spots.push([x, z]); return [x, z]; } } return [rnd() * 6 - 3, rnd() * 6 - 3]; };
  const paperT = canvasTex(64, 64, (c) => { c.fillStyle = "#fff8ee"; c.beginPath(); c.moveTo(4, 36); c.lineTo(32, 20); c.lineTo(60, 30); c.lineTo(34, 40); c.closePath(); c.fill(); c.fillStyle = "#f0d8c8"; c.beginPath(); c.moveTo(32, 20); c.lineTo(28, 6); c.lineTo(38, 24); c.fill(); });
  const evs = kinds.map((kind, i) => { const e = { i, kind, state: got.has(i) ? "done" : "wait", t: 0, g: new THREE.Group() };
    if (kind === "sky") { const [x, z] = freeSpot(); Object.assign(e, { x, z }); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.9, 10), stoneM); base.position.y = 0.45; e.g.add(base);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.8, 10, 1, true), new THREE.MeshStandardMaterial({ color: "#ffe0b0", emissive: "#ff9a40", emissiveIntensity: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })); lan.position.y = 1.35; e.g.add(lan); e.lan = lan;
      const gl = sprite("#ffb060", 2.2, 0.5); gl.position.y = 1.35; e.g.add(gl); e.gl = gl; e.g.position.set(x, 0, z); proxy(1.5, "ev", i, e.g, 1.2); obstacles.push(e.obs = { x, z, r: 0.7, h: 1 }); }
    else { const r = 6 + rnd() * 7, a0 = rnd() * Math.PI * 2; Object.assign(e, { r, a0, w: (rnd() < 0.5 ? -1 : 1) * (0.16 + rnd() * 0.08), x: Math.cos(a0) * r, z: Math.sin(a0) * r, ph: rnd() * 6 });
      const cr = new THREE.Sprite(new THREE.SpriteMaterial({ map: paperT, transparent: true, depthWrite: false })); cr.scale.set(1.3, 1.3, 1); e.g.add(cr); e.cr = cr; const gl = sprite("#fff0e0", 2, 0.4); e.g.add(gl); e.gl = gl; proxy(1.6, "ev", i, e.g, 0); }
    e.g.visible = e.state !== "done"; scene.add(e.g); return e; });
  const showCount = () => { const n = evs.filter((e) => e.state !== "wait").length, el = $("#echo"); el.textContent = `🏮 ${n} / 5`; el.classList.toggle("full", n >= 5); };
  showCount();
  function finish(e) { if (e.state !== "wait") return;
    if (!QS.get("day") && todayStr() !== DAY) { toast(L("過了午夜，雲海換了一個黃昏。重新整理……", "Midnight has passed — a new dusk over the clouds. Reloading…")); setTimeout(() => location.reload(), 1600); return; }
    e.state = "go"; e.t = 0; if (e.kind === "sky") { audio.lantern(); if (e.obs) tog(e.obs, false); } else audio.task();
    const r = FS && FS.starDone ? FS.starDone("ferry", e.i) : null, cnt = evs.filter((x) => x.state !== "wait").length; showCount();
    const what = e.kind === "sky" ? L("天燈飛上去了", "The sky lantern is rising") : L("紙鶴停在你手上", "The paper crane landed on your hand");
    if (r) { toast(L(`🏮 ${what}（${r.count}/5）　+1 B・✦ 燈芯 +${r.mat || 1}`, `🏮 ${what} (${r.count}/5)  +1 B · ✦ wick +${r.mat || 1}`), 4200); fixes.refresh();
      if (r.bonus) setTimeout(() => { const b = r.bonus; say(L("五件事都做完了。雲海上所有的燈，一起閃了一下。", "All five are done. Every lantern over the clouds flickers at once."), b.type === "ore" ? L("回響：一顆原石", "Echo: a raw gem") : b.type === "dew" ? L(`回響：元液 +${b.n}`, `Echo: essence +${b.n}`) : L(`回響：+${b.n} B`, `Echo: +${b.n} B`), 7500); audio.fix(); }, 2600); }
    else toast(L(`🏮 ${what}（${cnt}/5）`, `🏮 ${what} (${cnt}/5)`)); }

  /* ---------- 修補面板＋海報＋故事 ---------- */
  let fixes = { refresh() { } }, fixGo = null;
  fixes = createRepair({ city: "ferry", L, toast, say, FS, info: fixInfo, sound: (n) => { if (n === 1) audio.task(); else { audio.fix(); if (n === 2) setTimeout(() => audio.hum(), 900); } },
    onUpdate: (id, k, done, just) => { const S = fixSites[id]; S.kt = k; S.done = done; S.mk.visible = !done; unstick(); if (just) setTimeout(() => makePoster(id), 3600); if (just && Object.values(fixSites).every((x) => x.done)) setTimeout(tellStory, 19000); } });
  function tellStory(force) { if (!force && !(FS && FS.growStory && FS.growStory("ferry"))) return; audio.dock();
    storyCard({ L, chapter: L("修復手帳・第六章", "Restoration log · Chapter 6"), title: L("燈，是為誰亮的", "Who the lanterns are lit for"),
      paras: [L("雲渡船又開了。船長說，這條航線以前每天都載同一種貨：一盞盞裝在燈籠裡的光。", "The cloud ferry sails again. The captain says this route once carried the same cargo every day: light, packed into lanterns."),
        L("「那些光，是從你們小鎮那邊漂上來的。」他指著流星落下的方向。「每有一個人好好過完一天，就有一點光漂上來。」", "\"That light drifted up from your town,\" he says, pointing to where the meteor fell. \"Every time someone gets through a day well, a little light drifts up.\""),
        L("你想起家裡的元液瓶。原來那些亮亮的東西，不只留在瓶子裡。", "You think of the essence jar at home. So the glowing stuff doesn't only stay in the jar."),
        L("船長塞給你一張舊航海圖。上面畫著好幾座城，最遠的那座沒有名字，只寫著一行字：「光要回去的地方」。", "He presses an old chart into your hands. It shows several cities. The farthest has no name — only a line of writing: \"Where the light goes home.\"")],
      sign: L("— 老槳・雲渡船長", "— Old Oar, captain of the cloud ferry"), next: L("航海圖上的下一個座標，在雲層更深的地方。（下一座城，還在路上）", "The next mark on the chart lies deeper in the clouds. (The next city is still on its way.)"), keep: L("收好這一章", "Keep this chapter"), onClose: () => { storyBtn(); toast(L("📖 想再讀一次，點右上角的 📖", "📖 Tap 📖 at the top right to read it again")); } }); }
  let sBtn = null; function storyBtn() { if (sBtn) return; const hud = $(".hud"), b = document.createElement("button"); b.className = "btn snd"; b.type = "button"; b.textContent = "📖"; b.title = L("第六章", "Chapter 6"); b.onclick = (e) => { e.stopPropagation(); tellStory(true); }; hud.insertBefore(b, $("#snd")); sBtn = b; }
  function unstick() { for (let it = 0; it < 4; it++) for (const o of obstacles) { if (!(o.r > 0)) continue; const ox = P.x - o.x, oz = P.z - o.z, od = Math.hypot(ox, oz) || 0.001; if (od < o.r) { P.x = o.x + ox / od * (o.r + 0.05); P.z = o.z + oz / od * (o.r + 0.05); } } }
  const fixNear = (S) => Math.hypot(P.x - S.x, P.z - S.z);
  function fixTap(id) { const S = fixSites[id]; if (fixNear(S) < 6.5) { fixes.open(id); return; } fixGo = id; P.stuck = 0;
    const cand = [[-4.4, 0], [4.4, 0], [0, -4.4], [0, 4.4], [-3, -3], [3, 3], [0, -2.5]].map(([dx, dz]) => [S.x + dx, S.z + dz]).filter(([x, z]) => walkable(x, z) && freeOK(x, z, 0.4)).sort((p, q) => Math.hypot(p[0] - P.x, p[1] - P.z) - Math.hypot(q[0] - P.x, q[1] - P.z));
    if (!cand.length) { toast(L("走不過去——先把鐵鏈橋修好。", "You can't get there yet — mend the chain bridge first.")); fixGo = null; return; } [P.tx, P.tz] = cand[0]; markAt(P.tx, P.tz); }
  const _mw = new V3();
  function fixFrame(t, dt) { for (const S of Object.values(fixSites)) { if (S.snap) S.k = S.kt; S.k += (S.kt - S.k) * 0.04; S.draw(S.k, S.done, t, dt); S.snap = false; S.ring.visible = S.mk.visible; if (S.mk.visible) { S.mk.getWorldPosition(_mw); S.mk.material.opacity = Math.min(1, Math.max(0, (_mw.distanceTo(camera.position) - 5) / 4));   /* 鏡頭太近就淡掉，不會擋住畫面 */ S.mk.position.y = S.my + Math.sin(t * 2 + S.x) * 0.25; S.ring.material.opacity = 0.35 + Math.sin(t * 2.2 + S.x) * 0.15; } }
    if (fixGo) { const S = fixSites[fixGo]; if (fixNear(S) < 5.4) { fixes.open(fixGo); fixGo = null; } }
    else if (fixes.isOpen && Object.values(fixSites).every((S) => fixNear(S) > 9)) fixes.close(); }
  const POSTER_CAM = { beacon: [[12, 7, 12], [0, 7, 0]], chain: [[9, 4, 14], [0, 1, 26]], boat: [[12, 4, 30], [4, 2, 39]] };
  function makePoster(id) { try {
      const [cp, lk] = POSTER_CAM[id], oldP = camera.position.clone(), oldQ = camera.quaternion.clone(), oldA = camera.aspect, oldF = camera.fov;
      const W = 360, H = 480, rt = new THREE.WebGLRenderTarget(W * 2, H * 2, { colorSpace: THREE.SRGBColorSpace }); camera.position.set(...cp); camera.lookAt(...lk); camera.aspect = W / H; camera.fov = 55; camera.updateProjectionMatrix();
      const nm = nameTag.visible; nameTag.visible = false; renderer.setRenderTarget(rt); renderer.render(scene, camera); const px = new Uint8Array(W * 2 * H * 2 * 4); renderer.readRenderTargetPixels(rt, 0, 0, W * 2, H * 2, px); renderer.setRenderTarget(null); rt.dispose(); nameTag.visible = nm;
      camera.position.copy(oldP); camera.quaternion.copy(oldQ); camera.aspect = oldA; camera.fov = oldF; camera.updateProjectionMatrix();
      const src = document.createElement("canvas"); src.width = W * 2; src.height = H * 2; const sc = src.getContext("2d"), id2 = sc.createImageData(W * 2, H * 2); for (let y = 0; y < H * 2; y++) id2.data.set(px.subarray((H * 2 - 1 - y) * W * 8, (H * 2 - y) * W * 8), y * W * 8); sc.putImageData(id2, 0, 0);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"); c.fillStyle = "#f4e8dc"; c.fillRect(0, 0, W, H); c.drawImage(src, 0, 0, W * 2, H * 2 * 0.8, 16, 16, W - 32, (H - 32) * 0.8);
      c.strokeStyle = "rgba(80,50,40,.5)"; c.lineWidth = 1.2; c.strokeRect(16, 16, W - 32, (H - 32) * 0.8); c.fillStyle = "#4a2f2a"; c.textAlign = "center";
      c.font = "700 19px Georgia, 'Times New Roman', serif"; c.fillText("LANTERNFERRY", W / 2, H - 72); c.font = "15px 'Noto Serif TC','Microsoft JhengHei',serif"; const I = fixInfo[id]; c.fillText(L(`${I.short[0]}修好了　·　浮燈渡`, `${I.short[1]} is repaired`), W / 2, H - 46);
      c.font = "12px Georgia, serif"; c.fillStyle = "#8a6a5a"; c.fillText(DAY.replace(/-/g, "."), W / 2, H - 24);
      const url = cv.toDataURL("image/jpeg", 0.78), ok = FS && FS.cityPoster ? FS.cityPoster("ferry", id, url, `${I.short[0]}修好了・浮燈渡`, `${I.short[1]} repaired · Lanternferry`) : false;
      const ov = document.createElement("div"); ov.className = "posterov"; ov.innerHTML = `<div class="pcard"><small>${L("送你一張修復紀念海報", "A souvenir poster for you")}</small><img alt=""><p>${ok ? L("已經收進家裡的海報冊。", "It's in the poster album at home.") : L("（從遊戲裡進來，海報才會收進海報冊）", "(Enter from the game to keep it in your poster album)")}</p><button class="btn primary" type="button">${L("好", "OK")}</button></div>`;
      ov.querySelector("img").src = url; ov.addEventListener("pointerdown", (e) => e.stopPropagation()); ov.querySelector("button").onclick = () => ov.remove(); document.body.append(ov);
    } catch (e) { console.warn(e); } }

  /* ---------- 玩家 ---------- */
  const me = new THREE.Group(); scene.add(me);
  const av = finAvatar(THREE) || makePerson(THREE, { top: "#f0eee8", bottom: "#8a5a4a", longHair: true, hair: "#2a1d18", skin: "#f1d3bd" }, Math.random); me.add(av);
  const nameTag = makeNameTag(THREE, playerName(), null, { color: "#ffffff", glow: "#ffd890", size: 0.42 }); nameTag.position.y = 1.98; me.add(nameTag);
  const P = { x: 0, z: 9, tx: null, tz: null }, cam = { yaw: 0, pitch: 0.3, dist: 60, want: SMALL ? 13 : 11.5 };
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), new THREE.MeshBasicMaterial({ color: "#ffd890", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); mark.rotation.x = -Math.PI / 2; scene.add(mark);
  const markAt = (x, z) => { mark.position.set(x, 0.06, z); mark.material.opacity = 0.9; $("#hint").classList.add("off"); };
  for (const id of Object.keys(fixSites)) { const S = fixSites[id], st = fixes.site(id); S.k = S.kt = st.k; S.done = st.done; S.mk.visible = !st.done; S.snap = true; S.draw(S.k, S.done, 0, 0); }
  unstick();

  /* ---------- 每天的小事：三個風鈴；小遊戲：接天燈、敲渡鐘 ---------- */
  const MZ = { lux: ["曦晶", "halo crystal"], sand: ["時砂", "time sand"], pearl: ["潮珠", "tide pearl"], moss: ["苔光", "moss light"], glim: ["燈芯", "lantern wick"] };
  const cx = makeTrio({ THREE, scene, pickables, spots: [[-6.5, 1.4, 3.5], [6.8, 1.4, 4.2], [5.2, 1.4, -6.6]], color: "#ffd890", done: !!(FS && FS.cityxState && FS.cityxState("ferry").done),
    onLight: (n, N) => { if (n < N) toast(L(`🎐 風鈴（${n}/${N}）`, `🎐 Wind chimes (${n}/${N})`), 2000); },
    onAll: () => { audio.lantern(); say(L("三串風鈴一起響，遠方的天燈好像也晃了一下。", "All three chimes ring together, and the far-off lanterns seem to sway."), L("風鈴", "Wind chimes"), 6500); const r = FS && FS.cityxDo ? FS.cityxDo("ferry") : null; if (r) setTimeout(() => toast(L(`✨ 今天的小事完成了　+${r.b} B${r.matN ? `・${MZ[r.mat][0]} +${r.matN}` : ""}${r.ess ? `・元液 +${r.ess}` : ""}`, `✨ Today's little thing is done  +${r.b} B${r.matN ? ` · ${MZ[r.mat][1]} +${r.matN}` : ""}${r.ess ? ` · essence +${r.ess}` : ""}`), 4200), 1800); } });
  const mg = makeGames({ THREE, scene, pickables, city: "ferry", L, toast, list: [
    { key: "lanterns", type: "catch", pos: [-9.5, 0, -3.5], icon: "🏮", color: "#ffd890", title: ["接天燈", "Lantern Catch"], intro: ["風把放歪的天燈吹回來了。拖著竹籃接住它們，別接到烏鴉。", "The wind blew some crooked lanterns back. Drag the basket to catch them — not the crows."], how: ["左右拖動畫面移動籃子", "Drag left and right to move the basket"], theme: { bg: "#6a3a5a", bg2: "#2a1a30", fg: "#ffd890", good: ["🏮", "🪔", "✨", "🎐"], bad: ["🐦‍⬛"], basket: "🧺" } },
    { key: "ferrybell", type: "rhythm", pos: [9.5, 0, -2.5], icon: "🔔", color: "#ffc0d0", title: ["敲渡鐘", "Ferry Bell"], intro: ["渡船出發前要敲鐘。光點繞到鐘的時候點一下。", "The ferry bell rings before every crossing. Tap when the light reaches the bell."], how: ["光點碰到鐘的那一刻點畫面", "Tap the moment the light touches the bell"], theme: { bg: "#5a3050", bg2: "#22142a", fg: "#ffd8e0", target: "🔔", center: "⛵", note: "✦" } }] });
  window.__mg = { play: (i) => mg.play(i), cur: () => mg.cur, pos: (i) => mg.pos(i).toArray().map((v) => +v.toFixed(2)) };

  /* ---------- 一起：週末的 Niko、共遊的朋友、合照小卡 ---------- */
  const together = { niko: null, others: {} }, NLN = [["Islands that choose to stay. I would like to be one of those.", "會自己決定留下來的島。我想當那樣的一座。"], ["Every lantern is a day someone got through. I counted yours. There are many.", "每一盞天燈都是某個人過完的一天。我數了妳的，很多。"], ["Do not lean over the rail. I am serious. Mostly.", "不要靠在欄杆上。我是認真的。大概。"]];
  if (QS.get("niko") === "1") { const n = makeFigure(THREE, NIKO_LOOK, "Niko"); n.x = P.x - 1.2; n.z = P.z + 1.2; n.say = 7; scene.add(n.p); together.niko = n; }
  const tourOn = !!FS && /^https?:/.test(location.protocol) && !window.StarDemo;   /* 靜態試玩版沒有伺服器：不開邀請 */
  if (tourOn) tourLink({ city: "ferry", L, toast, getMe: () => ({ x: P.x, z: P.z, ry: av.rotation.y, m: P.tx !== null ? "walk" : "idle" }), onSync: (list) => {
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
    if (tourOn) { const inv = invitePanel({ city: "ferry", L, toast }); mk("👥", L("邀請朋友一起逛", "Invite a friend"), () => inv.open()); }
    mk("🖼", L("合照小卡", "Photo card"), async () => { const names = [playerName(), ...(together.niko ? ["Niko"] : []), ...Object.values(together.others).map((f) => f.name)];
      const card = await makeCard({ snap: () => window.__sleSnap && window.__sleSnap(), cityName: L("浮燈渡", "Lanternferry"), names, palette: ["#3a2040", "#fff0e8", "#ffd890"], L });
      if (!card) { toast(L("拍不到畫面，再試一次", "Couldn't capture the view — try again")); return; } audio.task();
      cardPanel({ card, cityName: L("浮燈渡", "Lanternferry"), mates: Object.values(together.others).map((f) => ({ uid: f.uid, name: f.name })), L, toast }); }); }

  /* ---------- 今天漂過來的兩座島 ---------- */
  const showGrowth = () => { const n = isles.filter((x) => !x.fly).length; const c = $("#clock"); c.textContent = `🏝 ${n}`; c.title = L(`已經靠岸的浮島：${n} 座`, `Islands docked: ${n}`); };
  let growUI = null;
  function offerNow() { if (!FS || cut) return; const g = growStart({ city: "ferry", map: GROW_MAP, rnd }); if (!g.offer) { showGrowth(); return; }
    const why = g.top ? L(ISLE[GROW_MAP[g.top]].why[0], ISLE[GROW_MAP[g.top]].why[1]) : L("雲海今天很安靜，漂來的兩座島是風選的。", "The clouds are quiet today; the wind chose these two.");
    growUI = growPanel({ L, info: ISLE, offer: g.offer, title: L("兩座浮島漂過來了。讓哪一座靠岸？", "Two islands are drifting in. Which one should dock?"), why,
      onPick: (type) => { const r = FS.growChoose("ferry", type, SLOT_ANG.length); growUI = null; if (!r) return; dock(type, r); }, onLater: () => { growUI = null; toast(L("它們會在雲海裡等你。", "They'll wait for you in the clouds.")); } }); }
  function dock(type, r) { const I = ISLE[type];
    if (r.slot >= 0) { const it = placeIsle(r.slot, type, Math.min(3, (r.state.lv || {})[type] || 0), true); audio.dock(); say(L(`${I.name[0]}靠岸了。橋正在放下來。`, `${I.name[1]} is docking. The bridge is coming down.`), L("浮燈渡", "Lanternferry"), 6000); cam.yaw = Math.atan2(Math.cos(it.ang), Math.sin(it.ang)) + Math.PI; cam.want = Math.max(cam.want, 26); }
    else { const lv = (r.state.lv || {})[type] || 0; for (const it of isles.filter((x) => x.type === type)) { scene.remove(it.g); const nb = buildIsle(type, lv); nb.g.position.copy(it.g.position); nb.g.rotation.copy(it.g.rotation); scene.add(nb.g); it.g = nb.g; }
      audio.dock(); say(L(`${I.name[0]}又長大了一點（第 ${lv} 級）。`, `${I.name[1]} grew a little (level ${lv}).`), L("浮燈渡", "Lanternferry"), 6000); }
    layStrings(r.state.night); showGrowth(); }

  /* ---------- 操作：點地面走、拖曳轉視角、滾輪／雙指縮放 ---------- */
  const ray = new THREE.Raycaster(), ptr = new Map(), _h = new V3(), _sp = new V3(), _nd = new THREE.Vector2(), groundPl = new THREE.Plane(new V3(0, 1, 0), 0); let drag = null, pinch = 0;
  const el = renderer.domElement;
  function groundHit() { return ray.ray.intersectPlane(groundPl, _h) ? _h.clone() : null; }
  function nearPick(cx0, cy0) { let best = null, bd = Math.max(42, Math.min(innerWidth, innerHeight) * 0.09);
    for (const m of pickables) { if (!m.parent || m.parent.visible === false) continue; const u = m.userData; if (u.kind === "fix") continue; m.getWorldPosition(_sp); const dist = _sp.distanceTo(camera.position); if (dist > 45) continue; _sp.project(camera); if (_sp.z > 1) continue;
      const d = Math.hypot((_sp.x + 1) / 2 * innerWidth - cx0, (1 - _sp.y) / 2 * innerHeight - cy0); if (d < bd) { bd = d; best = m; } } return best; }
  function tap(cx0, cy0) { if (cut || growUI) return; _nd.set(cx0 / innerWidth * 2 - 1, -(cy0 / innerHeight) * 2 + 1); ray.setFromCamera(_nd, camera); const gh = groundHit(), gd = gh ? gh.distanceTo(camera.position) : Infinity;
    const hit = ray.intersectObjects(pickables, false).find((h) => h.object.parent && h.object.parent.visible !== false && h.distance < gd + 2); const obj = hit ? hit.object : nearPick(cx0, cy0);
    if (obj) { const u = obj.userData;
      if (u.kind === "fix") { fixTap(u.ref); return; }
      if (u.kind === "cx") { if (cx.tap(u.ref, [P.x, P.z]) === "far") { const p = cx.pos(u.ref); goNear(p.x, p.z, 1.4); } return; }
      if (u.kind === "mg") { if (mg.tap(u.ref, [P.x, P.z]) === "far") { const p = mg.pos(u.ref); goNear(p.x, p.z, 1.6); } return; }
      if (u.kind === "folk") { const f = folks[u.ref]; if (Math.hypot(P.x - f.x, P.z - f.z) < 9) { talk(f, performance.now() / 1000); return; } goNear(f.x, f.z, 1.6); return; }
      if (u.kind === "ev") { const e = evs[u.ref]; if (e.state !== "wait") return; if (e.kind === "sky") { if (Math.hypot(P.x - e.x, P.z - e.z) < 3.5) { finish(e); return; } goNear(e.x, e.z, 1.8); return; } goNear(e.x, e.z, 0); return; } }
    if (!gh || !walkable(gh.x, gh.z)) { if (gh && !chainArea.on && gh.z > 20 && Math.abs(gh.x) < 6) toast(L("鐵鏈橋斷了，過不去。", "The chain bridge is broken — you can't cross.")); return; }
    fixGo = null; P.stuck = 0; P.tx = gh.x; P.tz = gh.z; markAt(gh.x, gh.z); }
  function goNear(x, z, off) { const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz) || 1; let tx = x + dx / d * off, tz = z + dz / d * off; if (!walkable(tx, tz)) { tx = x; tz = z; } if (!walkable(tx, tz)) return;
    fixGo = null; P.stuck = 0; P.tx = tx; P.tz = tz; markAt(tx, tz); }
  const endPtr = (e) => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (drag && !drag.turning && e.type === "pointerup") tap(e.clientX, e.clientY); if (ptr.size === 0) { drag = null; pinch = 0; } };
  el.addEventListener("pointerdown", (e) => { if (e.isPrimary) { ptr.clear(); pinch = 0; drag = null; } try { el.setPointerCapture(e.pointerId); } catch (er) { }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0, turning: false }; else if (ptr.size === 2) { const p = [...ptr.values()]; pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); drag = null; } });
  el.addEventListener("pointermove", (e) => { if (!ptr.has(e.pointerId)) return; const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const p = [...ptr.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (pinch) cam.want = Math.max(4, Math.min(80, cam.want * pinch / d)); pinch = d; return; }
    if (!drag) return; const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    if (drag.moved > 16) { drag.turning = true; cam.yaw -= dx * 0.0045; cam.pitch = Math.max(-1.1, Math.min(1.35, cam.pitch + dy * 0.004)); } });
  el.addEventListener("pointerup", endPtr); el.addEventListener("pointercancel", endPtr); el.addEventListener("lostpointercapture", endPtr);
  el.addEventListener("wheel", (e) => { e.preventDefault(); cam.want = Math.max(4, Math.min(80, cam.want * (e.deltaY > 0 ? 1.12 : 0.89))); }, { passive: false });

  let composer = null;
  if (QS.get("fx") === "1" || (!SMALL && QS.get("fx") !== "0")) { try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all(["EffectComposer", "RenderPass", "UnrealBloomPass", "OutputPass"].map(n => import(`${FX_URL}${n}.js/+esm`)));
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.6, 0.75)); composer.addPass(new OutputPass());
  } catch { composer = null; } }
  const normalFov = () => innerWidth / innerHeight < 0.8 ? 68 : 58;
  function resize() { renderer.setSize(innerWidth, innerHeight); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); } camera.aspect = innerWidth / innerHeight; if (!cut) camera.fov = normalFov(); camera.updateProjectionMatrix(); }

  /* ---------- 過場：穿過星門，從雲海上方慢慢降到渡口 ---------- */
  const _ca = new V3(), _cb = new V3(), CUT_FROM = new V3(80, 120, -260);
  function endCut() { if (!cut) return; cut = null; camera.fov = normalFov(); camera.updateProjectionMatrix(); $("#gate").hidden = true; document.body.classList.remove("cutting"); const h = $("#hint"); h.classList.remove("off"); setTimeout(() => h.classList.add("off"), 12000); setTimeout(offerNow, 1200); }
  function runCut(dt, fpos, flook) { cut.t += dt; const T = cut.t;
    if (cut.ph === "wait") { const a = T * 0.04 + 0.6; camera.position.set(Math.cos(a) * 130, 45 + Math.sin(T * 0.07) * 6, Math.sin(a) * 130); camera.lookAt(0, 4, 0); return; }
    const k = ease(T / 5.5); _ca.copy(CUT_FROM).lerp(fpos, k); _ca.y += Math.sin(k * Math.PI) * 14; camera.position.copy(_ca); _cb.set(120, 10, -700).lerp(flook, k); camera.lookAt(_cb); if (T >= 5.5) endCut(); }
  if (cut) { $("#gate").hidden = false; document.body.classList.add("cutting"); $("#hint").classList.add("off");
    $("#gGo").textContent = L("🌀 穿過星門", "🌀 Through the star gate"); $("#gSub").textContent = L("訊號從一片永遠在黃昏的雲海傳來。", "The signal comes from a sea of clouds where it is always dusk."); $("#gTitle").textContent = L("浮燈渡", "LANTERNFERRY"); $("#gSkip").textContent = L("略過 ›", "Skip ›");
    $("#gGo").onclick = (e) => { e.stopPropagation(); audio.gesture(); audio.fall(); cut.ph = "run"; cut.t = 0; $("#gate").classList.add("running"); };
    $("#gSkip").onclick = (e) => { e.stopPropagation(); audio.gesture(); endCut(); }; }
  else setTimeout(offerNow, 900);
  addEventListener("resize", resize); resize();

  $("#place").textContent = L("浮燈渡", "Lanternferry"); showGrowth();
  $("#hint").textContent = L("點地面走過去 · 拖曳轉視角 · 每天會有浮島漂過來 · 發光的東西點點看 · 🔧 是壞掉的地方", "Tap the ground to walk · drag to turn · islands drift in each day · try tapping things that glow · 🔧 marks something broken");
  if (!cut) setTimeout(() => $("#hint").classList.add("off"), 14000);
  window.__sleSnap = () => { try { if (composer) composer.render(); else renderer.render(scene, camera); const c = renderer.domElement; return { url: c.toDataURL("image/jpeg", 0.9), w: c.width, h: c.height, place: $("#place") ? $("#place").textContent : "" }; } catch (e) { return null; } };
  $("#loading").remove(); sndLabel(); $("#snd").onclick = (e) => { e.stopPropagation(); audio.toggle(); sndLabel(); toast(audio.on ? L("♪ 聲音打開了", "♪ Sound on") : L("聲音關掉了", "Sound off"), 1800); };
  const perf = { n: 0, sum: 0, max: 0 };
  if (QS.has("dbg")) window.__ferry = { P, cam, isles: () => isles.map((x) => ({ i: x.i, type: x.type, fly: !!x.fly })), ev: () => evs.map((e) => ({ i: e.i, kind: e.kind, x: +e.x.toFixed(1), z: +e.z.toFixed(1), state: e.state })),
    go: (x, z) => { P.x = x; P.z = z; P.tx = P.tz = null; return [x, z, walkable(x, z)]; }, near: (i) => { const e = evs[i]; P.x = e.x + 2; P.z = e.z; P.tx = P.tz = null; return [P.x, P.z]; }, finish: (i) => { finish(evs[i]); return evs[i].state; },
    offer: () => { offerNow(); return !!growUI; }, place: (type, lv = 0) => { const it = placeIsle(isles.length, type, lv, true); return it.i; }, strings: (n) => { layStrings(n); return strGeo.drawRange.count; },
    fix: () => Object.values(fixSites).map((S) => ({ id: S.id, k: +S.kt.toFixed(2), done: S.done })), fixAt: (id, off = 4.4) => { const S = fixSites[id]; P.x = S.x - off; P.z = S.z; P.tx = P.tz = null; return [S.x, S.z]; }, fixTap: (id) => { fixTap(id); return fixes.isOpen; },
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
    const wind = windAt(t); audio.breeze(wind);
    cloudT.offset.x = (t * 0.004) % 1; cloudT.offset.y = (t * 0.002) % 1;
    for (const p of puffs) { p.a += p.v * dt; p.sp.position.x = Math.cos(p.a) * p.d; p.sp.position.z = Math.sin(p.a) * p.d; }
    for (let i = 0; i < NSL; i++) { const b = i * 4, y = (slBase[b + 1] + t * slBase[b + 3]) % 130; slPos[i * 3] = slBase[b] + Math.sin(t * 0.2 + i) * 2; slPos[i * 3 + 1] = y - 6; slPos[i * 3 + 2] = slBase[b + 2] + Math.cos(t * 0.17 + i) * 2; }
    slGeo.attributes.position.needsUpdate = true; strMat.opacity = 0.7 + Math.sin(t * 1.3) * 0.15;
    hub.position.y = Math.sin(t * 0.4) * 0.0; pierIsle.children.forEach((c) => { if (c.userData.bob != null) c.position.y = -3 - c.userData.bob * 2 + Math.sin(t * 0.8 + c.userData.bob) * 0.3; });
    /* 島：靠岸的動畫、各種島自己的小動作 */
    for (const it of isles) {
      if (it.fly) { it.fly.t += dt; const k = ease(Math.min(1, it.fly.t / 6)), far = 1 + (1 - k) * 2.6; it.g.position.set(Math.cos(it.ang) * SLOT_R * far, -16 * (1 - k), Math.sin(it.ang) * SLOT_R * far);
        it.br.scale.z = Math.max(0.001, ease(Math.min(1, (it.fly.t - 6) / 2))); if (it.fly.t > 8) { it.fly = null; it.area.on = it.bridgeArea.on = true; it.wobs.forEach((o) => tog(o, true)); unstick(); } }
      const g = it.g; if (g.userData.carousel) g.userData.carousel.rotation.y = t * 0.6; if (g.userData.discs) g.userData.discs.forEach((d, k) => { const a = t * 0.8 + k / g.userData.discs.length * Math.PI * 2; d.position.set(Math.cos(a) * 2.4, 2 + Math.sin(t + k) * 0.5, Math.sin(a) * 2.4); });
      g.children.forEach((c) => { if (c.userData.bob != null) c.position.y = -3 - c.userData.bob * 2 + Math.sin(t * 0.8 + c.userData.bob + it.i) * 0.3; if (c.userData.boat != null) c.position.y = -0.4 + Math.sin(t * 1.1 + c.userData.boat) * 0.12; if (c.userData.swing != null) c.rotation.z = Math.sin(t * 2 + c.userData.swing) * 0.3 * (0.3 + wind); }); }
    for (const f of folks) { f.p.position.y = Math.sin(t * 1.3 + f.ph) * 0.02; if (f.face > 0) { f.face -= dt; const want = Math.atan2(P.x - f.x, P.z - f.z); let dy = want - f.p.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.p.rotation.y += dy * Math.min(1, dt * 4); } }
    for (const e of evs) {
      if (e.state === "wait") { if (e.kind === "sky") { e.gl.material.opacity = 0.35 + wind * 0.3 + Math.sin(t * 2 + e.i) * 0.08; }
        else { const a = e.a0 + t * e.w; e.x = Math.cos(a) * e.r; e.z = Math.sin(a) * e.r; e.g.position.set(e.x, 1.6 + Math.sin(t * 2 + e.ph) * 0.4, e.z); e.cr.material.rotation = Math.sin(t * 3 + e.ph) * 0.3;
          if (!cut && Math.hypot(P.x - e.x, P.z - e.z) < 1.9) finish(e); } }
      else if (e.state === "go") { e.t += dt; const k = Math.min(1, e.t / 4);
        if (e.kind === "sky") { e.lan.position.y = 1.35 + k * k * 30; e.gl.position.y = e.lan.position.y; e.gl.material.opacity = 0.8 * (1 - k * 0.6); e.lan.material.emissiveIntensity = 0.9; }
        else { e.g.position.y += dt * (2 + k * 10); e.gl.material.opacity = 0.4 * (1 - k); }
        if (k >= 1) { e.state = "done"; if (e.kind !== "sky") e.g.visible = false; else { e.lan.visible = false; e.gl.visible = false; } } } }
    if (!cut) fixFrame(t, dt); togetherFrame(t, dt); cx.tick(t); mg.tick(t);
    if (fixSites.beacon.done && beaconGlow) beaconGlow.material.opacity = 0.65 + wind * 0.2;
    /* 鏡頭 */
    cam.dist += (cam.want - cam.dist) * Math.min(1, dt * 1.6);
    const base = _q.set(P.x, 1.6, P.z), pit = Math.max(0.06, cam.pitch), lift = Math.max(0, 0.06 - cam.pitch), cp = Math.cos(pit); let D = cam.dist;
    for (let tries = 0; tries < 7; tries++) { _p.set(base.x + Math.sin(cam.yaw) * cp * D, base.y + Math.sin(pit) * D, base.z + Math.cos(cam.yaw) * cp * D); let inside = false;
      const ns = Math.max(6, Math.ceil(D / 1.5)); for (let k = 1; k <= ns && !inside; k++) { const f = k / ns, qx = base.x + (_p.x - base.x) * f, qy = base.y + (_p.y - base.y) * f, qz = base.z + (_p.z - base.z) * f;
        for (const o of obstacles) if (o.r > 0 && qy < o.h + 0.6 && Math.hypot(qx - o.x, qz - o.z) < o.r + 0.5) { inside = true; break; } }
      if (!inside || D < 1.5) break; D *= 0.78; }
    if (_p.y < 0.6) _p.y = 0.6;
    _look.copy(base); _look.y += lift * 3.2 * D;
    if (cut) runCut(raw, _p, _look); else { camera.position.copy(_p); camera.lookAt(_look); }
    if (composer) composer.render(); else renderer.render(scene, camera);
    const ms = performance.now() - f0; if (!cut) { perf.n++; perf.sum += ms; if (ms > perf.max) perf.max = ms; } }
  requestAnimationFrame(frame);
})();
