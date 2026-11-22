/* 城市的生活感（熊 2026-11-13）：月台上走動的人（晚上回家）、一條比照財務遊戲小鎮的「Sora 街」、
 * 騎腳踏車和滑板車的人、少量外星人、路人偶爾用中文／日語／英文／德語聊兩句、背景聲（風、雨、軌道）、下雨、星港之環。
 * 這顆星（奧蕾莉亞）是通往外星的通道：星港之環現在先鎖著，之後從這裡出發去其他星球。 */
import { makePerson, animatePerson, makeCrowd, sit, setRain } from "./city-people.js";
import { speak } from "./city-games.js";

const TALK = {
  zh: [["今天天氣真好！", "對啊，等一下去咖啡店嗎？"], ["你也要搭捷運進城嗎？", "嗯，去圖書館借書。"], ["昨晚有流星耶！", "我也看到了，好亮！"], ["這條街的花開了。", "春天要來了吧。"]],
  ja: [["こんにちは！", "いい天気ですね。"], ["駅はどこですか？", "まっすぐ行って、右です。"], ["昨日、流れ星を見ました！", "本当？すごいですね！"], ["お疲れさまです。", "また明日！"]],
  en: [["Morning! Off to the station?", "Yep, heading downtown."], ["Did you see the shooting stars?", "I did — so bright!"], ["Nice bike!", "Thanks, it's brand new."], ["Coffee later?", "Sounds good!"]],
  de: [["Guten Tag!", "Schönes Wetter heute, oder?"], ["Fährst du in die Stadt?", "Ja, zur Bibliothek."], ["Hast du die Sternschnuppen gesehen?", "Ja, wunderschön!"], ["Bis später!", "Tschüss!"]],
};

