/* 高架軌道與列車：三條高度不同、互相交錯的線；車廂是拉絲質感的銀色金屬，搭車的那列有車廂內部（座椅、扶手、乘客）。 */
import { makePerson, sit, addFolded } from "./city-people.js";

export function buildLines(ctx, STATION, STATION2) {
  const { THREE, scene, C, glow } = ctx;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const LINES = [
    { name: "A", color: "#f2c14e", pts: [V(STATION.x + 10, STATION.y, STATION.z + 60), V(STATION.x + 10, STATION.y, STATION.z - 20), V(50, 16, -150), V(18, 34, -300), V(C.x, 40, C.z), V(-60, 40, C.z - 70), V(-160, 30, C.z - 160)] },
    { name: "B", color: "#8fe6ff", pts: [V(-420, 58, -260), V(-180, 64, -360), V(C.x, 70, C.z - 20), V(180, 62, -520), V(420, 54, -640)] },
    // S 線（星門線，熊 2026-11-14）：從家這邊的 ASTRALIS 出發，經過湖、森林和水晶塔，從另一邊進中央車站
    ...(STATION2 ? [{ name: "S", color: "#b48cff", pts: [V(STATION2.x - 2, STATION2.y, STATION2.z + 60), V(STATION2.x - 2, STATION2.y, STATION2.z - 10), V(-200, 26, -60), V(-215, 34, -170), V(-170, 44, -300), V(-80, 42, -400), V(C.x, 40, C.z), V(90, 44, C.z - 70)] }] : []),
    { name: "C", color: "#ff9ad8", loop: true, pts: Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return V(C.x + Math.cos(a) * 95, 92 + Math.sin(a * 2) * 8, C.z + Math.sin(a) * 95); }) },
  ];
  const beam = new THREE.MeshStandardMaterial({ color: "#cfd3d9", roughness: 0.55, metalness: 0.35 });
  const pillars = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.2, 1.6, 1, 12), beam, 420); let pc = 0;
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), glows = [];
  LINES.forEach(line => {
    line.curve = new THREE.CatmullRomCurve3(line.pts, !!line.loop, "centripetal");
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(line.curve, 260, 1.6, 8, !!line.loop), beam));
    const strip = new THREE.Mesh(new THREE.TubeGeometry(line.curve, 260, 0.3, 5, !!line.loop), glow(line.color)); strip.position.y = 1.7; scene.add(strip); glows.push(strip);
    line.len = line.curve.getLength();
    line.low = line.name === "A" ? -6 : line.name === "S" ? -11 : 0;   // 下層軌道：一般列車走這層，搭的那一列走上層
    if (line.low) { const lowC = new THREE.CatmullRomCurve3(line.pts.map(p => p.clone().setY(p.y + line.low)), !!line.loop, "centripetal"); scene.add(new THREE.Mesh(new THREE.TubeGeometry(lowC, 260, 1.2, 8, !!line.loop), beam)); const ls = new THREE.Mesh(new THREE.TubeGeometry(lowC, 260, 0.25, 5, !!line.loop), glow(line.color)); ls.position.y = 1.4; scene.add(ls); glows.push(ls); }
    for (let d = 20; d < line.len && pc < 420; d += 34) { const p = line.curve.getPointAt(d / line.len); if (p.y < 3) continue; pillars.setMatrixAt(pc++, m4.compose(V(p.x, p.y / 2, p.z), q0, V(1, p.y, 1))); }
  });
  // 環狀高架道路：兩層，上面有車流光點
  const rings = [{ r: 170, y: 22, tilt: 0 }, { r: 115, y: 50, tilt: 0.05 }], cars = [];
  const deckM = new THREE.MeshStandardMaterial({ color: "#3a3e45", side: THREE.DoubleSide, roughness: 0.9 });
  const col = new THREE.Color();
  rings.forEach((rg, k) => {
    const deck = new THREE.Mesh(new THREE.RingGeometry(rg.r - 7, rg.r + 7, 128), deckM); deck.rotation.x = -Math.PI / 2 + rg.tilt; deck.position.set(C.x, rg.y, C.z); scene.add(deck);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(rg.r + 7, 0.45, 6, 160), glow(k ? "#8fe6ff" : "#ffd59a")); edge.rotation.x = Math.PI / 2 + rg.tilt; edge.position.set(C.x, rg.y + 0.8, C.z); scene.add(edge); glows.push(edge);
    for (let i = 0; i < 36 && pc < 420; i++) { const a = i / 36 * Math.PI * 2; pillars.setMatrixAt(pc++, m4.compose(V(C.x + Math.cos(a) * rg.r, rg.y / 2, C.z + Math.sin(a) * rg.r), q0, V(1.4, rg.y, 1.4))); }
    const n = ctx.SMALL ? 60 : 120, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 1.1, 4.2), new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }), n);
    for (let i = 0; i < n; i++) im.setColorAt(i, col.set(i % 2 ? "#ff5a4a" : "#fff4dc"));
    scene.add(im); cars.push({ im, rg, n, phase: Array.from({ length: n }, () => Math.random() * Math.PI * 2), speed: Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1) * (0.05 + Math.random() * 0.04)) });
  });
  pillars.count = pc; pillars.instanceMatrix.needsUpdate = true; scene.add(pillars);
  return { LINES, glows, cars };
}

