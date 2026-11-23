/* 留白城的聲音（2026-11-23）：全部當場合成，沒有音檔。
 * - 背景：山裡的風（濾過的雜訊）＋很遠的流水聲＋偶爾一兩個像古琴泛音的單音（五聲音階，空很多拍）。
 * - 添一筆：毛筆落紙的「沙」一聲＋三個往下的琴音；修好：一串泛音＋低低的一聲磬。
 * - 畫裡的人說話：幾個撥弦（每個人音高不同）。 */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export function createInkAudio(seed = 1) {
  let c = null, master = null, sfx = null, music = null, wg = null, wat = null, on = true, paused = false, nextNote = 0, windLv = 0, noise = null;
  try { on = localStorage.getItem("sle-sound") !== "0"; } catch (e) { }
  const root = 50 + (seed % 5);
  function init() {
    if (c) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; c = new AC();
    const out = c.createDynamicsCompressor(); out.threshold.value = -18; out.ratio.value = 4; out.connect(c.destination);
    master = c.createGain(); master.gain.value = 0; master.connect(out);
    const rev = c.createConvolver(); { const len = Math.floor(c.sampleRate * 3.4), b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); } rev.buffer = b; }
    const rv = c.createGain(); rv.gain.value = 0.55; rev.connect(rv).connect(master);
    music = c.createGain(); music.gain.value = 0.5; music.connect(master); const mw = c.createGain(); mw.gain.value = 0.7; music.connect(mw).connect(rev);
    sfx = c.createGain(); sfx.gain.value = 0.9; sfx.connect(master); const sw = c.createGain(); sw.gain.value = 0.4; sfx.connect(sw).connect(rev);
    noise = c.createBuffer(1, c.sampleRate * 4, c.sampleRate); { const d = noise.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
    const w = c.createBufferSource(); w.buffer = noise; w.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; bp.Q.value = 0.5; wg = c.createGain(); wg.gain.value = 0.1; w.connect(bp).connect(wg).connect(master); w.start();
    const s2 = c.createBufferSource(); s2.buffer = noise; s2.loop = true; s2.playbackRate.value = 1.7; const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800; wat = c.createGain(); wat.gain.value = 0.03; s2.connect(hp).connect(wat).connect(master); s2.start();
  }
  /* 撥弦：很快起音、慢慢衰減；harm 為泛音（只有高次諧波，比較空靈） */
  function pluck(t, f, v = 1, dur = 2.6, harm = false, dest = sfx) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(dest);
    const parts = harm ? [[2, 1], [4, 0.25]] : [[1, 1], [2, 0.4], [3, 0.12]]; for (const [k, gv] of parts) { const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f * k; const og = c.createGain(); og.gain.value = gv; o.connect(og).connect(g); o.start(t); o.stop(t + dur); }
    const o2 = c.createOscillator(), g2 = c.createGain(); o2.type = "triangle"; o2.frequency.setValueAtTime(f * 1.01, t); o2.frequency.exponentialRampToValueAtTime(f, t + 0.25); g2.gain.setValueAtTime(0.04 * v, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o2.connect(g2).connect(dest); o2.start(t); o2.stop(t + 0.32); }
  function brush(t, dur = 0.5) { const s = c.createBufferSource(); s.buffer = noise; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(900, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(bp).connect(g).connect(sfx); s.start(t, Math.random() * 3); s.stop(t + dur + 0.05); }
  function chime(t, f, dur = 5) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(sfx);
    for (const [k, gv] of [[1, 1], [2.71, 0.4], [4.95, 0.15]]) { const o = c.createOscillator(); o.frequency.value = f * k; const og = c.createGain(); og.gain.value = gv; o.connect(og).connect(g); o.start(t); o.stop(t + dur); } }
  function loop() { if (!c || paused || !on) return; const t = c.currentTime;
    if (t > nextNote) { const n = PENTA[Math.floor(Math.random() * 7)], harm = Math.random() < 0.35; pluck(t + 0.1, mtof(root + n), 0.55, 4, harm, music); if (Math.random() < 0.4) pluck(t + 0.9, mtof(root + PENTA[Math.floor(Math.random() * 7)]), 0.4, 3.5, false, music); nextNote = t + 5 + Math.random() * 7; } }
  setInterval(loop, 400);
  const fadeTo = (v) => { if (!c) return; master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(v, c.currentTime, 0.4); };
  const now = () => (c ? c.currentTime : 0), ok = () => !!c && on && !paused;
  return {
    get on() { return on; },
    gesture() { init(); if (!c) return; if (c.state === "suspended") c.resume(); if (on && !paused) fadeTo(0.9); },
    pause(force) { if (force) paused = true; if (c) fadeTo(0); },
    resume(force) { if (force) paused = false; if (c && on && !paused) { if (c.state === "suspended") c.resume(); fadeTo(0.9); } },
    toggle() { on = !on; try { localStorage.setItem("sle-sound", on ? "1" : "0"); } catch (e) { } if (on) this.resume(); else fadeTo(0); },
    breeze(w) { windLv = w; if (wg && c) wg.gain.setTargetAtTime(0.06 + w * 0.16, c.currentTime, 0.8); },
    water(v) { if (wat && c) wat.gain.setTargetAtTime(0.02 + v * 0.06, c.currentTime, 1.2); },
    task() { if (!ok()) return; const t = now(); [7, 4, 0].forEach((n, i) => pluck(t + i * 0.16, mtof(root + 12 + n), 0.7, 2.2)); },
    stroke() { if (!ok()) return; const t = now(); brush(t, 0.6); brush(t + 0.5, 0.9); [12, 9, 7, 4].forEach((n, i) => pluck(t + 0.7 + i * 0.28, mtof(root + n), 0.6, 3, i === 3)); },
    fix() { if (!ok()) return; const t = now(); for (let i = 0; i < 6; i++) pluck(t + i * 0.14, mtof(root + 12 + PENTA[i]), 0.5, 3.2, true); chime(t + 1, mtof(root - 12), 6); },
    hum() { if (!ok()) return; chime(now(), mtof(root - 12), 7); },
    voice(i) { if (!ok()) return; const t = now(), base = root + 7 + (i % 5) * 2; for (let k = 0; k < 3; k++) pluck(t + k * 0.15, mtof(base + PENTA[(k * 2 + i) % 6]), 0.4, 0.9); },
    fall() { if (!ok()) return; const t = now(); brush(t, 1.4); for (let i = 0; i < 8; i++) pluck(t + 0.3 + i * 0.22, mtof(root + 24 - PENTA[i]), 0.35, 2.4, i % 2 === 0); },
  };
}
