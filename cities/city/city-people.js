/* 城市裡的人：玩家的人偶（衣服跟書房同步）和 NPC 路人。單位是公尺，身高約 1.7。 */
const SKINS = ["#f1d3bd", "#e6bfa0", "#c99a78", "#8d5f45", "#f6dcc8"];
const HAIRS = ["#2a1d18", "#4a3426", "#151515", "#7a5536", "#b8a27a", "#6b6b6b"];
const TOPS = ["#e9e4da", "#2f4b7a", "#7a2f3a", "#3f6b55", "#c9a46a", "#5b5b66", "#d9d2e9", "#1d1d1f", "#b5533c", "#f2efe8"];
const BOTTOMS = ["#2b2f3a", "#4f6f99", "#5b5b5b", "#3a3027", "#1d1d1f", "#8a7a66"];

/* 下雨時大家撐傘（熊 2026-11-14）：每個人身上都有一把收起來的傘，setRain(true) 時打開、右手舉著 */
const PEOPLE = new Set(), UMB = ["#e9a6b9", "#2f4b7a", "#f2c14e", "#3f6b55", "#7a2f3a", "#d9d2e9", "#1d1d1f", "#5fa8c9"];
// 熊 2026-11-15（FIN-U53）：撐傘時手要舉起來拿著傘；傘柄短一點。傘的原點＝手握的地方，每一幀放到手的位置
export function addUmbrella(THREE, g, rnd = Math.random, color) {
  const umb = new THREE.Group(); umb.position.set(0.22, 1.75, 0.4); umb.visible = false;
  const cm = new THREE.MeshStandardMaterial({ color: color || UMB[(rnd() * UMB.length) | 0], roughness: 0.55, side: THREE.DoubleSide });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 6, 0, Math.PI * 2, 0, Math.PI * 0.34), cm); top.scale.y = 0.6; top.position.set(0, 0.1, -0.04); umb.add(top);
  const stickM = new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.4 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), stickM); stick.position.set(0, 0.22, -0.02); umb.add(stick);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), stickM); grip.position.y = -0.03; umb.add(grip);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), stickM); tip.position.set(0, 0.47, -0.04); umb.add(tip);
  g.add(umb); g.userData.umb = umb; PEOPLE.add(g);
  try { const u = g.userData, arm = u.arms && u.arms[1]; if (arm) { const r = arm.rotation.x; arm.rotation.x = 0; g.updateMatrixWorld(true);   // 手的位置（手臂最下面）
      const b = new THREE.Box3().setFromObject(arm), p = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + 0.04, (b.min.z + b.max.z) / 2); u.handL = arm.worldToLocal(p); arm.rotation.x = r; } } catch { }
  return umb;
}
/* 收起來的傘（車廂裡、店裡）：靠在旁邊，下雨天才看得到 */
const FOLDED = new Set();
export function addFolded(THREE, parent, x, y, z, color, short = false) {   // short：短短的折傘（橫放在座椅上）；不然是長直傘（靠在座椅前面，熊 FIN-U54）
  const f = new THREE.Group(); f.position.set(x, y, z); f.visible = rainOn;
  const cm = new THREE.MeshStandardMaterial({ color: color || UMB[(Math.random() * UMB.length) | 0], roughness: 0.6 });
  if (short) { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.24, 12), cm); body.rotation.x = Math.PI / 2; body.position.y = 0.035; f.add(body);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.006, 6, 14), new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.5 })); strap.position.set(0, 0.035, 0.03); f.add(strap);
    const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 8), new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.4 })); hdl.rotation.x = Math.PI / 2; hdl.position.set(0, 0.035, -0.16); f.add(hdl);
    parent.add(f); FOLDED.add(f); return f; }
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.62, 10), cm); body.position.y = 0.36; body.rotation.x = Math.PI; f.add(body);
  const tipM = new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.4 });
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), tipM); sh.position.y = 0.03; f.add(sh);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), tipM); hd.position.set(0.04, 0.72, 0); f.add(hd);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6), tipM); st.position.y = 0.68; f.add(st);
  parent.add(f); FOLDED.add(f); return f;
}
let rainOn = false;
export function setRain(on) { if (on === rainOn) return; rainOn = on; for (const g of PEOPLE) { g.userData.umbOn = on; if (g.userData.umb) g.userData.umb.visible = on && !g.userData.sitting; } for (const f of FOLDED) f.visible = on; }
export function isRain() { return rainOn; }
/* 嵌在財務遊戲裡：用臥室那個人偶（造型、髮型、衣服一樣）。換成城市的尺寸（身高約 1.7） */
export function finAvatar(THREE) {
  try {
    const P = window.parent !== window && typeof window.parent.__finRig === "function" ? window.parent : null; if (!P) return null;
    const r = P.__finRig(); if (!r || !r.json) return null;
    const g0 = new THREE.ObjectLoader().parse(JSON.parse(r.json)), get = (n) => [0, 1].map(i => g0.getObjectByName(n + i));
    if (get("finLeg").some(x => !x) || get("finArm").some(x => !x)) return null;
    g0.scale.multiplyScalar(0.68); g0.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const g = new THREE.Group(); g.add(g0); const head = new THREE.Object3D(); head.position.y = 1.6; g.add(head);
    g.userData = { legs: get("finLeg"), knees: get("finKnee").filter(Boolean), arms: get("finArm"), head, phase: 0, totes: [] }; g0.traverse(o => { if (o.userData && o.userData.tote) g.userData.totes.push(o); });
    addUmbrella(THREE, g, Math.random, "#f2c14e"); g.userData.umbOn = rainOn; g.userData.umb.visible = rainOn;
    // 傘的位置跟著她舉起來的手（FIN-U53）
    g.userData.totes.forEach(o => { o.visible = false; });   // 熊 FIN-U59：去城市不拿購物袋
    return g;
  } catch (e) { console.warn("城市人偶同步失敗，用簡易人偶", e); return null; }
}

