/* 奧蕾莉亞的城市 v2（熊 2026-11-13）：類地球、科幻風格裡融合老建築。
 * - 小鎮（書房所在的房子、小鎮站）→ 高架捷運 → 市中心（中央車站、玻璃電梯）→ 老城廣場（鐘樓、圖書館、拱門、圓頂大廳、老街）。
 * - 搭車時可以看車廂裡面（座椅、銀色扶手、乘客，窗外是城市）或車外；到站後下車、搭電梯下到廣場，點地面就能走。
 * - 走到「舊城圖書館」門口可以走進去。廣場和小鎮有路人走動。
 * - 天空跟著時間（夜晚、清晨、白天、黃昏）；窗燈亮度自然、有些窗裡有淡淡的人影；金屬和玻璃有環境反射。
 * v3（熊 2026-11-13）：陰影、磚縫與石板縫的凹凸、夜晚燈光的光暈（電腦）；鏡頭不會穿過建築；長方形碰撞；
 *   每 2 小時隨機掉落的寶石（city-gems.js），和光環小遊戲入口（city-games.js）。
 * 預覽時段：?hour=7、?hour=12、?hour=18、?hour=23；光暈 ?fx=1 強制打開、?fx=0 關掉
 */
import { buildSkyline, buildTown, buildPlaza, buildLibraryInterior, TOWN_ROADS } from "./city-build.js";
try { if (window.parent !== window) document.body.classList.add("embed"); } catch (e) { document.body.classList.add("embed"); }   // 熊 2026-11-14（FIN-U49）：在遊戲裡打開時，書房／回臥室收在遊戲的摺疊鈕裡
import { buildLines, metalMaterial, makeTrain, placeOnLine, reseat, decorate } from "./city-train.js";
import { makePerson, animatePerson, finAvatar, sit, stand, addFolded, makeCrowd } from "./city-people.js";
import { cityMP } from "./city-mp.js";
import { createFinds } from "./city-gems.js";
import { createGames, speak as speakIt, setQuiet } from "./city-games.js";
import { buildLife } from "./city-life.js";
import { makeTrio } from "./cityx.js";   /* 2026-11-21 每天的小事 */
import { makeGames } from "./minigame.js";
import { makePvMystery } from "./city-pv.js";   /* 曦環城入口 B 版預覽：只在本機預覽打開 */   /* 2026-11-21 小遊戲 */

/* 用 jsDelivr 的 +esm 版本：three.js 的 addons（光暈後製）裡的 import "three" 會被改寫成同一個網址，不需要 importmap（會被 CSP 擋） */
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
const FX_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/";
const $ = (s) => document.querySelector(s);
const I18N = window.SLE_I18N || { lang: "zh" };
const L = (zh, en) => (I18N.lang === "en" ? en : zh);
const SMALL = Math.min(innerWidth, innerHeight) < 600;
let toastT = 0;
function toast(m, ms = 3400) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms); }
async function api(method, path, body) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await r.json(); } catch { /* 空 */ }
  return { ok: r.ok, status: r.status, data };
}
let seed = 20261113;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- 時段 ---------- */
const PAL = {
  night: { top: "#060a18", hor: "#1b2442", fog: "#121a30", sun: 0.18, hemi: 0.35, lights: 1, name: ["夜晚", "Night"] },
  dawn: { top: "#33497f", hor: "#f2a679", fog: "#b8909a", sun: 0.9, hemi: 0.65, lights: 0.45, name: ["清晨", "Dawn"] },
  day: { top: "#5d9be0", hor: "#d8eaf8", fog: "#c3d7ec", sun: 2.3, hemi: 1.15, lights: 0, name: ["白天", "Day"] },
  dusk: { top: "#262a62", hor: "#ee8656", fog: "#7c6278", sun: 0.75, hemi: 0.5, lights: 0.75, name: ["黃昏", "Dusk"] },
};
const KEYS = [[0, "night"], [4.6, "night"], [6.0, "dawn"], [7.4, "day"], [16.6, "day"], [18.0, "dusk"], [19.4, "night"], [24, "night"]];
function hourNow() { const q = new URLSearchParams(location.search).get("hour"); if (q !== null && q !== "" && !isNaN(+q)) return ((+q % 24) + 24) % 24; const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
function palette(THREE, h) {
  let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1], t = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const A = PAL[a], B = PAL[b], mix = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), t), seg = t < 0.5 ? a : b;
  return { top: mix(A.top, B.top), hor: mix(A.hor, B.hor), fog: mix(A.fog, B.fog), sun: A.sun + (B.sun - A.sun) * t, hemi: A.hemi + (B.hemi - A.hemi) * t,
    lights: A.lights + (B.lights - A.lights) * t, seg, name: PAL[seg].name };
}
const CLOTH = { "C-001": "#f4f4f0", "C-002": "#4f6f99", "C-003": "#f0eee8", "C-004": "#3f8d8a", "C-005": "#9999CC", "C-006": "#CDCD9A", "C-007": "#5B5B5B" };

