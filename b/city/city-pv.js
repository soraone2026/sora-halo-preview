/* 曦環城入口 B 版預覽（本機）：奧蕾莉亞的第一個謎、每天 3～5 個礦點。
 * 只在遊戲預覽打開時（localStorage「sora-pv」＝haloB）才會建立，正式版不會用到。
 * 狀態放在遊戲存檔的 pv_city（透過 FinSave.pvCity），同一天繞圈、重新進城、重新整理都不補礦；隔天換位置。
 *   clue：0 還沒撿到礦（光梯旁那顆會響進站鈴）→ 1 撿起來了 → 2 在圖書館讀到寫到一半的明信片 → 3 回廣場找到明信片說的刻痕（解開） */
export function makePvMystery({ THREE, plaza, lib, C, E, L, toast, pickables, canvasTex, pause, toPlaza }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const FS = window.FinSave;
  if (!document.getElementById("pvCss")) { const cs = document.createElement("style"); cs.id = "pvCss"; cs.textContent = ".pvphoto{width:100%;height:auto;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.25);transform:rotate(-1.2deg);margin:4px 0 8px}.pvcover{text-align:center;padding:18px 6px}.pvcover p{margin:0 0 12px}.pvq{font-weight:600;margin:6px 0}.pvh{opacity:.75;margin:2px 0 10px}.pvcap{text-align:center;margin:0}.pvpost{font-family:'Kaiti TC','BiauKai','STKaiti',serif;line-height:1.75;margin:4px 0 6px;padding:8px 10px;background:#fbf6ea;color:#3a3226;border-radius:6px}"; document.head.appendChild(cs); }
  const st = (fn) => (FS && FS.pvCity ? FS.pvCity(fn) : null);
  const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---- 聲音：一聲進站鈴（兩個音，像車站的叮咚） ---- */
  let ac = null;
  function chime() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
    [[659.25, 0], [523.25, 0.42]].forEach(([f, d]) => { const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + d;
      o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2.01; const g2 = ac.createGain(); g2.gain.value = 0.18;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(ac.destination); o.start(t0); o2.start(t0); o.stop(t0 + 1.7); o2.stop(t0 + 1.7); }); } catch { } }

  /* ---- 廣場上的礦點（廣場座標；廣場群組在 C） ---- */
  const toC = V(-plaza.doorPos.x + C.x, 0, -plaza.doorPos.z + C.z).normalize(), side = V(-toC.z, 0, toC.x);
  const stepsW = plaza.doorPos.clone().addScaledVector(toC, 3.2).addScaledVector(side, 7.5);
  const toE = V(C.x - E.x, 0, C.z - E.z).normalize(), liftP = V(E.x, 0, E.z).addScaledVector(toE, 8.5).addScaledVector(V(-toE.z, 0, toE.x), 2.5);
  const SPOTS = {
    lift: [liftP.x - C.x, liftP.z - C.z, ["光梯旁", "by the light lift"]],
    steps: [stepsW.x - C.x, stepsW.z - C.z, ["圖書館台階旁", "by the library steps"]],
    fountain: [9.2, 21.5, ["噴泉邊", "by the fountain"]],
    clock: [-34.5, -22.5, ["紅磚鐘樓下", "under the clock tower"]],
    arch: [10.5, 58.5, ["南邊石拱門旁", "by the south arch"]],
    hall: [-33.5, 28.5, ["圓頂大廳前", "in front of the domed hall"]],
    shops: [Math.cos(0.75) * 53, Math.sin(0.75) * 53, ["老街商店前", "outside the old shops"]],
    bench: [Math.cos(2.6) * 27.5, Math.sin(2.6) * 27.5, ["長椅旁", "next to a bench"]],
    lamp: [Math.cos(4.3) * 43, Math.sin(4.3) * 43, ["路燈下", "under a street lamp"]],
  };
  for (const k in SPOTS) { const s = SPOTS[k]; if (k === "lift") continue; if (plaza.free && !plaza.free(s[0], s[1], 0.9)) { for (let r = 1; r < 6; r += 1) { const a = hash(k) % 6.28; const x = s[0] + Math.cos(a) * r, z = s[1] + Math.sin(a) * r; if (plaza.free(x, z, 0.9)) { s[0] = x; s[1] = z; break; } } } }
  function todaySpots(p) { const d = today(), r = seeded(hash("pv-ores:" + d)), keys = Object.keys(SPOTS).filter(k => k !== "steps" && k !== "lift");
    for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
    const n = 3 + (hash("pv-n:" + d) % 3), pick = keys.slice(0, n);
    if (!(p.clue >= 1)) pick[0] = "lift"; else if (r() < 0.4) pick[0] = "steps";   // 還沒撿到第一顆礦：剛下光梯就看得到的那顆（會響進站鈴）
    return pick; }
  const state = st((p) => { if (p.day !== today()) { p.day = today(); p.picked = []; p.lib = false; p.spots = null; } if (!p.spots) p.spots = todaySpots(p); p.clue = p.clue || 0; return JSON.parse(JSON.stringify(p)); }) || { day: today(), picked: [], lib: false, spots: todaySpots({}), clue: 0 };

  const veinT = canvasTex(128, 128, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 3; const r = seeded(7); for (let i = 0; i < 7; i++) { c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; c.lineTo(x, y); } c.stroke(); } });
  const rockM = () => new THREE.MeshStandardMaterial({ color: "#5b6274", roughness: 0.85, metalness: 0.1, emissive: "#9fe6ff", emissiveMap: veinT, emissiveIntensity: 0.25 });
  const shardM = new THREE.MeshStandardMaterial({ color: "#bfefff", emissive: "#7fdcff", emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.2 });
  function shards(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); const r = seeded(hash(x.toFixed(1) + z.toFixed(1)));
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + r() * 0.1), shardM); m.position.set((r() - 0.5) * 0.8, 0.06, (r() - 0.5) * 0.8); m.rotation.set(r() * 3, r() * 3, r() * 3); g.add(m); } parent.add(g); return g; }
  const ores = [];   // { key, mesh, where: "plaza"|"lib", x, z, picked, shards }
  function makeOre(key, parent, x, y, z, where) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), rockM()); m.position.set(x, y + 0.32, z); m.rotation.set(0.4, hash(key) % 6, 0.2); m.scale.set(1, 0.78, 1.1);
    m.userData.pvOre = key; parent.add(m); pickables.push(m);
    const o = { key, mesh: m, where, x, z, picked: false, shards: null }; ores.push(o); return o; }
  // 會響的那顆：半透明的金白色晶石，飄著一圈光環（和一般的灰色礦石不一樣）
  const bellM = new THREE.MeshStandardMaterial({ color: "#ffc94a", emissive: "#ff9d1a", emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3 });
  const ringM = new THREE.MeshBasicMaterial({ color: "#ffc35a", transparent: true, opacity: 0, depthWrite: false });
  let bellO = null, ring = null;
  function makeBell(key, x, z) { const g = new THREE.Group(); g.position.set(x, 0.12, z); plaza.group.add(g);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), bellM); m.position.y = 0.85; m.scale.set(1.0, 1.7, 1.0); m.userData.pvOre = key; g.add(m); pickables.push(m);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), rockM()); base.position.y = 0.2; base.scale.set(1.3, 0.55, 1.2); g.add(base);
    ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 40), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 1.6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.8; hit.userData.pvOre = key; g.add(hit); pickables.push(hit);
    const o = { key, mesh: m, grp: g, hit, where: "plaza", x, z, picked: false, shards: null, bell: true }; ores.push(o); bellO = o; return o; }
  for (const k of state.spots) { const s = SPOTS[k]; if (!s) continue; const o = k === "lift" ? makeBell(k, s[0], s[1]) : makeOre(k, plaza.group, s[0], 0.12, s[1], "plaza"); if (state.picked.includes(k)) setPicked(o); }
  // 圖書館裡的礦點（也記錄當天採過沒）
  const LIBORE = [-11.2, 5.5];
  { const o = makeOre("lib", lib.group, LIBORE[0], 0, LIBORE[1], "lib"); if (state.lib) setPicked(o); }
  function setPicked(o) { o.picked = true; o.mesh.visible = false; if (o.grp) { o.grp.visible = false; const j = pickables.indexOf(o.hit); if (j >= 0) pickables.splice(j, 1); } const i = pickables.indexOf(o.mesh); if (i >= 0) pickables.splice(i, 1); if (!o.shards) o.shards = shards(o.where === "lib" ? lib.group : plaza.group, o.x, o.where === "lib" ? 0 : 0.12, o.z); }

  /* ---- 圖書館：碎晶、會亮的書脊 ---- */
  const LIBSH = [11.6, 6.4];
  shards(lib.group, LIBSH[0], 0, LIBSH[1]).scale.setScalar(1.6);
  const spineM = new THREE.MeshStandardMaterial({ color: "#3a4a7a", emissive: "#ffe9a8", emissiveIntensity: 0, roughness: 0.6 });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, 0.62), spineM); spine.position.set(13.75, 2.35, LIBSH[1]); spine.userData.pvBook = 1; lib.group.add(spine); pickables.push(spine);
  const spineHit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 1.0), new THREE.MeshBasicMaterial({ visible: false })); spineHit.position.copy(spine.position); spineHit.userData.pvBook = 1; lib.group.add(spineHit); pickables.push(spineHit);

  /* ---- 廣場：南邊石拱門西側石柱上的刻痕（照片角落那一道） ---- */
  const markT = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(60,48,32,.85)"; c.lineWidth = 6; c.lineCap = "round";
    c.beginPath(); c.moveTo(30, 30); c.lineTo(30, 98); c.moveTo(52, 30); c.lineTo(52, 98); c.moveTo(74, 30); c.lineTo(74, 98); c.moveTo(22, 64); c.lineTo(100, 64); c.stroke();
    c.beginPath(); c.arc(96, 34, 10, 0, 7); c.stroke(); });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshStandardMaterial({ map: markT, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  mark.position.set(-6, 2.2, 66 - 1.32); mark.rotation.y = Math.PI; plaza.group.add(mark);
  const markHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 6, 3.4), new THREE.MeshBasicMaterial({ visible: false })); markHit.position.set(-6, 3, 66); markHit.userData.pvMark = 1; plaza.group.add(markHit); pickables.push(markHit);
  // 舊月台的輪廓（查證時短暫疊在廣場上）
  const ghost = new THREE.Group(); ghost.visible = false; ghost.position.set(-6, 0, 50); plaza.group.add(ghost);
  { const lm = new THREE.LineBasicMaterial({ color: "#fff1c8", transparent: true, opacity: 0, depthWrite: false, fog: false }), fm = new THREE.MeshBasicMaterial({ color: "#e8b866", transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const edge = (w, h, d, x, y, z) => { const geo = new THREE.BoxGeometry(w, h, d), e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm), f = new THREE.Mesh(geo, fm); e.position.set(x, y, z); f.position.set(x, y, z); ghost.add(f); ghost.add(e); };   /* 半透明的暖色面＋亮邊，白天也看得清楚 */
    edge(40, 1.1, 7, 0, 0.55, 0); edge(40, 0.3, 8.5, 0, 6.2, 0);
    for (let i = -3; i <= 3; i++) edge(0.4, 5.6, 0.4, i * 6, 3.4, -2.6);
    for (let i = 0; i < 5; i++) edge(7.5, 2.6, 2.8, -14 + i * 7.8, 2.2, 5.4);   // 停在月台邊的舊車廂
    ghost.userData.m = lm; ghost.userData.f = fm; }
  let ghostT = -1;

  /* ---- 書裡夾著一張寫到一半的明信片：提到廣場上看得到的南邊石拱門 ---- */
  const CARD = `<svg viewBox="0 0 320 200" class="pvphoto" role="img" aria-label="${L("寫到一半的明信片", "A half-written postcard")}"><rect width="320" height="200" rx="6" fill="#f6eedb" stroke="#d9cba8" stroke-width="2"/>
    <g transform="translate(14 22)"><rect width="140" height="150" fill="#e9dcbc"/><rect x="0" y="118" width="140" height="32" fill="#cdbb92"/>
      <path d="M22 118V58a48 48 0 0 1 96 0v60h-20V60a28 28 0 0 0-56 0v58z" fill="#b9a27a" stroke="#7a6446" stroke-width="2"/>
      <g stroke="#4a3a26" stroke-width="2" stroke-linecap="round"><path d="M27 84v16M31 84v16M35 84v16M25 92h12"/><circle cx="38" cy="80" r="2" fill="none"/></g>
      <circle cx="32" cy="92" r="11" fill="none" stroke="#c0392b" stroke-width="1.6" stroke-dasharray="3 2"/><text x="70" y="142" text-anchor="middle" font-size="10" fill="#5a4a32" font-family="serif">${L("南邊石拱門", "South arch")}</text></g>
    <line x1="166" y1="20" x2="166" y2="180" stroke="#d9cba8" stroke-width="1.5"/><rect x="262" y="16" width="42" height="50" fill="#e6c8a0" stroke="#b08a5a" stroke-dasharray="3 2"/><circle cx="252" cy="58" r="16" fill="none" stroke="#8a7a9a" stroke-width="1.5" opacity=".7"/>
    ${[96, 122, 148, 174].map(y => `<line x1="178" y1="${y}" x2="306" y2="${y}" stroke="#d9cba8"/>`).join("")}</svg>`;
  const PHOTO = `<svg viewBox="0 0 320 210" class="pvphoto" role="img" aria-label="${L("舊月台的照片", "An old platform photo")}"><defs><filter id="pvSep"><feColorMatrix type="matrix" values=".39 .77 .19 0 0 .35 .69 .17 0 0 .27 .53 .13 0 0 0 0 0 1 0"/></filter></defs>
    <g filter="url(#pvSep)"><rect width="320" height="210" fill="#d9c9a3"/><rect y="140" width="320" height="70" fill="#a8946c"/><rect y="132" width="320" height="10" fill="#8a7650"/>
    <rect x="0" y="40" width="320" height="10" fill="#6a5a3e"/>${[40, 100, 160, 220, 280].map(x => `<rect x="${x}" y="50" width="6" height="84" fill="#5a4a32"/>`).join("")}
    <g fill="#7a6a4a">${[0, 1, 2].map(i => `<rect x="${12 + i * 104}" y="92" width="96" height="40" rx="6"/><rect x="${22 + i * 104}" y="100" width="18" height="14" fill="#c9b78f"/><rect x="${50 + i * 104}" y="100" width="18" height="14" fill="#c9b78f"/><rect x="${78 + i * 104}" y="100" width="18" height="14" fill="#c9b78f"/>`).join("")}</g>
    ${[[70, 120], [150, 118], [230, 121]].map(([x, y]) => `<g fill="#4a3c28"><circle cx="${x}" cy="${y}" r="5"/><rect x="${x - 5}" y="${y + 5}" width="10" height="18" rx="3"/></g>`).join("")}
    <rect x="6" y="150" width="26" height="60" fill="#9a8a68" stroke="#5a4a32" stroke-width="2"/><g stroke="#3a2e1e" stroke-width="2" stroke-linecap="round"><path d="M13 168v20M19 168v20M25 168v20M10 178h20"/><circle cx="27" cy="164" r="3" fill="none"/></g>
    <rect width="320" height="210" fill="none" stroke="#f4ecd8" stroke-width="10"/></g></svg>`;
  function openPhoto() {
    const first = state.clue < 2; pause && pause(true); void PHOTO;
    const root = document.createElement("div"); root.className = "game"; root.innerHTML = `<div class="game-card book-card"><div class="game-head"><strong>📖 ${L("《星站往事》", "“Tales of the Star Station”")}</strong><span class="spacer"></span><button class="btn pvx" type="button">✕</button></div>
      <div class="game-body"><div class="pvcover"><p>${L("書脊微微發著光。", "The spine is glowing softly.")}</p><button class="btn pvopen" type="button">${L("翻開", "Open it")}</button></div>
      <div class="pvpage" hidden><p class="pvh"><small>${L("書頁之間，夾著一張沒寄出去的明信片。", "Between the pages: a postcard that was never sent.")}</small></p>${CARD}
      <p class="pvpost">${L("阿蓮：<br>舊月台明天就要拆了。我在<b>南邊石拱門西邊那根柱子</b>上，刻了我們的記號——三條直線、一條橫線，旁邊一個小圈。<br>等廣場蓋好，你來的時候就站在那根柱子下面，應該還聽得見進站鈴——",
        "Dear Lian,<br>They're tearing the old platform down tomorrow. On <b>the west pillar of the south stone arch</b> I carved our mark — three lines down, one across, and a little circle beside them.<br>When the square is built and you come, stand under that pillar. You should still be able to hear the arrival bell —")}</p>
      <p class="pvcap"><small>${L("（寫到這裡就停了。郵戳：舊奧蕾莉亞站）", "(It stops there. Postmark: Old Aurelia Station)")}</small></p>
      <p class="pvq">${L("館員：「南邊那座石拱門，現在還在喔。」", "Librarian: “That stone arch to the south is still standing, you know.”")}</p><button class="btn pvback" type="button">${L("回廣場找找", "Go and look in the square")}</button></div></div></div>`;
    document.body.appendChild(root);
    const close = () => { root.remove(); pause && pause(false); };
    root.querySelector(".pvx").onclick = close; root.querySelector(".pvback").onclick = () => { close(); toPlaza && toPlaza(); };   /* 回廣場找找：直接回到廣場 */
    root.querySelector(".pvopen").onclick = () => { root.querySelector(".pvcover").hidden = true; root.querySelector(".pvpage").hidden = false; if (first) { state.clue = 2; st((p) => { p.clue = Math.max(p.clue || 0, 2); }); } };
  }

  /* ---- 撿礦 ---- */
  let libFlashT = -1, glowO = null, glowT = -1;
  function pick(o) { if (o.picked) return; setPicked(o);
    const first = !(state.clue >= 1);
    if (o.where === "lib") { state.lib = true; st((p) => { p.lib = true; }); } else { state.picked.push(o.key); st((p) => { if (!p.picked.includes(o.key)) p.picked.push(o.key); }); }
    const got = FS && FS.addOre ? FS.addOre("ore") : false;
    if (first) { state.clue = 1; st((p) => { p.clue = Math.max(p.clue || 0, 1); });
      chime(); glowO = shards(o.where === "lib" ? lib.group : plaza.group, o.x, o.where === "lib" ? 0.1 : 0.22, o.z); glowO.scale.setScalar(2.2); glowT = 0; libFlashT = 0.9;
      toast(o.bell ? L("你一碰，鈴聲就停了。晶石裡的光流進了圖書館的窗——那裡也閃了一下。", "The ringing stops the moment you touch it. Its light flows toward the library windows — they flash too.") : L("叮——咚。石頭上的紋路亮了起來……圖書館的窗裡，好像也閃過同樣的光。", "Ding—dong. The veins in the stone light up… and the same light flickers in the library windows."), 5200);
      setTimeout(() => toast(got ? L("撿到一塊未鑑定原石，放進家裡的元液瓶了。", "You picked up an unidentified ore — it's in your essence bottle at home.") : L("撿到一塊礦石。", "You picked up an ore."), 3600), 5400); }
    else toast((got ? L("撿到一塊未鑑定原石（放進家裡的元液瓶）。", "An unidentified ore — into your essence bottle at home.") : L("撿到一塊礦石。", "You picked up an ore.")) + L(`　今天這裡還有 ${ores.filter(q => !q.picked && q.where === o.where).length} 個礦點。`, `  ${ores.filter(q => !q.picked && q.where === o.where).length} more spots here today.`), 3600); }

  /* ---- 點東西 ---- */
  function tap(obj, mode, avp) {
    const ud = obj.userData;
    if (ud.pvOre) { const o = ores.find(q => q.key === ud.pvOre); if (!o || o.picked) return {}; const w = (o.where === "lib" ? lib.group : plaza.group).localToWorld(V(o.x, 0, o.z));
      if (Math.hypot(w.x - avp.x, w.z - avp.z) < 1.9) { pick(o); return {}; } return { walk: [w.x, w.z] }; }   /* 會響的那顆也是走近就撿 */
    if (ud.pvBook) { const bw = lib.group.localToWorld(V(LIBSH[0], 0, LIBSH[1])); if (Math.hypot(bw.x - avp.x, bw.z - avp.z) > 5) return { walk: [bw.x - 1.2, bw.z] };
      if (state.clue >= 1 && bookLit) { openPhoto(); return {}; } toast(L("一本舊書，書脊上寫著《星站往事》。", "An old book: “Tales of the Star Station.”"), 3000); return {}; }
    if (ud.pvMark) { const w = plaza.group.localToWorld(V(-6, 0, 64)); if (Math.hypot(w.x - avp.x, w.z - avp.z) > 6.5) return { walk: [w.x, w.z - 1.5] };
      if (state.clue >= 2 && state.clue < 3) { state.clue = 3; st((p) => { p.clue = 3; p.solvedAt = Date.now(); }); ghostT = 0; ghost.visible = true; chime();
        toast(L("就是明信片說的記號。舊月台的輪廓疊上了眼前的廣場——原來這裡以前是月台。", "This is the mark. The outline of the old platform settles over the square — this used to be a platform."), 5600);
        setTimeout(() => toast(L("✦ 奧蕾莉亞的第一個謎，解開了。", "✦ Aurelia's first mystery is solved."), 4200), 5800); return {}; }
      if (state.clue >= 3) { ghostT = 0; ghost.visible = true; toast(L("石柱上的刻痕。以前這裡是月台。", "The carved mark. This used to be a platform."), 3200); return {}; }
      toast(L("石柱上有一道很舊的刻痕。", "There's a very old mark carved into the pillar."), 3000); return {}; }
    return null; }

  /* ---- 進圖書館 ---- */
  let hinted = false;
  function enterLib() { if (state.clue < 1 && !hinted && !st((p) => p.hint)) { hinted = true; st((p) => { p.hint = 1; });
      setTimeout(() => toast(L("館員：「光梯旁那顆石頭，今天一直在響呢。」", "Librarian: “That stone by the light lift has been ringing all day.”"), 5200), 4600); } }
  /* ---- 第一次下光梯：附近那顆晶石響起進站鈴 ---- */
  let ringT = -1, ringNext = -1;
  function enterStreet() { if (!bellO || bellO.picked) return; ringNext = 1.6; setTimeout(() => { if (bellO && !bellO.picked) toast(L("叮——咚。光梯旁一顆發光的晶石響了，像剛才聽說的進站鈴。", "Ding—dong. A glowing crystal by the lift is ringing — like the arrival bell you just heard about."), 5200); }, 9600); }

  /* ---- 每一格 ---- */
  let bookLit = state.clue >= 2;
  const _w = V(0, 0, 0);
  function update(dt, t, mode, avp) {
    if (mode === "street" || mode === "inside") for (const o of ores) { if (o.picked || (mode === "inside") !== (o.where === "lib")) continue; o.mesh.getWorldPosition(_w); if (Math.hypot(_w.x - avp.x, _w.z - avp.z) < 1.25) pick(o); }
    for (const o of ores) if (!o.picked && !o.bell) o.mesh.material.emissiveIntensity = 0.18 + 0.12 * Math.sin(t * 2 + o.x);
    if (bellO && !bellO.picked) { bellO.mesh.rotation.y += dt * 0.6; bellO.mesh.position.y = 0.85 + 0.08 * Math.sin(t * 1.6); bellM.emissiveIntensity = 0.8 + 0.3 * Math.sin(t * 2.4);
      if (mode === "street" && ringNext >= 0) { ringNext -= dt; if (ringNext < 0) { const w = plaza.group.localToWorld(V(bellO.x, 0, bellO.z)); if (Math.hypot(w.x - avp.x, w.z - avp.z) < 30) { chime(); ringT = 0; } ringNext = 9; } }
      if (ringT >= 0) { ringT += dt; const k = ringT / 1.8; ring.scale.setScalar(1 + k * 2.2); ringM.opacity = Math.max(0, 0.8 * (1 - k)); bellM.emissiveIntensity = 1.8 * (1 - k) + 0.8; if (k >= 1) ringT = -1; } }
    if (glowO && glowT >= 0) { glowT += dt; const k = Math.max(0, 1 - glowT / 3.5); glowO.children.forEach(m => { m.material = m.material === shardM ? shardM.clone() : m.material; m.material.emissiveIntensity = 0.6 + 2.4 * k; }); if (glowT > 3.5) glowT = -1; }
    if (libFlashT >= 0 && plaza.doorLight) { libFlashT -= dt; plaza.doorLight.material.emissiveIntensity = libFlashT > 0 ? 1.6 * Math.abs(Math.sin(libFlashT * 9)) : 0; if (libFlashT <= 0) libFlashT = -1; }
    if (mode === "inside" && state.clue >= 1 && !bookLit) { const w = lib.group.localToWorld(V(LIBSH[0], 0, LIBSH[1])); if (Math.hypot(w.x - avp.x, w.z - avp.z) < 3.6) { bookLit = true; chime();
        toast(L("口袋裡的礦石和地上的碎晶一起亮了一下——旁邊書架上，一本書的書脊亮了起來。", "The ore in your pocket and the shards on the floor flash together — a book spine on the shelf beside them lights up."), 5200); } }
    spineM.emissiveIntensity = bookLit ? 0.55 + 0.35 * Math.sin(t * 3) : 0;
    if (ghostT >= 0) { ghostT += dt; const k = ghostT < 0.6 ? ghostT / 0.6 : ghostT < 3.6 ? 1 : Math.max(0, 1 - (ghostT - 3.6) / 0.9); ghost.userData.m.opacity = 0.95 * k; ghost.userData.f.opacity = 0.32 * k; if (ghostT > 4.5) { ghostT = -1; ghost.visible = false; } }
  }
  const dbg = () => ({ E: [+E.x.toFixed(1), +E.z.toFixed(1)], day: state.day, spots: state.spots, picked: state.picked, lib: state.lib, clue: state.clue, bookLit, ores: ores.map(o => { const w = (o.where === "lib" ? lib.group : plaza.group).localToWorld(V(o.x, 0, o.z)); return [o.key, o.picked, +w.x.toFixed(1), +w.z.toFixed(1)]; }), mark: plaza.group.localToWorld(V(-6, 0, 64)).toArray().map(v => +v.toFixed(1)), shard: lib.group.localToWorld(V(LIBSH[0], 0, LIBSH[1])).toArray().map(v => +v.toFixed(1)) });
  const test = { mark: (avp) => tap({ userData: { pvMark: 1 } }, "street", avp), book: (avp) => tap({ userData: { pvBook: 1 } }, "inside", avp) };   // 測試用（無頭瀏覽器裡點不到 3D 物件）
  return { tap, update, enterLib, enterStreet, dbg, openPhoto, test, clue: () => state.clue };
}

