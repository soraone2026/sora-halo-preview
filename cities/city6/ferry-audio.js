/* 浮燈渡的聲音（2026-11-23）：全部當場合成，沒有音檔。
 * - 背景：雲海底下的風（濾過的雜訊）＋很遠的低音和弦＋偶爾一聲渡船的汽笛（低低的兩個音）。
 * - 風鈴：風大的時候自己響；放天燈、新的島靠岸：往上的鐘音；修好：一串風鈴＋低音。
 * - 渡民說話：幾個像木琴的音（每個人音高不同）。 */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

export function createFerryAudio(seed = 1) {
  let c = null, master = null, sfx = null, music = null, wind = null, wg = null, on = true, paused = false, started = false, nextPad = 0, nextHorn = 0, nextChime = 0, windLv = 0;
  try { on = localStorage.getItem("sle-sound") !== "0"; } catch (e) { }
  const root = 55 + (seed % 5);
  function init() {
    if (c) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; c = new AC();
    const out = c.createDynamicsCompressor(); out.threshold.value = -16; out.ratio.value = 4; out.connect(c.destination);
    master = c.createGain(); master.gain.value = 0; master.connect(out);
    const rev = c.createConvolver(); { const len = Math.floor(c.sampleRate * 2.6), b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); } rev.buffer = b; }
    const rv = c.createGain(); rv.gain.value = 0.5; rev.connect(rv).connect(master);
    music = c.createGain(); music.gain.value = 0.4; music.connect(master); music.connect(rev);
    sfx = c.createGain(); sfx.gain.value = 0.9; sfx.connect(master); const sw = c.createGain(); sw.gain.value = 0.45; sfx.connect(sw).connect(rev);
    const nb = c.createBuffer(1, c.sampleRate * 4, c.sampleRate); { const d = nb.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
    wind = c.createBufferSource(); wind.buffer = nb; wind.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 0.5; wg = c.createGain(); wg.gain.value = 0.18; wind.connect(bp).connect(wg).connect(master); wind.start();
  }
  function bell(t, f, v = 1, dur = 2.2) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(sfx);
    for (const [k, gv] of [[1, 1], [2.76, 0.32], [5.4, 0.1]]) { const o = c.createOscillator(); o.frequency.value = f * k; const og = c.createGain(); og.gain.value = gv; o.connect(og).connect(g); o.start(t); o.stop(t + dur); } }
  function pad(t) { const notes = [0, 7, 12, 16].map((n) => root + n - 12 + (Math.floor(t / 20) % 2 ? -3 : 0)), g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.028, t + 5); g.gain.setValueAtTime(0.028, t + 14); g.gain.exponentialRampToValueAtTime(0.0001, t + 21); g.connect(music);
    for (const n of notes) { const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = mtof(n); o.detune.value = (Math.random() - 0.5) * 8; o.connect(g); o.start(t); o.stop(t + 22); } }
  function horn(t) { for (const [n, at] of [[root - 24, 0], [root - 19, 1.1]]) { const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = mtof(n); lp.type = "lowpass"; lp.frequency.value = 380;
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(0.05, t + at + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + at + 1.6); o.connect(lp).connect(g).connect(music); o.start(t + at); o.stop(t + at + 1.8); } }
  function loop() { if (!c || paused || !on) return; const t = c.currentTime;
    if (t > nextPad) { pad(nextPad = Math.max(t, nextPad)); nextPad += 16; }
    if (t > nextHorn) { if (started) horn(t + 0.2); nextHorn = t + 40 + Math.random() * 30; }
    if (windLv > 0.55 && t > nextChime) { for (let k = 0; k < 3; k++) bell(t + k * (0.12 + Math.random() * 0.2), mtof(root + 12 + SCALE[Math.floor(Math.random() * SCALE.length)]), 0.35, 2.8); nextChime = t + 2.5 + Math.random() * 3; }
    started = true; }
  setInterval(loop, 400);
  const fadeTo = (v) => { if (!c) return; master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(v, c.currentTime, 0.4); };
  const now = () => (c ? c.currentTime : 0), ok = () => !!c && on && !paused;
  return {
    get on() { return on; },
    gesture() { init(); if (!c) return; if (c.state === "suspended") c.resume(); if (on && !paused) fadeTo(0.9); },
    pause(force) { if (force) paused = true; if (c) fadeTo(0); },
    resume(force) { if (force) paused = false; if (c && on && !paused) { if (c.state === "suspended") c.resume(); fadeTo(0.9); } },
    toggle() { on = !on; try { localStorage.setItem("sle-sound", on ? "1" : "0"); } catch (e) { } if (on) this.resume(); else fadeTo(0); },
    breeze(w) { windLv = w; if (wg && c) wg.gain.setTargetAtTime(0.12 + w * 0.22, c.currentTime, 0.8); },
    task() { if (!ok()) return; const t = now(); [0, 4, 7].forEach((n, i) => bell(t + i * 0.11, mtof(root + 12 + n), 0.8, 1.6)); },
    lantern() { if (!ok()) return; const t = now(); for (let i = 0; i < 5; i++) bell(t + i * 0.09, mtof(root + 12 + SCALE[i * 2 % SCALE.length]), 0.55, 1.8); },
    dock() { if (!ok()) return; const t = now(); horn(t); [0, 7, 12, 16, 19].forEach((n, i) => bell(t + 1.2 + i * 0.16, mtof(root + n), 0.7, 2.6)); },
    fix() { if (!ok()) return; const t = now(); for (let i = 0; i < 9; i++) bell(t + i * 0.08, mtof(root + 12 + SCALE[(i * 3) % SCALE.length]), 0.6, 2.4); },
    hum() { if (!ok()) return; horn(now()); },
    voice(i) { if (!ok()) return; const t = now(), base = root + 7 + (i % 5) * 2; for (let k = 0; k < 4; k++) bell(t + k * 0.13, mtof(base + SCALE[(k * 2 + i) % 5]), 0.4, 0.5); },
    fall() { if (!ok()) return; const t = now(); for (let i = 0; i < 12; i++) bell(t + i * 0.18, mtof(root + 24 - i * 2), 0.3, 1.2); },
  };
}