(async function main() {
  let THREE;
  try { THREE = await import(THREE_URL); } catch { $("#loading").textContent = L("城市需要網路載入 3D。", "The city needs the internet to load 3D."); return; }
  const st = await api("GET", "/api/desk/state");
  const desk = st.ok ? st.data : null;
  const showCoins = () => { $("#coins").textContent = `B ${desk ? desk.coins : "–"}`; };
  showCoins();

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !SMALL }); }
  catch (e) {   /* 瀏覽器開不了 3D（WebGL 被關掉、顯示卡不支援）：說清楚，給一個回去的按鈕，不要一直停在「城市載入中…」 */
    console.error(e); const box = $("#loading"), act = document.querySelector(".actions"); if (act) act.style.display = "none"; box.style.pointerEvents = "auto"; box.replaceChildren();
    const w = document.createElement("div"); w.style.cssText = "text-align:center;max-width:320px;line-height:1.6;padding:16px";
    const t = document.createElement("b"); t.textContent = L("這個瀏覽器目前無法顯示 3D 城市。", "This browser can't show the 3D city right now.");
    const m = document.createElement("p"); m.style.cssText = "margin:8px 0 14px;font-size:13px;opacity:.85"; m.textContent = L("WebGL 沒有開啟或顯示卡不支援。請換一個瀏覽器，或開啟瀏覽器的硬體加速後再試。", "WebGL is off or not supported. Try another browser, or turn on hardware acceleration.") + (e && e.message ? `（${e.message}）` : "");
    const back = document.createElement("button"); back.type = "button"; back.className = "btn primary"; back.textContent = document.body.classList.contains("embed") ? L("🏠 回家", "🏠 Back home") : L("‹ 回上一頁", "‹ Go back");
    back.addEventListener("click", () => { if (document.body.classList.contains("embed")) { try { window.parent.postMessage({ type: "sle.study.close" }, location.origin); } catch { } } else if (history.length > 1) history.back(); else location.href = "/"; });
    w.append(t, m, back); box.append(w); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, SMALL ? 1.4 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $("#stage").appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 5000);   // 近平面 0.5：深度更準，地面和路不會閃
  scene.fog = new THREE.Fog("#121a30", 260, 1700);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const canvasTex = (w, h, paint) => { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, fog: false });
  const C = V(0, 0, -440);
  const ctx = { THREE, scene, rnd, canvasTex, glow, SMALL, C };

  /* ---- 天空、環境反射 ---- */
  const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
  const skyShader = { vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.7)), 1.0); }" };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ ...skyShader, uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false })); scene.add(sky);
  const sp = new Float32Array(2400 * 3);
  for (let i = 0; i < 2400; i++) { const a = rnd() * Math.PI * 2, e = Math.asin(rnd() * 0.95 + 0.05), r = 3500; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  // 星星分三群，各自一閃一閃（熊 2026-11-13：城市的星星要會閃爍）
  const starMats = [0, 1, 2].map(k => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(sp.slice(k * 2400, (k + 1) * 2400), 3));
    const m = new THREE.PointsMaterial({ color: ["#e6ecff", "#fff4dc", "#d6e2ff"][k], size: [2.2, 1.6, 2.8][k], sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }); scene.add(new THREE.Points(g, m)); return m; });
  const starMat = { set opacity(v) { starMats.forEach(m => { m.userData.base = v; }); } };
  const disc = (c, r) => new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true }));
  const moon = disc("#f2f0e6", 70); moon.position.set(-900, 1300, -2600); moon.lookAt(0, 0, 0); scene.add(moon);
  const sunDisc = disc("#fff3d6", 90); sunDisc.position.set(1200, 900, -2600); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);
  const hemi = new THREE.HemisphereLight("#c9d6ff", "#2a2a2a", 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff4e0", 1); sun.position.set(300, 500, 200); scene.add(sun); scene.add(sun.target);
  // 陰影只照人偶附近（跟著鏡頭的目標走）：廣場的建築、樹、路人、寶石都有影子；晚上是淡淡的月光影子
  sun.castShadow = true; sun.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 10, far: 1400 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  const sunOff = V(300, 500, 200).setLength(600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(), envU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), new THREE.ShaderMaterial({ ...skyShader, uniforms: envU, side: THREE.BackSide })));
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(10, 24), new THREE.MeshBasicMaterial({ color: "#6f747c" })); envGround.rotation.x = -Math.PI / 2; envGround.position.y = -1; envScene.add(envGround);
  // 環境裡的城市燈帶：金屬和玻璃晚上也反射得到光，看起來才像銀色
  [["#ffe2b0", 0.4, 0], ["#cfe4ff", 1.1, 1.6], ["#ffffff", -0.2, 3.3]].forEach(([c, y, a]) => { const band = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.5, 32, 1, true, a, 2.2), new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide })); band.position.y = y; envScene.add(band); });
  const envSun = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" })); envSun.position.set(5, 6, -4); envScene.add(envSun);
  let envRT = null;

  /* ---- 地面 ---- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: "#7d9f5c", roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);   // 草地顏色和家門口一樣
  const cityFloor = new THREE.Mesh(new THREE.CircleGeometry(300, 64), new THREE.MeshStandardMaterial({ color: "#2f3338", roughness: 0.9 })); cityFloor.rotation.x = -Math.PI / 2; cityFloor.position.set(C.x, 0.05, C.z); scene.add(cityFloor);
  // 熊 2026-11-14：路延伸出去、有道路線；路面、線各自往前推一點（polygonOffset），不會和地面、Sora 街打架而閃
  const roadMat = new THREE.MeshStandardMaterial({ color: "#4c4f55", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const lineW = new THREE.MeshBasicMaterial({ color: "#eeeae0", polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), lineY = new THREE.MeshBasicMaterial({ color: "#e9c25a", polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  TOWN_ROADS.forEach(([x, z, w, d], ri) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.09 + ri * 0.004, z); m.renderOrder = 1; scene.add(m);
    const along = d > w, L = Math.max(w, d), W = Math.min(w, d), y = 0.13 + ri * 0.004, put = (mat, ox, oz, lw, ld) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(lw, ld), mat); q.rotation.x = -Math.PI / 2; q.position.set(x + ox, y, z + oz); q.renderOrder = 2; scene.add(q); };
    if (ri === 0) for (let k = -4; k <= 4; k++) put(lineW, k * 1.05, -d / 2 + 2.2, 0.6, 2.6);   // 熊 FIN-U58：道路接到廣場前有斑馬線
    if (ri > 1) return;   // 熊 2026-11-14：只有大條的主要道路才畫道路線
    for (let s = -L / 2 + 2; s < L / 2 - 2; s += 6) if (along) put(ri === 0 ? lineY : lineW, 0, s, 0.22, 3); else put(lineW, s, 0, 3, 0.22);   // 中線（主要道路是黃色虛線）
    for (const e of [-1, 1]) if (along) put(lineW, e * (W / 2 - 0.45), 0, 0.14, L); else put(lineW, 0, e * (W / 2 - 0.45), L, 0.14); });   // 兩邊的白色路邊線

  /* ---- 城市的各個部分 ---- */
  const skyline = buildSkyline(ctx);
  // 四季（熊 2026-11-14）：春天粉紅花、夏天綠、秋天橘紅黃、冬天結霜；?season= 可以預覽
  const SEASON = (() => { const q = new URLSearchParams(location.search).get("season"); if (["spring", "summer", "autumn", "winter"].includes(q)) return q; const m = new Date().getMonth() + 1; return m >= 3 && m <= 5 ? "spring" : m <= 8 ? "summer" : m <= 11 ? "autumn" : "winter"; })();
  const SEASON_PAL = { spring: ["#f2b6c8", "#f7cfda", "#8fc06a", "#eaa2bb"], autumn: ["#d9692b", "#e08a2e", "#c4452f", "#e3b23c", "#b8542a"], winter: ["#dfe8ee", "#cfdde6", "#e9eef2"] }[SEASON];
  { // 熊 2026-11-14：城市外圍遠方隱隱約約的高樓（被霧吃掉一大半，只看得到輪廓）
    const far = new THREE.Group(); scene.add(far); const fm = ["#c9d2e2", "#d6dde9"].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, depthWrite: false, fog: false }));   // 熊：要很淡
    for (let k = 0; k < 150; k++) { const a = k / 150 * Math.PI * 2 + rnd() * 0.02, rad = 1150 + rnd() * 380, w = 18 + rnd() * 40, h = 50 + rnd() * rnd() * 300;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.6 + rnd() * 0.6)), fm[k % 2]); b.position.set(C.x + Math.cos(a) * rad, h / 2, C.z + Math.sin(a) * rad); b.rotation.y = rnd() * 3; far.add(b); } }
  const town = buildTown(ctx);
  const lines = buildLines(ctx, town.STATION, town.STATION2);
  if (SEASON_PAL) {   // 小鎮的樹（instanced）一棵一棵換顏色；其他綠色的圓樹冠也換
    if (town.crown) { const col = new THREE.Color(); for (let i = 0; i < town.crown.count; i++) { col.set(SEASON_PAL[i % SEASON_PAL.length]); town.crown.setColorAt(i, col); } town.crown.instanceColor.needsUpdate = true; town.crown.material.color.set("#ffffff"); }
    const _h = {}; let k = 0; scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.material || !o.material.color || o.material.map || !o.geometry || o.geometry.type !== "SphereGeometry") return; o.material.color.getHSL(_h);
      if (_h.h > 0.17 && _h.h < 0.42 && _h.s > 0.18 && _h.l > 0.18 && _h.l < 0.62) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(SEASON_PAL[k++ % SEASON_PAL.length]), 0.8); } }); }
  // 更科幻一點（熊 2026-11-14）：市中心上空有飛行車流、三圈慢慢轉的全息光環
  const skyTraffic = new THREE.Group(); scene.add(skyTraffic); const flyers = [];
  { const bodyM = new THREE.MeshStandardMaterial({ color: "#d9dee8", metalness: 0.8, roughness: 0.25 }), strip = ["#7ad7ff", "#ff7ab8", "#b48cff", "#7dffcf"].map(c => new THREE.MeshBasicMaterial({ color: c }));
    for (let i = 0; i < 16; i++) { const f = new THREE.Group(), b = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 3.2, 4, 10), bodyM); b.rotation.z = Math.PI / 2; f.add(b);
      const st = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 2.3), strip[i % 4]); st.position.y = -0.5; f.add(st); skyTraffic.add(f);
      flyers.push({ f, r: 90 + rnd() * 160, y: 70 + rnd() * 90, a: rnd() * 6.28, sp: (0.05 + rnd() * 0.06) * (i % 2 ? 1 : -1) }); }
    for (const [r, y, c] of [[70, 200, "#7ad7ff"], [105, 232, "#b48cff"], [140, 262, "#7dffcf"]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.8, 8, 120), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2; ring.position.set(C.x, y, C.z); skyTraffic.add(ring); flyers.push({ ring }); } }
  // 霞光（熊 2026-11-14：少見；出現一定會掉東西）：天上一片會流動的彩色光幕，幾秒後一顆發光的碎片掉到她旁邊
  const aur = new THREE.Group(); aur.visible = false; scene.add(aur); const aurM = [];
  { const tex = ctx.canvasTex(512, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); ["#7dffcf", "#7ad7ff", "#c48cff", "#ff9ad5", "#ffd28a", "#7dffcf"].forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col)); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "destination-in"; const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.35, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = v; c.fillRect(0, 0, w, h); });
    tex.wrapS = THREE.RepeatWrapping;
    for (let k = 0; k < 4; k++) { const geo = new THREE.PlaneGeometry(1600, 260, 80, 1), ps = geo.attributes.position; for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.sin(ps.getX(i) / 140 + k) * 90);
      const m = new THREE.MeshBasicMaterial({ map: tex.clone(), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });   // 白天也看得到（不用相加混色） m.map.wrapS = THREE.RepeatWrapping; m.map.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, m); mesh.position.set(C.x + (k - 1.5) * 120, 360 + k * 28, C.z - 260 + k * 160); mesh.rotation.y = k * 0.5; aur.add(mesh); aurM.push(m); } }
  let aurT = -1, aurNext = 60, aurDropped = false, shard = null;
  const AUR_LEN = 45;
  const aurStart = () => { aurT = 0; aurDropped = false; aur.visible = true; toast(L("✨ 天空出現了霞光！", "✨ An aurora lights up the sky!")); };
  if (new URLSearchParams(location.search).get("aurora") === "1" || rnd() < 0.06) setTimeout(aurStart, 4000);
  const plaza = buildPlaza(ctx);
  const lib = buildLibraryInterior(ctx); lib.group.visible = false;
  const life = buildLife(ctx, town);
  window.__sleSound = (on) => life.pause(!on);   // 月台的人、Sora 街、腳踏車和滑板車、外星人、聊天、背景聲、雨、星港之環
  plaza.group.traverse(o => { if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; } });
  const FROM_HOME = new URLSearchParams(location.search).get("from") === "home";   // 從遊戲家門口來：搭 S 線（ASTRALIS）；從書房來：A 線（LUMEN）
  const lineA = FROM_HOME ? lines.LINES.find(l => l.name === "S") : lines.LINES[0], HOME_ST = FROM_HOME ? town.STATION2 : town.STATION;
  const nearestU = (line, pt, u0 = 0, u1 = 1) => { let best = u0, bd = 1e9; for (let u = u0; u < u1; u += 0.001) { const p = line.curve.getPointAt(u), d = Math.hypot(p.x - pt.x, p.z - pt.z); if (d < bd) { bd = d; best = u; } } return best; };
  const U_HUB = nearestU(lineA, C, 0.3, 0.98), U_TOWN = nearestU(lineA, HOME_ST, 0, 0.3);
  const hubP = lineA.curve.getPointAt(U_HUB), DECK = hubP.y + 1.6;
  // 中央車站：月台和車廂地板同高，玻璃圓頂；旁邊是玻璃電梯，下到老城廣場
  const concrete = new THREE.MeshStandardMaterial({ color: "#c9ccd2", roughness: 0.7 });
  const hubDeck = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 1.2, 48), concrete); hubDeck.position.set(hubP.x, DECK - 0.6, hubP.z); scene.add(hubDeck);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(15, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#d8f0ff", transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.04, metalness: 0.1, side: THREE.DoubleSide }));
  dome.scale.y = 0.5; dome.position.set(hubP.x, DECK, hubP.z); scene.add(dome);
  const E = V(hubP.x + 10, 0, hubP.z + 6);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, DECK, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: "#cfeaff", transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide }));
  shaft.position.set(E.x, DECK / 2, E.z); scene.add(shaft);
  const metal = metalMaterial(ctx);
  const cab = new THREE.Group(); cab.position.set(E.x, DECK, E.z); scene.add(cab);
  cab.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24), metal));
  const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24), metal); cabRoof.position.y = 2.6; cab.add(cabRoof);

  /* ---- 列車 ---- */
  const trains = lines.LINES.map((line, i) => ({ line, g: makeTrain(ctx, line.color, metal, { interior: true, rnd }), u: rnd(), speed: (i === 2 ? 18 : 26) / line.len, dir: 1 }));
  const rideTrain = makeTrain(ctx, "#f2c14e", metal, { interior: true, rnd }); rideTrain.visible = false;
  // 熊 FIN-U58：特別的節日，車廂有花紋地板和扶手上的小掛飾（?holiday=xmas 可以預覽）
  const HOL = (() => { const q = new URLSearchParams(location.search).get("holiday"); if (q) return q; const d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
    return m === 1 && dd <= 3 ? "newyear" : m === 2 && dd === 14 ? "valentine" : m === 10 && dd >= 29 ? "halloween" : m === 12 && dd >= 20 && dd <= 26 ? "xmas" : m === 12 && dd === 31 ? "newyear" : null; })();
  if (HOL) [rideTrain, ...trains.map(t => t.g)].forEach(tg => tg.userData.cars && decorate(THREE, tg.userData.cars[0], HOL));

  /* ---- 人偶 ---- */
  const av = finAvatar(THREE) || makePerson(THREE, { top: CLOTH[desk?.avatar?.top] || "#f0eee8", bottom: CLOTH[desk?.avatar?.bottom] || "#3f8d8a", longHair: true, hair: "#2a1d18", skin: "#f1d3bd" }, rnd);
  av.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(av);
  // 熊 FIN-U53：坐車時她坐在車廂裡（看得到她），傘收起來放旁邊
  const hipY = (() => { try { av.updateMatrixWorld(true); const v = V(0, 0, 0); av.userData.legs[0].getWorldPosition(v); return v.y - av.position.y; } catch { return 0.84; } })();
  const rideCar = rideTrain.userData.cars[0], MY_SEAT = { sx: -1, z: 1.0 }, myFold = addFolded(THREE, rideCar, -1.08, 0.56, MY_SEAT.z + 0.5, "#f2c14e", true);   // 她的折傘收起來放在座椅上
  const toteHome = new Map();
  function boardAv() { rideCar.add(av); sit(av);
    for (const tb of av.userData.totes || []) { if (!toteHome.has(tb)) toteHome.set(tb, { p: tb.parent, pos: tb.position.clone(), q: tb.quaternion.clone(), s: tb.scale.clone() });   // 熊 FIN-U56：提袋放在她旁邊的座椅上
      const ws = V(0, 0, 0); tb.getWorldScale(ws); rideCar.add(tb); tb.scale.copy(ws); tb.quaternion.identity(); tb.rotation.y = Math.PI / 2; tb.position.set(MY_SEAT.sx * 1.08, 0.56, MY_SEAT.z - 0.55); } av.position.set(MY_SEAT.sx * (rideCar.userData.W - 0.45), 0.6 - hipY, MY_SEAT.z); av.rotation.set(0, -MY_SEAT.sx * Math.PI / 2, 0); av.visible = true;
    myFold.position.set(MY_SEAT.sx * 1.08, 0.56, MY_SEAT.z + 0.5); reseat(rideCar, Math.random, MY_SEAT); }
  function leaveAv() { if (av.parent !== scene) { scene.add(av); } stand(av);
    for (const [tb, h] of toteHome) { h.p.add(tb); tb.position.copy(h.pos); tb.quaternion.copy(h.q); tb.scale.copy(h.s); } toteHome.clear(); av.rotation.set(0, av.rotation.y, 0); }
  const townSpot = V(HOME_ST.x + (FROM_HOME ? -2 : 2), HOME_ST.y, HOME_ST.z + 6);
  // 熊 FIN-U56：月台上要有別的人；太早太晚就沒人
  // 熊 FIN-U59：月台上的人隨機走動，也會聊天（有聲音）
  const platC = makeCrowd(THREE, scene, 6, () => V(townSpot.x + (rnd() - 0.5) * 1.6, HOME_ST.y, townSpot.z + (rnd() - 0.5) * 16), rnd), platPeople = platC.people.map(w => w.p); life.talkers.push(...platC.people);
  if (false) Array.from({ length: 6 }, (_, i) => { const p = makePerson(THREE, { longHair: rnd() < 0.45 }, rnd); p.visible = false; scene.add(p);
    const side = i % 2 ? 1 : -1, along = (2.2 + Math.floor(i / 2) * 2.6 + rnd() * 0.8) * side; p.position.set(townSpot.x + (rnd() - 0.5) * 1.2, HOME_ST.y, townSpot.z + along); p.rotation.y = (FROM_HOME ? 1 : -1) * Math.PI / 2 + (rnd() - 0.5) * 0.8; return p; });
  function platCrowd() { const h = Math.floor(hourNow()), n = h < 6 || h >= 23 ? 0 : (h >= 7 && h < 9) || (h >= 17 && h < 20) ? 6 : h < 7 || h >= 21 ? 1 : 3; platPeople.forEach((p, i) => { p.visible = i < n; }); }
  platCrowd();
  av.position.copy(townSpot); av.rotation.y = Math.atan2(townSpot.x - C.x, townSpot.z - C.z) + Math.PI;   // 面向城市

  /* ---- 鏡頭與操作 ---- */
  const target = V(30, 6, -10);
  const view = { theta: 0.55, phi: 1.2, r: SMALL ? 150 : 120 }, want = { ...view };
  const PVB = (() => { try { return localStorage.getItem("sora-pv") === "haloB"; } catch { return false; } })();   /* 曦環城入口 B 版預覽 */
  let pvLeft = false, pvNear = false;   /* B 版預覽：回程按鈕等玩家離開光梯、再走回來時才出現 */
  let mode = "town", rideView = "inside", walkTo = null, keys = {}, paused = false, peek = null, lightsNow = 0;
  // 熊 2026-11-14（FIN-U51）：按車站來的時候，直接站在月台上（鏡頭在月台後面、看著城市）；坐車回來時，定點畫面是城市的正面，她站在月台上
  const platTheta = Math.atan2(townSpot.x - C.x, townSpot.z - C.z);
  function platformView(wide) {
    if (wide) { target.copy(townSpot).lerp(C, 0.25); target.y = 20; Object.assign(view, { theta: platTheta, phi: 1.2, r: SMALL ? 170 : 150 }); }
    else { target.set(townSpot.x, townSpot.y + 1.4, townSpot.z); Object.assign(view, { theta: platTheta, phi: 1.08, r: 26 }); }
    Object.assign(want, view); }
  platformView(false);
  const ptr = new Map(); let pinch = 0, moved = 0;
  const cv = renderer.domElement;
  let lpOn = false, lpT = 0, downT = 0;   // 熊 FIN-U57：統一——長按才轉視角（手機），點一下地面她走過去
  cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; downT = performance.now(); lpOn = e.pointerType !== "touch"; clearTimeout(lpT); if (!lpOn) lpT = setTimeout(() => { if (moved < 10 && ptr.size === 1) lpOn = true; }, 280); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  cv.addEventListener("pointermove", (e) => {
    const p = ptr.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
    if (ptr.size === 1) { if (!lpOn && moved > 10) lpOn = true;   /* 熊 FIN-U68：手機一指拖曳直接轉視角（月台、城市都一樣） */
      if (!lpOn) { p.x = e.clientX; p.y = e.clientY; return; } want.theta -= dx * 0.005; want.phi = Math.min(1.52, Math.max(0.3, want.phi - dy * 0.004)); }
    else if (ptr.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) want.r = Math.min(900, Math.max(4, want.r * pinch / d)); pinch = d; return; }
    p.x = e.clientX; p.y = e.clientY;
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = V(0, 0, 0);
  // 熊 FIN-U57：在家以外的地方，她頭上都有名字牌（前面是她的小頭像）
  const meTag = document.createElement("div"); meTag.className = "metag"; document.body.appendChild(meTag);
  try { const P = window.parent !== window ? window.parent : null, face = P && P.__finFace ? P.__finFace() : "", nm = P && P.__finName ? P.__finName() : "";
    meTag.innerHTML = `<span></span>`; meTag.querySelector("span").textContent = nm || L("我", "Me");
    if (face && /^(data:image\/(png|jpeg|webp);base64,|blob:|\/)/.test(face)) { const im = document.createElement("img"); im.alt = ""; im.src = face; meTag.insertBefore(im, meTag.firstChild); } }   /* FIN-U240（Codex 審查）：頭像用 img.src 設，不經過 innerHTML */ catch { meTag.innerHTML = `<span>${L("我", "Me")}</span>`; }
  const _tp = V(0, 0, 0);
  function tagTick() { const on = av.visible && !paused && mode !== "peek"; meTag.style.opacity = on ? "1" : "0"; if (!on) return;
    av.getWorldPosition(_tp); _tp.y += mode === "ride" ? 1.95 : 2.05; _tp.project(camera); if (_tp.z > 1 || Math.abs(_tp.x) > 1.05 || Math.abs(_tp.y) > 1.05) { meTag.style.opacity = "0"; return; }
    meTag.style.transform = `translate(${((_tp.x + 1) / 2 * innerWidth - meTag.offsetWidth / 2).toFixed(1)}px, ${((1 - _tp.y) / 2 * innerHeight - meTag.offsetHeight).toFixed(1)}px)`; }
  // 熊 FIN-U84：同一線的其他玩家（廣場、街上、圖書館裡看得到）
  window.__cityToast = toast;
  const _mpV = V(0, 0, 0), mp = cityMP(THREE, scene, camera, () => { if (!av.visible || paused) return null; av.getWorldPosition(_mpV); return { x: +_mpV.x.toFixed(2), y: +_mpV.y.toFixed(2), z: +_mpV.z.toFixed(2), ry: +av.rotation.y.toFixed(2), mode }; });
  cv.addEventListener("pointerup", (e) => {
    const was = ptr.get(e.pointerId); ptr.delete(e.pointerId);
    if (!was || moved > 8 || paused) return;
    if (e.pointerType === "touch" && performance.now() - downT > 380) return;   // 長按放開不算點一下
    const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (mode === "peek") { peek = null; setMode("town"); return; }
    if (mode === "town" && !seq) {
      const tr = trains.find(x => ray.intersectObject(x.g, true).length); if (tr) { peek = tr; setMode("peek"); toast(L("在車廂裡看看。點畫面任何地方回小鎮。", "Looking inside the car. Tap anywhere to go back.")); return; }
      if (ray.intersectObject(life.portal, true).length) { const open = window.FinSave && FinSave.townDone("stargate");
        toast(open ? L("星港之環開了！其他星球的航線正在準備中，很快就能出發。", "The star port ring is open! Routes to other planets are being prepared.") : L("星港之環：這顆星是通往外星的通道。家裡的小鎮修好「星門」以後，就能從這裡出發去其他星球。", "Star port ring: this planet is a gateway to other worlds. Repair the stargate in your home town to set off from here."), 5200); return; }
      if (life.aliens.some(a => ray.intersectObject(a, true).length)) { const g = window.FinSave ? FinSave.alienGift() : null;   // 點外星人：和家裡小鎮的外星人共用每天 2 份禮物
        toast(!g ? L("外星人揮揮手：今天的禮物送完了。", "The alien waves: no more gifts today.") : g.type === "ore" ? L("👽 外星人送你一顆未鑑定原石！放進家裡的元液瓶了。", "👽 The alien gave you an unidentified ore! It's in your essence bottle at home.") : g.type === "dew" ? L("👽 外星人送你一滴宇宙元液露珠！", "👽 The alien gave you a dewdrop of cosmic essence!") : L(`👽 外星人送你 ${g.n} B！`, `👽 The alien gave you ${g.n} B!`), 4200); return; }
      if (town.myHouse && ray.intersectObject(town.myHouse, true).length) {   // 熊 FIN-U77：點家上面的三角形（或房子）＝直接回到家門口
        if (document.body.classList.contains("embed")) { try { window.parent.postMessage({ type: "sle.city.home" }, location.origin); } catch { } }
        else toast(L("這是你的家。從遊戲裡搭捷運來的話，點這裡就直接回到家門口。", "That's your home. If you came by metro from the game, tap it to go straight to your front door."), 4200);
        return; }
      return;
    }
    if (mode !== "street" && mode !== "inside") return;
    if (pvm) { const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; }, ph0 = ray.intersectObjects(pvPick, false).find(h => shown(h.object)),
        wall = ph0 && ray.intersectObject(mode === "inside" ? lib.group : plaza.group, true).find(h => !pvPick.includes(h.object) && h.object.isMesh && h.object.visible && h.object.material && h.object.material.visible !== false && shown(h.object)), ph = ph0 && (!wall || wall.distance > ph0.distance - 0.6) ? ph0 : null;   /* 熊：按門口要出去，《星站往事》又跳出來——被擋住的、另一個場景的不算 */
      if (ph) { const r = pvm.tap(ph.object, mode, av.position); if (r && r.walk) { walkTo = V(r.walk[0], mode === "inside" ? lib.O.y : 0.12, r.walk[1]); detourTo = null; detours = 0; } if (r) return; } }   /* B 版預覽：礦點、書、刻痕 */
    if (mode === "street") { const po = finds.portalObj && finds.portalObj(); if (po && ray.intersectObject(po, true).length) { po.getWorldPosition(hit); walkTo = hit.clone(); walkTo.y = 0.12; toast(L("走到光環裡就開始玩！", "Walk into the ring to play!")); return; } }   // 點遊戲光環：她走過去，走進去就開始
    if (mode === "street" && mg) { const mh = ray.intersectObjects(mgPick, false)[0]; if (mh) { const i = mh.object.userData.ref; if (mg.tap(i, [av.position.x, av.position.z]) === "far") { const p = mg.pos(i); walkTo = V(p.x - 1.4, 0.12, p.z); detourTo = null; detours = 0; } return; } }
    if (mode === "street" && cxLamps) { const ch = ray.intersectObjects(cxPick, false)[0]; if (ch) { const i = ch.object.userData.ref; if (cxLamps.tap(i, [av.position.x, av.position.z]) === "far") { const p = cxLamps.pos(i); walkTo = V(p.x - 1.2, 0.12, p.z); detourTo = null; detours = 0; } return; } }
    if (mode === "inside") { const hl = lib.hits.find(o => ray.intersectObject(o, true).length);   // 圖書館：館員、閱讀台、看書的人
      if (hl) { const k = hl.userData.lib; if (k === "book") { openBook(); return; } if (k === "librarian") { guideDone(3); toast(L("館員：今天來挑戰三個單字吧！", "Librarian: try today's three words!")); games.quiz(); } else if (k === "lectern") games.reading();
        else games.trivia(); return; } }   // 熊 FIN-U57：點到人物就開始問問題
    const y = mode === "inside" ? lib.O.y : 0.12;
    if (ray.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), -y), hit)) { walkTo = hit.clone(); detourTo = null; detours = 0; try { running = finds.debug().gems.some(gm => Math.hypot(gm.x - hit.x, gm.z - hit.z) < 3); } catch { running = false; } }   // 點地面：走過去；點寶石旁邊：跑過去
  });
  cv.addEventListener("pointercancel", (e) => ptr.delete(e.pointerId));
  cv.addEventListener("wheel", (e) => { e.preventDefault(); want.r = Math.min(900, Math.max(4, want.r * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  addEventListener("keydown", (e) => { if (!paused) keys[e.key.toLowerCase()] = true; });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  /* ---- 流程：小鎮 → 搭車 → 下車 → 電梯 → 廣場 → 圖書館 ---- */
  let seq = null;   // 目前在跑的動畫：{ kind, t, ... }
  function ui() {
    const b = $("#ride"), v = $("#view");
    $("#place").textContent = { town: L("奧蕾莉亞・小鎮", "Aurelia · Town"), ride: L("捷運 A 線", "Metro Line A"), alight: L("中央車站", "Central Station"),
      street: L("奧蕾莉亞・老城廣場", "Aurelia · Old Town Square"), inside: L("舊城圖書館", "Old Town Library"), peek: L("行進中的車廂", "A moving train car") }[mode] || "";
    b.hidden = mode === "ride" || mode === "alight" || mode === "inside" || mode === "peek" || (PVB && mode === "street" && !pvNear); b.disabled = false;
    const hb = $("#homeBtn"); if (hb) hb.hidden = !(document.body.classList.contains("embed") && mode === "town");   // 熊 FIN-U58：在小鎮月台可以直接回家
    b.textContent = mode === "street" ? L("🚉 搭電梯上月台，坐車回小鎮（免費）", "🚉 Lift to the platform, ride home (free)") : (PVB ? L("🎫 搭捷運進城（3 B・回程免費）", "🎫 Metro to downtown (3 B · return free)") : L("🎫 搭捷運進城（3 B）", "🎫 Metro to downtown (3 B)"));
    { const sk = $("#skipRide"); if (sk) { sk.hidden = mode !== "ride"; sk.textContent = L("⏩ 略過，直接到站", "⏩ Skip to the station"); } }   // 熊 FIN-U105：乘車畫面可以按掉
    v.hidden = mode !== "ride"; v.textContent = rideView === "inside" ? L("👀 看車外", "👀 Outside view") : L("🪑 回車廂裡", "🪑 Inside the car");
  }
  const auroraMsg = (g) => g.type === "ore" ? L("霞光落下一塊未鑑定原石！放進家裡的元液瓶了。", "The aurora dropped an unidentified ore! It's in your essence bottle at home.") : g.type === "dew" ? L(`霞光落下 ${g.n} 滴宇宙元液。`, `The aurora left ${g.n} drops of essence.`) : L(`霞光落下 ${g.n} B！`, `The aurora dropped ${g.n} Bloom!`);
  /* 2026-11-21 每天的小事：廣場上三盞許願燈（從月台電梯下來的地方附近），走近點亮 */
  const cxPick = [], MZ = { lux: ["曦晶", "halo crystal"], sand: ["時砂", "time sand"], pearl: ["潮珠", "tide pearl"], moss: ["苔光", "moss light"] }; let cxLamps = null;
  try { cxLamps = makeTrio({ THREE, scene, pickables: cxPick, spots: [[E.x + 6, 1.7, E.z - 3], [E.x + 8, 1.9, E.z + 2], [E.x + 4.5, 1.6, E.z + 6]], color: "#ffd59a", done: !!(window.FinSave && FinSave.cityxState && FinSave.cityxState("aurelia").done),
    onLight: (n, N) => { if (n < N) toast(L(`🏮 許願燈亮了（${n}/${N}）`, `🏮 A wish lamp lights up (${n}/${N})`)); },
    onAll: () => { const r = window.FinSave && FinSave.cityxDo ? FinSave.cityxDo("aurelia") : null; toast(L("三盞許願燈都亮了，廣場上的人抬頭看了一下，笑了。", "All three wish lamps are lit. People on the plaza look up and smile.") + (r ? L(`　+${r.b} B${r.ess ? `・元液 +${r.ess}` : ""}`, `  +${r.b} B${r.ess ? ` · essence +${r.ess}` : ""}`) : ""), 5200); void MZ; } }); } catch (e) { console.warn("cityx", e); }
  /* 2026-11-21 小遊戲：廣場上的兩個小站 */
  const mgPick = []; let mg = null;
  try { mg = makeGames({ THREE, scene, pickables: mgPick, city: "aurelia", L, toast, list: [
    { key: "letters", type: "hunt", pos: [E.x - 3.5, 0.12, E.z - 4.5], icon: "✉️", color: "#ffd59a", title: ["找回寄丟的信", "Lost Letters"], intro: ["郵差的袋子破了，五封信混在廣場的落葉和傳單裡。幫他找回來。", "The postman's bag tore — five letters are mixed in with the leaves and flyers on the plaza. Help him find them."], how: ["點信封（點錯會少一秒）", "Tap the envelopes (a wrong tap costs a second)"], theme: { bg: "#5a4632", bg2: "#2a2018", fg: "#ffd59a", target: "✉️", decoys: ["🍂", "🍁", "📰", "📄", "🧾", "🪶", "🎫", "🗞"] } },
    { key: "fountain", type: "order", pos: [E.x - 4.5, 0.12, E.z + 4.5], icon: "⛲", color: "#9fd8ff", title: ["噴泉的燈", "Fountain Lights"], intro: ["噴泉底下的六盞燈會照一首老歌的順序亮。記住它，換你來點。", "The six lamps under the fountain light up to an old tune. Remember it, then play it back."], how: ["照剛剛亮起的順序點", "Tap them in the order they lit"], theme: { bg: "#18304a", bg2: "#0a1626", fg: "#9fd8ff", nodes: ["💧", "🌟", "🎐", "🫧", "🌙", "🐟"] } }] }); } catch (e) { console.warn("mg", e); }
  window.__mg = { play: (i) => mg && mg.play(i), cur: () => mg && mg.cur, pos: (i) => mg ? mg.pos(i).toArray().map((v) => +v.toFixed(2)) : null };
  function setMode(m) { mode = m; if (m === "street") { pvLeft = false; pvNear = false; } setQuiet(m === "inside"); ui(); if (m === "street") guideDone(1); if (m === "inside") guideDone(2); }
  /* ---- 黃色小箭頭（熊 2026-11-14：出了書房才出現）：① 搭捷運進城 → ② 走進舊城圖書館 → ③ 點館員挑戰今日三題 ---- */
  const GK = "sle.cityGuide"; let gStep = 0; try { gStep = Number(localStorage.getItem(GK)) || 0; } catch { }
  function guideDone(n) { if (gStep >= n) return; gStep = n; try { localStorage.setItem(GK, String(n)); } catch { } }
  const gEl = document.createElement("div"); gEl.id = "sleGuide"; gEl.innerHTML = `<div class="gl"><span></span><button type="button">${L("略過", "Skip")}</button></div><div class="ga"></div>`; document.body.appendChild(gEl);
  gEl.querySelector("button").onclick = () => { guideDone(9); try { localStorage.setItem("sle.cityGuideOff", new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)); } catch { } };   /* 略過：今天也不再提醒每天的小事 */
  gEl.querySelector(".ga").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation();   // 熊 FIN-U58：點黃色三角形就直接過去
    if (gStep === 0 && mode === "town") $("#ride").click();
    else if (gStep === 1 && mode === "street") { const o = V(plaza.doorPos.x - C.x, 0, plaza.doorPos.z - C.z).normalize().multiplyScalar(-2); av.position.set(plaza.doorPos.x + o.x, 0.12, plaza.doorPos.z + o.z); walkTo = null; }
    else if (gStep === 2 && mode === "inside") { guideDone(3); games.quiz(); } });
  const _gv = V(0, 0, 0);
  /* 2026-11-21（熊：城市的活動常常三角形指示不見了）：目標在畫面外時，黃色三角形停在畫面邊緣、指向那個方向（以前直接消失）；
     新手三步走完以後，它也會指今天還沒做的事（圖書館的今日三題、廣場的三盞許願燈） */
  const gaEl = gEl.querySelector(".ga"); let gTodayT = -9, gQuiz = false;
  const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  function quizDone() { const now = performance.now(); if (now - gTodayT < 2000) return gQuiz; gTodayT = now; try { const s = JSON.parse(localStorage.getItem("sora-universe-v0")), L0 = s && s.profile && s.profile.lib; gQuiz = !!(L0 && L0.d === todayStr() && (L0.k || []).indexOf("quiz") >= 0); } catch { gQuiz = false; } return gQuiz; }
  function scr(v) { v.project(camera); const W = innerWidth, H = innerHeight, behind = v.z > 1; let sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H; if (behind) { sx = W / 2 - (sx - W / 2) * 1000; sy = H / 2 - (sy - H / 2) * 1000; }
    const inside = !behind && sx > 30 && sx < W - 30 && sy > 100 && sy < H - 50; if (inside) return { xy: [sx, sy], rot: 0 };
    const ang = Math.atan2(sy - H / 2, sx - W / 2); return { xy: [Math.max(40, Math.min(W - 40, sx)), Math.max(120, Math.min(H - 60, sy))], rot: ang - Math.PI / 2 }; }
  function guideTick() {
    let xy = null, below = false, text = "", rot = 0;
    let off = false; try { off = gStep >= 3 && localStorage.getItem("sle.cityGuideOff") === todayStr(); } catch { }
    const busy = paused || seq || document.querySelector(".game") || off, pvc = pvm ? pvm.clue() : 9;
    if (!busy && gStep === 0 && mode === "town") { const b = $("#ride"); if (b && !b.hidden && b.offsetParent) { const r = b.getBoundingClientRect(); xy = [r.left + r.width / 2, r.top]; text = L("搭捷運進城看看", "Ride the metro downtown"); } }
    else if (!busy && mode === "street" && ((gStep === 1 && pvc >= 1) || (gStep >= 3 && !quizDone() && pvc >= 3))) { _gv.copy(plaza.doorPos); _gv.y = PVB ? 1.4 : 4; const q = scr(_gv); xy = q.xy; rot = q.rot; text = gStep === 1 ? L("走進舊城圖書館", "Walk into the Old Town Library") : L("圖書館：今日三題還沒挑戰", "Library: today's three words are waiting"); }
    else if (!busy && mode === "inside" && pvc >= 3 && (gStep === 2 || (gStep >= 3 && !quizDone()))) { const lb = lib.hits.find(o => o.userData.lib === "librarian" && o.isGroup); if (lb) { lb.getWorldPosition(_gv); _gv.y += 2.1; const q = scr(_gv); xy = q.xy; rot = q.rot; text = L("點館員，挑戰今日三題", "Tap the librarian for today's three words"); } }
    else if (!busy && mode === "street" && gStep >= 3 && pvc >= 3 && cxLamps && !cxLamps.done) { const i = cxLamps.next(); if (i >= 0) { _gv.copy(cxLamps.pos(i)); _gv.y += 0.8; const q = scr(_gv); xy = q.xy; rot = q.rot; text = L("廣場的許願燈還沒點亮", "The plaza's wish lamps are still dark"); } }
    if (!xy) { gEl.classList.remove("on"); return; }
    gEl.querySelector("span").textContent = text; gEl.classList.add("on"); gEl.classList.toggle("below", below); gaEl.style.rotate = rot ? `${(rot * 180 / Math.PI).toFixed(1)}deg` : "0deg";
    const w = gEl.offsetWidth, h = gEl.offsetHeight, x = Math.min(innerWidth - w - 6, Math.max(6, xy[0] - w / 2));
    gEl.style.transform = `translate(${x.toFixed(1)}px, ${(xy[1] - h - 4).toFixed(1)}px)`; gEl.querySelector(".ga").style.marginLeft = `${((xy[0] - x - w / 2) * 2).toFixed(1)}px`;
  }
  $("#view").addEventListener("click", () => { rideView = rideView === "inside" ? "outside" : "inside"; ui(); });
  $("#skipRide")?.addEventListener("click", () => { if (!seq || seq.kind !== "ride") return;   // 熊 FIN-U105：快速版——進城直接站在電梯裡下到廣場；回小鎮直接到站
    if (seq.dest === "toCity") { seq = null; leaveAv(); av.visible = true; av.position.set(E.x, DECK, E.z); setMode("alight"); target.set(E.x, DECK + 1.4, E.z); seq = { kind: "liftDown", t: 0 }; }
    else seq.t = seq.dur; });
  $("#homeBtn") && $("#homeBtn").addEventListener("click", () => { try { window.parent.postMessage({ type: "sle.study.close" }, location.origin); } catch { } });
  $("#ride").addEventListener("click", async () => {
    if (seq) return;
    if (mode === "street") {   // 回程：走到電梯 → 上月台 → 搭車回小鎮
      $("#ride").disabled = true;
      av.position.set(E.x, 0.12, E.z); seq = { kind: "liftUp", t: 0 }; return;
    }
    if (mode !== "town") return;
    $("#ride").disabled = true;
    // 捷運票只用 B 幣（熊 2026-11-14：不花元液）
    const r = await api("POST", "/api/city/ticket", {});
    if (!r.ok) { $("#ride").disabled = false; return toast(r.data.message || L("買不到車票", "Could not buy a ticket")); }
    if (desk) { desk.coins = r.data.wallet.total; showCoins(); }
    toast(L(`買好車票了（−${r.data.price} B，含回程）。上車囉！`, `Ticket bought (−${r.data.price} B, return included). All aboard!`));
    startRide(U_TOWN, U_HUB, "toCity");
  });
  const PL = (k) => { const A = PLACE_LINES[k]; return A[(Math.random() * A.length) | 0]; };
  const PLACE_LINES = {   // 熊 FIN-U56：到一個地方，出現一句和那裡有關的話
    town: [["小鎮的月台，風裡有麵包香。", "The town platform — the wind smells of bread."], ["每一趟車，都是一個新的開始。", "Every train is a small new start."]],
    station: [["中央車站，城市的心跳在這裡。", "Central Station — the city's heartbeat."], ["這麼多人，每個人都有自己的故事。", "So many people, each with a story."]],
    plaza: [["老城廣場，鐘聲會告訴你現在幾點。", "The Old Town Square — the clock will tell you the time."], ["石板路走起來，像在讀一本舊書。", "Walking these stones feels like reading an old book."]],
    library: [["安靜的地方，想法會變得清楚。", "In quiet places, thoughts grow clear."], ["每一本書，都是別人留給你的一盞燈。", "Every book is a lamp someone left for you."]],
  };
  const QUOTES = [["適當的準備能解決生活中80%的問題。", "Proper preparation solves 80 percent of life's problems."], ["回頭的人永遠到不了最高峰！", "Bravery never goes out of fashion."], ["能量和堅持可以征服一切事情。", "Energy and persistence conquer all things."],
    ["活要活得美好，夢要夢得熱烈，愛要愛得完整。", "Live beautifully, dream passionately, love completely."], ["愛因斯坦：邏輯會帶你從A點到達B點，想像力將把你帶到任何地方。", "Logic will get you from A to B. Imagination will take you everywhere. — Albert Einstein"],
    ["幸福，是每一個微小的生活願望達成。當你想吃的時候有得吃，想被愛的時候有人來愛你。", "Happiness is having each tiny wish come true: something to eat when you are hungry, someone's love when you need love."],
    ["不要將你的東西為了某一個特別的時刻而預留著，因為你生活的每一天都是那麼特別。", "Do not keep anything for a special occasion, because every day that you live is a special occasion."],
    ["在回憶裡繼續夢幻，不如在地獄裡等待天堂。", "Dreaming in the memory is not as good as waiting for the paradise in the hell."], ["我走得很慢，但是我從來不會後退。", "I am a slow walker, but I never walk backwards."],
    ["一息若存，希望不滅。", "While there is life there is hope."], ["做你想做的夢吧，去你想去的地方吧，成為你想成為的人吧，因為你只有一次生命，一個機會去做所有那些你想做的事。", "Dream what you want to dream; go where you want to go; be what you want to be."],
    ["心之所願，無所不成。", "Nothing is impossible to a willing heart."], ["生命不息，希望常在。", "Where there is life, there is hope."], ["最好的總會在最不經意的時候出現。", "The best things come when you least expect them to."],
    ["你的時間是有限的，所以不要浪費時間去過別人要你過的生活。", "Your time is limited, so don't waste it living someone else's life."], ["靈魂的慾望是命運的先知。", "The soul's desire is the prophet of its fate."]];
  function startRide(from, to, kind) {
    if (Math.random() < 0.4) setTimeout(() => { if (seq && seq.kind === "ride") { const q = QUOTES[(Math.random() * QUOTES.length) | 0]; toast("✦ " + L(q[0], q[1]), 6000); } }, 5000);   // 坐車時偶爾想到一句話
    seq = { kind: "ride", t: 0, dur: 22, from, to, dest: kind };
    if (kind === "toCity") { placeOnLine(THREE, rideTrain, lineA, to, Math.sign(to - from)); rideCar.updateMatrixWorld(true); MY_SEAT.sx = rideCar.worldToLocal(V(E.x, DECK, E.z)).x >= 0 ? 1 : -1; }   // 坐在下車時靠電梯的那一側
    rideTrain.visible = true; boardAv(); rideView = "inside"; setMode("ride");
    placeOnLine(THREE, rideTrain, lineA, from, Math.sign(to - from));
  }
  function arriveCity() {   // 下車：從車門走到電梯
    rideTrain.visible = true; leaveAv(); av.visible = true;
    const car = rideCar; car.updateMatrixWorld(true); const sx = MY_SEAT.sx;
    const P = (x, z) => { const w = car.localToWorld(V(x, 0, z)); return V(w.x, DECK, w.z); };
    seq = { kind: "alight", t: 0, i: 0, pts: [P(sx * 0.6, MY_SEAT.z), P(sx * 0.6, -3.2), P(sx * 1.7, -3.2), P(sx * 3.2, -3.2), V(E.x, DECK, E.z)] };   // 車廂裡走到車門、出門、再走到電梯
    av.position.copy(seq.pts[0]);
    { const c = car.getWorldPosition(V(0, 0, 0)); want.theta = view.theta = Math.atan2(E.x - c.x, E.z - c.z); want.phi = view.phi = 1.15; target.set(seq.pts[2].x, DECK + 1.4, seq.pts[2].z); }   // 鏡頭在電梯那一側，看得到她從車門走出來
    setMode("alight");
    { const q = PL("station"); toast(L("中央車站到了。" + q[0], "Central Station. " + q[1]), 4200); }
  }
  function enterStreet() {
    av.position.set(E.x + 2.5, 0.12, E.z + 2.5); rideTrain.visible = false; setMode("street");
    Object.assign(want, { theta: 0.6, phi: 1.2, r: 11 }); Object.assign(view, want);
    { const q = PL("plaza"); setTimeout(() => toast(L(q[0], q[1]), 3600), 5600); }
    toast(L("點地面就會走過去（電腦也可以用方向鍵）。走到圖書館門口可以進去。", "Tap the ground to walk (arrow keys work too). Walk to the library door to go in."), 5200);
    if (pvm) pvm.enterStreet();
  }
  // 發光的書：飛出來、打開 → 隨機事件（每天第一次有小禮物）＋一句「書頁低語」
  // FIN-U145（熊）：圖書館裡的不叫神喻（神諭留給遊戲的塔羅室）；句子從 19 句增加到 60 句、輪完一輪才會重複；書不再一闔上就馬上又出現
  const WHISPER = [["你要找的答案，藏在每天重複做的小事裡。", "The answer you seek hides in the small things you do every day."],
    ["先往前走一小步，路會自己亮起來。", "Take one small step; the path will light itself."],
    ["慢一點沒關係，星星也是一顆一顆亮的。", "It's fine to go slowly — stars light up one at a time."],
    ["今天放下一件小事，明天會多一點空間。", "Let one small thing go today; tomorrow will have more room."],
    ["你存下的不只是錢，是未來的自由。", "What you save isn't just money — it's future freedom."],
    ["好奇心會帶你到地圖上沒畫的地方。", "Curiosity will take you where the map hasn't been drawn."],
    ["有些花要等一個季節，有些夢要等一個你。", "Some flowers wait a season; some dreams wait for you."],
    ["把今天學到的一個字，送給明天的自己。", "Give one word you learned today to tomorrow's you."],
    ["當你不確定時，回到你最初為什麼開始。", "When unsure, return to why you began."],
    ["小小的光，也能照亮整間書房。", "A small light can still fill the whole study."],
    ["你比昨天的自己，多走了一步。", "You're one step further than yesterday."],
    ["宇宙在等你問一個好問題。", "The universe is waiting for a good question."],
    ["適當的準備能解決生活中80%的問題。", "Proper preparation solves 80 percent of life's problems."],
    ["能量和堅持可以征服一切事情。", "Energy and persistence conquer all things."],
    ["我走得很慢，但是我從來不會後退。", "I am a slow walker, but I never walk backwards."],
    ["心之所願，無所不成。", "Nothing is impossible to a willing heart."],
    ["最好的總會在最不經意的時候出現。", "The best things come when you least expect them to."],
    ["一息若存，希望不滅。", "While there is life there is hope."],
    ["讀不懂的那一頁，先折個角，過幾天再回來。", "Fold the corner of the page you can't follow; come back in a few days."],
    ["記帳不是在數錢，是在看自己把日子過成什麼樣。", "Keeping accounts isn't counting money — it's seeing what your days are made of."],
    ["一個單字念十遍，不如拿它造一個自己的句子。", "Better one sentence of your own than a word repeated ten times."],
    ["累的時候，休息也算進度。", "When you're tired, resting counts as progress."],
    ["書架最上層的書，也是有人一階一階爬上去放的。", "Even the top-shelf books were carried up one step at a time."],
    ["今天只做一件事也可以，只要是真的做了。", "One thing today is enough, as long as it's truly done."],
    ["想不通的時候，去走一走，答案常常在路上。", "When stuck, take a walk; answers are often on the way."],
    ["別人翻得快，不代表你讀得淺。", "Others turning pages faster doesn't make your reading shallow."],
    ["把難的事切成小塊，每一塊都會變得溫柔。", "Cut a hard thing into small pieces and each piece turns gentle."],
    ["錯的那一題，是今天最有用的一題。", "The question you got wrong is today's most useful one."],
    ["你不需要一次看完整座圖書館。", "You don't have to read the whole library at once."],
    ["晚一點開的花，也是花。", "A late flower is still a flower."],
    ["對自己說話，請用對朋友說話的語氣。", "Speak to yourself in the voice you'd use for a friend."],
    ["想買的東西，放三天，再問一次自己。", "Let a wish to buy rest three days, then ask yourself again."],
    ["安靜不是空的，裡面有你自己的聲音。", "Quiet isn't empty; your own voice is in it."],
    ["每一個熟練的人，都曾經在第一頁停很久。", "Everyone fluent once stayed a long time on page one."],
    ["今天的你，已經是某一天的你很想成為的樣子。", "Today's you is who some earlier you longed to become."],
    ["慢慢來，比較快。", "Slowly is the faster way."],
    ["不用等準備好。開始了，才會準備好。", "Don't wait to be ready; starting is what makes you ready."],
    ["一杯茶的時間，足夠記住一個新的說法。", "The time of one cup of tea is enough for one new phrase."],
    ["把燈留給晚回來的自己。", "Leave a light on for the you who comes home late."],
    ["比較的時候，只跟上個月的自己比。", "If you must compare, compare with last month's you."],
    ["寫下來的煩惱，會小一號。", "A worry written down shrinks one size."],
    ["今天多存的一點點，是給以後的自己的一封信。", "The little extra saved today is a letter to your later self."],
    ["沒人看見的努力，書都記得。", "The effort nobody saw — the books remember."],
    ["聽不懂沒關係，耳朵正在認路。", "It's fine not to follow yet; your ears are learning the road."],
    ["窗外下雨的日子，最適合讀一本慢的書。", "Rainy days are made for slow books."],
    ["你問的問題，比你以為的更好。", "Your question is better than you think."],
    ["把手機放遠一點，世界會安靜兩格。", "Put the phone a little further away; the world goes two notches quieter."],
    ["一件事做到第七天，它就開始認得你。", "By the seventh day, a habit begins to recognise you."],
    ["不會的事，只是還沒輪到它。", "What you can't do yet simply hasn't had its turn."],
    ["好的句子，值得抄在手心裡帶走。", "A good sentence deserves to be carried in your palm."],
    ["今天的收穫，可以只是一個微笑。", "Today's harvest may be just one smile."],
    ["迷路的時候，就當作多看了一條街。", "When you're lost, count it as one more street seen."],
    ["先把桌面清出一個角落，心也會跟著有位置。", "Clear one corner of the desk and the mind finds room too."],
    ["你正在讀的這一頁，是別人花了一生寫下的。", "The page you're reading took someone a lifetime to write."],
    ["留一點預算給快樂，也是理財。", "Budgeting a little for joy is still good finance."],
    ["今天不想讀，就翻一頁；翻了，常常就會讀下去。", "Don't feel like reading? Turn one page — you often keep going."],
    ["有人在遠方，也正努力著同一件事。", "Somewhere far away, someone is working at the very same thing."],
    ["晚安之前，謝謝今天的自己一次。", "Before goodnight, thank today's self once."],
    ["想去的地方，先在地圖上畫一顆星。", "Mark the place you long to go with a star on the map."],
    ["慢慢累積的東西，最不容易被拿走。", "What is gathered slowly is hardest to take away."]];
  const EVENTS = [["書頁之間夾著一片乾燥的四葉草。", "A dried four-leaf clover was pressed between the pages."],
    ["書裡掉出一張很舊的星空車票。", "An old star-train ticket fell out of the book."],
    ["翻開的那一頁，畫著一座你沒見過的城市。", "The page you opened shows a city you've never seen."],
    ["書頁沙沙作響，像有人在遠方輕輕說話。", "The pages rustle, like someone whispering far away."],
    ["一張書籤上寫著：今天也辛苦了。", "A bookmark reads: you did well today."],
    ["書裡飄出一點金色的光塵。", "A little golden dust drifts out of the book."],
    ["扉頁有一行褪色的鉛筆字，是很久以前的借書人留的。", "A faded pencil line on the flyleaf, left by a borrower long ago."],
    ["書頁裡夾著一根白色的羽毛。", "A white feather lies between the pages."],
    ["翻開時有一點雨後泥土的味道。", "It smells faintly of earth after rain."],
    ["書背裡藏著一張手繪的小地圖。", "A small hand-drawn map hides in the spine."],
    ["有一頁的角落畫了一隻打瞌睡的貓。", "In one corner someone drew a dozing cat."],
    ["書裡夾著一張寫到一半的明信片。", "A half-written postcard is tucked inside."],
    ["書頁邊緣有淡淡的茶漬，像一朵雲。", "A pale tea stain on the margin, shaped like a cloud."],
    ["最後一頁蓋著一個星星形狀的印章。", "The last page bears a star-shaped stamp."],
    ["書一打開，旁邊的檯燈跟著亮了一點。", "As the book opens, the lamp beside it glows a little brighter."],
    ["夾在書裡的壓花還留著一點顏色。", "The pressed flower inside still keeps a little colour."]];
  const bag = (key, n) => { let a = []; try { a = JSON.parse(localStorage.getItem(key) || "[]"); } catch { } a = a.filter(x => Number.isInteger(x) && x >= 0 && x < n); if (!a.length) { a = [...Array(n).keys()]; for (let q = n - 1; q > 0; q--) { const r = (Math.random() * (q + 1)) | 0; [a[q], a[r]] = [a[r], a[q]]; } } const v = a.pop(); try { localStorage.setItem(key, JSON.stringify(a)); } catch { } return v; };
  let bookWait = 0;   // 秒；倒數完書才會再出現在書架上
  const hideBook = (sec) => { lib.book.visible = false; lib.book.position.y = -60; bookWait = sec; };
  function openBook() {
    if (paused || bookAnim || !lib.book.visible) return; const bk = lib.book, from = bk.getWorldPosition(V(0, 0, 0)), to = camera.position.clone().add(camera.getWorldDirection(V(0, 0, 0)).multiplyScalar(2.2));
    bookAnim = { t: 0, from, to }; paused = true;
  }
  let bookAnim = null;
  function bookTick(dt) {
    if (!bookAnim && bookWait > 0 && mode === "inside" && !paused) { bookWait -= dt; if (bookWait <= 0) { lib.placeBook(); toast(L("書架上有一本書在發光。", "A book on the shelves is glowing."), 3200); } }
    if (!bookAnim) return; const A = bookAnim, bk = lib.book; A.t += dt; const k = Math.min(1, A.t / 1.1), e = 1 - (1 - k) ** 3;
    const p = A.from.clone().lerp(A.to, e); bk.parent.worldToLocal(p); bk.position.copy(p); bk.rotation.y += dt * 4 * (1 - e); bk.scale.setScalar(1 + e * 0.6);
    if (k >= 1 && !A.shown) { A.shown = true; bk.visible = false; const g = window.FinSave ? FinSave.bookGift() : null, ev = EVENTS[bag("sle-book-ev", EVENTS.length)], or = WHISPER[bag("sle-book-wh", WHISPER.length)];
      const root = document.createElement("div"); root.className = "game"; root.innerHTML = `<div class="game-card book-card"><div class="game-head"><strong>📖 ${L("打開的書", "The open book")}</strong><span class="spacer"></span><button class="btn" type="button">${L("闔上", "Close")}</button></div>
        <div class="game-body"><p class="book-ev">${L(...ev)}</p>${g ? `<p class="game-result">${g.type === "ore" ? L("書裡還夾著一塊未鑑定原石！放進家裡的元液瓶了。", "There's an unidentified ore inside too! It went into your essence bottle at home.") : g.type === "dew" ? L("書頁上凝著一滴宇宙元液（+1）。", "A drop of cosmic essence on the page (+1).") : L(`書裡夾著 ${g.n} B！`, `${g.n} Bloom tucked inside!`)}</p>` : ""}
        <div class="whisper"><small>${L("✦ 書頁低語", "✦ A whisper from the page")}</small><p>${L(...or)}</p></div></div></div>`;
      document.body.appendChild(root); const close = () => { root.remove(); paused = false; bookAnim = null; hideBook(window.__bookFast ? 3 : 300 + Math.random() * 300); };   // 讀完一本，5–10 分鐘後才會再有一本
      root.querySelector(".btn").onclick = close; root.addEventListener("click", (e2) => { if (e2.target === root) close(); }); }
  }
  function enterLibrary() {
    if (!enterLibrary.once) { enterLibrary.once = true; if (window.__bookNow || Math.random() < 0.4) lib.placeBook(); else hideBook(window.__bookFast ? 3 : 90 + Math.random() * 210); }   // 第一次進門：四成機率書已經在發光，不然過 1.5–5 分鐘才出現；之後進出圖書館不會重新抽
    lib.group.visible = true; plaza.group.visible = false; setMode("inside");
    av.position.copy(lib.spawn); av.rotation.y = 0; walkTo = null;
    Object.assign(want, { theta: Math.PI, phi: 1.05, r: 10 }); Object.assign(view, want);   // 站在門口往裡面看
    scene.fog.near = 60; scene.fog.far = 140;
    { const q = PL("library"); toast(L("舊城圖書館。" + q[0], "The Old Town Library. " + q[1]), 4200); }
    if (pvm) pvm.enterLib();
  }
  function leaveLibrary() {
    lib.group.visible = false; plaza.group.visible = true; scene.fog.near = 260; scene.fog.far = 1700;
    const out = V(plaza.doorPos.x - C.x, 0, plaza.doorPos.z - C.z).normalize().multiplyScalar(-3);
    av.position.set(plaza.doorPos.x - out.x * -1, 0.12, plaza.doorPos.z - out.z * -1); walkTo = null; setMode("street");
  }

  /* ---- 夜晚燈光的光暈（電腦才開；手機先不開，效能優先） ---- */
  let composer = null, bloom = null;
  const FX = new URLSearchParams(location.search).get("fx");
  if (FX === "1" || (!SMALL && FX !== "0")) {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all(["EffectComposer", "RenderPass", "UnrealBloomPass", "OutputPass"].map(n => import(`${FX_URL}${n}.js/+esm`)));
      composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.55, 0.8); composer.addPass(bloom); composer.addPass(new OutputPass());
    } catch { composer = null; bloom = null; }
  }

  /* ---- 寶石與小遊戲 ---- */
  const showGems = (bag) => { $("#gems").textContent = `💎 ${bag ? bag.total : 0}`; };
  const tellParent = (open) => { try { if (window.parent !== window) window.parent.postMessage({ type: "sle.game", open }, location.origin); } catch { } };   // 熊 FIN-U57：遊戲打開時，遊戲外面的 ↩ 鈕先藏起來，不會擋到字
  const games = createGames({ api, L, toast, onBag: showGems, onOpen: () => { paused = true; keys = {}; walkTo = null; tellParent(true); }, onClose: () => { paused = false; tellParent(false); } });
  const finds = createFinds(ctx, { plaza, lib, api, toast, L, onBag: showGems, openGame: (game, id, onPlayed) => games.play(game, id, onPlayed) });
  $("#gems").addEventListener("click", () => games.showBag(finds.bag()));
  const pvPick = []; let pvm = null;
  if (PVB) try { pvm = makePvMystery({ THREE, plaza, lib, C, E, L, toPlaza: () => { if (mode === "inside") leaveLibrary(); }, toast, pickables: pvPick, canvasTex: ctx.canvasTex, pause: (on) => { paused = on; if (on) { keys = {}; walkTo = null; } tellParent(on); } }); } catch (e) { console.warn("pv", e); }
  $("#snd").addEventListener("click", () => { $("#snd").textContent = life.toggleSound() ? "🔊" : "🔇"; });
  finds.refresh();

  /* ---- 時段 ---- */
  let segNow = "";
  function applyTime() {
    const h = hourNow(), p = palette(THREE, h);
    skyU.top.value.copy(p.top); skyU.hor.value.copy(p.hor); envU.top.value.copy(p.top); envU.hor.value.copy(p.hor);
    envSun.visible = p.lights < 0.5;
    if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, 0.02); scene.environment = envRT.texture;
    scene.fog.color.copy(p.fog); renderer.setClearColor(p.fog);
    hemi.intensity = p.hemi; sun.intensity = p.sun;
    sunOff.copy(p.lights > 0.6 ? moon.position : V(300, 500, 200)).setLength(600);   // 晚上的影子是月亮照出來的
    if (bloom) { bloom.strength = 0.18 + p.lights * 0.5; bloom.threshold = 0.82 - p.lights * 0.22; } sun.color.set(p.seg === "day" ? "#fff4e0" : p.seg === "night" ? "#9fb2e0" : "#ffb88a");
    starMat.opacity = p.lights; lightsNow = p.lights; moon.material.opacity = Math.max(0, p.lights - 0.2); sunDisc.material.opacity = Math.max(0, 1 - p.lights * 1.6);
    sunDisc.material.color.set(p.seg === "day" ? "#fff3d6" : "#ffb070");
    skyline.mats.forEach(m => { m.emissiveIntensity = p.lights * 0.9; });          // 窗燈：貼圖本身偏暗、亮的不多，晚上看起來自然
    town.winWarm.emissiveIntensity = p.lights * 0.7; town.lampMat.opacity = 0.25 + p.lights * 0.75;
    plaza.clockMat.emissiveIntensity = p.lights * 0.8; plaza.water.material.emissiveIntensity = p.lights * 0.5;
    plaza.shopWin.forEach(m => { m.emissiveIntensity = 0.15 + p.lights * 0.75; });
    plaza.lampGlass.emissiveIntensity = 0.1 + p.lights * 2.2; plaza.lampLights.forEach(l => { l.intensity = p.lights * 30; });
    plaza.doorLight.material.emissiveIntensity = p.lights * 0.8;
    metal.emissive.set("#5a6270"); metal.emissiveIntensity = p.lights * 0.55;   // 晚上金屬反射城市的燈光，看起來還是銀色
    rideTrain.userData.glass.emissiveIntensity = 0.05 + p.lights * 0.35; trains.forEach(t => { t.g.userData.glass.emissiveIntensity = 0.05 + p.lights * 0.35; });
    lines.glows.forEach(m => { m.material.opacity = 0.35 + p.lights * 0.6; });
    skyline.crowns.forEach(m => { m.material.opacity = 0.3 + p.lights * 0.7; });
    document.body.classList.remove("night", "dawn", "day", "dusk"); document.body.classList.add(p.seg);
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60) % 60;
    $("#clock").textContent = `${L(p.name[0], p.name[1])} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    segNow = p.seg;
  }
  applyTime(); setInterval(applyTime, 60000); setInterval(platCrowd, 60000);

  /* ---- 主迴圈 ---- */
  function resize() { renderer.setSize(innerWidth, innerHeight); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); } camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth / innerHeight < 0.8 ? 62 : 50; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  const camRay = new THREE.Raycaster(), camDir = V(0, 0, 0); let camR = 100;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), camWant = V(0, 0, 0), lookAt = V(0, 0, 0), step = V(0, 0, 0), fwd = V(0, 0, 0), right = V(0, 0, 0);
  let last = performance.now();
  let sideSign = 1, stuckT = 0, running = false, escapeLeft = 1.2, detours = 0, detourTo = null; const _pp = V(0, 0, 0);
  function walk(dt, t, bounded) {   // 點地面或方向鍵：人偶走過去，不穿過建築
    step.set(0, 0, 0);
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); right.crossVectors(fwd, V(0, 1, 0));
    if (keys["arrowup"] || keys["w"]) step.add(fwd); if (keys["arrowdown"] || keys["s"]) step.sub(fwd);
    if (keys["arrowright"] || keys["d"]) step.add(right); if (keys["arrowleft"] || keys["a"]) step.sub(right);
    if (paused) { step.set(0, 0, 0); walkTo = null; detourTo = null; }
    if (step.lengthSq() > 0) { walkTo = null; detourTo = null; running = false; }
    else if (detourTo) { step.subVectors(detourTo, av.position); step.y = 0; if (step.length() < 0.3) { detourTo = null; step.set(0, 0, 0); } }
    else if (walkTo) { step.subVectors(walkTo, av.position); step.y = 0; if (step.length() < 0.25) { walkTo = null; detours = 0; step.set(0, 0, 0); } }
    const speed = running ? 9.5 : 3.6;   // 熊 FIN-U80：撿寶石跑得更快   // 熊 FIN-U58：去撿寶石用跑的
    if (step.lengthSq() > 0) {   // 熊 2026-11-14：前面被擋住就沿著牆、柱子滑過去，或斜著繞；本來就卡在裡面時，往哪走都可以先出來
      step.normalize().multiplyScalar(speed * dt);
      const inside = !bounded(av.position.x, av.position.z); if (!inside) escapeLeft = 1.2;   // 熊 FIN-U80：卡在牆／台階裡時，只准往外走一小段（不會一路穿過建築）
      const tryMove = (dx, dz) => { const nx = av.position.x + dx, nz = av.position.z + dz, ok = bounded(nx, nz) || (inside && escapeLeft > 0); if (ok) { if (inside) escapeLeft -= Math.hypot(dx, dz); av.position.x = nx; av.position.z = nz; return true; } return false; };
      let dx = step.x, dz = step.z, moved = tryMove(dx, dz);
      if (!moved) for (const a of [0.45 * sideSign, -0.45 * sideSign, 0.95 * sideSign, -0.95 * sideSign, 1.45 * sideSign, -1.45 * sideSign]) {
        const c = Math.cos(a), sn = Math.sin(a), rx = step.x * c - step.z * sn, rz = step.x * sn + step.z * c;
        if (tryMove(rx, rz)) { moved = true; dx = rx; dz = rz; sideSign = Math.sign(a) || 1; break; } }
      if (moved) stuckT = 0; else if ((stuckT += dt) > 0.6) { stuckT = 0; sideSign = -sideSign;   // 熊 FIN-U80：過不去就往旁邊繞一段再走（最多繞 6 次），不會停在半路
        if (walkTo && detours < 6) { detours++; const fx = walkTo.x - av.position.x, fz = walkTo.z - av.position.z, fl = Math.hypot(fx, fz) || 1, k = 2.5 + detours * 0.8;
          detourTo = V(av.position.x + (-fz / fl) * k * sideSign - fx / fl * 0.8, av.position.y, av.position.z + (fx / fl) * k * sideSign - fz / fl * 0.8); }
        else { walkTo = null; detourTo = null; } }
      av.rotation.y = Math.atan2(dx, dz); animatePerson(av, t, moved ? speed : 0);
    } else animatePerson(av, t, 0);
  }
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    trains.forEach(tr => { tr.u += tr.speed * dt * tr.dir; if (!tr.line.loop && (tr.u > 0.98 || tr.u < 0.02)) tr.dir *= -1; placeOnLine(THREE, tr.g, tr.line, tr.u, tr.dir, tr.line.low || 0); });
    lines.cars.forEach(c => { for (let i = 0; i < c.n; i++) { c.phase[i] += c.speed[i] * dt; const a = c.phase[i], r = c.rg.r + (c.speed[i] > 0 ? 3 : -3);
      c.im.setMatrixAt(i, m4.compose(V(C.x + Math.cos(a) * r, c.rg.y + 1, C.z + Math.sin(a) * r), q.setFromAxisAngle(V(0, 1, 0), -a), V(1, 1, 1))); } c.im.instanceMatrix.needsUpdate = true; });
    skyline.crowns.forEach((m, i) => { m.rotation.z = t * (i % 2 ? 0.3 : -0.2); }); skyline.beacon.visible = Math.sin(t * 3) > -0.2;
    if (town.myHouse.userData.arrow) { const ar = town.myHouse.userData.arrow; ar.position.y = 17 + Math.abs(Math.sin(t * 2.4)) * 0.9; ar.rotation.y = t * 0.8; }   // 只留一個慢慢轉、上下跳的三角形
    const d = new Date(), mins = d.getMinutes() + d.getSeconds() / 60;
    plaza.hands.forEach(([hh, mm]) => { mm.rotation.z = -mins / 60 * Math.PI * 2; hh.rotation.z = -((d.getHours() % 12) + mins / 60) / 12 * Math.PI * 2; });
    if (mode === "town") { platC.people.forEach((w, i) => { if (i % 3 !== 0 && w.wait < 1) w.wait = 4 + rnd() * 8; }); platC.update(dt, t, av.parent === scene ? av.position : null); }   // 熊 FIN-U63：月台的人大部分站著，少數走動
    town.crowd.update(dt, t, av.parent === scene ? av.position : null); if (plaza.group.visible) plaza.crowd.update(dt, t, mode === "street" ? av.position : null);
    if (lib.group.visible) { lib.globe.rotation.y = t * 0.3; lib.ring.rotation.z = t * 0.4; }
    finds.update(dt, t, seq ? "" : mode, av);
    if (pvm) pvm.update(dt, t, seq ? "" : mode, av.position);
    if (PVB && mode === "street" && !seq) { const dE = Math.hypot(av.position.x - E.x, av.position.z - E.z); if (dE > 9) pvLeft = true; const nr = pvLeft && dE < 7; if (nr !== pvNear) { pvNear = nr; ui(); } }
    starMats.forEach((m, i) => { m.opacity = (m.userData.base ?? 1) * (0.55 + 0.45 * Math.sin(t * (1.3 + i * 0.7) + i * 2)); });   // 星星閃爍
    let near = 1e9; trains.forEach(x => { near = Math.min(near, x.g.position.distanceTo(camera.position)); });
    life.update(dt, t, { camera, night: lightsNow, mode, railLevel: mode === "ride" || mode === "peek" ? 1 : Math.max(0, 1 - near / 140) });

    // 動畫流程
    if (seq && seq.kind === "ride") {
      seq.t += dt; const k = Math.min(1, seq.t / seq.dur), e = k * k * (3 - 2 * k);
      placeOnLine(THREE, rideTrain, lineA, seq.from + (seq.to - seq.from) * e, Math.sign(seq.to - seq.from));
      if (k >= 1) { const dest = seq.dest; seq = null; if (dest === "toCity") arriveCity(); else { leaveAv(); rideTrain.visible = false; av.visible = true; av.position.copy(townSpot); av.rotation.y = platTheta + Math.PI; setMode("town"); platformView(false); { const q = PL("town"); toast(L("回到小鎮了。" + q[0], "Back in town. " + q[1]), 3000); }
          if (document.body.classList.contains("embed")) setTimeout(() => { if (!seq && mode !== "ride") { try { window.parent.postMessage({ type: "sle.city.home" }, location.origin); } catch { } } }, 5000); /* 熊 FIN-U80：到小鎮站 5 秒，一定回到家門口（看車廂也照樣回家） */ } }
    } else if (seq && seq.kind === "alight") {   // 熊 FIN-U53：從靠電梯那一側的車門下車，先往外走一步再去電梯（不穿過車廂）
      const a = seq.pts[seq.i], b = seq.pts[seq.i + 1]; seq.t += dt; const k = Math.min(1, seq.t / Math.max(0.35, a.distanceTo(b) / 1.4));
      av.position.lerpVectors(a, b, k); av.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); animatePerson(av, t, 1.3);
      if (k >= 1) { seq.i++; seq.t = 0; if (seq.i >= seq.pts.length - 1) { animatePerson(av, t, 0); seq = { kind: "liftDown", t: 0 }; } }
    } else if (seq && (seq.kind === "liftDown" || seq.kind === "liftUp")) {
      seq.t += dt; const k = Math.min(1, seq.t / 4), e = k * k * (3 - 2 * k), down = seq.kind === "liftDown";
      const y = down ? DECK + (0.12 - DECK) * e : 0.12 + (DECK - 0.12) * e;
      cab.position.y = y; av.position.set(E.x, y, E.z); animatePerson(av, t, 0);
      if (k >= 1) { seq = null; if (down) { rideTrain.visible = false; enterStreet(); } else startRide(U_HUB, U_TOWN, "toTown"); }
    }
    if (mode === "street" && !seq) {
      walk(dt, t, (x, z) => (plaza.free(x - C.x, z - C.z) || Math.hypot(x - E.x, z - E.z) < 3) && !plaza.crowd.people.some(w => { w.p.getWorldPosition(_pp); return Math.hypot(_pp.x - x, _pp.z - z) < 0.55; }));   // 熊 FIN-U53：不穿過路人
      if (av.position.distanceTo(V(plaza.doorPos.x, 0.12, plaza.doorPos.z)) < 2.6) enterLibrary();
    } else if (mode === "inside") {
      const B = lib.bounds;
      walk(dt, t, (x, z) => Math.abs(x - lib.O.x) < B.x && z > B.z0 && z < B.z1 && !lib.blocked(x, z));   // 桌子、櫃台、柱子都過不去
      if (av.position.z < lib.exitZ) leaveLibrary();
    }

    // 鏡頭
    for (const k of ["theta", "phi", "r"]) view[k] += (want[k] - view[k]) * Math.min(1, dt * 5);
    if (mode === "peek" && peek) {   // 看行進中的車廂裡面
      const car = peek.g.userData.cars[0];
      camera.position.copy(car.localToWorld(camWant.set(0.75, 1.6, 4.2))); camera.lookAt(car.localToWorld(lookAt.set(-1.6, 1.4, 1.2)));
    } else if (mode === "ride") {
      if (rideView === "inside") {   // 坐在車廂裡：看她坐的那一側和窗外，城市往後流
        const car = rideTrain.userData.cars[0], cs = -MY_SEAT.sx;
        camera.position.copy(car.localToWorld(camWant.set(0.9 * cs, 1.6, 2.6))); camera.lookAt(car.localToWorld(lookAt.set(-1.6 * cs, 1.25, 0.2)));
      } else {
        const back = V(0, 0, 1).applyQuaternion(rideTrain.quaternion);
        camWant.copy(rideTrain.position).addScaledVector(back, 34).add(V(0, 14, 0));
        camera.position.lerp(camWant, Math.min(1, dt * 2.5)); camera.lookAt(rideTrain.position.x, rideTrain.position.y + 2, rideTrain.position.z);
      }
    } else if (mode === "inside") {   // 圖書館裡：站在人偶後面、平視房間（拖曳可以左右看）
      const th = view.theta, ax = av.position.x, az = av.position.z, oy = av.position.y;
      const dd = Math.min(7, Math.max(2.6, view.r * 0.38));   /* 熊：圖書館裡也能拉遠拉近（以前固定 4.2） */
      camWant.set(ax + Math.sin(th) * dd, oy + 1.2 + dd * 0.29, az + Math.cos(th) * dd);
      camWant.x = Math.max(lib.O.x - 14.2, Math.min(lib.O.x + 14.2, camWant.x)); camWant.z = Math.max(lib.O.z - 19.4, Math.min(lib.O.z + 19.4, camWant.z));
      camera.position.lerp(camWant, Math.min(1, dt * 6));
      camera.lookAt(ax - Math.sin(th) * 8, oy + 1.6, az - Math.cos(th) * 8);
    } else if (mode === "alight" || mode === "street" || (seq && seq.kind.startsWith("lift"))) {
      target.lerp(V(av.position.x, av.position.y + 1.4, av.position.z), Math.min(1, dt * 6));
      const r = mode === "alight" ? 9 : seq && seq.kind.startsWith("lift") ? 14 : view.r;
      camDir.set(Math.sin(view.phi) * Math.sin(view.theta), Math.cos(view.phi), Math.sin(view.phi) * Math.cos(view.theta));
      let rr = r;
      if (mode === "street") {   // 鏡頭碰撞：人偶和鏡頭之間有建築時，鏡頭往人偶靠近，不會被牆擋住
        camRay.set(target, camDir); camRay.far = r;
        const h = camRay.intersectObjects(plaza.solids, true)[0];
        const want = h ? Math.max(2.2, h.distance - 0.8) : r;
        camR = want < camR ? want : camR + (want - camR) * Math.min(1, dt * 2); rr = Math.min(r, camR);
      } else camR = r;
      camera.position.copy(target).addScaledVector(camDir, rr);
      if (mode === "inside") {   // 鏡頭留在圖書館裡面（不然會跑到牆外）
        camera.position.y = Math.min(camera.position.y, lib.O.y + 10.5);
        camera.position.x = Math.max(lib.O.x - 14.2, Math.min(lib.O.x + 14.2, camera.position.x));
        camera.position.z = Math.max(lib.O.z - 19.4, Math.min(lib.O.z + 19.4, camera.position.z));
      }
      camera.lookAt(target);
    } else {
      camera.position.set(target.x + view.r * Math.sin(view.phi) * Math.sin(view.theta), target.y + view.r * Math.cos(view.phi), target.z + view.r * Math.sin(view.phi) * Math.cos(view.theta));
      camera.lookAt(target);
    }
    const shady = mode === "street" || mode === "alight" || (seq && seq.kind.startsWith("lift"));
    renderer.shadowMap.autoUpdate = !!shady;   // 陰影只在廣場附近更新，搭車和在小鎮時省下來
    if (shady) { sun.target.position.copy(target); sun.position.copy(target).add(sunOff); }
    mp.tick(dt, now / 1000);
    scene.updateMatrixWorld(); camera.updateMatrixWorld(); tagTick(); mp.tags();   // 熊 FIN-U80：鏡頭和車廂都動完才放名字牌（搭捷運時不會飄走）
    if (composer) composer.render(); else renderer.render(scene, camera);
    guideTick(); bookTick(dt); if (cxLamps) cxLamps.tick(now / 1000); if (mg) mg.tick(now / 1000);
    { const tt = now / 1000; for (const q of flyers) { if (q.ring) { q.ring.rotation.z = tt * 0.05 * (q.ring.position.y % 2 ? 1 : -1); continue; } q.a += q.sp * dt; q.f.position.set(C.x + Math.cos(q.a) * q.r, q.y + Math.sin(tt + q.r) * 2, C.z + Math.sin(q.a) * q.r); q.f.rotation.y = -q.a + (q.sp > 0 ? 0 : Math.PI); } }
    if (aurT < 0) { if ((aurNext -= dt) < 0) { aurNext = 60; if (rnd() < 0.025) aurStart(); } }   // 每分鐘 2.5% 的機會
    else { aurT += dt; const a = Math.min(1, aurT / 4, Math.max(0, (AUR_LEN - aurT) / 4)) * 0.8; aurM.forEach((m, i) => { m.opacity = a * (0.7 + 0.3 * Math.sin(now / 900 + i)); m.map.offset.x = now / 60000 * (i % 2 ? 1 : -1); });
      if (!aurDropped && aurT > 2.5) { aurDropped = true; const g = window.FinSave ? FinSave.auroraGift() : null;   // 一定會掉東西
        if (mode === "town" || mode === "street") { shard = { m: new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: "#ffe9a8" })), t: 0, g }; shard.m.position.set(av.position.x + 2, 60, av.position.z + 2); scene.add(shard.m); }
        else if (g) toast(auroraMsg(g)); }
      if (aurT > AUR_LEN) { aurT = -1; aur.visible = false; } }
    if (shard) { shard.t += dt; const k = Math.min(1, shard.t / 2.2); shard.m.position.y = 60 - 59 * (1 - (1 - k) ** 2); shard.m.rotation.y += dt * 6; if (k >= 1) { shard.m.scale.multiplyScalar(0.9); if (shard.m.scale.x < 0.05) { scene.remove(shard.m); if (shard.g) toast(auroraMsg(shard.g)); shard = null; } } }
  });
  ui();
  $("#loading").hidden = true;
  window.__sleSnap = () => { try { if (composer) composer.render(); else renderer.render(scene, camera); const c = renderer.domElement;   // 熊 FIN-U61：遊戲在城市裡也能拍照
      return { url: c.toDataURL("image/jpeg", 0.9), w: c.width, h: c.height, place: $("#place") ? $("#place").textContent : "" }; } catch (e) { return null; } };
  window.__cityx = { tap: (i) => cxLamps ? cxLamps.tap(i, null) : null, done: () => !!(cxLamps && cxLamps.done), pos: (i) => cxLamps ? cxLamps.pos(i).toArray().map((v) => +v.toFixed(2)) : null, guide: () => [gEl.classList.contains("on"), gEl.querySelector("span").textContent, gaEl.style.rotate] };
  window.__pvCity = () => pvm ? pvm.dbg() : null; window.__pvTest = (k) => pvm ? JSON.stringify(pvm.test[k](av.position)) : null;
  window.__sleCity = { tp: (x, z) => { av.position.set(x, av.position.y, z); walkTo = null; return 1; }, street: () => { seq = null; enterStreet(); return mode; }, library: () => { seq = null; enterLibrary(); return mode; }, libQuiz: () => { guideDone(3); return games.quiz(); }, book: () => { openBook(); return 1; }, libRead: () => games.reading(), mode: () => mode, riding: () => !!seq, seq: () => seq && seq.kind, hour: hourNow, seg: () => segNow,
    look: (o, tg) => { Object.assign(want, o); Object.assign(view, o); if (tg) target.set(...tg); },
    walkTo: (x, z) => { walkTo = V(x, mode === "inside" ? lib.O.y : 0.12, z); detourTo = null; detours = 0; }, door: () => [plaza.doorPos.x, plaza.doorPos.z], lib: () => [lib.O.x, lib.exitZ],
    av: () => [av.position.x, av.position.y, av.position.z], finds: () => finds.debug(), dropNow: () => finds.dropNow(), paused: () => paused, fx: () => !!composer, setView: (v) => { rideView = v; ui(); }, skip: () => { if (seq && seq.kind === "ride") seq.t = seq.dur; }, peek: (i) => { peek = trains[i || 0]; setMode("peek"); } };
})();