/* 館員的今日三題（B 版預覽）：第 2 題輪流出小鎮的事或思想家的話，第 3 題從玩家自己的記帳出 */
export function pvQuiz(L) {
  const sh = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const d = new Date(), day = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
  const TOWN = [
    [["昨晚，星站的站名燈暗了哪一個字？", "Which character on the Star Station's sign went dark last night?"], "曦環城", ["環", "環"], [["曦", "曦"], ["城", "城"]]],
    [["一顆流星落在哪裡？", "Where did the meteor fall?"], "", ["小鎮", "The town"], [["奧蕾莉亞", "Aurelia"], ["曦環城", "Xi Halo"]]],
    [["從小鎮搭捷運到奧蕾莉亞，去程要幾 B？", "How many B is the metro from the town to Aurelia?"], "", ["3 B", "3 B"], [["1 B", "1 B"], ["5 B", "5 B"]]],
    [["Rose 阿姨說，車站什麼又壞了？", "What did Mrs. Rose say was broken again at the station?"], "", ["到站燈", "The arrival light"], [["售票機", "The ticket machine"], ["電梯", "The lift"]]],
    [["記帳時標上地點（麵包店、咖啡廳……），小鎮會怎樣？", "Tag a place when you record (bakery, café…) and the town will…"], "", ["越來越熱鬧", "grow livelier"], [["變得比較安靜", "get quieter"], ["沒有變化", "stay the same"]]]];
  const WHO = [["卡繆", "Camus"], ["沙特", "Sartre"], ["卡夫卡", "Kafka"], ["普魯斯特", "Proust"], ["老子", "Laozi"], ["孔子", "Confucius"]];
  const QUOTE = [
    [["我們必須想像薛西弗斯是快樂的。", "One must imagine Sisyphus happy."], 0], [["在隆冬，我終於知道，我身上有一個不可戰勝的夏天。", "In the depth of winter, I finally learned that within me there lay an invincible summer."], 0],
    [["人被判定是自由的。", "Man is condemned to be free."], 1], [["一本書必須是砍向我們內心冰封之海的斧頭。", "A book must be the axe for the frozen sea within us."], 2],
    [["真正的發現之旅，不在於尋找新風景，而在於擁有新的眼光。", "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes."], 3], [["千里之行，始於足下。", "A journey of a thousand miles begins beneath one's feet."], 4]];
  let q2;
  if (day % 2) { const [q, h, a, w] = TOWN[day % TOWN.length]; q2 = { q: L(...q), h, a: L(...a), opts: sh([L(...a), ...w.map(x => L(...x))]) }; }
  else { const [t, wi] = QUOTE[day % QUOTE.length], a = L(...WHO[wi]); q2 = { q: L("這句話是誰說的？", "Who said this?"), h: "「" + L(...t) + "」", small: 1, a, opts: sh([a, ...sh(WHO.filter((_, i) => i !== wi)).slice(0, 2).map(x => L(...x))]) }; }
  let q3 = null;
  try { const s = JSON.parse(localStorage.getItem("sora-universe-v0")), recs = ((s && s.records && s.records.finance) || []).filter(r => r && r.item);
    if (recs.length) { const r = recs.reduce((a, b) => (String(b.date) >= String(a.date) ? b : a)), items = [...new Set(recs.map(x => x.item))].filter(x => x !== r.item), pad = ["午餐", "咖啡", "交通", "早餐", "日用品", "晚餐"].filter(x => x !== r.item && !items.includes(x));
      q3 = { q: L(`你最近一筆記帳（${r.date}）記的是什麼？`, `Your latest record (${r.date}) — what was it?`), h: "📒", a: r.item, opts: sh([r.item, ...sh(items).concat(sh(pad)).slice(0, 2)]) }; } } catch { }
  if (!q3) q3 = { q: L("館員：「你還沒記過帳吧？」記帳記的是哪一種錢？", "Librarian: “You haven't kept a record yet, have you?” What do your records track?"), h: "📒", a: L("現實生活的收入和支出", "Real-life income and spending"), opts: sh([L("現實生活的收入和支出", "Real-life income and spending"), L("遊戲裡的 B 幣", "In-game B"), L("撿到的原石", "Ores you find")]) };
  return [q2, q3]; }
