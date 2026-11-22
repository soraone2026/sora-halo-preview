/* 城市的建築：科幻高樓（玻璃帷幕、石材）＋老城區地標（紅磚鐘樓、石柱圖書館、拱門、銅綠圓頂），
 * 書房所在的小鎮，以及可以走進去的舊城圖書館內部。單位是公尺。 */
import { makePerson, makeCrowd, sit } from "./city-people.js";

/* ---------- 立面貼圖：窗戶自然的亮度（暖、白、冷混合，亮的比例低），有些窗裡有淡淡的人影或窗簾 ---------- */
function facade(ctx, kind) {
  const { canvasTex, rnd } = ctx, CW = 16, COLS = 8, ROWS = 16;
  const lit = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) lit.push(rnd() < 0.2 ? (rnd() < 0.55 ? 0 : rnd() < 0.7 ? 1 : 2) : -1);
  const map = canvasTex(CW * COLS, CW * ROWS, (g, w, h) => {
    if (kind === "glass") {
      g.fillStyle = "#b9c1ca"; g.fillRect(0, 0, w, h);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const x = c * CW + 1, y = r * CW + 2, gr = g.createLinearGradient(x, y, x + CW, y + CW);
        gr.addColorStop(0, "#41566f"); gr.addColorStop(0.5, "#2a3a50"); gr.addColorStop(1, "#5a7290");
        g.fillStyle = gr; g.fillRect(x, y, CW - 2, CW - 3);
      }
    } else {
      g.fillStyle = kind === "brick" ? "#8a4a36" : "#cfc6b8"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "255,255,255" : "0,0,0"},${rnd() * .06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
      for (let r = 0; r < ROWS; r++) { g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(0, r * CW + CW - 2, w, 2); }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.fillStyle = "#2c3036"; g.fillRect(c * CW + 4, r * CW + 3, CW - 8, CW - 6); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(c * CW + 4, r * CW + 3, CW - 8, 1); }
    }
  });
  const TEMP = ["#b08458", "#c9bba0", "#8fa2b8"];   // 暖黃、白、冷白（都偏暗，晚上看起來自然）
  const em = canvasTex(CW * COLS, CW * ROWS, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    lit.forEach((k, i) => {
      if (k < 0) return;
      const r = (i / COLS) | 0, c = i % COLS, pad = kind === "glass" ? 1 : 4, x = c * CW + pad, y = r * CW + (kind === "glass" ? 2 : 3), ww = CW - pad * 2, hh = CW - (kind === "glass" ? 3 : 6);
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, TEMP[k]); gr.addColorStop(1, "#3a3028");
      g.globalAlpha = 0.55 + rnd() * 0.45; g.fillStyle = gr; g.fillRect(x, y, ww, hh); g.globalAlpha = 1;
      const roll = rnd();
      if (roll < 0.3) {   // 淡淡的人影：頭＋肩膀
        g.fillStyle = "rgba(0,0,0,.45)"; const sx = x + ww * (0.25 + rnd() * 0.5);
        g.beginPath(); g.arc(sx, y + hh * 0.45, ww * 0.12, 0, 7); g.fill(); g.fillRect(sx - ww * 0.2, y + hh * 0.6, ww * 0.4, hh * 0.4);
      } else if (roll < 0.55) {   // 半拉的窗簾
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y, ww * (0.3 + rnd() * 0.3), hh);
      }
    });
  });
  return { map, em };
}

/* ---------- 科幻高樓 ---------- */
export function buildSkyline(ctx) {
  const { THREE, scene, rnd, C, glow } = ctx;
  const mats = [], tops = [];
  const F = { glass: facade(ctx, "glass"), stone: facade(ctx, "stone"), glass2: facade(ctx, "glass"), stone2: facade(ctx, "stone") };
  function cls(n, floors, width, f, glassy) {
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 16, uv.getY(i) * floors / 16);
    const mat = glassy ? new THREE.MeshPhysicalMaterial({ map: f.map, emissiveMap: f.em, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.18, metalness: 0.55, clearcoat: 0.6, envMapIntensity: 1.1 })
      : new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.em, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.85, metalness: 0.05 });
    mats.push(mat);
    const im = new THREE.InstancedMesh(geo, mat, n); im.count = 0; scene.add(im); return im;
  }
  const K = { low: cls(500, 6, 14, F.stone, false), mid: cls(320, 18, 22, F.stone2, false), high: cls(180, 46, 28, F.glass, true), tower: cls(50, 100, 34, F.glass2, true) };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const TINT = { low: ["#e8e2d8", "#d8d0c4", "#f0ebe2", "#c9c2b6"], mid: ["#e2ddd5", "#cfd4da", "#d9d2c6"], high: ["#ffffff", "#e6eef6", "#dfe6ee"], tower: ["#ffffff", "#eef3f8"] };
  function put(kind, x, z, w, d, h) {
    const im = K[kind]; if (im.count >= im.instanceMatrix.count) return;
    q.setFromAxisAngle(up, (rnd() < 0.5 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.08);
    im.setMatrixAt(im.count, m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(w, h, d)));
    im.setColorAt(im.count, col.set(TINT[kind][(rnd() * TINT[kind].length) | 0])); im.count++;
    if (h > 90) tops.push(new THREE.Vector3(x, h + 2, z));
  }
  for (let i = 0; i < (ctx.SMALL ? 650 : 900); i++) {
    const a = rnd() * Math.PI * 2, r = 82 + Math.sqrt(rnd()) * 210, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r;
    if (Math.abs(x - C.x) < 10 || Math.abs(r - 170) < 10 || Math.abs(r - 115) < 7) continue;
    const core = 1 - (r - 82) / 210, h = 12 + Math.pow(core, 2.4) * 270 * (0.35 + rnd() * 0.9);
    put(h > 140 ? "tower" : h > 60 ? "high" : h > 26 ? "mid" : "low", x, z, 10 + rnd() * (h > 80 ? 16 : 10), 10 + rnd() * 10, h);
  }
  for (let i = 0; i < 220; i++) { const x = (rnd() - 0.5) * 520, z = -150 - rnd() * 140; if (Math.abs(x) < 14) continue; put("low", x, z, 8 + rnd() * 8, 8 + rnd() * 8, 8 + rnd() * 18); }
  Object.values(K).forEach(im => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  // 科幻：發光冠環、紅色警示燈、玻璃空橋
  const crowns = [];
  tops.slice(0, 14).forEach((p, i) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(10 + (i % 3) * 3, 0.5, 8, 48), glow(i % 2 ? "#8fe6ff" : "#ffd59a")); ring.rotation.x = Math.PI / 2; ring.position.copy(p).add(new THREE.Vector3(0, -6 - (i % 4) * 8, 0)); scene.add(ring); crowns.push(ring); });
  const beacon = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: "#ff3a2a", fog: false }), Math.max(1, tops.length));
  tops.forEach((p, i) => beacon.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z))); beacon.count = tops.length; scene.add(beacon);
  const bridgeMat = new THREE.MeshPhysicalMaterial({ color: "#cfe9ff", transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.1, emissive: "#5fb8ff", emissiveIntensity: 0.1 });
  for (let i = 0; i + 1 < Math.min(tops.length, 12); i += 2) {
    const a = tops[i], b = tops[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z); if (len > 120) continue;
    const br = new THREE.Mesh(new THREE.BoxGeometry(len, 4, 6), bridgeMat); br.position.set((a.x + b.x) / 2, Math.min(a.y, b.y) * 0.6, (a.z + b.z) / 2); br.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(br);
  }
  return { mats, crowns, beacon };
}