/* 銀色金屬：細細的橫向拉絲紋路，配合環境反射才會有金屬光澤 */
export function metalMaterial(ctx) {
  const { THREE, canvasTex } = ctx;
  const brushed = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#c8ccd2"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { g.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "70,75,85"},${.04 + Math.random() * .09})`; g.fillRect(0, y, w, 1); }
  });
  brushed.repeat.set(4, 1);
  return new THREE.MeshPhysicalMaterial({ color: "#eef1f5", map: brushed, metalness: 0.85, roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1.8 });
}

export function makeTrain(ctx, color, metal, { interior = false, rnd = Math.random } = {}) {
  const { THREE, scene, glow } = ctx;
  const g = new THREE.Group(); scene.add(g);
  // 車廂斷面：圓角長方形（寬 2.9、高 3.1），沿 z 擠出 11 公尺
  const shape = new THREE.Shape(), w = 1.45, h = 3.1, r = 0.8;
  shape.moveTo(-w, 0); shape.lineTo(w, 0); shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h); shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r); shape.lineTo(-w, 0);
  const body = new THREE.ExtrudeGeometry(shape, { depth: 11, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 3 }); body.translate(0, 0, -5.5);
  const glass = new THREE.MeshPhysicalMaterial({ color: "#1c2430", metalness: 0.4, roughness: 0.06, clearcoat: 1, emissive: "#d6e4ff", emissiveIntensity: 0, side: THREE.FrontSide });
  const doorM = new THREE.MeshStandardMaterial({ color: "#9aa1aa", metalness: 0.9, roughness: 0.35 });
  const cars = [];
  for (let k = 0; k < 3; k++) {
    const car = new THREE.Group(); car.position.z = -k * 12; g.add(car); cars.push(car);
    car.add(new THREE.Mesh(body, metal));
    for (const sx of [-1, 1]) {   // 窗帶（從外面看是深色玻璃；從裡面看是透明的，看得到外面）
      const win = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.15), glass); win.position.set(sx * (w + 0.21), 1.75, 0); win.rotation.y = sx * Math.PI / 2; car.add(win);
      for (const dz of [-3.2, 3.2]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), doorM); d.position.set(sx * (w + 0.215), 1.25, dz); d.rotation.y = sx * Math.PI / 2; car.add(d); }
      const band = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 0.18), glow(color)); band.position.set(sx * (w + 0.22), 0.55, 0); band.rotation.y = sx * Math.PI / 2; car.add(band);
    }
  }
  if (interior) buildInterior(ctx, cars[0], metal, rnd);
  g.userData = { glass, cars };
  return g;
}

