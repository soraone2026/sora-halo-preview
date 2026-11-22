/* 寶石與小遊戲入口（熊 2026-11-13）。
 * - 伺服器每 2 小時決定一批寶石（/api/city/world），這裡用每顆的 seed 在廣場或圖書館挑一個走得到的位置。
 * - 廣場的寶石在你到達後的幾十秒內，一顆一顆像流星一樣從天上掉下來；圖書館的寶石放在地上發光。
 * - 走到寶石旁邊就自動撿起來（POST /api/city/gems/<id>）。
 * - 小遊戲入口是一個會轉的光環，走進去就開始小遊戲（city-games.js）。 */
export const GEM_KINDS = {
  ruby: { color: "#e0115f", name: ["紅寶石", "Ruby"] },
  sapphire: { color: "#1f5fd6", name: ["藍寶石", "Sapphire"] },
  emerald: { color: "#1fa463", name: ["祖母綠", "Emerald"] },
  amethyst: { color: "#9b5de5", name: ["紫水晶", "Amethyst"] },
  topaz: { color: "#f5b82e", name: ["黃玉", "Topaz"] },
  star: { color: "#eef4ff", name: ["星鑽", "Star diamond"] },
};
export const GAME_INFO = {
  meteor: { color: "#8fe6ff", name: ["單字流星", "Word Meteors"] },
  match: { color: "#ff9ad8", name: ["寶石翻牌", "Gem Match"] },
  spell: { color: "#f2c14e", name: ["鐘樓拼字", "Tower Spelling"] },
};

const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;