// ---- FIN-U98（熊）：NPC 的臉型、髮型、嘴型、眼睛、眉毛更多樣（小鎮 NPC 和城市路人共用同一套）----
// grp：放在頭的中心、已經縮放成「半徑 1」的群組；所有零件用單位球的座標擺
function npcFace(THREE, grp, o) {
  const r = o.rnd, pick = (a) => a[Math.floor(r() * a.length) % a.length], M = o.M, skin = o.skin, sex = o.sex || "f", kid = !!o.kid;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); grp.add(m); return m; };
  const hc = new THREE.Color(o.hair || "#3a2a20"), hairM = M(o.hair || "#3a2a20", { roughness: o.slick ? 0.35 : 0.75 }), brow = M("#" + hc.clone().multiplyScalar(0.7).getHexString());
  // 頭型：下巴（尖、方、圓臉頰、普通）
  const chin = o.chin != null ? o.chin : Math.floor(r() * 4);
  if (chin === 1) add(new THREE.SphereGeometry(0.45, 14, 10), skin, 0, -0.72, 0.32).scale.set(0.85, 0.7, 0.8);
  else if (chin === 2) add(new THREE.SphereGeometry(0.62, 14, 10), skin, 0, -0.5, 0.12).scale.set(1.45, 0.75, 1.15);
  else if (chin === 3) for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.4, 12, 8), skin, sx * 0.52, -0.35, 0.5);
  // 眼睛
  const eye = M("#1d1a1a", { roughness: 0.3 }), ew = M("#ffffff", { roughness: 0.3 }), ey = 0.08 + (r() - 0.5) * 0.08, ex = 0.33 + (r() - 0.5) * 0.08, et = Math.floor(r() * 5);
  for (const sx of [-1, 1]) {
    if (et === 0) add(new THREE.SphereGeometry(0.1, 10, 8), eye, sx * ex, ey, 0.92);
    else if (et === 1) add(new THREE.SphereGeometry(0.085, 10, 8), eye, sx * ex, ey, 0.93).scale.set(1, 1.5, 0.8);
    else if (et === 2) { const a = add(new THREE.TorusGeometry(0.09, 0.028, 6, 12, Math.PI), eye, sx * ex, ey - 0.03, 0.93); }   // 笑瞇瞇的眼睛
    else if (et === 3) { add(new THREE.SphereGeometry(0.13, 12, 10), ew, sx * ex, ey, 0.88).scale.z = 0.6; add(new THREE.SphereGeometry(0.075, 10, 8), eye, sx * ex, ey, 0.96); }   // 大眼睛
    else add(new THREE.BoxGeometry(0.18, 0.04, 0.05), eye, sx * ex, ey, 0.93).rotation.z = sx * -0.08;   // 睡眼
  }
  // 眉毛
  const bt = Math.floor(r() * 4), bz = [0, 0.18, -0.2, 0.06][bt];
  for (const sx of [-1, 1]) { const b = add(new THREE.BoxGeometry(bt === 3 ? 0.3 : 0.25, bt === 3 ? 0.07 : 0.045, 0.05), brow, sx * ex, ey + 0.27, 0.9); b.rotation.z = sx * bz; b.rotation.x = -0.25; }
  // 鼻子
  const nz = Math.floor(r() * 4);
  if (nz === 0) add(new THREE.SphereGeometry(0.11, 10, 8), skin, 0, -0.18, 1.0); else if (nz === 1) add(new THREE.CapsuleGeometry(0.07, 0.2, 4, 8), skin, 0, -0.14, 0.98).rotation.x = -0.35;
  else if (nz === 2) add(new THREE.SphereGeometry(0.15, 10, 8), skin, 0, -0.2, 0.96).scale.set(1.15, 0.8, 0.8); else add(new THREE.ConeGeometry(0.09, 0.22, 8), skin, 0, -0.17, 1.02).rotation.x = Math.PI / 2;
  // 嘴巴
  const lip = M(pick(sex === "m" ? ["#8a5a50", "#9a6458", "#7a4a44"] : ["#b85a64", "#c4505e", "#a6585e", "#d47a7a", "#9c4a5a"]), { roughness: 0.5 }), dark = M("#5a2a2e"), mt = Math.floor(r() * 8), my = -0.47;
  if (mt === 0) add(new THREE.BoxGeometry(0.3, 0.04, 0.05), lip, 0, my, 0.88);
  else if (mt === 1) add(new THREE.TorusGeometry(0.15, 0.035, 6, 14, Math.PI), lip, 0, my + 0.08, 0.87).rotation.z = Math.PI;   // 微笑
  else if (mt === 2) { add(new THREE.CircleGeometry(0.17, 16, Math.PI, Math.PI), M("#ffffff"), 0, my + 0.04, 0.9); add(new THREE.TorusGeometry(0.17, 0.03, 6, 16, Math.PI), lip, 0, my + 0.04, 0.89).rotation.z = Math.PI; }   // 露齒笑
  else if (mt === 3) add(new THREE.TorusGeometry(0.07, 0.03, 6, 12), dark, 0, my, 0.9);   // 「喔」
  else if (mt === 4) { const s = add(new THREE.BoxGeometry(0.26, 0.04, 0.05), lip, 0.05, my, 0.88); s.rotation.z = 0.22; }   // 嘴角歪一邊
  else if (mt === 5) { add(new THREE.SphereGeometry(0.075, 8, 6), lip, 0, my + 0.03, 0.9).scale.x = 1.5; add(new THREE.SphereGeometry(0.075, 8, 6), lip, 0, my - 0.04, 0.89).scale.x = 1.4; }   // 嘟嘴
  else if (mt === 6) add(new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI), lip, 0, my - 0.06, 0.88);   // 小小的嘴往下
  else add(new THREE.SphereGeometry(0.06, 8, 6), lip, 0, my, 0.9);
  if (sex === "f" && r() < 0.35) { const bl = new THREE.MeshBasicMaterial({ color: "#ff9aa8", transparent: true, opacity: 0.35, depthWrite: false }); for (const sx of [-1, 1]) add(new THREE.CircleGeometry(0.12, 12), bl, sx * 0.55, -0.22, 0.83).rotation.y = sx * 0.6; }   // 腮紅
  // 髮型
  const FEM = ["bob", "long", "pony", "bun", "twinBuns", "twinTails", "bangs", "curly", "sidePart", "wavy"], MAL = ["crop", "buzz", "sidePart", "spiky", "curly", "slick", "bangs", "afro", "bald"], KID = ["bangs", "twinBuns", "crop", "curly", "pony", "spiky"];
  const st = o.style || pick(kid ? KID : sex === "m" ? MAL : FEM);
  const cap = (k = 1.07, th = 0.52) => add(new THREE.SphereGeometry(k, 22, 12, 0, Math.PI * 2, 0, Math.PI * th), hairM, 0, 0.06, -0.06);
  const back = (h, y, rt = 1.08, rb = 1.15) => { const c = add(new THREE.CylinderGeometry(rt, rb, h, 22, 1, true, Math.PI * 0.3, Math.PI * 1.4), M(o.hair || "#3a2a20", { side: THREE.DoubleSide, roughness: 0.75 }), 0, y, -0.06); return c; };
  if (st === "bald") { if (r() < 0.6) add(new THREE.SphereGeometry(1.03, 20, 8, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.16), hairM, 0, 0.05, -0.08).scale.z = 0.95; }   // 光頭／只剩兩側一圈
  else if (st === "buzz") cap(1.03, 0.47);
  else if (st === "afro") { cap(1.08, 0.55); for (let i = 0; i < 16; i++) { const a = i * 2.4, el = 0.15 + (i % 6) / 6 * 1.25; const x = Math.cos(a) * Math.sin(el) * 1.1, y = Math.cos(el) * 1.1 + 0.15, z = Math.sin(a) * Math.sin(el) * 1.1 - 0.25; if (z > 0.55 && y < 0.6) continue; add(new THREE.SphereGeometry(0.5, 8, 6), hairM, x, y, z); } }
  else if (st === "curly") { cap(1.05, 0.5); for (let i = 0; i < 18; i++) { const a = i * 2.4, el = 0.1 + (i % 7) / 7 * 1.35; const x = Math.cos(a) * Math.sin(el) * 1.02, y = Math.cos(el) * 1.02 + 0.08, z = Math.sin(a) * Math.sin(el) * 1.02 - 0.1; if (z > 0.5 && y < 0.55) continue; add(new THREE.SphereGeometry(0.32, 7, 5), hairM, x, y, z); } }
  else {
    cap(st === "slick" ? 1.05 : 1.08, st === "crop" || st === "slick" || st === "spiky" ? 0.5 : 0.55);
    if (st === "slick") grp.children[grp.children.length - 1].scale.y = 0.92;
    if (st === "spiky") for (let i = 0; i < 9; i++) { const a = i * 0.7, c = add(new THREE.ConeGeometry(0.16, 0.42, 6), hairM, Math.cos(a) * 0.55, 1.0 - (i % 3) * 0.08, Math.sin(a) * 0.55 - 0.15); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
    if (st === "sidePart") { const f = add(new THREE.SphereGeometry(0.6, 12, 8), hairM, 0.35, 0.62, 0.62); f.scale.set(1.25, 0.45, 0.7); f.rotation.z = -0.35; }
    if (st === "bangs" || st === "bob" || st === "twinBuns" || st === "twinTails") { const f = add(new THREE.BoxGeometry(1.5, 0.32, 0.32), hairM, 0, 0.6, 0.78); f.rotation.x = -0.5; }
    if (st === "bob") back(1.05, -0.32, 1.1, 1.18);
    if (st === "long") back(2.1, -0.82, 1.08, 1.25);
    if (st === "wavy") { back(1.7, -0.62, 1.1, 1.3); for (let i = 0; i < 8; i++) { const a = Math.PI * 0.35 + i * Math.PI * 1.3 / 7; add(new THREE.SphereGeometry(0.28, 8, 6), hairM, Math.sin(a) * 1.18, -1.35, Math.cos(a) * 1.18 - 0.06); } }
    if (st === "pony") { const p = add(new THREE.CapsuleGeometry(0.26, 1.0, 4, 8), hairM, 0, -0.25, -1.18); p.rotation.x = 0.3; add(new THREE.TorusGeometry(0.2, 0.06, 6, 12), M(pick(["#e8436b", "#3f6fb5", "#f2c230", "#ffffff"])), 0, 0.3, -1.05).rotation.x = Math.PI / 2 + 0.3; }
    if (st === "bun") add(new THREE.SphereGeometry(0.45, 12, 10), hairM, 0, 1.0, -0.5);
    if (st === "twinBuns") for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.34, 10, 8), hairM, sx * 0.72, 0.85, -0.2);
    if (st === "twinTails") for (const sx of [-1, 1]) { const t = add(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), hairM, sx * 1.05, -0.45, -0.35); t.rotation.z = sx * 0.2; }
  }
  // 小配件：眼鏡、鬍子、耳環
  if (!kid && r() < 0.2) { const gm = M(pick(["#2b2b2e", "#8a5a30", "#c9a24e"]), { roughness: 0.4 }); for (const sx of [-1, 1]) add(new THREE.TorusGeometry(0.17, 0.025, 6, 16), gm, sx * ex, ey, 0.98); add(new THREE.BoxGeometry(0.16, 0.03, 0.03), gm, 0, ey + 0.03, 1.0); }
  if (sex === "m" && !kid && r() < 0.25) { if (r() < 0.5) add(new THREE.SphereGeometry(1.04, 18, 8, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.6, Math.PI * 0.32), hairM, 0, 0, 0); /* 落腮鬍 */ else add(new THREE.BoxGeometry(0.42, 0.08, 0.08), hairM, 0, -0.32, 0.95); }
  if (sex === "f" && !kid && r() < 0.3) for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.06, 8, 6), M("#d9b24a", { metalness: 0.6, roughness: 0.3 }), sx * 1.0, -0.25, 0.05);
  return st;
}

