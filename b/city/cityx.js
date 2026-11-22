/* 每座城市多一件每天的小事（2026-11-21，熊：「城市可以再多開發新的功能或地點」）
 * 三個發光的小東西（風鈴、雨滴、貝殼、蘑菇、路燈……）散在一個地方；走近點一下就亮起來，三個都亮了就完成，
 * 獎勵由 FinSave.cityxDo(city, key) 給（每天一次）。完成後今天就保持亮著。
 * 用法：const tr = makeTrio({ THREE, scene, pickables, spots: [[x,y,z],…], color, kind: "cx" });
 *       點到 userData.kind === "cx" 的東西 → tr.tap(ref, [px, pz])；每一格 tr.tick(t)。 */
export function makeTrio(o) {
  const { THREE, scene, pickables, spots, color = "#ffe39a", kind = "cx", reach = 4.5, parent = scene, onLight, onAll, done = false } = o;
  const glowTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const c = cv.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const items = spots.map(([x, y, z], i) => {
    const g = new THREE.Group(); g.position.set(x, y, z); ((o.parents && o.parents[i]) || parent).add(g);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: "#3a3f52", emissive: color, emissiveIntensity: done ? 1.2 : 0.12, roughness: 0.4 })); g.add(core);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: done ? 0.8 : 0.18, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(1.6); g.add(halo);
    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pick.userData = { kind, ref: i }; g.add(pick); pickables.push(pick);
    return { g, core, halo, lit: !!done, ph: i * 2.1, y0: y };
  });
  let all = !!done;
  const api = {
    items, get done() { return all; },
    pos: (i) => { const p = new THREE.Vector3(); items[i].g.getWorldPosition(p); return p; },
    next: () => items.findIndex((q) => !q.lit),
    /* p = [x, z] 玩家在世界座標的位置（null＝不檢查距離） */
    tap(i, p) { const it = items[i]; if (!it || it.lit || all) return "lit"; if (p) { const w = api.pos(i); if (Math.hypot(w.x - p[0], w.z - p[1]) > reach) return "far"; }
      it.lit = true; it.core.material.emissiveIntensity = 1.2; it.halo.material.opacity = 0.85; const n = items.filter((q) => q.lit).length;
      try { onLight && onLight(n, items.length); } catch (e) { }
      if (n === items.length) { all = true; try { onAll && onAll(); } catch (e) { } } return "ok"; },
    tick(t) { for (const it of items) { it.g.position.y = it.y0 + Math.sin(t * 1.6 + it.ph) * 0.12; if (!it.lit) it.halo.material.opacity = 0.14 + (Math.sin(t * 2.4 + it.ph) + 1) * 0.08; } },
  };
  return api;
}