/* ---------- 書房所在的小鎮 ---------- */
// 小鎮的道路（熊 2026-11-14：房子、樹不能長在路上；路要延伸出去）：[中心 x, 中心 z, 寬, 長]
export const TOWN_ROADS = [[0, -80, 10, 560], [0, 0, 600, 8], [-40, 55, 8, 130], [40, 55, 8, 130], [0, 120, 300, 8]];
export const onRoad = (x, z, m = 0) => TOWN_ROADS.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + m && Math.abs(z - cz) < d / 2 + m);
export function buildTown(ctx) {
  const { THREE, scene, rnd, glow, canvasTex } = ctx;
  const town = new THREE.Group(); scene.add(town);
  const lots = [];   // 已經蓋了房子的地（樹不種在這裡）
  const taken = (x, z, m) => lots.some(([lx, lz, r]) => Math.hypot(x - lx, z - lz) < r + m);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  const winWarm = new THREE.MeshStandardMaterial({ color: "#2e2a24", emissive: "#e8c48e", emissiveIntensity: 0, roughness: 0.3 });
  const plaster = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  // 熊 2026-11-14：和遊戲裡家門口的小鎮同一個樣子——三角屋頂（山牆）、同一組牆色和屋頂色、門、灰藍窗、有的有煙囪
  const WALLS = ["#f2e6d8", "#dfe8e3", "#e8dccd", "#d9e2ec", "#f3d9cf", "#ece4c8", "#e3dbe8"], ROOFS = ["#4a4d55", "#8a4b3a", "#5b6b5e", "#6a5a4e"], DOORS = ["#6b4a34", "#2f4a5e", "#7a2f2f", "#3e5a3a"];
  const winGrey = M("#7d8d99", { roughness: 0.25, metalness: 0.3 }), trimW = M("#f7f5f0");
  function house(x, z, w, d, h, wall, roofC, ry, ci = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; town.add(g);
    const wm = new THREE.MeshStandardMaterial({ color: wall, map: plaster, roughness: 0.9 }), rm = M(roofC, { roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); body.position.y = h / 2; g.add(body);
    const rh = w * 0.42, sl = Math.hypot(w / 2, rh) + 0.3, an = Math.atan2(rh, w / 2);
    for (const sg of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(sl, 0.2, d + 0.5), rm); r.position.set(sg * w / 4, h + rh / 2, 0); r.rotation.z = -sg * an; g.add(r); }
    const gab = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rh)]);
    const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gab, { depth: d, bevelEnabled: false }), wm); gm.position.set(0, h, -d / 2); g.add(gm);
    const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 0.42, 0.1), M(DOORS[ci % 4])); door.position.set(-w * 0.22, h * 0.21, d / 2 + 0.04); g.add(door);
    for (const [wx, wy] of [[w * 0.2, h * 0.3], [-w * 0.22, h * 0.72], [w * 0.2, h * 0.72]]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.17, h * 0.17), rnd() < 0.5 ? winWarm : winGrey); win.position.set(wx, wy, d / 2 + 0.06); g.add(win);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(w * 0.19, 0.12, 0.12), trimW); sill.position.set(wx, wy - h * 0.09, d / 2 + 0.08); g.add(sill); }
    if (ci % 3 === 0) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), rm); ch.position.set(w * 0.25, h + rh * 0.65, -d * 0.2); g.add(ch); }
    return g;
  }
  // 玩家的家：和遊戲裡的家同樣的樣子（白牆、淺灰的陡斜屋頂、橘棕色的門、灰藍窗），上面有「你的家」標示和往下的箭頭，搭捷運也看得到（熊 2026-11-14）
  const myHouse = new THREE.Group(); myHouse.position.set(-12, 0, 14); myHouse.rotation.y = Math.PI / 2; town.add(myHouse); lots.push([-12, 14, 8]);   // 在主要道路旁邊、面向馬路
  { const HW = 8, HD = 9, HH = 10.5, wallM = new THREE.MeshStandardMaterial({ color: "#f2f0eb", map: plaster, roughness: 0.9 }), roofM = M("#d9d6cf", { roughness: 0.7 }), trim = M("#3a3d44");
    const body = new THREE.Mesh(new THREE.BoxGeometry(HW, HH, HD), wallM); body.position.y = HH / 2; myHouse.add(body);
    const gab = new THREE.Shape(); gab.moveTo(-HW / 2, 0); gab.lineTo(0, 3.6); gab.lineTo(HW / 2, 0); gab.closePath();
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gab, { depth: HD, bevelEnabled: false }), wallM); gable.position.set(0, HH, -HD / 2); myHouse.add(gable);
    const sl = Math.hypot(HW / 2, 3.6) + 0.5, an = Math.atan2(3.6, HW / 2);
    for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(sl, 0.3, HD + 0.8), roofM); r.position.set(sx * HW / 4, HH + 1.85, 0); r.rotation.z = -sx * an; myHouse.add(r);
      const e = new THREE.Mesh(new THREE.BoxGeometry(sl, 0.12, 0.12), trim); e.position.set(sx * HW / 4, HH + 1.68, HD / 2 + 0.42); e.rotation.z = -sx * an; myHouse.add(e); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.8, 0.15), M("#b8743e")); door.position.set(-1.4, 1.4, HD / 2 + 0.05); myHouse.add(door);
    for (const [wx, wy] of [[1.9, 2.4], [-1.9, 6.6], [1.9, 6.6], [0, 11.6]]) { const fr = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 0.12), trim); fr.position.set(wx, wy, HD / 2 + 0.04); myHouse.add(fr);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.85), winWarm); gl.position.set(wx, wy, HD / 2 + 0.11); myHouse.add(gl); }
    // 熊 2026-11-14：標示只要一個三角形；不要圖示、不要底色——半透明銀灰的泡泡感
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 3), new THREE.MeshStandardMaterial({ color: "#e4e8ef", metalness: 0.55, roughness: 0.18, emissive: "#b9c2d0", emissiveIntensity: 0.45, transparent: true, opacity: 0.82, fog: false }));
    arrow.rotation.x = Math.PI; arrow.position.y = HH + 6.5; myHouse.add(arrow); myHouse.userData.arrow = arrow;
    if (false) { const tag = canvasTex(320, 96, (c, w, h) => {   // 熊 2026-11-14（FIN-U49）：「你的家 HOME」牌子拿掉，只留銀色三角形 const r = 40, gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(248,250,253,.62)"); gr.addColorStop(0.55, "rgba(206,212,224,.42)"); gr.addColorStop(1, "rgba(178,186,201,.5)");
      c.beginPath(); c.roundRect(6, 8, w - 12, h - 16, r); c.fillStyle = gr; c.fill(); c.lineWidth = 2.5; c.strokeStyle = "rgba(255,255,255,.85)"; c.stroke();
      const hl = c.createLinearGradient(0, 10, 0, h / 2); hl.addColorStop(0, "rgba(255,255,255,.75)"); hl.addColorStop(1, "rgba(255,255,255,0)"); c.beginPath(); c.roundRect(20, 13, w - 40, h / 2 - 12, 24); c.fillStyle = hl; c.fill();
      c.fillStyle = "#3a404c"; c.font = "bold 34px sans-serif"; c.textAlign = "center"; c.fillText("你的家 HOME", w / 2, h / 2 + 12); });
    const tagS = new THREE.Sprite(new THREE.SpriteMaterial({ map: tag, depthTest: false, fog: false, transparent: true })); tagS.scale.set(9, 2.7, 1); tagS.position.y = HH + 10.6; tagS.renderOrder = 5; myHouse.add(tagS); } }
  // 家旁邊和遊戲裡一樣：左邊是 Rose 阿姨家（前院有花），右邊再過去是 Café Sora
  house(-12, 29, 8.5, 8, 7, "#e8dccd", "#8a4b3a", Math.PI / 2, 3); lots.push([-12, 29, 7]);   // Rose 阿姨家：隔壁
  { const fl = [M("#f2a7c3"), M("#f6d36b")]; for (let k = 0; k < 10; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), fl[k % 2]); b.position.set(-6.8 - Math.floor(k / 5) * 1.1, 0.4, 25.5 + (k % 5) * 1.4); town.add(b); } }
  { const cafe = new THREE.Group(); cafe.position.set(-12.5, 0, -14); cafe.rotation.y = Math.PI / 2; town.add(cafe); lots.push([-12.5, -14, 8]);   // Café Sora：和遊戲裡一樣在家這一邊（熊 FIN-U49：對面不蓋房子，才不會擋住）
    const cb = new THREE.Mesh(new THREE.BoxGeometry(10, 5.5, 8), M("#f4efe6")); cb.position.y = 2.75; cafe.add(cb);
    const cr = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.5, 8.6), M("#4a4d55")); cr.position.y = 5.7; cafe.add(cr);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 1.8), M("#2f5b43")); aw.position.set(0, 3.6, 4.7); aw.rotation.x = 0.35; cafe.add(aw);
    const cs = canvasTex(256, 64, (c, w) => { c.fillStyle = "#2f5b43"; c.fillRect(0, 0, w, 64); c.fillStyle = "#f6efe0"; c.font = "bold 34px Georgia"; c.textAlign = "center"; c.fillText("Café Sora", w / 2, 44); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: cs })); sg.position.set(0, 4.7, 4.02); cafe.add(sg);
    const gw = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4), winWarm); gw.position.set(0, 1.6, 4.02); cafe.add(gw); }
  // 麵包店、超市（FIN-U49）：在主要道路的另一邊，和遊戲裡一樣有條紋遮陽棚
  const store = (x, z, ry, w, label, wall, awn) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; town.add(g); lots.push([x, z, w * 0.7]);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 5.4, 7), M(wall)); b.position.y = 2.7; g.add(b); const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, 7.5), M("#4a4d55")); rf.position.y = 5.6; g.add(rf);
    const st = canvasTex(128, 32, (c, cw, ch) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? "#ffffff" : awn; c.fillRect(k * cw / 8, 0, cw / 8, ch); } });
    const aw = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.15, 1.8), new THREE.MeshStandardMaterial({ map: st, roughness: 0.8 })); aw.position.set(0, 3.6, 4.2); aw.rotation.x = 0.32; g.add(aw);
    const sg = canvasTex(512, 128, (c, cw) => { c.fillStyle = "#fffaf0"; c.fillRect(0, 0, cw, 128); c.fillStyle = awn; c.font = "bold 66px Georgia, serif"; c.textAlign = "center"; c.fillText(label, cw / 2, 86); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, w * 0.18), new THREE.MeshBasicMaterial({ map: sg })); sm.position.set(0, 4.6, 3.52); g.add(sm);
    const gw = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, 2.2), winWarm); gw.position.set(w * 0.1, 1.6, 3.52); g.add(gw); };
  store(12.5, -30, -Math.PI / 2, 9, "BAKERY", "#f6e7d2", "#c0703a"); store(12.5, -46, -Math.PI / 2, 10, "SUPERMARKET", "#e3eef2", "#3f8f6a");
  // 房子排成一排一排、面向馬路（熊 2026-11-14：小鎮配置要和遊戲裡家門口一樣，不要亂撒）
  { let n = 0; const MAX = ctx.SMALL ? 56 : 90;
    const put = (x, z, ry) => { if (n >= MAX) return; const w = 7 + (n % 3) * 1.2, d = 6 + (n % 2), r = Math.hypot(w, d) / 2;
      if (onRoad(x, z, r + 1) || taken(x, z, r + 0.5) || (x > 40 && x < 90 && z > -50 && z < 5) || (x < -1 && x > -24 && z > -24 && z < -4) || (x > 1 && x < 24 && z > -22 && z < -6)) return;   // 咖啡廳和它對面留空
      house(x, z, w, d, 5.6 + (n % 3) * 0.9, WALLS[n % WALLS.length], ROOFS[(n * 3) % ROOFS.length], ry, n); lots.push([x, z, r]); n++; };
    for (let z = 44; z >= -110; z -= 15) { put(-12, z, Math.PI / 2); put(12.5, z, -Math.PI / 2); }   // 主要道路兩邊
    for (let k = 1; k <= 7; k++) for (const sx of [-1, 1]) { const x = sx * (12 + k * 14); put(x, -11, 0); put(x, 11, Math.PI); }   // 橫的大路兩邊
    for (const rx of [-40, 40]) for (let z = 22; z <= 112; z += 15) { put(rx - 11, z, Math.PI / 2); put(rx + 11, z, -Math.PI / 2); }
    for (let x = -130; x <= 130; x += 15) { put(x, 109, Math.PI); put(x, 131, 0); } }
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), M("#5a4030"), 260);
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 12, 9), M("#5f9e45"), 260);   // 圓圓的樹（和家門口的小鎮一樣）
  for (let i = 0; i < 260; i++) {
    const x = (rnd() - 0.5) * 260, z = 70 - rnd() * 200, s = onRoad(x, z, 3) || taken(x, z, 2.5) || (x > -62 && x < -8 && z > 25 && z < 58) || (x > 50 && x < 74 && z > -50 && z < -6) ? 0 : 0.7 + rnd() * 0.8;   // 樹不種在路上、房子上、車站下
    trunk.setMatrixAt(i, m4.compose(V(x, 1.5 * s, z), q0, V(s, s, s))); crown.setMatrixAt(i, m4.compose(V(x, 5.5 * s, z), q0, V(s, s, s)));
  }
  scene.add(trunk, crown);
  const lampMat = new THREE.MeshBasicMaterial({ color: "#ffd59a", fog: false, transparent: true });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 8, 6), lampMat, 60);
  for (let i = 0; i < 60; i++) lamps.setMatrixAt(i, m4.makeTranslation(i % 2 ? 6.5 : -6.5, 5, 40 - i * 7));
  scene.add(lamps);
  // 晴空站（高架月台；熊 2026-11-14：改名）
  const STATION = V(62, 10, -28);
  const stn = new THREE.Group(); stn.position.copy(STATION); scene.add(stn);
  const concrete = M("#c9ccd2", { roughness: 0.75 });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 40), concrete); platform.position.y = -0.5; stn.add(platform);
  for (const pz of [-15, 0, 15]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, STATION.y, 10), concrete); leg.position.set(-3, -STATION.y / 2, pz); stn.add(leg); }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 30), new THREE.MeshPhysicalMaterial({ color: "#f2f4f6", transparent: true, opacity: 0.7, roughness: 0.1 })); canopy.position.set(-2, 6, 0); stn.add(canopy);
  const sign = canvasTex(256, 64, (g, w) => { g.fillStyle = "#1d3a6b"; g.fillRect(0, 0, w, 64); g.fillStyle = "#fff"; g.font = "bold 26px sans-serif"; g.textAlign = "center"; g.fillText("✦ LUMEN  Line A", w / 2, 42); });   // 熊 2026-11-14：兩條線——書房這邊是 LUMEN（A 線）
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: sign, fog: false })); signM.position.set(-2, 4.5, 15.2); stn.add(signM);
  // 家這邊的 ASTRALIS 站（S 線，星門線）：在小鎮西邊，紫色的燈
  const STATION2 = V(-125, 12, 60);
  { const s2 = new THREE.Group(); s2.position.copy(STATION2); scene.add(s2);
    const pf = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 40), concrete); pf.position.y = -0.5; s2.add(pf);
    for (const pz of [-15, 0, 15]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, STATION2.y, 10), concrete); leg.position.set(3, -STATION2.y / 2, pz); s2.add(leg); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(7, 0.35, 8, 48, Math.PI), glow("#b48cff")); arch.position.set(0, 0, 18); s2.add(arch);   // 星門一樣的拱
    const sg2 = canvasTex(256, 64, (g, w) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#3b1d6b"); gr.addColorStop(1, "#1d2a6b"); g.fillStyle = gr; g.fillRect(0, 0, w, 64); g.fillStyle = "#fff"; g.font = "bold 26px sans-serif"; g.textAlign = "center"; g.fillText("✦ ASTRALIS  Line S", w / 2, 42); });
    const sm2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: sg2, fog: false })); sm2.position.set(2, 4.5, 15.2); s2.add(sm2); }
  // S 線沿途的景（和 A 線不一樣）：一座湖、湖邊的森林、會發光的水晶塔
  { const lake = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ color: "#5aa6d6", roughness: 0.08, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -3 })); lake.rotation.x = -Math.PI / 2; lake.position.set(-205, 0.12, -110); lake.scale.y = 0.7; scene.add(lake);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 2, 24), M("#7d9f5c")); isl.position.set(-200, 0.6, -105); scene.add(isl);
    const crys = new THREE.MeshStandardMaterial({ color: "#c9b8ff", emissive: "#8f6bff", emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85 });
    for (let k = 0; k < 9; k++) { const h = 18 + rnd() * 40, c = new THREE.Mesh(new THREE.ConeGeometry(2.5 + rnd() * 2, h, 6), crys); c.position.set(-235 + rnd() * 40, h / 2, -230 - rnd() * 60); c.rotation.z = (rnd() - 0.5) * 0.3; scene.add(c); }
    lots.push([-205, -110, 72], [-235, -250, 40]); }
  // 小鎮的路人
  const crowd = makeCrowd(THREE, scene, ctx.SMALL ? 10 : 18, () => V((rnd() < 0.5 ? -1 : 1) * (2 + rnd() * 3), 0, 50 - rnd() * 200), rnd);
  return { myHouse, winWarm, lampMat, STATION, STATION2, crowd, crown };
}

