/* 星際城市的小遊戲（2026-11-21，熊：「其他幾個城市很好看，但遊戲太少，可以更有趣一點」）
 * 城市裡放幾個會發光、會浮起來的小站（makeGames）；走近點一下，畫面上打開一個 30 秒～2 分鐘的小遊戲（openMiniGame）。
 * 六種玩法：catch（接住掉下來的東西）、taps（點會飛的東西）、rhythm（對準時機）、order（記住順序）、memory（翻牌配對）、hunt（找東西）。
 * 每個遊戲每天一次給獎勵：FinSave.cgameDo(city, key, score, pass)（過關：2 B＋那座城的材料 1，奧蕾莉亞 3 B；沒過關也給 1 B；一成五的機會 +1 元液）。 */

let AC = null;
function tone(f, d = 0.12, type = "sine", v = 0.12) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d + 0.02); } catch (e) { } }
const SND = { good: () => { tone(880, 0.1, "triangle"); setTimeout(() => tone(1320, 0.12, "triangle"), 60); }, bad: () => tone(180, 0.22, "sawtooth", 0.08), tick: (f = 660) => tone(f, 0.09, "sine", 0.1), win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.12), i * 110)) };



/* o: { type, title, intro, theme:{bg, fg, good:[emoji], bad:[emoji], target, decoys:[emoji], nodes:[emoji], pairs:[emoji]}, dur, onEnd(score, max, pass) → 結果文字, L } */
export function openMiniGame(o) {
  const L = o.L || ((zh) => zh), T = o.theme || {};
  if (!document.getElementById("mgcss")) { const st = document.createElement("link"); st.id = "mgcss"; st.rel = "stylesheet"; st.href = "./minigame.css"; document.head.appendChild(st); }   /* 城市頁的 CSP 不允許內嵌 <style>，用同一個網站的 css 檔 */
  const ov = document.createElement("div"); ov.className = "mgov";
  ov.innerHTML = `<div class="mgbox"><div class="mghd"><b></b><span class="mgst"></span></div><canvas class="mgcv" width="360" height="500"></canvas><div class="mgmsg"></div><div class="mgrow"><button class="mgbtn" data-go>${L("開始", "Start")}</button><button class="mgbtn ghost" data-x>${L("離開", "Leave")}</button></div></div>`;
  document.body.appendChild(ov); ov.querySelector("b").textContent = o.title; const msg = ov.querySelector(".mgmsg"), stEl = ov.querySelector(".mgst"); msg.textContent = o.intro || "";
  const cv = ov.querySelector("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = 360 * dpr; cv.height = 500 * dpr; const c = cv.getContext("2d"); c.scale(dpr, dpr);
  const W = 360, H = 500; let raf = 0, alive = true, running = false, G = null;
  const toXY = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const close = () => { alive = false; cancelAnimationFrame(raf); ov.remove(); try { o.onClose && o.onClose(); } catch (e) { } };
  ov.querySelector("[data-x]").onclick = close;
  const bg = () => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.bg || "#1b2347"); g.addColorStop(1, T.bg2 || "#0e1328"); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  const emo = (e, x, y, s = 30) => { c.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, x, y); };
  const glow = (x, y, r, col, a = 1) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = 1; };
  const sparks = []; const burst = (x, y, col) => { for (let i = 0; i < 12; i++) { const a = Math.random() * 7, v = 60 + Math.random() * 120; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.6, col }); } };
  const drawSparks = (dt) => { for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.t -= dt; if (p.t <= 0) { sparks.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; glow(p.x, p.y, 6, p.col || "#ffe9a0", p.t / 0.6); } };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- 六種玩法：每種回傳 { max, pass, step(dt), draw(), down(x,y), move(x,y), score, done } ---------- */
  const MK = {
    catch() { const dur = o.dur || 35; let t = 0, x = W / 2, items = [], sp = 0, score = 0, shake = 0;
      return { max: 30, pass: 12, get score() { return score; }, get done() { return t >= dur; }, status: () => L(`接到 ${score}・剩 ${Math.max(0, Math.ceil(dur - t))} 秒`, `${score} caught · ${Math.max(0, Math.ceil(dur - t))}s`),
        step(dt) { t += dt; sp -= dt; if (sp <= 0) { sp = Math.max(0.32, 0.8 - t * 0.012); const bad = Math.random() < 0.24; items.push({ x: rnd(24, W - 24), y: -20, v: rnd(110, 150) + t * 3.2, e: bad ? pick(T.bad || ["💣"]) : pick(T.good || ["⭐"]), bad }); }
          for (let i = items.length - 1; i >= 0; i--) { const q = items[i]; q.y += q.v * dt; if (q.y > H - 70 && q.y < H - 30 && Math.abs(q.x - x) < 42) { items.splice(i, 1); if (q.bad) { score = Math.max(0, score - 2); shake = 0.3; SND.bad(); } else { score++; SND.good(); burst(q.x, H - 60, T.fg); } } else if (q.y > H + 20) items.splice(i, 1); } shake = Math.max(0, shake - dt); },
        draw() { bg(); for (const q of items) emo(q.e, q.x, q.y, 30); const sx = shake > 0 ? Math.sin(t * 80) * 5 : 0; c.fillStyle = T.fg || "#ffd66b"; c.globalAlpha = 0.9; c.beginPath(); c.ellipse(x + sx, H - 48, 44, 12, 0, 0, 7); c.fill(); c.globalAlpha = 1; emo(T.basket || "🧺", x + sx, H - 58, 34); },
        down(px) { x = Math.max(30, Math.min(W - 30, px)); }, move(px) { x = Math.max(30, Math.min(W - 30, px)); } }; },
    taps() { const dur = o.dur || 30; let t = 0, fl = [], sp = 0, score = 0;
      return { max: 30, pass: 14, get score() { return score; }, get done() { return t >= dur; }, status: () => L(`收集 ${score}・剩 ${Math.max(0, Math.ceil(dur - t))} 秒`, `${score} · ${Math.max(0, Math.ceil(dur - t))}s`),
        step(dt) { t += dt; sp -= dt; if (sp <= 0 && fl.length < 7) { sp = rnd(0.35, 0.7); const bad = Math.random() < 0.2; fl.push({ x: rnd(30, W - 30), y: rnd(60, H - 60), vx: rnd(-40, 40), vy: rnd(-30, 30), life: rnd(2.2, 3.6), ph: rnd(0, 7), bad }); }
          for (let i = fl.length - 1; i >= 0; i--) { const f = fl[i]; f.life -= dt; f.vx += rnd(-60, 60) * dt; f.vy += rnd(-60, 60) * dt; f.x = Math.max(20, Math.min(W - 20, f.x + f.vx * dt)); f.y = Math.max(40, Math.min(H - 20, f.y + f.vy * dt)); if (f.life <= 0) fl.splice(i, 1); } },
        draw() { bg(); for (const f of fl) { const a = Math.min(1, f.life) * (0.65 + 0.35 * Math.sin(t * 6 + f.ph)); if (f.bad) { emo(T.decoy || "🦋", f.x, f.y, 24); } else { glow(f.x, f.y, 26, T.fg || "#d9ff7a", a); c.fillStyle = "#fffbe0"; c.beginPath(); c.arc(f.x, f.y, 4, 0, 7); c.fill(); } } },
        down(px, py) { let best = -1, bd = 34; fl.forEach((f, i) => { const d = Math.hypot(f.x - px, f.y - py); if (d < bd) { bd = d; best = i; } }); if (best < 0) return; const f = fl.splice(best, 1)[0]; if (f.bad) { score = Math.max(0, score - 1); SND.bad(); } else { score++; SND.good(); burst(f.x, f.y, T.fg); } } }; },
    rhythm() { const N = 22; let t = 0, notes = [], hits = 0, idx = 0, fb = "", fbT = 0; const per = 1.15; for (let i = 0; i < N; i++) notes.push({ at: 1.6 + i * per * (i % 5 === 4 ? 1.35 : 1) + (i > 10 ? -i * 0.02 : 0), st: 0 });
      const cx = W / 2, cy = 250, R = 120; return { max: N, pass: 13, get score() { return hits; }, get done() { return idx >= N && t > notes[N - 1].at + 0.6; }, status: () => L(`對準 ${hits}/${N}`, `${hits}/${N} on time`),
        step(dt) { t += dt; fbT -= dt; while (idx < N && t > notes[idx].at + 0.28) { if (!notes[idx].st) { notes[idx].st = -1; fb = L("太晚了", "Late"); fbT = 0.5; } idx++; } },
        draw() { bg(); c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); glow(cx, cy - R, 30, T.fg || "#ffd66b", 0.9); emo(T.target || "🔔", cx, cy - R, 28);
          for (let i = idx; i < Math.min(N, idx + 4); i++) { const q = notes[i], k = (q.at - t) / 2.2; if (k > 1 || q.st) continue; const a = -Math.PI / 2 + k * Math.PI * 1.6; glow(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 18, "#9fd8ff", 0.9); emo(T.note || "✦", cx + Math.cos(a) * R, cy + Math.sin(a) * R, 22); }
          emo(T.center || "🕰", cx, cy, 64); if (fbT > 0) { c.fillStyle = "#fff"; c.font = "bold 22px system-ui"; c.fillText(fb, cx, cy + R + 50); } },
        down() { if (idx >= N) return; const q = notes[idx], d = Math.abs(t - q.at); if (d < 0.18) { q.st = 1; hits++; fb = d < 0.08 ? L("剛剛好！", "Perfect!") : L("好", "Good"); SND.tick(d < 0.08 ? 990 : 770); burst(cx, cy - R, T.fg); idx++; } else if (d < 0.45) { q.st = -1; fb = L("差一點", "Almost"); SND.bad(); idx++; } fbT = 0.5; } }; },
    order() { const nodes = (T.nodes || ["🔔", "🔔", "🔔", "🔔", "🔔", "🔔"]).slice(0, 6), P = nodes.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / nodes.length; return [W / 2 + Math.cos(a) * 115, 250 + Math.sin(a) * 115]; });
      let seq = [], show = 0, showT = 0, inp = 0, best = 0, over = false, flash = -1, flashT = 0, wait = 1; const add = () => { seq.push(Math.floor(Math.random() * nodes.length)); show = 0; showT = 0; inp = 0; wait = 0.8; };
      add(); add(); add(); const notes = [523, 587, 659, 784, 880, 988];
      return { max: 8, pass: 5, get score() { return best; }, get done() { return over; }, status: () => L(`記住了 ${best}・這輪 ${seq.length} 個`, `Best ${best} · round of ${seq.length}`),
        step(dt) { flashT -= dt; if (wait > 0) { wait -= dt; return; } if (show < seq.length) { showT -= dt; if (showT <= 0) { flash = seq[show]; flashT = 0.42; SND.tick(notes[flash]); show++; showT = 0.62; } } },
        draw() { bg(); P.forEach(([x, y], i) => { const on = flashT > 0 && flash === i; glow(x, y, on ? 52 : 30, on ? (T.fg || "#ffd66b") : "rgba(160,180,255,.35)", on ? 1 : 0.6); emo(nodes[i], x, y, on ? 42 : 34); });
          c.fillStyle = "rgba(255,255,255,.85)"; c.font = "16px system-ui"; c.textAlign = "center"; c.fillText(show < seq.length || wait > 0 ? L("看好順序……", "Watch the order…") : L("照順序點", "Tap them in order"), W / 2, 470); },
        down(px, py) { if (over || wait > 0 || show < seq.length) return; let i = P.findIndex(([x, y]) => Math.hypot(x - px, y - py) < 44); if (i < 0) return; flash = i; flashT = 0.25;
          if (i === seq[inp]) { SND.tick(notes[i]); inp++; if (inp === seq.length) { best = seq.length; burst(W / 2, 250, T.fg); if (seq.length >= 8) { over = true; return; } add(); } } else { SND.bad(); over = true; } } }; },
    memory() { const pairs = (T.pairs || ["🍄", "🌿", "🌸", "🍀", "🌰", "🐌"]).slice(0, 6), cards = [...pairs, ...pairs].map((e) => ({ e, up: false, got: false })).sort(() => Math.random() - 0.5);
      let t = 0, open = [], lock = 0, got = 0, flips = 0; const lim = o.dur || 80; const cell = (i) => [30 + (i % 4) * 78, 70 + Math.floor(i / 4) * 120];
      return { max: 6, pass: 6, get score() { return got; }, get done() { return got === 6 || t >= lim; }, status: () => L(`配對 ${got}/6・剩 ${Math.max(0, Math.ceil(lim - t))} 秒`, `${got}/6 pairs · ${Math.max(0, Math.ceil(lim - t))}s`),
        step(dt) { t += dt; if (lock > 0) { lock -= dt; if (lock <= 0) { for (const k of open) if (!cards[k].got) cards[k].up = false; open = []; } } },
        draw() { bg(); cards.forEach((q, i) => { const [x, y] = cell(i); c.fillStyle = q.got ? "rgba(255,255,255,.12)" : q.up ? "#f6f1e4" : (T.card || "#3b4f8a"); c.beginPath(); c.roundRect ? c.roundRect(x, y, 66, 100, 12) : c.rect(x, y, 66, 100); c.fill(); if (q.up || q.got) emo(q.e, x + 33, y + 50, 34); else emo(T.back || "✦", x + 33, y + 50, 22); }); },
        down(px, py) { if (lock > 0) return; const i = cards.findIndex((q, k) => { const [x, y] = cell(k); return px > x && px < x + 66 && py > y && py < y + 100; }); if (i < 0 || cards[i].up || cards[i].got) return; cards[i].up = true; open.push(i); SND.tick(700); flips++;
          if (open.length === 2) { const [a, b] = open; if (cards[a].e === cards[b].e) { cards[a].got = cards[b].got = true; got++; open = []; SND.good(); const [x, y] = cell(b); burst(x + 33, y + 50, T.fg); } else lock = 0.75; } } }; },
    hunt() { const N = 5, lim = o.dur || 60, items = []; let t = 0, found = 0, miss = 0;
      for (let i = 0; i < 70; i++) items.push({ x: rnd(18, W - 18), y: rnd(30, H - 18), e: pick(T.decoys || ["🌿", "🪨"]), s: rnd(18, 30), r: rnd(-0.6, 0.6), t: false });
      for (let i = 0; i < N; i++) items.splice(Math.floor(Math.random() * items.length), 0, { x: rnd(24, W - 24), y: rnd(40, H - 24), e: T.target || "🔖", s: rnd(17, 22), r: rnd(-0.8, 0.8), t: true, found: false });
      return { max: N, pass: 4, get score() { return found; }, get done() { return found === N || t >= lim; }, status: () => L(`找到 ${found}/${N}・剩 ${Math.max(0, Math.ceil(lim - t))} 秒`, `${found}/${N} · ${Math.max(0, Math.ceil(lim - t))}s`),
        step(dt) { t += dt; },
        draw() { bg(); for (const q of items) { if (q.found) continue; c.save(); c.translate(q.x, q.y); c.rotate(q.r); emo(q.e, 0, 0, q.s); c.restore(); } for (const q of items) if (q.found) { glow(q.x, q.y, 26, T.fg || "#ffd66b", 0.8); emo("✓", q.x, q.y, 20); } },
        down(px, py) { let best = null, bd = 26; for (const q of items) { if (!q.t || q.found) continue; const d = Math.hypot(q.x - px, q.y - py); if (d < bd) { bd = d; best = q; } } if (best) { best.found = true; found++; SND.good(); burst(best.x, best.y, T.fg); } else { miss++; t += 1; SND.bad(); } } }; },
  };
  let last = 0;
  const loop = (now) => { if (!alive) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (running && G) { G.step(dt); stEl.textContent = G.status(); if (G.done) finish(); } if (G) { G.draw(); drawSparks(dt); } };
  const finish = () => { running = false; const pass = G.score >= G.pass; if (pass) SND.win(); let txt = ""; try { txt = o.onEnd ? o.onEnd(G.score, G.max, pass) || "" : ""; } catch (e) { }
    msg.textContent = (pass ? L("🎉 過關！", "🎉 Cleared!") : L("差一點點～", "So close~")) + (txt ? "　" + txt : ""); const go = ov.querySelector("[data-go]"); go.hidden = false; go.textContent = L("再玩一次", "Play again"); };
  cv.addEventListener("pointerdown", (e) => { if (!running || !G) return; const [x, y] = toXY(e); G.down(x, y); try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
  cv.addEventListener("pointermove", (e) => { if (!running || !G || !G.move || !(e.buttons || e.pointerType === "touch")) return; const [x, y] = toXY(e); G.move(x, y); });
  const start = () => { G = (MK[o.type] || MK.catch)(); running = true; msg.textContent = o.how || ""; ov.querySelector("[data-go]").hidden = true; };
  ov.querySelector("[data-go]").onclick = start;
  G = (MK[o.type] || MK.catch)(); raf = requestAnimationFrame(loop);
  return { close, get running() { return running; }, _g: () => G, start, finish };
}

/* 城市裡的小站：一圈光＋浮起來的圖示；點了走近、開遊戲。list: [{ key, type, pos:[x,y,z], icon, color, title:[zh,en], intro:[zh,en], how:[zh,en], theme }] */
export function makeGames(o) {
  const { THREE, scene, pickables, city, list, L, toast, reach = 4.2 } = o;
  const FS = () => window.FinSave;
  const iconTex = (e) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const c = cv.getContext("2d"); c.font = '92px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, 64, 70); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const sts = list.map((g, i) => { const grp = new THREE.Group(); grp.position.set(g.pos[0], g.pos[1] || 0, g.pos[2]); (g.parent || scene).add(grp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: g.color || "#ffd66b", emissive: g.color || "#ffd66b", emissiveIntensity: 0.9 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; grp.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color: g.color || "#ffd66b", transparent: true, opacity: 0.18, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05; grp.add(disc);
    const ic = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(g.icon || "✦"), transparent: true, depthWrite: false, depthTest: false })); ic.scale.setScalar(1.05); ic.position.y = 1.6; ic.renderOrder = 12; grp.add(ic);
    const pk = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pk.position.y = 1.0; pk.userData = { kind: "mg", ref: i }; grp.add(pk); pickables.push(pk);
    return { g, grp, ring, ic, ph: i * 1.7 }; });
  const doneToday = (k) => { try { return !!(FS() && FS().cgameState && FS().cgameState(city + ":" + k).done); } catch (e) { return false; } };
  let cur = null, chkT = -1;
  const api = {
    pos: (i) => { const p = new THREE.Vector3(); sts[i].grp.getWorldPosition(p); return p; },
    get open() { return !!cur; }, get cur() { return cur; },
    tap(i, p) { const s = sts[i]; if (!s || cur) return "busy"; if (p) { const w = api.pos(i); if (Math.hypot(w.x - p[0], w.z - p[1]) > reach) return "far"; } api.play(i); return "ok"; },
    play(i) { const g = sts[i].g, done0 = doneToday(g.key);
      cur = openMiniGame({ type: g.type, theme: g.theme, L, title: L(g.title[0], g.title[1]), intro: L(g.intro[0], g.intro[1]) + (done0 ? L("（今天的獎勵已經拿過了，可以再玩）", " (Today's reward is already collected — play for fun)") : ""), how: g.how ? L(g.how[0], g.how[1]) : "", dur: g.dur,
        onEnd: (score, max, pass) => { let r = null; try { r = FS() && FS().cgameDo ? FS().cgameDo(city, g.key, score, pass) : null; } catch (e) { } if (!r) return L(`得分 ${score}`, `Score ${score}`);
          return L(`+${r.b} B`, `+${r.b} B`) + (r.matN ? L(`・${r.matZh} +${r.matN}`, ` · ${r.matEn} +${r.matN}`) : "") + (r.ess ? L(`・元液 +${r.ess}`, ` · essence +${r.ess}`) : "") + (r.best ? L("・新紀錄！", " · New best!") : ""); },
        onClose: () => { cur = null; } }); return true; },
    tick(t) { if (t - chkT > 3 || chkT < 0) { chkT = t; for (const s of sts) s.done = doneToday(s.g.key); }   /* 存檔每 3 秒看一次就好（不要每一格都讀） */
      for (const s of sts) { s.ic.position.y = 1.6 + Math.sin(t * 2 + s.ph) * 0.12; s.ring.rotation.z = t * 0.6 + s.ph; s.ring.material.emissiveIntensity = s.done ? 0.25 : 0.7 + Math.sin(t * 3 + s.ph) * 0.3; } },
  };
  return api;
}
