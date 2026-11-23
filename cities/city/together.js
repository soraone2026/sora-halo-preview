/* FIN-U190（熊）：星際城市裡的「一起」
 * - 週末 Niko 同行（網址 ?niko=1，遊戲那邊決定：熊自己的家、週末、沒有關掉）：Niko 跟在她旁邊，偶爾說一句。
 * - 共遊：邀請朋友或同鎮鄰居（伺服器 mail kind "tour"，30 分鐘內有效）；接受的人用 ?tour=邀請人 進來，不用買星門票。
 *   同一個房間（城市＋邀請人）的人每秒交換一次位置，看得到彼此（頭上有發光的名字）。
 * - 合照小卡：把現在的畫面做成一張小卡（城市、日期、在場的人），放進遊戲的相簿；也可以寄一張給同行的朋友（用明信片，一天一張）。
 * 城市只要提供：自己的位置（getMe）、怎麼把一個人放到某個位置（put）、截圖（snap）。
 */
import { makePerson, animatePerson } from "./city-people.js";
import { makeNameTag } from "./nametag.js";
import { openPlayerCard, showWaves } from "./playercard.js";   /* 熊 2026-11-21：玩家小卡 */
let hereNow = [];   /* 共遊房間裡現在的其他人（邀請面板裡可以點開小卡） */

const QS = new URLSearchParams(location.search);
export const NIKO_LOOK = { top: "#e9e5dc", bottom: "#3b3f47", hair: "#2a1d16", skin: "#ecd2bd", longHair: false };
export const NIKO_LINES = {
  halo: [["A city that grows overnight. I would like to meet its engineer.", "一座每晚自己長出來的城市。我想見見它的工程師。"], ["Listen — the star hums in B-flat.", "妳聽，那顆恆星是降 B 的嗡嗡聲。"], ["The whales are not swimming. They are being sung along.", "光鯨不是在游。牠們是被歌聲帶著走。"],
    ["I would build a coil here. The whole ring would light up.", "我想在這裡蓋一座線圈，整個環都會亮起來。"], ["Walk on the glass with me. The planet underneath is shy.", "陪我走在玻璃上。底下那顆行星很害羞。"], ["I am glad it is the weekend.", "還好是週末。"]],
  still: [["Time only moves near you. I have always suspected this.", "時間只在妳身邊流動。我一直這樣懷疑。"], ["That lightning has been waiting a very long time. So have I, for Saturday.", "那道閃電等了很久。我也等週六等了很久。"], ["Stand still for a second. There — now we match the city.", "站著不要動一秒——好，現在我們跟這座城一樣了。"],
    ["If I fixed the clock tower, would you stay a little longer?", "如果我把鐘樓修好，妳會不會多待一下？"], ["The rain falls only around us. I find that romantic and also scientifically troubling.", "雨只在我們身邊落下。很浪漫，也很不科學。"], ["I am glad it is the weekend.", "還好是週末。"]],
};

/* ---------- 人：Niko 或其他玩家 ---------- */
export function makeFigure(THREE, look, name, opt = {}) {
  const p = makePerson(THREE, { top: look.top || look.shirt, bottom: look.bottom || look.pants, hair: look.hair || look.hairColor, skin: look.skin, longHair: look.longHair != null ? look.longHair : look.sex !== "m", noUmbrella: true, scale: opt.scale || 1 }, Math.random);
  p.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  const tag = makeNameTag(THREE, name, opt.place || "", { size: 0.36, glow: opt.glow || "#ffe39a" }); tag.position.y = opt.tagY || 2.32;   /* 比她的名牌高一點，站在旁邊時不會疊在一起 */ p.add(tag);
  return { p, tag, x: 0, z: 0, tx: 0, tz: 0, ry: 0, tryy: 0, moving: 0 };
}
export const tickFigure = (f, t) => { animatePerson(f.p, t, f.moving ? 1.6 : 0); f.tag.userData.tick(t); };