/* ---------- 老城區廣場（市中心地面）：紅磚鐘樓、石柱圖書館、拱門、銅綠圓頂、噴泉、老街商店 ---------- */
export function buildPlaza(ctx) {
  const { THREE, scene, rnd, C, canvasTex, glow } = ctx;
  const g = new THREE.Group(); g.position.copy(C); scene.add(g);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const solids = [];   // 鏡頭不能穿過去的建築（鏡頭碰撞用）
  const tex = (w, h, paint, rep = [1, 1]) => { const t = canvasTex(w, h, paint); t.repeat.set(...rep); return t; };
  const paving = tex(256, 256, (c, w, h) => { c.fillStyle = "#a59c90"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 0 : 16; x < w; x += 32) { const v = 138 + rnd() * 34; c.fillStyle = `rgb(${v + 8 | 0},${v + 2 | 0},${v - 8 | 0})`; c.fillRect(x + 1, y + 1, 30, 30); } /* 石板：同一個色系、深淺不同 */ }, [14, 14]);
  const brick = tex(256, 256, (c, w, h) => { c.fillStyle = "#c7bfb2"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) { c.fillStyle = `rgb(${130 + rnd() * 40},${60 + rnd() * 20},${45 + rnd() * 15})`; c.fillRect(x + 1, y + 1, 30, 14); } }, [2, 4]);
  const stoneT = tex(256, 256, (c, w, h) => { c.fillStyle = "#d8d0c0"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 40) { c.fillStyle = "rgba(90,80,60,.25)"; c.fillRect(0, y, w, 2); for (let x = (y / 40) % 2 ? 30 : 0; x < w; x += 60) c.fillRect(x, y, 2, 40); }
    for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(${rnd() < .5 ? "255,255,255" : "60,50,40"},${rnd() * .08})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); } }, [3, 2]);
  const S = (map, o = {}) => new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 3, roughness: 0.9, ...o });   // 用同一張貼圖當凹凸：縫是凹下去的
  const stone = S(stoneT), brickM = S(brick), copper = new THREE.MeshStandardMaterial({ color: "#5f9e8a", roughness: 0.55, metalness: 0.35 });
  const floor = add(new THREE.CircleGeometry(80, 64), S(paving, { roughness: 0.95, bumpScale: 2 }), 0, 0.12, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false; floor.userData.noShadow = true; floor.receiveShadow = true;
  const colliders = [];   // 走路不能穿過去的地方（廣場座標）：圓形 [x, z, 半徑]，或長方形 { x, z, hw, hd, rot }
  const box = (grp, hw, hd, lx = 0, lz = 0) => { const c = grp.localToWorld(V(lx, 0, lz)); colliders.push({ x: c.x - C.x, z: c.z - C.z, hw, hd, rot: grp.rotation.y }); };
  // 噴泉
  add(new THREE.CylinderGeometry(7, 7.4, 0.9, 40), stone, 0, 0.45, 20); colliders.push([0, 20, 7.6]);
  const water = add(new THREE.CircleGeometry(6.4, 40), new THREE.MeshPhysicalMaterial({ color: "#4a7f9a", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.9, emissive: "#3a6f8f", emissiveIntensity: 0 }), 0, 0.85, 20); water.rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(0.6, 0.9, 3.5, 16), stone, 0, 1.8, 20); add(new THREE.SphereGeometry(1, 16, 12), copper, 0, 3.8, 20);
  // 紅磚鐘樓
  const tower = new THREE.Group(); tower.position.set(-42, 0, -28); g.add(tower); solids.push(tower); colliders.push({ x: -42, z: -28, hw: 5.6, hd: 5.6, rot: 0 });
  add(new THREE.BoxGeometry(10, 36, 10), brickM, 0, 18, 0, tower);
  [6, 18, 30].forEach(y => add(new THREE.BoxGeometry(10.8, 0.8, 10.8), stone, 0, y, 0, tower));
  add(new THREE.BoxGeometry(12, 9, 12), stone, 0, 40.5, 0, tower);
  const faceTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#f4ead2"; c.beginPath(); c.arc(w / 2, h / 2, 120, 0, 7); c.fill(); c.strokeStyle = "#2a2018"; c.lineWidth = 6; c.stroke();
    c.fillStyle = "#2a2018"; c.font = "bold 26px Georgia"; c.textAlign = "center"; c.textBaseline = "middle"; ["XII", "III", "VI", "IX"].forEach((t, k) => { const a = k / 4 * Math.PI * 2 - Math.PI / 2; c.fillText(t, w / 2 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92); }); });
  const clockMat = new THREE.MeshStandardMaterial({ map: faceTex, emissive: "#ffe6b0", emissiveMap: faceTex, emissiveIntensity: 0, roughness: 0.6 });
  const hands = [];
  for (const [rx, x, z] of [[0, 0, 6.02], [Math.PI, 0, -6.02], [Math.PI / 2, 6.02, 0], [-Math.PI / 2, -6.02, 0]]) {
    const f = new THREE.Group(); f.position.set(x, 40.5, z); f.rotation.y = rx; tower.add(f);
    add(new THREE.CircleGeometry(3.6, 40), clockMat, 0, 0, 0, f);
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2, 0.1), new THREE.MeshStandardMaterial({ color: "#1d1d1f" })); hh.geometry.translate(0, 1, 0); hh.position.z = 0.08; f.add(hh);
    const mm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3, 0.1), new THREE.MeshStandardMaterial({ color: "#1d1d1f" })); mm.geometry.translate(0, 1.5, 0); mm.position.z = 0.1; f.add(mm);
    hands.push([hh, mm]);
  }
  add(new THREE.ConeGeometry(9, 14, 4), copper, 0, 52, 0, tower).rotation.y = Math.PI / 4;
  add(new THREE.SphereGeometry(0.6, 10, 8), glow("#ffd27a"), 0, 59.5, 0, tower);
  // 石柱圖書館（可以走進去）
  const lib = new THREE.Group(); lib.position.set(36, 0, -34); lib.rotation.y = Math.atan2(-36, 34); g.add(lib); solids.push(lib);   // 正面朝廣場中心
  add(new THREE.BoxGeometry(34, 14, 22), stone, 0, 7, -4, lib);
  for (let s = 0; s < 3; s++) add(new THREE.BoxGeometry(30 - s * 1.5, 0.6, 4 - s * 1.2), stone, 0, 0.3 + s * 0.6, 10.5 - s * 0.6, lib);
  for (let i = 0; i < 8; i++) { add(new THREE.CylinderGeometry(0.75, 0.85, 11, 16), stone, -12.6 + i * 3.6, 7.3, 8.5, lib); add(new THREE.BoxGeometry(2, 0.6, 2), stone, -12.6 + i * 3.6, 12.9, 8.5, lib); }
  add(new THREE.BoxGeometry(30, 1.4, 4), stone, 0, 13.8, 8.2, lib);
  const ped = new THREE.Shape(); ped.moveTo(-15, 0); ped.lineTo(15, 0); ped.lineTo(0, 5); ped.lineTo(-15, 0);
  add(new THREE.ExtrudeGeometry(ped, { depth: 3, bevelEnabled: false }), stone, 0, 14.5, 6.6, lib);
  add(new THREE.BoxGeometry(3.6, 6, 0.4), new THREE.MeshStandardMaterial({ color: "#4a2e1c", roughness: 0.6 }), 0, 3, 7.05, lib);
  const doorLight = add(new THREE.PlaneGeometry(3.2, 5.6), new THREE.MeshStandardMaterial({ color: "#3a2a1c", emissive: "#ffcf8a", emissiveIntensity: 0 }), 0, 3, 7.3, lib);
  const libSign = canvasTex(512, 64, (c, w) => { c.fillStyle = "#d8d0c0"; c.fillRect(0, 0, w, 64); c.fillStyle = "#3a2e22"; c.font = "bold 30px Georgia"; c.textAlign = "center"; c.fillText("OLD TOWN LIBRARY · 舊城圖書館", w / 2, 42); });
  add(new THREE.PlaneGeometry(20, 2.5), new THREE.MeshStandardMaterial({ map: libSign, roughness: 0.8 }), 0, 15.2, 9.75, lib);
  g.updateMatrixWorld(true);
  const doorPos = lib.localToWorld(V(0, 0, 11.5));
  box(lib, 17.4, 11.4, 0, -4);   // 長方形碰撞：建築本體；前面的台階走得上去
  for (let i = 0; i < 8; i++) if (i !== 3 && i !== 4) { const c = lib.localToWorld(V(-12.6 + i * 3.6, 0, 8.5)); colliders.push([c.x - C.x, c.z - C.z, 0.9]); }   // 石柱（門前兩根留給走進去）
  // 石造拱門（廣場南邊的入口）
  for (const sx of [-6, 6]) { solids.push(add(new THREE.BoxGeometry(2.6, 12, 2.6), stone, sx, 6, 66)); colliders.push({ x: sx, z: 66, hw: 1.5, hd: 1.5, rot: 0 }); }
  solids.push(add(new THREE.TorusGeometry(6, 1.2, 10, 24, Math.PI), stone, 0, 12, 66));
  solids.push(add(new THREE.BoxGeometry(16, 2, 3), stone, 0, 18.5, 66));
  // 銅綠圓頂大廳
  const hall = new THREE.Group(); hall.position.set(-48, 0, 34); g.add(hall); solids.push(hall); colliders.push([-48, 34, 13.4]);
  add(new THREE.CylinderGeometry(12, 12.5, 12, 32), stone, 0, 6, 0, hall);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.5, 0.5, 10, 10), stone, Math.cos(a) * 12.8, 5, Math.sin(a) * 12.8, hall); }
  add(new THREE.SphereGeometry(11.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), copper, 0, 12, 0, hall);
  add(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), stone, 0, 24, 0, hall); add(new THREE.ConeGeometry(1.8, 3, 12), copper, 0, 27, 0, hall);
  // 老街商店（廣場東南邊的弧形）
  const shopWin = [];
  const PLAS = ["#e9d8c0", "#d9c2a8", "#c9d4cc", "#e6cfc9", "#d8d0e2"], AWN = ["#a33a2e", "#2f5b43", "#2b3f7a", "#c9a24e", "#6a3a5a"];
  for (let i = 0; i < 8; i++) {
    const a = 0.25 + i * 0.16, r = 60, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = -a - Math.PI / 2; g.add(s); solids.push(s); g.updateMatrixWorld(true); box(s, 3.9, 3.6);
    const h = 8 + (i % 3) * 2;
    add(new THREE.BoxGeometry(7.5, h, 7), i % 3 === 1 ? brickM : new THREE.MeshStandardMaterial({ color: PLAS[i % 5], roughness: 0.9 }), 0, h / 2, 0, s);
    // 熊 FIN-U58：每一家都有門和櫥窗，招牌、櫥窗裡的東西都不一樣
    const KIND = [["花店", "FLOWERS", "#e98fb5"], ["舊書", "BOOKS", "#7a2f3a"], ["茶館", "TEA", "#3f6b55"], ["鐘錶", "CLOCKS", "#c9a24e"], ["帽子", "HATS", "#2b3f7a"], ["糖果", "SWEETS", "#e0457b"], ["古董", "ANTIQUES", "#6a3a5a"], ["樂器", "MUSIC", "#a33a2e"]][i];
    const dx = i % 2 ? 2.2 : -2.2, wx = -dx * 0.55;
    const sw = add(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshStandardMaterial({ color: "#2b2620", emissive: "#e8c28a", emissiveIntensity: 0, roughness: 0.2, metalness: 0.3 }), wx, 1.75, 3.52, s); shopWin.push(sw.material);
    add(new THREE.BoxGeometry(3.8, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: "#4a3a2a" }), wx, 0.52, 3.56, s); add(new THREE.BoxGeometry(3.8, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: "#4a3a2a" }), wx, 2.98, 3.56, s);
    const doorM = new THREE.MeshStandardMaterial({ color: ["#5a3a24", "#2f4b7a", "#3f6b55", "#7a2f3a"][i % 4], roughness: 0.6 });
    add(new THREE.BoxGeometry(1.3, 2.6, 0.12), doorM, dx, 1.3, 3.56, s); add(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshStandardMaterial({ color: "#2b2620", emissive: "#e8c28a", emissiveIntensity: 0.3 }), dx, 1.9, 3.63, s);
    add(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: "#d9b44a", metalness: 0.8, roughness: 0.3 }), dx + (i % 2 ? -0.45 : 0.45), 1.25, 3.66, s);
    for (let k = 0; k < 4; k++) { const it = add(i % 3 === 0 ? new THREE.SphereGeometry(0.18, 10, 8) : i % 3 === 1 ? new THREE.BoxGeometry(0.28, 0.4, 0.12) : new THREE.CylinderGeometry(0.14, 0.18, 0.36, 10), new THREE.MeshStandardMaterial({ color: [KIND[2], "#f2efe8", "#ffd75e", "#9fd0e6"][k], roughness: 0.5 }), wx - 1.2 + k * 0.8, 0.75 + (i % 3 === 0 ? 0.1 : 0.15), 3.6, s); it.castShadow = false; }
    const awning = add(new THREE.BoxGeometry(6.4, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: AWN[i % 5], roughness: 0.8 }), 0, 3.4, 4.3, s); awning.rotation.x = 0.35;
    { const st = canvasTex(256, 64, (c, w) => { c.fillStyle = "#f6efe2"; c.fillRect(0, 0, w, 64); c.strokeStyle = KIND[2]; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, 58); c.fillStyle = KIND[2]; c.font = "bold 26px Georgia, serif"; c.textAlign = "center"; c.fillText(KIND[0] + "  " + KIND[1], w / 2, 42); });
      add(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshStandardMaterial({ map: st, roughness: 0.8 }), 0, 4.55, 3.53, s); }
    for (const wx of [-2, 2]) add(new THREE.PlaneGeometry(1.4, 1.8), shopWin[shopWin.length - 1], wx, h - 2.6, 3.52, s);
  }
  // 舊式路燈、樹、長椅
  const lampGlass = new THREE.MeshStandardMaterial({ color: "#fff4dc", emissive: "#ffd18a", emissiveIntensity: 0.1 });
  const iron = new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.4, metalness: 0.6 });
  const lampLights = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, r = i % 2 ? 26 : 48, x = Math.cos(a) * r, z = Math.sin(a) * r;
    add(new THREE.CylinderGeometry(0.12, 0.18, 4.2, 8), iron, x, 2.1, z); add(new THREE.CylinderGeometry(0.35, 0.25, 0.8, 6), lampGlass, x, 4.6, z); colliders.push([x, z, 0.25]);   // FIN-U186（codex）：路燈也擋路
    if (i % 3 === 0 && lampLights.length < 5) { const pl = new THREE.PointLight("#ffcf8a", 0, 18, 2); pl.position.set(x, 4.6, z); g.add(pl); lampLights.push(pl); }
  }
  const leaf = new THREE.MeshStandardMaterial({ color: "#46703f", roughness: 0.9 }), bark = new THREE.MeshStandardMaterial({ color: "#5a4030", roughness: 1 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.13, x = Math.cos(a) * 37, z = Math.sin(a) * 37; add(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), bark, x, 1.5, z); add(new THREE.SphereGeometry(2.4, 12, 10), leaf, x, 4.6, z).scale.y = 1.15; colliders.push([x, z, 1]); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, x = Math.cos(a) * 31, z = Math.sin(a) * 31; const b = add(new THREE.BoxGeometry(2.4, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: "#7a5236", roughness: 0.7 }), x, 0.55, z); b.rotation.y = -a; colliders.push({ x, z, hw: 1.2, hd: 0.35, rot: -a }); }   // FIN-U186：長椅不能穿過去
  // 廣場上的路人
  const clear = (x, z, c, pad) => {
    if (Array.isArray(c)) return Math.hypot(x - c[0], z - c[1]) > c[2] + pad;
    const dx = x - c.x, dz = z - c.z, co = Math.cos(c.rot), si = Math.sin(c.rot);
    return Math.abs(dx * co - dz * si) > c.hw + pad || Math.abs(dx * si + dz * co) > c.hd + pad;   // 轉回建築自己的座標再比長寬
  };
  const free = (x, z, pad = 0.6) => colliders.every(c => clear(x, z, c, pad)) && Math.hypot(x, z) < 74;
  const pick = () => { for (let k = 0; k < 30; k++) { const a = rnd() * Math.PI * 2, r = 10 + rnd() * 62, x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z)) return V(x, 0.12, z); } return V(0, 0.12, 40); };
  const crowd = makeCrowd(THREE, g, ctx.SMALL ? 14 : 24, pick, rnd, (x, z) => free(x, z, 0.35));
  return { group: g, colliders, free, solids, doorPos, clockMat, hands, water, shopWin, lampGlass, lampLights, doorLight, crowd };
}

