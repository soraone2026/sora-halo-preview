/* FIN-U189（熊：「在曦環城，玩家頭上也要有名字。可以是像光明一樣。sora XXX（地點）」）
 * 頭上一行發光的字：「名字・地點」。用畫布畫成貼圖、貼在 Sprite 上（永遠面向鏡頭、不被東西擋住），輕輕地呼吸。
 */
export function makeNameTag(THREE, name, place, opt = {}) {
  const text = place ? `${name} · ${place}` : name, cv = document.createElement("canvas"), c = cv.getContext("2d");
  const font = `700 64px "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif`; c.font = font;
  const w = Math.ceil(c.measureText(text).width) + 120, h = 130; cv.width = w; cv.height = h;
  const col = opt.color || "#fff6dc", glow = opt.glow || "#ffd98a";
  c.font = font; c.textAlign = "center"; c.textBaseline = "middle";
  const halo = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); halo.addColorStop(0, "rgba(255,230,170,.22)"); halo.addColorStop(1, "rgba(255,230,170,0)");
  c.fillStyle = halo; c.fillRect(0, 0, w, h);                                   /* 字後面一團淡淡的光 */
  { const pw = w - 40, ph = 92, x0 = 20, y0 = (h - ph) / 2, r = ph / 2; c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x0 + pw, y0, x0 + pw, y0 + ph, r); c.arcTo(x0 + pw, y0 + ph, x0, y0 + ph, r); c.arcTo(x0, y0 + ph, x0, y0, r); c.arcTo(x0, y0, x0 + pw, y0, r); c.closePath();
    c.fillStyle = "rgba(20,26,48,.55)"; c.fill(); c.lineWidth = 3; c.strokeStyle = glow; c.globalAlpha = 0.7; c.stroke(); c.globalAlpha = 1; }   /* FIN-U208（熊：名字要清楚一點）：字後面一塊深色的圓角底 */
  c.shadowColor = glow; for (const b of [14, 6]) { c.shadowBlur = b; c.fillStyle = glow; c.fillText(text, w / 2, h / 2 + 2); }   /* 光暈（薄一點，字才清楚） */
  c.shadowBlur = 0; c.lineWidth = 6; c.strokeStyle = "rgba(10,14,30,.85)"; c.strokeText(text, w / 2, h / 2 + 2); c.fillStyle = col; c.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const sp = new THREE.Sprite(mat), H = opt.size || 0.5; sp.scale.set(H * w / h, H, 1); sp.renderOrder = 20;
  sp.userData.tick = (t) => { mat.opacity = 0.94 + Math.sin(t * 1.6) * 0.06; };
  return sp;
}
export function playerName() { try { const s = JSON.parse(localStorage.getItem("sora-universe-v0")); return (s && ((s.avatar && s.avatar.name) || (s.profile && s.profile.name))) || "Sora"; } catch (e) { return "Sora"; } }