/* 車廂內部：長條座椅、銀色立柱與扶手、車頂燈帶、乘客。窗戶的位置留空，看得到外面的城市 */
function buildInterior(ctx, car, metal, rnd) {
  const { THREE } = ctx;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); car.add(m); return m; };
  const panel = new THREE.MeshStandardMaterial({ color: "#e8eaee", roughness: 0.6, side: THREE.DoubleSide });
  const floorM = new THREE.MeshStandardMaterial({ color: "#5b6068", roughness: 0.9 });
  const seatM = new THREE.MeshStandardMaterial({ color: "#2f4b7a", roughness: 0.85 });
  const W = 1.38, L = 10.6;
  add(new THREE.PlaneGeometry(2 * W, L), floorM, 0, 0.05, 0).rotation.x = -Math.PI / 2;
  for (const sx of [-1, 1]) {
    add(new THREE.PlaneGeometry(L, 1.15), panel, sx * W, 0.6, 0).rotation.y = sx * Math.PI / 2;     // 窗下的牆
    add(new THREE.PlaneGeometry(L, 0.6), panel, sx * W, 2.65, 0).rotation.y = sx * Math.PI / 2;     // 窗上的牆
    add(new THREE.BoxGeometry(0.5, 0.12, 8), seatM, sx * (W - 0.3), 0.5, 0);                         // 長條座椅
    add(new THREE.BoxGeometry(0.12, 0.6, 8), seatM, sx * (W - 0.06), 0.85, 0);
    for (let z = -4.5; z <= 4.5; z += 1.5) add(new THREE.BoxGeometry(0.06, 1.15, 0.08), metal, sx * W, 1.75, z);   // 窗框
    add(new THREE.CylinderGeometry(0.025, 0.025, L, 8), metal, sx * 0.75, 2.6, 0).rotation.x = Math.PI / 2;            // 吊環扶手
  }
  add(new THREE.PlaneGeometry(2 * W, L), panel, 0, 2.95, 0).rotation.x = Math.PI / 2;
  const lightM = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#f4f7ff", emissiveIntensity: 1.2 });
  for (const sx of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.18, 0.04, L - 1), lightM, sx, 2.92, 0);
  for (const z of [-3, 0, 3]) add(new THREE.CylinderGeometry(0.035, 0.035, 2.9, 10), metal, 0, 1.45, z);   // 中間的立柱
  const lamp = new THREE.PointLight("#f2f5ff", 6, 8, 1.6); lamp.position.set(0, 2.6, 0); car.add(lamp);
  // 乘客：坐著的、站著抓扶手的。熊 FIN-U53：在車廂裡傘收起來放旁邊；每一側有時候坐一個人、有時候兩個人（隨機）
  const seated = [];
  for (let i = 0; i < 4; i++) { const p = makePerson(THREE, { longHair: rnd() < 0.5, noUmbrella: true }, rnd); sit(p); const sx = i < 2 ? 1 : -1; p.rotation.y = -sx * Math.PI / 2; car.add(p);
    const f = addFolded(THREE, car, 0, 0.05, 0); f.rotation.z = -sx * 0.16; seated.push({ p, f, sx }); }   // 長直傘：站在地上、靠在座椅前緣（不插進座椅）
  car.userData.W = W; car.userData.L = L;
  const standing = []; for (let i = 0; i < 2; i++) { const p = makePerson(THREE, { noUmbrella: true }, rnd); p.position.set(0.3, 0.05, i ? 3.7 : -1.6); p.rotation.y = Math.PI * (i ? 0.5 : -0.5); p.userData.arms[0].rotation.x = -2.6; car.add(p); standing.push(p); }
  car.userData.seated = seated; car.userData.standing = standing; car.userData.W = W; reseat(car, rnd);
}
/* 重新安排坐的人：每一側 1～2 個人，坐在不同的位置；keep：她自己坐的位置（不要有人坐在那裡） */
/* 特別的節日：車廂鋪花紋地板、扶手掛小飾品（熊 FIN-U58）。kind：xmas／newyear／valentine／halloween */
export function decorate(THREE, car, kind) {
  if (!car.userData.W || car.userData.decor) return; const W = car.userData.W, L = car.userData.L, g = new THREE.Group(); car.add(g); car.userData.decor = g;
  const C = { xmas: ["#2f6b4a", "#d63a3a", "#ffd75e"], newyear: ["#9a1f2a", "#ffd75e", "#ffffff"], valentine: ["#f7c6d6", "#e0457b", "#ffffff"], halloween: ["#3a2a4a", "#ff8a1e", "#ffd75e"] }[kind] || ["#2f4b7a", "#ffd75e", "#ffffff"];
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const c = cv.getContext("2d"); c.fillStyle = C[0]; c.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 32 + (y % 2 ? 16 : 0) + 8, cy = y * 32 + 16; c.fillStyle = (x + y) % 2 ? C[1] : C[2]; c.beginPath();
    if (kind === "valentine") { c.moveTo(cx, cy + 6); c.bezierCurveTo(cx - 10, cy - 2, cx - 4, cy - 10, cx, cy - 4); c.bezierCurveTo(cx + 4, cy - 10, cx + 10, cy - 2, cx, cy + 6); }
    else for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 3 : 7; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.fill(); }
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 8); tx.colorSpace = THREE.SRGBColorSpace;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(2 * W - 0.8, L - 0.4), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.06; g.add(fl);
  const strM = new THREE.MeshStandardMaterial({ color: "#d9d9d9" });
  for (const sx of [-0.75, 0.75]) for (let z = -L / 2 + 1; z < L / 2 - 0.8; z += 1.3) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.22, 4), strM); s.position.set(sx, 2.49, z); g.add(s);
    const col = C[1 + (Math.round(z * 3) & 1)], m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: kind === "xmas" || kind === "newyear" ? 0.5 : 0.1, emissive: col, emissiveIntensity: 0.15 });
    const o = new THREE.Mesh(kind === "valentine" ? new THREE.OctahedronGeometry(0.07) : new THREE.SphereGeometry(0.07, 12, 10), m); o.position.set(sx, 2.33, z); if (kind === "halloween") o.scale.set(1.2, 0.85, 1.2); g.add(o); }
}
export function reseat(car, rnd = Math.random, keep = null) {
  const S = car.userData.seated; if (!S) return; const W = car.userData.W, SLOTS = [-3.6, -2.2, -0.8, 0.6, 2.0, 3.4];
  if (keep) car.userData.standing.forEach(p => { p.position.x = -keep.sx * 0.3; });   // 站著的人站到另一邊，她下車的路是空的
  for (const sx of [1, -1]) { const ps = S.filter(q => q.sx === sx), n = rnd() < 0.5 ? 1 : 2, free = SLOTS.filter(z => !(keep && keep.sx === sx && z < keep.z + 1.1));   // 她那一側：只坐在她後面（她往車門走的路上沒有人）
    ps.forEach((q, k) => { const show = k < n; q.p.visible = show; q.f.parent && (q.f.userData.hide = !show);
      if (!show) { q.f.position.y = -50; return; } const z = free.splice((rnd() * free.length) | 0, 1)[0];
      q.p.position.set(sx * (W - 0.45), -0.3, z); q.f.position.set(sx * (W - 0.66), 0.05, z + 0.42); }); }
}

export function placeOnLine(THREE, g, line, u, dir = 1, yOff = 0) {   // yOff：下層軌道（熊 FIN-U58：兩台車不會互相穿過——一台在上面、一台在下面）
  const uu = line.loop ? ((u % 1) + 1) % 1 : Math.min(0.999, Math.max(0.001, u));
  const p = line.curve.getPointAt(uu), t = line.curve.getTangentAt(uu).multiplyScalar(dir);
  g.position.set(p.x, p.y + 1.7 + yOff, p.z); g.lookAt(p.x - t.x, p.y + 1.7 + yOff - t.y, p.z - t.z);
}