export function makePerson(THREE, opt = {}, rnd = Math.random) {
  const pick = (a) => a[(rnd() * a.length) | 0];
  const M = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const top = M(opt.top || pick(TOPS)), bot = M(opt.bottom || pick(BOTTOMS)), skin = M(opt.skin || pick(SKINS), 0.7), hairC = opt.hair || pick(HAIRS);
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = false; parent.add(m); return m; };
  const knees = [];   // 熊 FIN-U58：大腿、小腿分開，坐下時小腿垂下來（腳放下來）
  const legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * 0.09, 0.84, 0); g.add(hip);
    add(new THREE.CapsuleGeometry(0.075, 0.28, 4, 8), bot, 0, -0.2, 0, hip); const kn = new THREE.Group(); kn.position.set(0, -0.42, 0); hip.add(kn); knees.push(kn);
    add(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), bot, 0, -0.2, 0, kn); add(new THREE.BoxGeometry(0.12, 0.07, 0.24), M("#1d1d1f", 0.5), 0, -0.38, 0.05, kn); return hip; });
  add(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), top, 0, 1.17, 0).scale.z = 0.7;
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * 0.22, 1.38, 0); g.add(sh);
    add(new THREE.CapsuleGeometry(0.05, 0.46, 4, 8), top, 0, -0.27, 0, sh); add(new THREE.SphereGeometry(0.05, 8, 6), skin, 0, -0.55, 0, sh); return sh; });
  add(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skin, 0, 1.48, 0);
  const head = add(new THREE.SphereGeometry(0.115, 14, 10), skin, 0, 1.6, 0);
  // 熊 FIN-U98：臉型、髮型、眼睛、眉毛、鼻子、嘴巴、配件都更多樣（和財務遊戲小鎮的 NPC 同一套）
  const HS = [[1, 1, 1], [1.08, 0.93, 1], [0.91, 1.08, 0.97], [1.04, 1.05, 1.03], [0.96, 0.98, 1.06], [1.12, 0.95, 1.04], [0.94, 1.12, 0.95], [1.02, 0.9, 1.1]][(rnd() * 8) | 0];
  head.scale.set(...HS);
  { const fg = new THREE.Group(); fg.position.set(0, 1.6, 0); fg.scale.set(0.115 * HS[0], 0.115 * HS[1], 0.115 * HS[2]); g.add(fg);
    npcFace(THREE, fg, { rnd, M: (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }), skin, hair: hairC, sex: opt.sex || (rnd() < 0.5 ? "f" : "m"), style: opt.longHair ? "long" : opt.hairStyle || null }); }
  if (!opt.scale) { const bd = [1, 1.12, 0.9, 1.05][(rnd() * 4) | 0]; g.scale.set(bd, 1, bd); }
  if (opt.scale) g.scale.setScalar(opt.scale);
  g.userData = { legs, knees, arms, head, phase: rnd() * 6 };
  if (!opt.noUmbrella) { addUmbrella(THREE, g, rnd); g.userData.umbOn = rainOn; g.userData.umb.visible = rainOn; }
  return g;
}