export function createFinds(ctx, { plaza, lib, api, toast, L, onBag, openGame }) {
  const { THREE, canvasTex, C } = ctx;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // 寶石的形狀：明亮式切工（下面尖、上面平），用平面著色讓每個切面反光不一樣
  const cut = new THREE.LatheGeometry([V(0, -0.42, 0), V(0.12, -0.29, 0), V(0.25, -0.12, 0), V(0.36, 0.02, 0), V(0.36, 0.055, 0), V(0.3, 0.12, 0), V(0.22, 0.17, 0), V(0.15, 0.2, 0), V(0, 0.2, 0)], 16);   // 熊 2026-11-14：多幾圈切面，更像真的明亮式切工
  const halo = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,.9)"); r.addColorStop(0.3, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const mats = {};
  const gemMat = (kind) => mats[kind] || (mats[kind] = new THREE.MeshPhysicalMaterial({
    color: GEM_KINDS[kind].color, flatShading: true, metalness: 0.15, roughness: 0.0, ior: 2.3, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.0,
    emissive: GEM_KINDS[kind].color, emissiveIntensity: 0.16, envMapIntensity: 3.2, iridescence: kind === "star" ? 1 : 0.45, iridescenceIOR: 1.9, transparent: true, opacity: 0.94, sheen: 0 }));   // 亮暗分明、透一點
  const trailGeo = new THREE.CylinderGeometry(0.02, 0.22, 9, 8, 1, true); trailGeo.translate(0, 4.5, 0);
  const beamGeo = new THREE.CylinderGeometry(0.16, 0.3, 7, 12, 1, true); beamGeo.translate(0, 3.5, 0);
  const beamTex = canvasTex(4, 64, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });

  function makeGem(kind) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(cut, gemMat(kind)); m.castShadow = true; m.scale.setScalar(1.45); g.add(m);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: GEM_KINDS[kind].color, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    h.scale.set(1.8, 1.8, 1); g.add(h);
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: GEM_KINDS[kind].color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    g.add(trail);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 32), new THREE.MeshBasicMaterial({ color: GEM_KINDS[kind].color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    // 光柱：遠遠就看得到地上有寶石
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: GEM_KINDS[kind].color, map: beamTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    beam.visible = false; g.add(beam);
    g.userData = { m, h, trail, ring, beam };
    return g;
  }

  function label(text, color) {
    const t = canvasTex(512, 96, (g, w, h) => { g.fillStyle = "rgba(10,14,28,.78)"; g.beginPath(); g.roundRect(4, 8, w - 8, h - 16, 36); g.fill(); g.strokeStyle = color; g.lineWidth = 4; g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 40px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 2); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set(4.2, 0.79, 1); return s;
  }

  function makePortal(game) {
    const info = GAME_INFO[game], g = new THREE.Group();
    const ringM = new THREE.MeshStandardMaterial({ color: "#d9dde3", metalness: 0.9, roughness: 0.25, emissive: info.color, emissiveIntensity: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.12, 12, 48), ringM); ring.position.y = 1.6; ring.castShadow = true; g.add(ring);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.9, fog: false })); inner.position.y = 1.6; g.add(inner);
    const U = { t: { value: 0 }, c: { value: new THREE.Color(info.color) } };
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float t; uniform vec3 c; varying vec2 vU; void main(){ float r = length(vU) * 2.0; float a = atan(vU.y, vU.x); float s = 0.5 + 0.5 * sin(a * 5.0 + r * 9.0 - t * 3.0); float k = smoothstep(1.0, 0.2, r) * (0.25 + 0.55 * s); gl_FragColor = vec4(c * k + vec3(k * 0.25), k); }" }));
    swirl.position.y = 1.6; g.add(swirl);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.18, 32), new THREE.MeshStandardMaterial({ color: "#3b3f46", metalness: 0.7, roughness: 0.4 })); base.position.y = 0.09; base.receiveShadow = true; g.add(base);
    const tag = label("🎮 " + L(...info.name), info.color); tag.position.y = 3.55; g.add(tag);
    g.userData = { ring, inner, U, swirl, tag };
    return g;
  }

  const live = new Map();   // id → { kind, obj, world, state, dropAt, ... }
  let portal = null, bag = null, nextAt = 0, arrivedAt = -1, busy = false;

  function spotPlaza(seed, pad) { const r = seeded(seed); for (let k = 0; k < 60; k++) { const a = r() * Math.PI * 2, d = 8 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d; if (plaza.free(x, z, pad)) return [x, z]; } return [0, 40]; }
  function spotLib(seed) { const r = seeded(seed), B = lib.bounds; let x = 0, z = 0;   // FIN-U186（codex）：不要長在桌子、書架、櫃台裡（撿不到）
    for (let k = 0; k < 40; k++) { x = (r() * 2 - 1) * (B.x - 1.5); z = (lib.bounds.z0 - lib.O.z) + 6 + r() * 28; if (![[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([dx, dz]) => lib.blocked(lib.O.x + x + dx, lib.O.z + z + dz))) break; }
    return [x, z]; }

  async function refresh() {
    const r = await api("GET", "/api/city/world");
    if (!r.ok) return;
    nextAt = r.data.next_at; bag = r.data.bag; onBag(bag);
    const want = new Set(r.data.gems.map(g => g.id));
    for (const [id, g] of live) if (!want.has(id)) { g.obj.parent.remove(g.obj); live.delete(id); }
    r.data.gems.forEach(gem => {
      if (live.has(gem.id)) return;
      const obj = makeGem(gem.kind), inLib = gem.place === "library";
      const [x, z] = inLib ? spotLib(gem.seed) : spotPlaza(gem.seed, 1.0);
      obj.position.set(x, inLib ? 0.9 : 0.12, z);
      (inLib ? lib.group : plaza.group).add(obj);
      live.set(gem.id, { ...gem, obj, inLib, base: obj.position.clone(), state: inLib ? "rest" : "wait", dropAt: 0, phase: seeded(gem.seed)() * 6 });
      if (!inLib) obj.visible = false;
    });
    const p = r.data.portals[0];
    if (portal && (!p || p.id !== portal.id)) { portal.obj.parent.remove(portal.obj); portal = null; }
    if (p && !portal) {
      const obj = makePortal(p.game), [x, z] = spotPlaza(p.seed, 2.2);
      obj.position.set(x, 0.12, z); obj.rotation.y = Math.atan2(-x, -z); plaza.group.add(obj);   // 光環正面朝廣場中心
      portal = { ...p, obj, near: false };
    }
    if (arrivedAt >= 0) scheduleDrops(performance.now() / 1000);
  }
  function scheduleDrops(now) {   // 到廣場後，還沒掉下來的寶石在 2–40 秒內一顆一顆掉下來
    let i = 0;
    for (const g of live.values()) if (!g.inLib && g.state === "wait" && !g.dropAt) g.dropAt = now + 2 + (i++) * (6 + seeded(g.seed + 7)() * 8);
  }

  async function pick(id, g) {
    g.state = "taking"; g.t = 0;
    const r = await api("POST", `/api/city/gems/${id}`, {});
    if (!r.ok) { if (r.status === 409 || r.status === 404) { g.state = "gone"; } else g.state = "rest"; return; }
    bag = r.data.bag; onBag(bag);
    const k = GEM_KINDS[g.kind];
    const ore = window.FinSave && FinSave.addOre(g.kind);   // 一份存檔：同時變成一顆未鑑定原石，放進家裡的元液瓶
    toast(L(`撿到一顆${k.name[0]}！（寶石 ${bag.total} 顆）`, `You found a ${k.name[1]}! (${bag.total} gems)`) + (ore ? L("　也放一顆原石進家裡的元液瓶了", "  An ore went into your essence bottle at home too") : ""));
  }

  const tmp = V(0, 0, 0);
  function update(dt, t, mode, av) {
    if (Date.now() / 1000 > nextAt && nextAt && !busy) { busy = true; refresh().finally(() => { busy = false; }); }
    const inStreet = mode === "street", inLib = mode === "inside";
    if (inStreet && arrivedAt < 0) { arrivedAt = t; scheduleDrops(t); }
    if (!inStreet && !inLib && arrivedAt >= 0 && mode === "town") arrivedAt = -1;
    for (const [id, g] of live) {
      const o = g.obj, u = o.userData;
      if (g.state === "wait") { if (g.dropAt && t >= g.dropAt && inStreet) { g.state = "fall"; g.t = 0; o.visible = true; u.trail.material.opacity = 0.8; } continue; }
      if (g.state === "fall") {   // 像流星一樣從天上掉下來，落地有一圈光
        g.t += dt; const k = Math.min(1, g.t / 1.6);
        o.position.set(g.base.x, 0.9 + (1 - k * k) * 46, g.base.z); u.m.rotation.y += dt * 9;
        u.trail.material.opacity = 0.8 * (1 - k * k); u.trail.scale.y = 1 - k;
        if (k >= 1) { g.state = "rest"; g.t = 0; u.trail.visible = false; u.ring.material.opacity = 0.9; u.beam.visible = !g.inLib; }
        continue;
      }
      if (g.state === "rest") {
        u.m.rotation.y += dt * 1.4; o.position.y = g.base.y + (g.inLib ? 0 : 0.78) + Math.sin(t * 2 + g.phase) * 0.12;
        u.h.material.opacity = 0.55 + Math.sin(t * 3 + g.phase) * 0.2;
        if (u.beam.visible) { u.beam.position.y = -o.position.y + 0.12; u.beam.material.opacity = 0.4 + Math.sin(t * 2.4 + g.phase) * 0.15; }
        if (u.ring.material.opacity > 0) { g.t += dt; u.ring.scale.setScalar(1 + g.t * 6); u.ring.material.opacity = Math.max(0, 0.9 - g.t * 1.2); u.ring.position.y = -o.position.y + 0.15; }
        if ((inStreet && !g.inLib) || (inLib && g.inLib)) {
          o.getWorldPosition(tmp);
          if (Math.hypot(tmp.x - av.position.x, tmp.z - av.position.z) < 1.4) pick(id, g);
        }
        continue;
      }
      if (g.state === "taking") { g.t += dt; o.position.y += dt * 5; const s = Math.max(0.01, 1 - g.t * 1.6); o.scale.setScalar(s); u.m.rotation.y += dt * 14; }
      if (g.state === "gone" || (g.state === "taking" && g.t > 0.7)) { o.parent.remove(o); live.delete(id); }
    }
    if (portal) {
      const u = portal.obj.userData; u.U.t.value = t; u.inner.rotation.z = t * 0.8; u.tag.position.y = 3.55 + Math.sin(t * 1.5) * 0.08;
      if (inStreet) {
        portal.obj.getWorldPosition(tmp);
        const near = Math.hypot(tmp.x - av.position.x, tmp.z - av.position.z) < 1.3;
        if (near && !portal.near) { const p = portal; openGame(p.game, p.id, () => { if (portal === p) { p.obj.parent.remove(p.obj); portal = null; } }); }
        portal.near = near;
      }
    }
  }

  return { refresh, update, bag: () => bag, portalObj: () => (portal ? portal.obj : null), debug: () => ({ gems: [...live.values()].map(g => { g.obj.getWorldPosition(tmp); return { id: g.id, kind: g.kind, state: g.state, inLib: g.inLib, x: tmp.x, z: tmp.z }; }),
    portal: portal && (portal.obj.getWorldPosition(tmp), { id: portal.id, game: portal.game, x: tmp.x, z: tmp.z }) }), dropNow: () => { for (const g of live.values()) if (g.state === "wait") g.dropAt = 0.001; } };
}