export function buildLife(ctx, town) {
  const { THREE, scene, rnd, canvasTex, glow } = ctx;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const S = town.STATION;

  /* ---- 月台上的人：走來走去，晚上大部分回家 ---- */
  const platform = makeCrowd(THREE, scene, ctx.SMALL ? 6 : 9, () => V(S.x - 6 + rnd() * 8, S.y, S.z - 17 + rnd() * 34), rnd);

  /* ---- Sora 街：比照財務遊戲的小鎮——兩排三角屋頂的小房子、人行道、路燈，東西向（z = 34，x −58 ～ −12） ---- */
  const st = new THREE.Group(); scene.add(st);
  const SZ = 34, X0 = -58, X1 = -12, len = X1 - X0, cx = (X0 + X1) / 2;
  add(new THREE.PlaneGeometry(len, 6), M("#3b3f45", { roughness: 0.95 }), cx, 0.1, SZ, st).rotation.x = -Math.PI / 2;
  for (const dz of [-4, 4]) add(new THREE.PlaneGeometry(len, 2), M("#cfc8bb", { roughness: 0.95 }), cx, 0.12, SZ + dz, st).rotation.x = -Math.PI / 2;
  for (let x = X0 + 2; x < X1; x += 4) add(new THREE.PlaneGeometry(1.6, 0.2), M("#e8e4da"), x, 0.11, SZ, st).rotation.x = -Math.PI / 2;   // 中線
  const WALLS = ["#f2e6d8", "#dfe8e3", "#e8dccd", "#d9e2ec", "#f3d9cf", "#ece4c8"], ROOFS = ["#4a4d55", "#8a4b3a", "#5b6b5e", "#6a5a4e"];
  const winM = new THREE.MeshStandardMaterial({ color: "#2e2a24", emissive: "#f0cf98", emissiveIntensity: 0, roughness: 0.3 });
  const tri = new THREE.Shape([[-1, 0], [1, 0], [0, 0.62]].map(([x, y]) => new THREE.Vector2(x, y)));
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 1, bevelEnabled: false }); roofGeo.translate(0, 0, -0.5);
  let k = 0;
  for (const side of [-1, 1]) for (let x = X0 + 4; x < X1 - 2; x += 8.2) {
    const w = 6.4, d = 6, h = 4.6 + (k % 3) * 0.9, g = new THREE.Group(); g.position.set(x, 0, SZ + side * 9.5); g.rotation.y = side > 0 ? Math.PI : 0; st.add(g);
    add(new THREE.BoxGeometry(w, h, d), M(WALLS[k % WALLS.length], { roughness: 0.9 }), 0, h / 2, 0, g);
    const rf = add(roofGeo, M(ROOFS[k % ROOFS.length], { roughness: 0.7 }), 0, h, 0, g); rf.scale.set(w / 2 + 0.3, w / 2 + 0.3, d + 0.4);
    add(new THREE.BoxGeometry(1.1, 2.1, 0.1), M(["#7a4a36", "#3f5d7a", "#6b6b3a"][k % 3]), -1.2, 1.05, d / 2 + 0.05, g);   // 門
    for (const wx of [1.2]) add(new THREE.PlaneGeometry(1.4, 1.1), winM, wx, 1.6, d / 2 + 0.06, g);
    for (const wx of [-1.4, 1.4]) add(new THREE.PlaneGeometry(1.1, 0.9), winM, wx, h - 1.2, d / 2 + 0.06, g);
    if (k % 2 === 0) add(new THREE.BoxGeometry(1.6, 0.35, 0.4), M("#7a5a3a"), 1.2, 0.9, d / 2 + 0.3, g);                 // 窗台花箱
    k++;
  }
  const poleM = M("#2a2a2e", { metalness: 0.6, roughness: 0.4 }), headM = new THREE.MeshBasicMaterial({ color: "#ffe2a8", fog: false, transparent: true });
  for (let x = X0 + 2; x < X1; x += 9) for (const dz of [-5, 5]) { add(new THREE.CylinderGeometry(0.08, 0.1, 4, 8), poleM, x, 2, SZ + dz, st); add(new THREE.SphereGeometry(0.28, 10, 8), headM, x, 4.1, SZ + dz, st); }
  const streetCrowd = makeCrowd(THREE, scene, ctx.SMALL ? 6 : 10, () => V(X0 + 2 + rnd() * (len - 4), 0, SZ + (rnd() < 0.5 ? -4 : 4)), rnd);

  /* ---- 騎腳踏車、玩滑板車的人 ---- */
  const riders = [];
  function bike() {
    const g = new THREE.Group(), frame = M("#c0392b", { metalness: 0.4, roughness: 0.4 }), tyre = M("#1d1d1f");
    const wheels = [-0.55, 0.55].map(z => { const w = add(new THREE.TorusGeometry(0.33, 0.04, 6, 20), tyre, 0, 0.35, z, g); w.rotation.y = Math.PI / 2; return w; });
    const bar = add(new THREE.BoxGeometry(0.05, 0.05, 1.0), frame, 0, 0.62, 0, g); bar.rotation.x = 0.15;
    add(new THREE.BoxGeometry(0.05, 0.6, 0.05), frame, 0, 0.6, -0.25, g); add(new THREE.BoxGeometry(0.05, 0.55, 0.05), frame, 0, 0.75, 0.5, g);
    add(new THREE.BoxGeometry(0.5, 0.04, 0.04), frame, 0, 1.03, 0.5, g); add(new THREE.BoxGeometry(0.16, 0.05, 0.25), M("#222"), 0, 0.92, -0.25, g);
    const p = makePerson(THREE, { longHair: rnd() < 0.4 }, rnd); sit(p); p.position.set(0, -0.05, -0.3); p.scale.setScalar(0.95); p.userData.arms.forEach(a => { a.rotation.x = -1.2; }); g.add(p);
    return { g, wheels, p, kind: "bike" };
  }
  function scooter() {
    const g = new THREE.Group(), m = M("#2b7bd9", { metalness: 0.5, roughness: 0.35 });
    add(new THREE.BoxGeometry(0.22, 0.06, 0.9), m, 0, 0.14, 0, g); add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), m, 0, 0.65, 0.42, g); add(new THREE.BoxGeometry(0.45, 0.04, 0.04), m, 0, 1.15, 0.42, g);
    const wheels = [-0.4, 0.42].map(z => { const w = add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14), M("#1d1d1f"), 0, 0.1, z, g); w.rotation.z = Math.PI / 2; return w; });
    const p = makePerson(THREE, {}, rnd); p.position.set(0, 0.17, -0.05); p.userData.arms.forEach(a => { a.rotation.x = -1.1; }); g.add(p);
    return { g, wheels, p, kind: "scooter" };
  }
  // 路線：主路的兩側（南北向）和 Sora 街（東西向），來回騎
  const lanes = [(u) => V(3.2, 0.1, 50 - u * 200), (u) => V(-3.2, 0.1, -150 + u * 200), (u) => V(X0 + u * len, 0.1, SZ - 1.6), (u) => V(X1 - u * len, 0.1, SZ + 1.6)];
  [bike(), bike(), scooter(), bike()].forEach((r, i) => { scene.add(r.g); riders.push({ ...r, lane: lanes[i % lanes.length], u: rnd(), speed: (r.kind === "bike" ? 4.5 : 3.2) / (i < 2 ? 200 : len) }); });

  /* ---- 少量外星人：綠色、大頭、兩根會發光的觸角 ---- */
  function alien() {
    const g = new THREE.Group(), sk = M("#8fe3a0", { roughness: 0.4 }), ey = M("#101418", { roughness: 0.1 });
    add(new THREE.CapsuleGeometry(0.22, 0.42, 6, 12), sk, 0, 0.55, 0, g);
    const hd = new THREE.Group(); hd.position.y = 1.25; g.add(hd);
    add(new THREE.SphereGeometry(0.34, 20, 14), sk, 0, 0, 0, hd).scale.set(1.1, 0.95, 1);
    for (const sx of [-1, 1]) { add(new THREE.SphereGeometry(0.09, 12, 8), ey, sx * 0.13, 0.03, 0.27, hd).scale.set(1, 1.4, 0.6);
      const an = add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), sk, sx * 0.1, 0.4, 0, hd); an.rotation.z = -sx * 0.3; add(new THREE.SphereGeometry(0.05, 10, 8), glow("#fff27a"), sx * 0.15, 0.55, 0, hd); }
    return { g, hd };
  }
  const aliens = [0, 1].map(i => { const a = alien(); scene.add(a.g); const pick = () => i ? V(X0 + rnd() * len, 0, SZ + (rnd() < 0.5 ? -4 : 4)) : V((rnd() - 0.5) * 16, 0, 40 - rnd() * 60); a.g.position.copy(pick()); return { ...a, pick, to: pick(), wait: 0 }; });

  /* ---- 星港之環：這顆星是通往外星的通道（先鎖著） ---- */
  const port = new THREE.Group(); port.position.set(S.x - 24, 0, S.z + 14); scene.add(port);
  add(new THREE.CylinderGeometry(4.2, 4.6, 0.6, 48), M("#c9ccd2", { metalness: 0.5, roughness: 0.4 }), 0, 0.3, 0, port);
  const ring = add(new THREE.TorusGeometry(3.4, 0.35, 16, 64), M("#d9dde4", { metalness: 0.9, roughness: 0.25 }), 0, 4.2, 0, port);
  const swirl = add(new THREE.CircleGeometry(3.1, 64), new THREE.MeshBasicMaterial({ color: "#7d6cf0", transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 4.2, 0, port);
  const runes = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; runes.push(add(new THREE.SphereGeometry(0.16, 8, 6), glow(i % 3 ? "#8ff6ff" : "#ffd98a"), Math.cos(a) * 3.4, 4.2 + Math.sin(a) * 3.4, 0.4, port)); }

  /* ---- 下雨（每小時看運氣，約 2 成）：雨絲跟著鏡頭 ---- */
  const N = 900, rp = new Float32Array(N * 6);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: "#c9d8f0", transparent: true, opacity: 0.45, fog: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  for (let i = 0; i < N; i++) { const x = (rnd() - 0.5) * 120, y = rnd() * 60, z = (rnd() - 0.5) * 120; rp.set([x, y, z, x + 0.15, y - 1.4, z], i * 6); }
  const rainingNow = () => { const q = new URLSearchParams(location.search).get("rain"); if (q !== null) return q === "1"; const d = new Date(); let h = 7; for (const c of `${d.toDateString()}-${d.getHours()}`) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 10 < 2; };

  /* ---- 路人聊天的泡泡 ---- */
  const layer = document.createElement("div"); layer.className = "talk-layer"; document.body.appendChild(layer);
  const bubbles = []; let talkCool = 6, lastCam = null; const talkers = [];
  const _v = V(0, 0, 0);
  function say(p, text, secs, lang) { const el = document.createElement("div"); el.className = "talk"; el.textContent = text; layer.appendChild(el); bubbles.push({ p, el, t: 0, secs });
    if (lang && lastCam && soundOn) { p.getWorldPosition(_v).project(lastCam); if (_v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05) {   // 熊（FIN-U49）：跳出來的話都要有語音（畫面上看得到的人才念）
      const ud = p.userData; if (ud.pitch == null) { ud.pitch = 0.85 + rnd() * 0.35; ud.voice = (rnd() * 4) | 0; } speak(text, lang, { pitch: ud.pitch, voice: ud.voice, rate: 0.94 + rnd() * 0.08 }); } } }
  function startTalk() {
    const pool = [...streetCrowd.people, ...town.crowd.people, ...talkers].filter(w => w.p.visible);
    for (let tries = 0; tries < 20; tries++) {
      const a = pool[(rnd() * pool.length) | 0], b = pool[(rnd() * pool.length) | 0]; if (!a || !b || a === b) continue;
      if (a.p.position.distanceTo(b.p.position) > 9) continue;
      const langs = ["en", "en", "zh"], lang = langs[(rnd() * langs.length) | 0], lines = TALK[lang][(rnd() * TALK[lang].length) | 0];
      a.wait = b.wait = 6; a.p.lookAt(b.p.position.x, a.p.position.y, b.p.position.z); b.p.lookAt(a.p.position.x, b.p.position.y, a.p.position.z);
      say(a.p, lines[0], 2.8, lang); setTimeout(() => say(b.p, lines[1], 2.8, lang), 2600);
      return;
    }
  }

  /* ---- 背景聲：風（一直有）、雨（下雨時）、軌道（列車靠近或搭車時）。用瀏覽器合成，不下載音檔 ---- */
  let ac = null, gains = null, soundOn = false;
  function noiseBuf(kind) { const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; }
  function loop(kind, type, freq, q) { const src = ac.createBufferSource(); src.buffer = noiseBuf(kind); src.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(ac.destination); src.start(); return { g, f }; }
  function startSound() { if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)();
    gains = { wind: loop("brown", "lowpass", 420, 0.6), rain: loop("white", "bandpass", 2600, 0.5), rail: loop("brown", "bandpass", 180, 2) }; }
  let clackT = 0;
  function clack(level) { if (!ac || level < 0.05) return; const o = ac.createBufferSource(); o.buffer = noiseBuf("white"); const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 900; const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.25 * level, ac.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12); o.connect(f).connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.15); }

  const portWorld = V(0, 0, 0);
  return {
    portal: port, aliens: aliens.map(a => a.g), talkers,
    pause(off) { if (!ac) return; if (off) { ac.suspend(); try { speechSynthesis.cancel(); } catch { } } else if (soundOn) ac.resume(); },   // 熊 FIN-U59：回到房間就沒有月台的風聲
    toggleSound() { soundOn = !soundOn; if (soundOn) { startSound(); ac.resume(); } else if (ac) ac.suspend(); return soundOn; },
    update(dt, t, { camera, night, railLevel, mode }) {
      lastCam = camera;
      // 晚上：大部分的人回家（只留三分之一）
      for (const list of [platform.people, streetCrowd.people, town.crowd.people]) list.forEach((w, i) => { w.p.visible = !(night > 0.6 && i % 3 !== 0); });
      platform.update(dt, t); streetCrowd.update(dt, t);
      winM.emissiveIntensity = night * 0.9; headM.opacity = 0.3 + night * 0.7;
      for (const r of riders) { r.u = (r.u + r.speed * dt) % 1; const p = r.lane(r.u), q2 = r.lane((r.u + 0.002) % 1); r.g.position.copy(p); r.g.lookAt(q2.x, p.y, q2.z); r.g.visible = !(night > 0.6 && riders.indexOf(r) % 2);
        r.wheels.forEach(w => { if (r.kind === "bike") w.rotation.x = t * 8; else w.rotation.x = t * 10; });
        if (r.kind === "bike") { const a = Math.sin(t * 6); r.p.userData.legs[0].rotation.x = -1.45 + a * 0.4; r.p.userData.legs[1].rotation.x = -1.45 - a * 0.4; } else animatePerson(r.p, 0, 0); }
      for (const a of aliens) { if (a.wait > 0) { a.wait -= dt; a.hd.rotation.z = Math.sin(t * 2) * 0.2; continue; }
        const d = a.to.clone().sub(a.g.position); d.y = 0; const L = d.length(); if (L < 0.5) { a.to = a.pick(); a.wait = 2 + rnd() * 4; continue; }
        a.g.position.addScaledVector(d, Math.min(L, 0.9 * dt) / L); a.g.position.y = Math.abs(Math.sin(t * 4)) * 0.15; a.g.rotation.y = Math.atan2(d.x, d.z); }
      ring.rotation.z = t * 0.15; swirl.rotation.z = -t * 0.6; swirl.material.opacity = 0.25 + 0.15 * Math.sin(t * 1.7); runes.forEach((m, i) => { m.visible = Math.sin(t * 2 + i) > -0.3; });
      // 雨
      const wet = rainingNow(); rain.visible = wet && mode !== "inside" && mode !== "ride" && mode !== "peek"; setRain(wet && mode !== "inside");
      if (rain.visible) { const c = camera.position; rain.position.set(c.x, Math.max(0, c.y - 40), c.z); for (let i = 0; i < N; i++) { let y = rp[i * 6 + 1] - dt * 38; if (y < 0) y += 60; rp[i * 6 + 1] = y; rp[i * 6 + 4] = y - 1.4; } rainGeo.attributes.position.needsUpdate = true; }
      // 聊天
      if (mode === "town" && (talkCool -= dt) < 0) { talkCool = 9 + rnd() * 8; startTalk(); }
      for (let i = bubbles.length - 1; i >= 0; i--) { const q = bubbles[i]; q.t += dt; if (q.t > q.secs || !q.p.visible) { q.el.remove(); bubbles.splice(i, 1); continue; }
        q.p.getWorldPosition(_v); _v.y += 2.1; _v.project(camera); const vis = _v.z < 1 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1;
        q.el.style.opacity = vis ? String(Math.min(1, q.t * 4, (q.secs - q.t) * 3)) : "0";
        if (vis) q.el.style.transform = `translate(${((_v.x + 1) / 2 * innerWidth - q.el.offsetWidth / 2).toFixed(0)}px, ${((1 - _v.y) / 2 * innerHeight - q.el.offsetHeight - 6).toFixed(0)}px)`; }
      // 聲音
      if (ac && soundOn) { const now = ac.currentTime, set = (g, v) => g.g.gain.setTargetAtTime(v, now, 0.6);
        set(gains.wind, mode === "inside" ? 0.02 : 0.07 + 0.05 * (Math.sin(t * 0.21) + 1)); gains.wind.f.frequency.setTargetAtTime(320 + 260 * (Math.sin(t * 0.13) + 1), now, 1);
        set(gains.rain, wet && mode !== "inside" ? 0.16 : 0); set(gains.rail, railLevel * 0.35);
        if ((clackT -= dt) < 0) { clackT = railLevel > 0.5 ? 0.55 : 0.9; clack(railLevel); setTimeout(() => clack(railLevel * 0.8), 110); } }
    },
  };
}
