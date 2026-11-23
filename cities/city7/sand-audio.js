/* 鳴沙城的聲音（2026-11-23，熊：「要有聲音」）：全部當場合成。
 * - 背景：很深的宇宙低鳴（幾個微微走音的低音＋慢慢掃過的「太陽風」）＋偶爾在遠處響起的鐘聲泛音（左右飄）。
 * - 調音：一個跟著滑桿走的「正弦＋三角」音；靠近共鳴點時多一層合唱、沙沙聲變大。
 * - 定音：一串鐘的和弦；大鐘：很低、很長；天弦：撥弦；節拍塔：滴答。
 * - iPhone 靜音鍵：宣告「播放」＋一段無聲 <audio>（silence.wav）。 */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];   /* 五聲音階 */
export const vToHz = (v) => 110 * Math.pow(2, v * 3);   /* 滑桿 0…1 → 110…880 Hz */

export function createSandAudio(seed = 1) {
  let c = null, master = null, sfx = null, music = null, rev = null, on = true, paused = false, noise = null, wind = null, nextBell = 0, tone = null, hiss = null, silent = null;
  try { on = localStorage.getItem("sle-sound") !== "0"; } catch (e) { }
  const root = 45 + (seed % 5);
  function init() {
    if (c) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; c = new AC();
    const out = c.createDynamicsCompressor(); out.threshold.value = -16; out.ratio.value = 4; out.connect(c.destination);
    master = c.createGain(); master.gain.value = 0; master.connect(out);
    rev = c.createConvolver(); { const len = Math.floor(c.sampleRate * 5.5), b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } rev.buffer = b; }
    const rv = c.createGain(); rv.gain.value = 0.7; rev.connect(rv).connect(master);
    music = c.createGain(); music.gain.value = 0.55; music.connect(master); const mw = c.createGain(); mw.gain.value = 0.8; music.connect(mw).connect(rev);
    sfx = c.createGain(); sfx.gain.value = 0.9; sfx.connect(master); const sw = c.createGain(); sw.gain.value = 0.5; sfx.connect(sw).connect(rev);
    noise = c.createBuffer(1, c.sampleRate * 4, c.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    /* 低鳴：四個微微走音的低音，經過慢慢開合的低通 */
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 2; const dg = c.createGain(); dg.gain.value = 0.05; lp.connect(dg).connect(music);
    for (const [m, det] of [[root - 24, 0], [root - 17, 4], [root - 12, -5], [root - 5, 7]]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = det; o.connect(lp); o.start(); }
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.045; lg.gain.value = 260; lfo.connect(lg).connect(lp.frequency); lfo.start();
    /* 太陽風 */
    const w = c.createBufferSource(); w.buffer = noise; w.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.7; wind = c.createGain(); wind.gain.value = 0.025; w.connect(bp).connect(wind).connect(music); w.start();
    const l2 = c.createOscillator(), g2 = c.createGain(); l2.frequency.value = 0.03; g2.gain.value = 500; l2.connect(g2).connect(bp.frequency); l2.start();
    /* 調音的音：一直開著，音量 0；沙沙聲 */
    const t1 = c.createOscillator(), t2 = c.createOscillator(), t3 = c.createOscillator(); t1.type = "sine"; t2.type = "triangle"; t3.type = "sine"; const tg = c.createGain(), cg = c.createGain(); tg.gain.value = 0; cg.gain.value = 0;
    t1.connect(tg); const t2g = c.createGain(); t2g.gain.value = 0.25; t2.connect(t2g).connect(tg); t3.connect(cg); tg.connect(sfx); cg.connect(sfx); [t1, t2, t3].forEach((o) => o.start()); tone = { t1, t2, t3, tg, cg };
    const hs = c.createBufferSource(); hs.buffer = noise; hs.loop = true; const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3800; hiss = c.createGain(); hiss.gain.value = 0; hs.connect(hp).connect(hiss).connect(sfx); hs.start();
  }
  function unlockIOS() { try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (e) { }
    if (!silent) { try { silent = new Audio(new URL("silence.wav", import.meta.url).href); silent.loop = true; silent.volume = 0.01; silent.setAttribute("playsinline", ""); } catch (e) { silent = false; } }
    if (silent && silent.paused) { const p = silent.play(); if (p && p.catch) p.catch(() => { }); } }
  /* 鐘：非諧和的泛音（1、2.76、5.4、8.93），慢慢衰減 */
  function bell(t, f, v = 0.1, dur = 5, dest = sfx, pan = 0) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; } node.connect(dest);
    for (const [k, gv, dk] of [[1, 1, 1], [2.76, 0.45, 0.7], [5.4, 0.22, 0.45], [8.93, 0.1, 0.3]]) { const o = c.createOscillator(); o.frequency.value = f * k; const og = c.createGain(); og.gain.setValueAtTime(gv, t); og.gain.exponentialRampToValueAtTime(0.0001, t + dur * dk); o.connect(og).connect(g); o.start(t); o.stop(t + dur); } }
  function pluck(t, f, v = 0.12, dur = 2.4, dest = sfx) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(dest);
    for (const [k, gv] of [[1, 1], [2, 0.5], [3, 0.2], [4, 0.1]]) { const o = c.createOscillator(); o.type = k === 1 ? "triangle" : "sine"; o.frequency.value = f * k; const og = c.createGain(); og.gain.value = gv; o.connect(og).connect(g); o.start(t); o.stop(t + dur); } }
  function loop() { if (!c || paused || !on) return; const t = c.currentTime;
    if (t > nextBell) { const n = SCALE[Math.floor(Math.random() * 8)], k = Math.random(); bell(t + 0.05, mtof(root + 24 + n), 0.035 + k * 0.03, 6 + k * 4, music, Math.random() * 1.6 - 0.8);
      if (Math.random() < 0.45) bell(t + 0.7 + Math.random(), mtof(root + 31 + SCALE[Math.floor(Math.random() * 6)]), 0.025, 6, music, Math.random() * 1.6 - 0.8); nextBell = t + 2.2 + Math.random() * 3.5; } }
  setInterval(loop, 300);
  const fadeTo = (v) => { if (!c) return; master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(v, c.currentTime, 0.4); };
  const now = () => (c ? c.currentTime : 0), ok = () => !!c && on && !paused;
  return {
    get on() { return on; },
    gesture() { init(); if (!c) return; unlockIOS(); if (c.state === "suspended") c.resume(); if (on && !paused) fadeTo(0.9); },
    pause(force) { if (force) paused = true; if (c) fadeTo(0); },
    resume(force) { if (force) paused = false; if (c && on && !paused) { if (c.state === "suspended") c.resume(); fadeTo(0.9); } },
    toggle() { on = !on; try { localStorage.setItem("sle-sound", on ? "1" : "0"); } catch (e) { } if (on) this.resume(); else fadeTo(0); },
    /* 調音：v（0…1）、res（0…1 共鳴多強）、play（手指有沒有在滑桿上） */
    tune(v, res, play) { if (!c || !tone) return; const t = c.currentTime, f = vToHz(v); tone.t1.frequency.setTargetAtTime(f, t, 0.03); tone.t2.frequency.setTargetAtTime(f * 1.003, t, 0.03); tone.t3.frequency.setTargetAtTime(f * 1.5, t, 0.03);
      tone.tg.gain.setTargetAtTime(play && ok() ? 0.05 + res * 0.07 : 0, t, 0.08); tone.cg.gain.setTargetAtTime(play && ok() ? res * res * 0.05 : 0, t, 0.1); hiss.gain.setTargetAtTime(ok() ? res * 0.06 : 0, t, 0.1); },
    sand(level) { if (hiss && c) hiss.gain.setTargetAtTime(ok() ? level * 0.06 : 0, c.currentTime, 0.15); },
    lock(v) { if (!ok()) return; const t = now(), f = vToHz(v); [1, 1.5, 2, 2.5, 3].forEach((k, i) => bell(t + i * 0.09, f * k, 0.07 - i * 0.008, 5, sfx, (i - 2) * 0.3)); },
    grow() { if (!ok()) return; const t = now(); for (let i = 0; i < 10; i++) bell(t + i * 0.16, mtof(root + 24 + SCALE[i % SCALE.length]), 0.045, 4, sfx, Math.sin(i) * 0.7); },
    strike(v = 1) { if (!ok()) return; const t = now(); bell(t, mtof(root - 12), 0.22 * v, 12); bell(t + 0.02, mtof(root), 0.12 * v, 9); const s = c.createBufferSource(); s.buffer = noise; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300; const g = c.createGain(); g.gain.setValueAtTime(0.4 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); s.connect(lp).connect(g).connect(sfx); s.start(t); s.stop(t + 1.3); },
    whoosh() { if (!ok()) return; const t = now(), s = c.createBufferSource(); s.buffer = noise; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(3000, t + 1.4); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); s.connect(bp).connect(g).connect(sfx); s.start(t); s.stop(t + 1.7); },
    string(i, v = 1) { if (!ok()) return; pluck(now(), mtof(root + 12 + SCALE[i % SCALE.length]), 0.08 * v, 3); },
    tick(hi) { if (!ok()) return; const t = now(); pluck(t, hi ? 1760 : 1320, 0.04, 0.12); },
    bell() { if (!ok()) return; const t = now(); bell(t, mtof(root - 5), 0.16, 10); bell(t + 0.01, mtof(root + 7), 0.06, 8); },
    task() { if (!ok()) return; const t = now(); [0, 4, 7].forEach((n, i) => bell(t + i * 0.12, mtof(root + 36 + n), 0.05, 2.5)); },
    fix() { if (!ok()) return; const t = now(); for (let i = 0; i < 7; i++) bell(t + i * 0.13, mtof(root + 24 + SCALE[i]), 0.05, 4, sfx, (i - 3) * 0.2); bell(t + 1, mtof(root - 12), 0.14, 9); },
    hum() { if (!ok()) return; bell(now(), mtof(root - 12), 0.1, 9); },
    voice(i) { if (!ok()) return; const t = now(), base = root + 24 + (i % 5) * 2; for (let k = 0; k < 3; k++) bell(t + k * 0.13, mtof(base + SCALE[(k * 2 + i) % 6]), 0.035, 1.2); },
    seal() { if (!ok()) return; const t = now(); bell(t, mtof(root + 31), 0.07, 3); bell(t + 0.12, mtof(root + 36), 0.05, 3); },
  };
}