/* ---------- 舊城圖書館內部（放在地底下的另一個地方，走進門就移過去） ---------- */
export function buildLibraryInterior(ctx) {
  const { THREE, scene, rnd, canvasTex, glow } = ctx;
  const O = new THREE.Vector3(0, -400, 0);
  const g = new THREE.Group(); g.position.copy(O); scene.add(g);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const wood = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#7a4e30"; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, y, w, 2); for (let i = 0; i < 30; i++) { c.strokeStyle = `rgba(40,20,8,${rnd() * .2})`; c.beginPath(); const yy = y + rnd() * 30; c.moveTo(0, yy); c.lineTo(w, yy + (rnd() - .5) * 4); c.stroke(); } } }); wood.repeat.set(6, 8);
  const wallT = canvasTex(128, 128, (c, w, h) => { c.fillStyle = "#e4dccb"; c.fillRect(0, 0, w, h); for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(80,60,40,${rnd() * .06})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); } }); wallT.repeat.set(4, 2);
  const W = 30, D = 40, H = 12;
  const floor = add(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 }), 0, 0.03, 0); floor.rotation.x = -Math.PI / 2;   // 比牆盒的底面高一點，不會閃（熊 2026-11-14）
  const wallM = new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.95, side: THREE.BackSide });
  add(new THREE.BoxGeometry(W, H, D), wallM, 0, H / 2, 0);
  const ceil = add(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: "#d9cdb4", roughness: 1 }), 0, H - 0.06, 0); ceil.rotation.x = Math.PI / 2;
  const stoneC = new THREE.MeshStandardMaterial({ color: "#d4ccbc", roughness: 0.8 });
  for (const x of [-8, 8]) for (let z = -14; z <= 14; z += 7) add(new THREE.CylinderGeometry(0.7, 0.8, H, 16), stoneC, x, H / 2, z);
  // 書架：牆邊兩排高書架，書背顏色隨機
  // 熊 2026-11-14：書背上有書名（經典名著＋學習書，直的寫在書背上）
  const TITLES = ["Pride and Prejudice", "Moby-Dick", "Jane Eyre", "Little Women", "The Odyssey", "Hamlet", "Emma", "Dracula", "Walden", "Persuasion", "Frankenstein", "Sherlock Holmes", "Treasure Island", "Peter Pan", "Wuthering Heights", "Robinson Crusoe",
    "English Grammar", "Business Letters", "Word Power", "Daily Phrases", "World Atlas", "Star Charts", "History of Tea", "Selected Poems", "Ocean Life", "City Maps", "Learning Japanese", "German Basics", "Music Theory", "Economics 101", "The Mind", "Origin of Stars",
    "英文文法", "旅行會話", "星空圖鑑", "城市地圖", "經濟學入門", "詩選", "世界史", "植物圖鑑", "論語", "唐詩三百首", "西遊記", "紅樓夢", "日語五十音", "德語入門"];
  const books = canvasTex(2048, 512, (c, w, h) => { c.fillStyle = "#3a2416"; c.fillRect(0, 0, w, h); const P = ["#7a2f3a", "#2f4b7a", "#3f6b55", "#a8823f", "#4b4b58", "#e9e4da", "#8a4a36", "#1d1d1f", "#5a3a6b"];
    const RH = h / 4; let ti = (rnd() * TITLES.length) | 0;   // 熊 2026-11-14：書調小——貼圖 4 層、在書架上重複 3×4 次
    for (let row = 0; row < 4; row++) { const y = row * RH + 4, bh0 = RH - 16; let x = 2;
      while (x < w - 6) { const bw = 20 + rnd() * 24, bh = bh0 - rnd() * 14, col = P[(rnd() * P.length) | 0], light = col === "#e9e4da" || col === "#a8823f";
        c.fillStyle = col; c.fillRect(x, y + (bh0 - bh), bw - 2, bh); c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(x + 2, y + (bh0 - bh), 2, bh);
        c.fillStyle = light ? "rgba(60,40,20,.55)" : "rgba(242,214,140,.85)"; c.fillRect(x + 3, y + (bh0 - bh) + 8, bw - 8, 2); c.fillRect(x + 3, y + bh0 - 10, bw - 8, 2);   // 書背上下的金線
        if (bw > 23) { const tt = TITLES[ti++ % TITLES.length]; c.save(); c.translate(x + bw / 2, y + bh0 - 14); c.rotate(-Math.PI / 2); c.fillStyle = light ? "#3a2a1c" : "#f4ead2"; c.textAlign = "left"; let fs = Math.min(15, bw * 0.55) | 0; const room = bh - 22;   // 字太長先縮小字，最小 9px 還放不下才截斷
          do { c.font = `600 ${fs}px Georgia, "Noto Serif TC", serif`; } while (c.measureText(tt).width > room && --fs > 9);
          let s = tt; while (c.measureText(s).width > room && s.length > 3) s = s.slice(0, -1); if (s !== tt) s = s.slice(0, -1) + "…"; c.fillText(s, 0, fs * 0.35); c.restore(); }
        x += bw; }
      c.fillStyle = "#2a1a10"; c.fillRect(0, y + bh0, w, RH - bh0); } });
  books.anisotropy = 8; books.repeat.set(3, 4);
  const shelfM = new THREE.MeshStandardMaterial({ map: books, roughness: 0.8 });
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(1.2, 9, D - 6), shelfM, sx * (W / 2 - 0.7), 4.5, 0);
  // 閱讀桌、檯燈、讀者
  const tableM = new THREE.MeshStandardMaterial({ color: "#5a3a24", roughness: 0.45 });
  const lampM = new THREE.MeshStandardMaterial({ color: "#2f5b43", emissive: "#ffd59a", emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 });
  const readers = [];
  for (const z of [-9, 0, 9]) for (const x of [-4.5, 4.5]) {
    add(new THREE.BoxGeometry(4, 0.15, 2), tableM, x, 1.05, z); add(new THREE.BoxGeometry(0.2, 1, 0.2), tableM, x - 1.7, 0.5, z - 0.8); add(new THREE.BoxGeometry(0.2, 1, 0.2), tableM, x + 1.7, 0.5, z + 0.8);
    add(new THREE.CylinderGeometry(0.25, 0.1, 0.3, 12), lampM, x, 1.275, z);   // FIN-U186：檯燈放在桌面上（之前浮在半空）
    for (let k = 0, n = 2 + ((rnd() * 3) | 0); k < n; k++) { const bk = add(new THREE.BoxGeometry(0.5, 0.08, 0.36), new THREE.MeshStandardMaterial({ color: ["#7a2f3a", "#2f4b7a", "#3f6b55", "#c9a46a", "#5b5b66"][(rnd() * 5) | 0], roughness: 0.7 }), x + 0.9 + (k > 2 ? -1.6 : 0), 1.17 + (k % 3) * 0.085, z - 0.3); bk.rotation.y = (rnd() - 0.5) * 0.5; }   // 熊 FIN-U57：桌上放幾本書
    if (rnd() < 0.7) { const cx = x + (rnd() < 0.5 ? -1 : 1); add(new THREE.BoxGeometry(0.6, 0.5, 0.6), tableM, cx, 0.25, z + 1.45); const p = makePerson(THREE, { longHair: rnd() < 0.5, noUmbrella: true }, rnd); sit(p); p.position.set(cx, -0.3, z + 1.55); p.rotation.y = Math.PI; p.userData.lib = "reader"; g.add(p); readers.push(p); }
  }
  // 中間的展品：會轉的地球儀＋星環
  add(new THREE.CylinderGeometry(1.2, 1.5, 1.2, 24), stoneC, 0, 0.6, 15);
  // 熊 2026-11-14：不要地球，改成和開場動畫一樣夢幻的星球（粉彩的氣體條紋＋漩渦），外面一圈光暈
  const globeT = canvasTex(512, 256, (c, w, h) => { const P = ["#f6d7e6", "#c9b8ff", "#9fd0e6", "#fbe9c8", "#e98fb5", "#b48cff", "#fff4f0"];
    for (let y = 0; y < h; y += 2) { const t = y / h, k = Math.sin(t * 22 + Math.sin(t * 7) * 2) * 0.5 + 0.5; c.fillStyle = P[Math.floor((t * 9 + k * 2) % P.length)]; c.globalAlpha = 0.85; c.fillRect(0, y, w, 2); }
    c.globalAlpha = 0.5; for (let i = 0; i < 40; i++) { c.strokeStyle = P[i % P.length]; c.lineWidth = 2 + rnd() * 5; c.beginPath(); const y = rnd() * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x / 40 + i) * 6); c.stroke(); }
    c.globalAlpha = 0.9; const sx = w * 0.62, sy = h * 0.58; for (let r = 26; r > 2; r -= 3) { c.strokeStyle = r % 6 ? "#e98fb5" : "#fff4f0"; c.lineWidth = 2; c.beginPath(); c.ellipse(sx, sy, r * 1.6, r, 0.2, 0, 7); c.stroke(); } });
  const globe = add(new THREE.SphereGeometry(1.6, 48, 32), new THREE.MeshStandardMaterial({ map: globeT, roughness: 0.35, emissive: "#b48cff", emissiveIntensity: 0.18 }), 0, 3, 15);
  { const hc = canvasTex(128, 128, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.45, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(220,200,255,.55)"); gr.addColorStop(1, "rgba(220,200,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: hc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(6.2, 6.2, 1); halo.position.set(0, 3, 15); g.add(halo); }
  const ring = add(new THREE.TorusGeometry(2.3, 0.04, 8, 64), glow("#f2c14e"), 0, 3, 15); ring.rotation.x = 1.2;
  // 吊燈與暖光
  const lights = [];
  for (const z of [-10, 0, 10]) { add(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: "#fff2d6", emissive: "#ffd59a", emissiveIntensity: 1.2 }), 0, H - 2, z); const pl = new THREE.PointLight("#ffd9a8", 18, 26, 1.6); pl.position.set(0, H - 2.5, z); g.add(pl); lights.push(pl); }
  // 館員的櫃台（點館員：今日三題）、地球儀旁的閱讀台（點：今日一句）
  const hits = [];
  const desk = add(new THREE.BoxGeometry(5, 1.1, 1.4), tableM, 6.5, 0.55, -13); desk.userData.lib = "librarian";
  const librarian = makePerson(THREE, { top: "#2b3a67", bottom: "#2b2f3a", hair: "#7a5536", longHair: true, noUmbrella: true }, rnd); librarian.position.set(6.5, 0, -14.2); librarian.userData.lib = "librarian"; g.add(librarian);
  { // 熊 FIN-U57：館員制服（深藍外套、白領子、紅領巾、名牌）；櫃台有電腦
    const P = (geo, mat, x, y, z, par) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (par || g).add(m); return m; };
    P(new THREE.BoxGeometry(0.2, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: "#ffffff" }), 0, 1.4, 0.12, librarian);
    P(new THREE.ConeGeometry(0.06, 0.16, 4), new THREE.MeshStandardMaterial({ color: "#c0392b", roughness: 0.6 }), 0, 1.3, 0.13, librarian).rotation.x = Math.PI;
    P(new THREE.BoxGeometry(0.1, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.4, roughness: 0.3 }), 0.09, 1.2, 0.125, librarian);
    const mon = P(new THREE.BoxGeometry(0.8, 0.52, 0.06), new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.4 }), 6.0, 1.42, -13.25); mon.rotation.y = Math.PI;
    P(new THREE.PlaneGeometry(0.72, 0.44), new THREE.MeshStandardMaterial({ color: "#bfe6ff", emissive: "#8fd0ff", emissiveIntensity: 0.7 }), 6.0, 1.42, -13.29).rotation.y = Math.PI;
    P(new THREE.BoxGeometry(0.3, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: "#2b2b2e" }), 6.0, 1.13, -13.15);
    P(new THREE.BoxGeometry(0.6, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: "#d9dde2", roughness: 0.5 }), 6.0, 1.12, -13.0); }
  const deskSign = canvasTex(256, 64, (c, w) => { c.fillStyle = "#2f5b43"; c.fillRect(0, 0, w, 64); c.fillStyle = "#f2e6c8"; c.font = "bold 24px sans-serif"; c.textAlign = "center"; c.fillText("ASK ME", w / 2, 42); });
  add(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: deskSign }), 6.5, 0.75, -12.28);
  const lectern = new THREE.Group(); lectern.position.set(-3.2, 0, 12.5); g.add(lectern); lectern.userData.lib = "lectern";
  const lt = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.9), tableM); lt.position.y = 1.2; lt.rotation.x = -0.35; lectern.add(lt);
  const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.15, 10), tableM); lp.position.y = 0.6; lectern.add(lp);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.7), new THREE.MeshStandardMaterial({ color: "#fbf6ea", emissive: "#ffe9b8", emissiveIntensity: 0.35 })); pages.position.set(0, 1.27, 0.02); pages.rotation.x = -0.35; lectern.add(pages);
  hits.push(desk, librarian, lectern);
  // 入口（走到這裡就回到廣場）
  const exitZ = -D / 2 + 1.5;
  add(new THREE.BoxGeometry(3.6, 6, 0.3), new THREE.MeshStandardMaterial({ color: "#4a2e1c", emissive: "#ffcf8a", emissiveIntensity: 0.25 }), 0, 3, -D / 2 + 0.2);
  const sign = canvasTex(256, 48, (c, w) => { c.fillStyle = "#3a2e22"; c.fillRect(0, 0, w, 48); c.fillStyle = "#f2e6c8"; c.font = "bold 22px sans-serif"; c.textAlign = "center"; c.fillText("出口  EXIT", w / 2, 32); });
  add(new THREE.PlaneGeometry(3, 0.6), new THREE.MeshBasicMaterial({ map: sign }), 0, 6.6, -D / 2 + 0.4);
  readers.forEach(p => hits.push(p));
  // 熊 2026-11-14：書架上隨機一本書會發光；點它飛出來、打開，觸發隨機事件＋一句神喻（每次進來換一本）
  const book = new THREE.Group(); g.add(book); book.userData.lib = "book";
  { const cover = new THREE.MeshStandardMaterial({ color: "#5a3a8a", emissive: "#ffd27a", emissiveIntensity: 0.8, roughness: 0.4 }), pages = new THREE.MeshStandardMaterial({ color: "#fbf3df", emissive: "#fff2c8", emissiveIntensity: 0.5 });
    const bm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.09), cover); book.add(bm); const pg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.095), pages); pg.position.x = 0.025; book.add(pg);
    const gl = canvasTex(64, 64, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,226,140,.9)"); gr.addColorStop(1, "rgba(255,226,140,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(1.4, 1.4, 1); book.add(sp);
    bm.onBeforeRender = () => { const t = performance.now() / 1000; cover.emissiveIntensity = 0.55 + 0.45 * Math.sin(t * 3); sp.material.opacity = 0.5 + 0.4 * Math.sin(t * 3); }; }
  const placeBook = () => { const side = rnd() < 0.5 ? -1 : 1, row = 2 + ((rnd() * 9) | 0); book.position.set(side * (W / 2 - 1.42), 0.32 + row * 0.5625, -13 + rnd() * 26); book.rotation.set(0, 0, 0); book.visible = true; book.scale.setScalar(1); };
  placeBook(); hits.push(book);
  // 走不過去的東西：閱讀桌、服務台、閱讀台、石柱、中間的星球台（熊：人偶不能穿過桌子）
  const solid = [];
  for (const z of [-9, 0, 9]) for (const x of [-4.5, 4.5]) solid.push([x, z, 2.2, 1.2]);
  solid.push([6.5, -13, 2.7, 0.9], [-3.2, 12.5, 0.8, 0.7], [0, 15, 1.7, 1.7]);
  for (const x of [-8, 8]) for (let z = -14; z <= 14; z += 7) solid.push([x, z, 0.95, 0.95]);
  const blocked = (wx, wz) => { const x = wx - O.x, z = wz - O.z; return solid.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz); };
  return { hits, book, placeBook, blocked, group: g, O, spawn: new THREE.Vector3(O.x, O.y, O.z - D / 2 + 4), exitZ: O.z + exitZ, bounds: { x: W / 2 - 1.6, z0: O.z - D / 2 + 1, z1: O.z + D / 2 - 1.5 }, globe, ring, lights, readers };
}