export function animatePerson(p, t, speed) {   // speed：每秒走幾公尺（0＝站著）
  const u = p.userData, sw = speed > 0.05 ? Math.sin(t * 7.5 * Math.min(1.4, speed / 1.2) + u.phase) * 0.55 : 0;
  if (u.sitting) return;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.7; u.arms[1].rotation.x = u.umbOn ? -2.6 : sw * 0.7;   // 撐傘：右手舉起來握著傘（熊 FIN-U53）
  if (u.umbOn && u.umb && u.handL && u.umb.visible) { const arm = u.arms[1]; arm.updateWorldMatrix(true, false); const w = arm.localToWorld(u.umb.position.clone().copy(u.handL)); p.worldToLocal(w); u.umb.position.copy(w); }
}

export function sit(p) {   // 坐姿：大腿往前、小腿垂下（簡化成整條腿往前抬）；坐著就把傘收起來
  const u = p.userData; u.sitting = true;
  u.legs.forEach(l => { l.rotation.x = -1.45; }); (u.knees || []).forEach(k => { k.rotation.x = 1.45; });
  u.arms.forEach(a => { a.rotation.x = -0.6; });
  if (u.umb) u.umb.visible = false;
}
export function stand(p) {   // 站起來
  const u = p.userData; u.sitting = false;
  u.legs.forEach(l => { l.rotation.x = 0; }); (u.knees || []).forEach(k => { k.rotation.x = 0; }); u.arms.forEach(a => { a.rotation.x = 0; });
  if (u.umb) u.umb.visible = !!u.umbOn;
}

