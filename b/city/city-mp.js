/* 城市裡的其他玩家（熊 2026-11-17，FIN-U84）：每 0.8 秒把自己的位置送給伺服器，拿回同一線的其他玩家。
 * 伺服器把城市分成很多線（每線最多 12 人，好友優先排同一線）；只有在廣場、街上、圖書館裡才互相看得到（搭車時不顯示）。
 * 只送名字、人偶外觀（衣服和頭髮顏色）、位置；沒登入或不是網站版就什麼都不做。 */
import { makePerson, animatePerson } from "./city-people.js";
import { openPlayerCard, showWaves } from "./playercard.js";   /* 熊 2026-11-21：點別的玩家的名牌 → 玩家小卡 */

const SHOWN = ["street", "inside", "alight"];

export function cityMP(THREE, scene, camera, getMe) {
  const others = {}, V = new THREE.Vector3();
  let line = null, said = false, lookAt = 0, off = false;
  const look = () => { try { const P = window.parent !== window ? window.parent : null; return P && P.__finLook ? P.__finLook() : null; } catch { return null; } };
  async function step() {
    if (off) return;
    try {
      const me = getMe();
      if (!document.hidden && me) {
        const body = { zone: "city", x: me.x, y: me.y, z: me.z, ry: me.ry, m: me.mode };
        if (Date.now() - lookAt > 30000) { const lk = look(); if (lk) body.look = lk; lookAt = Date.now(); }
        const r = await fetch("/api/world/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (r.status === 401 || r.status === 404) { off = true; return; }
        if (r.ok) { const d = await r.json(); line = d.line; sync(d.others || []); showWaves(d.waves);
          if (!said && line != null) { said = true; const n = (d.others || []).length; window.__cityToast && window.__cityToast(n ? `🌐 城市第 ${line} 線：這裡還有 ${n} 位玩家` : `🌐 城市第 ${line} 線：其他玩家來了會出現在這裡`); } }
      }
    } catch { }
    setTimeout(step, document.hidden ? 4000 : 800);
  }
  function sync(list) {
    const seen = new Set();
    for (const o of list) {
      if (!SHOWN.includes(o.m)) continue;
      seen.add(o.uid); let r = others[o.uid];
      if (!r) {
        const lk = o.look || {};
        const p = makePerson(THREE, { top: lk.shirt, bottom: lk.pants, hair: lk.hairColor, skin: lk.skin, longHair: lk.sex !== "m", scale: 1 });
        p.position.set(o.x, o.y || 0.12, o.z); scene.add(p);
        const tag = document.createElement("div"); tag.className = "metag other"; tag.innerHTML = `<i class="dot"></i><span></span>`; tag.querySelector("span").textContent = o.name; document.body.appendChild(tag);
        tag.style.pointerEvents = "auto"; tag.style.cursor = "pointer"; tag.addEventListener("click", (e) => { e.stopPropagation(); openPlayerCard(o.uid, o.name); });
        r = others[o.uid] = { p, tag, x: o.x, y: o.y || 0.12, z: o.z, ry: o.ry || 0 };
      }
      r.tx = o.x; r.ty = o.y || 0.12; r.tz = o.z; r.try = o.ry || 0;
    }
    for (const u of Object.keys(others)) if (!seen.has(u)) { scene.remove(others[u].p); others[u].tag.remove(); delete others[u]; }
  }
  function tick(dt, t) {
    for (const r of Object.values(others)) {
      const dx = r.tx - r.x, dz = r.tz - r.z, d = Math.hypot(dx, dz);
      if (d > 8) { r.x = r.tx; r.z = r.tz; } else if (d > 0.01) { const s = Math.min(d, Math.max(2.4, d * 2.5) * dt); r.x += dx / d * s; r.z += dz / d * s; r.ry = Math.atan2(dx, dz); }
      r.y += (r.ty - r.y) * Math.min(1, dt * 6);
      r.p.position.set(r.x, r.y, r.z); const want = d > 0.05 ? r.ry : r.try;
      r.p.rotation.y += Math.atan2(Math.sin(want - r.p.rotation.y), Math.cos(want - r.p.rotation.y)) * Math.min(1, dt * 8);
      animatePerson(r.p, t, d > 0.05 ? 1.4 : 0);
    }
  }
  function tags() {
    for (const r of Object.values(others)) {
      r.p.getWorldPosition(V); V.y += 2.05; V.project(camera);
      if (V.z > 1 || Math.abs(V.x) > 1.05 || Math.abs(V.y) > 1.05) { r.tag.style.opacity = "0"; continue; }
      r.tag.style.opacity = "1";
      r.tag.style.transform = `translate(${((V.x + 1) / 2 * innerWidth - r.tag.offsetWidth / 2).toFixed(1)}px, ${((1 - V.y) / 2 * innerHeight - r.tag.offsetHeight).toFixed(1)}px)`;
    }
  }
  step();
  return { tick, tags, count: () => Object.keys(others).length, line: () => line };
}