/* ---------- 共遊：每秒交換位置 ---------- */
export function tourLink({ city, getMe, onSync, toast, L }) {
  const room = QS.get("tour") || "self"; let off = false, said = false, lookAt = 0;
  const look = () => { try { const P = window.parent !== window ? window.parent : null; return P && P.__finLook ? P.__finLook() : null; } catch { return null; } };
  async function step() {
    if (off) return;
    try { const me = getMe();
      if (!document.hidden && me) { const body = { zone: "tour", city, room, x: me.x, y: 0, z: me.z, ry: me.ry, m: me.m || "walk" };
        if (Date.now() - lookAt > 30000) { const lk = look(); if (lk) body.look = lk; lookAt = Date.now(); }
        const r = await fetch("/api/world/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (r.status === 401 || r.status === 404) { off = true; return; }
        if (r.status === 403) { off = true; toast(L("共遊的邀請過期了，現在是一個人逛。", "The invitation has expired — you're exploring on your own now.")); return; }
        if (r.ok) { const d = await r.json(), others = d.others || []; onSync(others); hereNow = others.map((o) => ({ uid: o.uid, name: o.name })); showWaves(d.waves);
          if (!said && room !== "self") { said = true; toast(others.length ? L(`🛰 和 ${others.map((o) => o.name).join("、")} 一起逛`, `🛰 Exploring with ${others.map((o) => o.name).join(", ")}`) : L("🛰 已經進到朋友的房間，他來了就會出現在這裡", "🛰 You're in your friend's room — they'll appear here when they arrive")); } } }
    } catch (e) { }
    setTimeout(step, document.hidden ? 4000 : 1000);
  }
  step();
  return { room, get on() { return !off; } };
}

/* ---------- 邀請面板 ---------- */
export function invitePanel({ city, L, toast }) {
  const box = document.createElement("div"); box.className = "fixp tgp"; box.hidden = true; document.body.append(box);
  box.addEventListener("pointerdown", (e) => e.stopPropagation()); box.addEventListener("pointerup", (e) => e.stopPropagation());
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  async function open() { box.hidden = false; box.innerHTML = `<b class="tt">👥 ${L("邀請一起逛", "Invite someone")}</b><p>${L("讀取中…", "Loading…")}</p>`;
    let me = null; try { const r = await fetch("/api/world/me"); if (r.ok) me = await r.json(); } catch (e) { }
    if (!me) { box.innerHTML = `<b class="tt">👥 ${L("邀請一起逛", "Invite someone")}</b><p>${L("要在網站版登入才能邀請朋友。", "Sign in on the website to invite friends.")}</p><div class="row"><button class="btn" id="tgX" type="button">${L("關閉", "Close")}</button></div>`; box.querySelector("#tgX").onclick = () => { box.hidden = true; }; return; }
    const seen = new Set([me.uid]), people = [];
    for (const f of me.friends || []) if (!seen.has(f.uid)) { seen.add(f.uid); people.push({ ...f, tag: L("朋友", "friend") }); }
    for (const r of me.residents || []) if (!seen.has(r.uid)) { seen.add(r.uid); people.push({ ...r, tag: L("鄰居", "neighbour") }); }
    people.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
    box.innerHTML = `<b class="tt">👥 ${L("邀請一起逛", "Invite someone")}</b><p>${L("對方會在信箱收到邀請（30 分鐘內有效），按「一起去」就會出現在你身邊，不用買星門票。", "They get an invitation in their mailbox (valid 30 minutes). One tap and they appear beside you — no ticket needed.")}</p>
      <ul class="tgl">${people.length ? people.slice(0, 30).map((p) => `<li><span class="dot ${p.online ? "on" : ""}"></span><span class="nm">${esc(p.name)}<small>${p.tag}${p.online ? L("・在線上", " · online") : ""}</small></span><button class="btn" data-inv="${esc(p.uid)}" type="button">${L("邀請", "Invite")}</button></li>`).join("") : `<li>${L("還沒有朋友或鄰居。在遊戲的「朋友與鄰居」加朋友。", "No friends or neighbours yet — add some under Friends & neighbours in the game.")}</li>`}</ul>
      <div class="row"><button class="btn" id="tgX" type="button">${L("關閉", "Close")}</button></div>`;
    box.querySelector("#tgX").onclick = () => { box.hidden = true; };
    if (hereNow.length) { const sec = document.createElement("div"); sec.className = "tgHere"; sec.innerHTML = `<b class="tt">${L("現在在這裡", "Here now")}</b>`; for (const h of hereNow) { const b = document.createElement("button"); b.className = "btn"; b.type = "button"; b.textContent = "👤 " + h.name; b.onclick = () => openPlayerCard(h.uid, h.name); sec.appendChild(b); } box.insertBefore(sec, box.querySelector(".row")); }
    box.querySelectorAll("[data-inv]").forEach((b) => b.onclick = async () => { b.disabled = true;
      try { const r = await fetch("/api/world/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: b.dataset.inv, kind: "tour", city }) }); const d = await r.json().catch(() => ({}));
        if (r.ok) { b.textContent = L("已邀請", "Invited"); toast(L("📨 邀請送出了，對方 30 分鐘內按「一起去」就會出現。", "📨 Invitation sent — they'll appear if they accept within 30 minutes.")); }
        else { b.disabled = false; toast((d && (d.message || d.error)) || L("邀請送不出去", "Couldn't send the invitation")); } } catch (e) { b.disabled = false; toast(L("邀請送不出去", "Couldn't send the invitation")); } }); }
  return { open, close: () => { box.hidden = true; } };
}

/* ---------- 合照小卡 ---------- */
export function makeCard({ snap, cityName, names, palette, L }) {
  return new Promise((resolve) => { const s = snap(); if (!s) return resolve(null); const img = new Image(); img.onload = () => {
    const W = 900, H = 1200, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"), [bg, ink, accent] = palette;
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    for (let k = 0; k < 90; k++) { c.fillStyle = `rgba(255,255,255,${(Math.random() * 0.25).toFixed(2)})`; c.beginPath(); c.arc(Math.random() * W, Math.random() * H, Math.random() * 2.2, 0, 7); c.fill(); }   /* 一點星塵 */
    const px = 60, py = 70, pw = W - 120, ph = 820, r = 26; c.save(); c.beginPath(); c.roundRect ? c.roundRect(px, py, pw, ph, r) : c.rect(px, py, pw, ph); c.clip();
    const sc = Math.max(pw / img.width, ph / img.height), iw = img.width * sc, ih = img.height * sc; c.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih); c.restore();
    c.strokeStyle = accent; c.lineWidth = 4; c.beginPath(); c.roundRect ? c.roundRect(px - 8, py - 8, pw + 16, ph + 16, r + 6) : c.rect(px - 8, py - 8, pw + 16, ph + 16); c.stroke();
    const d = new Date(), ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    c.fillStyle = ink; c.textAlign = "center"; c.font = `600 56px "Noto Serif TC", Georgia, serif`; c.fillText(cityName, W / 2, 985);
    c.font = `400 30px "Noto Sans TC", system-ui, sans-serif`; c.globalAlpha = 0.8; c.fillText(ds, W / 2, 1035); c.globalAlpha = 1;
    c.font = `500 36px "Noto Sans TC", system-ui, sans-serif`; c.fillText(names.join("  ·  "), W / 2, 1105);
    c.fillStyle = accent; c.font = `400 24px Georgia, serif`; c.fillText("SORA · STAR CITY CARD", W / 2, 1160);
    resolve({ url: cv.toDataURL("image/jpeg", 0.88), small: (() => { const s2 = document.createElement("canvas"); s2.width = 540; s2.height = 720; s2.getContext("2d").drawImage(cv, 0, 0, 540, 720); return s2.toDataURL("image/jpeg", 0.72); })() }); };
    img.onerror = () => resolve(null); img.src = s.url; });
}
export function cardPanel({ card, cityName, mates, L, toast }) {
  const box = document.createElement("div"); box.className = "fixp tgp tgcard"; document.body.append(box);
  box.addEventListener("pointerdown", (e) => e.stopPropagation()); box.addEventListener("pointerup", (e) => e.stopPropagation());
  let saved = false; try { const P = window.parent !== window ? window.parent : null; if (P && P.__finCard) saved = !!P.__finCard(card.url, cityName, mates.map((m) => m.name)); } catch (e) { }
  const img = document.createElement("img"); img.src = card.url; img.alt = cityName;
  box.innerHTML = `<b class="tt">🖼 ${L("合照小卡", "Photo card")}</b><p>${saved ? L("放進遊戲的相簿了（OOTD 相簿）。", "Saved to your album in the game (OOTD album).") : L("要從遊戲裡進來，才會放進相簿。", "Open the city from the game to save it to your album.")}</p>`;
  box.append(img);
  const row = document.createElement("div"); row.className = "row";
  for (const m of mates.filter((x) => x.uid)) { const b = document.createElement("button"); b.className = "btn"; b.type = "button"; b.textContent = L(`💌 寄一張給 ${m.name}`, `💌 Send one to ${m.name}`);
    b.onclick = async () => { b.disabled = true; try { const r = await fetch("/api/world/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: m.uid, kind: "postcard", img: card.small, text: L(`${cityName}的合照`, `A photo from ${cityName}`), place: cityName }) }); const d = await r.json().catch(() => ({}));
        if (r.ok) { b.textContent = L("寄出了", "Sent"); toast(L(`💌 寄給 ${m.name} 了（明信片一天一張）`, `💌 Sent to ${m.name} (one postcard a day)`)); } else { b.disabled = false; toast((d && (d.message || d.error)) || L("寄不出去", "Couldn't send it")); } } catch (e) { b.disabled = false; } };
    row.append(b); }
  const x = document.createElement("button"); x.className = "btn"; x.type = "button"; x.textContent = L("關閉", "Close"); x.onclick = () => box.remove(); row.append(x); box.append(row);
}