/* 一群走來走去的路人：pickPoint() 回傳下一個目的地（THREE.Vector3） */
export function makeCrowd(THREE, parent, n, pickPoint, rnd = Math.random, canWalk = null) {   // canWalk(x, z)：熊 FIN-U80——路人不穿過牆和台階
  const people = [];
  for (let i = 0; i < n; i++) {
    const p = makePerson(THREE, { longHair: rnd() < 0.4 }, rnd);
    p.position.copy(pickPoint()); parent.add(p);
    people.push({ p, to: pickPoint(), speed: 1.0 + rnd() * 0.5, wait: rnd() * 3 });
  }
  const dir = new THREE.Vector3();
  return {
    people,
    update(dt, t, avoid) {   // avoid：她（人偶）的世界座標——路人走到她旁邊會繞開，不會穿過去（熊 FIN-U53）
      const me = avoid ? parent.worldToLocal(avoid.clone()) : null;
      for (const w of people) {
        if (w.wait > 0) { w.wait -= dt; animatePerson(w.p, t, 0); continue; }
        dir.subVectors(w.to, w.p.position); dir.y = 0;
        const d = dir.length();
        if (d < 0.4) { w.to = pickPoint(); w.wait = rnd() < 0.35 ? 1 + rnd() * 4 : 0; continue; }
        if (me) { const ax = w.p.position.x - me.x, az = w.p.position.z - me.z, ad = Math.hypot(ax, az);
          if (ad < 1.4) { if (ad < 0.5) { w.wait = 0.6; animatePerson(w.p, t, 0); continue; } dir.multiplyScalar(1 / d); const side = (dir.x * az - dir.z * ax) > 0 ? 1 : -1; dir.x += (ax / ad * 0.8 - az / ad * side * 1.2); dir.z += (az / ad * 0.8 + ax / ad * side * 1.2); const l = Math.hypot(dir.x, dir.z); dir.multiplyScalar(d / l); } }
        dir.multiplyScalar(Math.min(d, w.speed * dt) / d);
        if (canWalk && !canWalk(w.p.position.x + dir.x, w.p.position.z + dir.z)) {   // 前面擋住：換個角度繞；繞不過就換一個目的地
          let ok = false; for (const a of [0.6, -0.6, 1.2, -1.2]) { const c = Math.cos(a), s = Math.sin(a), rx = dir.x * c - dir.z * s, rz = dir.x * s + dir.z * c;
            if (canWalk(w.p.position.x + rx, w.p.position.z + rz)) { dir.x = rx; dir.z = rz; ok = true; break; } }
          if (!ok) { w.to = pickPoint(); w.wait = 0.4; animatePerson(w.p, t, 0); continue; } }
        w.p.position.add(dir);
        { const want = Math.atan2(dir.x, dir.z); let da = want - w.p.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); w.p.rotation.y += Math.max(-dt * 5, Math.min(dt * 5, da)); }   // 熊 FIN-U105：慢慢轉身（以前繞開她時每一幀左右急轉，看起來在閃）
        animatePerson(w.p, t, w.speed);
      }
    },
  };
}
