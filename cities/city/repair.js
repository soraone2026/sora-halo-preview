/* FIN-U185 星際城市的修補（熊：「宇宙城市上也加要修補的地方，讓玩家可以去修；要怎麼修、蒐集什麼，給你想」）
 * 曦環城和凝瞬城共用的面板：走到壞掉的地方 → 看要什麼材料 → 「放進去」（手上有多少放多少，可以分好幾次）→ 放滿就修好。
 * 配方和存檔都在 /fin-save.js（FinSave.fixState / fixPut）；這裡只管畫面。城市自己決定壞掉、修到一半、修好的樣子（onUpdate）。
 */
const MAT = { lux: ["曦晶", "Halo crystal", "◆", "曦環城裡拿得到", "found in Xi Halo"], sand: ["時砂", "Time sand", "⧗", "凝瞬城裡拿得到", "found in Stillmoment"], pearl: ["潮珠", "Tide pearl", "◉", "潮光港裡拿得到", "found in Tidelight Harbor"], moss: ["苔光", "Mossglow", "❦", "螢苔林裡拿得到", "found in Glowmoss Grove"],
  ink: ["松煙墨", "Pine-soot ink", "墨", "留白城裡拿得到", "found in Liubai"],
  tone: ["音晶", "Tone crystal", "♪", "鳴沙城裡拿得到", "found in Mingsha"],
  ess: ["元液", "Essence", "💧", "家裡的元液瓶", "from the essence jar at home"], gem: ["多出來的寶石", "Spare gem", "💎", "家裡重複的寶石", "a duplicate gem from home"] };

export function createRepair({ city, L, toast, say, FS, info, onUpdate, sound }) {
  let st = FS ? FS.fixState(city) : null, openId = null;
  const box = document.createElement("div"); box.className = "fixp"; box.hidden = true; box.setAttribute("role", "dialog"); document.body.append(box);
  box.addEventListener("pointerdown", (e) => e.stopPropagation()); box.addEventListener("pointerup", (e) => e.stopPropagation());
  const siteOf = (id) => (st && st.sites.find((x) => x.id === id)) || { id, k: 0, done: false, put: {}, need: {} };
  const nm = (id) => L(info[id].name[0], info[id].name[1]);
  function draw() { if (!openId) return; const I = info[openId], S = siteOf(openId), H = (st && st.have) || {};
    const rows = Object.keys(S.need || {}).map((k) => { const M = MAT[k], put = Math.min(S.need[k], S.put[k] || 0), ok = put >= S.need[k];
      return `<li class="${ok ? "ok" : ""}"><span class="ic">${M[2]}</span><span class="nm">${L(M[0], M[1])}<small>${L(M[3], M[4])}</small></span><b>${put} / ${S.need[k]}</b><span class="hv">${ok ? "✓" : L(`有 ${H[k] || 0}`, `have ${H[k] || 0}`)}</span></li>`; }).join("");
    const can = st && !S.done && Object.keys(S.need || {}).some((k) => (S.put[k] || 0) < S.need[k] && (H[k] || 0) > 0);
    box.innerHTML = `<b class="tt">🔧 ${nm(openId)}</b><p>${S.done ? L(I.fixed[0], I.fixed[1]) : L(I.desc[0], I.desc[1])}</p>`
      + (S.done ? "" : `<div class="bar"><i></i></div><ul>${rows}</ul>`)
      + `<div class="row">${S.done ? "" : `<button class="btn primary" id="fixGo" type="button" ${can ? "" : "disabled"}>${!st ? L("要從遊戲裡進來才能修", "Enter from the game to repair") : can ? L("放進去", "Put them in") : L("材料還不夠，下次再來", "Not enough yet — come back later")}</button>`}<button class="btn" id="fixX" type="button">${L("關閉", "Close")}</button></div>`;
    const bi = box.querySelector(".bar i"); if (bi) bi.style.width = Math.round(S.k * 100) + "%";   /* CSP 不讓 HTML 裡寫 style，要用程式設 */
    box.querySelector("#fixX").onclick = close; const go = box.querySelector("#fixGo"); if (go && can) go.onclick = put; }
  function open(id) { if (FS) st = FS.fixState(city); openId = id; box.hidden = false; draw(); }
  function close() { openId = null; box.hidden = true; }
  function put() { const id = openId, r = FS && FS.fixPut(city, id); if (!r || r.none) { draw(); return; }
    st = FS.fixState(city); const S = siteOf(id), gave = Object.keys(r.gave).map((k) => `${MAT[k][2]}${r.gave[k]}`).join(" ");
    onUpdate(id, S.k, S.done, !!r.done); sound && sound(r.done ? 2 : 1);
    if (r.done) { close(); const I = info[id], rw = r.reward ? [r.reward.b ? `+${r.reward.b} B` : "", r.reward.ore ? L(`原石 ×${r.reward.ore}`, `raw gem ×${r.reward.ore}`) : ""].filter(Boolean).join("　") : "";
      setTimeout(() => say(L(I.thanks[0], I.thanks[1]), L(I.who[0], I.who[1]), 7500), 900);
      const sh = I.short || I.name; toast(L(`🔧 ${sh[0]}修好了　${rw}`, `🔧 ${sh[1]} is repaired  ${rw}`), 5200);
      if (r.all) setTimeout(() => { say(L(info._all[0], info._all[1]), L(`全部修好了　+${r.all.b} B　原石 ×${r.all.ore}`, `All repaired  +${r.all.b} B  raw gem ×${r.all.ore}`), 8000); sound && sound(3); }, 9000); }
    else { toast(L(`放進去了 ${gave}　· 修到 ${Math.round(S.k * 100)}%`, `Put in ${gave} · ${Math.round(S.k * 100)}% repaired`), 3600); draw(); } }
  return { open, close, get isOpen() { return !!openId; }, site: (id) => siteOf(id), refresh: () => { if (FS) st = FS.fixState(city); if (openId) draw(); }, name: nm };
}
