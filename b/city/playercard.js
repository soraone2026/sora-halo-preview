/* 玩家小卡（熊 2026-11-21）：在城市裡點別的玩家——打招呼、加好友、邀請一起玩、不想再遇到（封鎖）。
 * 陌生人只有「兩個人此刻在同一個地方」才能加好友、邀請（伺服器會檢查）。以後所有多人玩法都用這一張卡。 */
const TOUR = [["halo", "曦環城", "Xi Halo"], ["still", "凝瞬城", "Stillmoment"], ["harbor", "潮光港", "Tidelight Harbor"], ["grove", "螢苔林", "Glowmoss Grove"]];
const en = () => { try { return (localStorage.getItem("sora-lang") || "").startsWith("en"); } catch { return false; } };
const L = (zh, e) => (en() ? e : zh);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function cssOnce() { if (document.getElementById("pcCss")) return; const l = document.createElement("link"); l.id = "pcCss"; l.rel = "stylesheet"; l.href = "./playercard.css"; document.head.appendChild(l); }
function say(msg) { if (window.__cityToast) { window.__cityToast(msg); return; } let t = document.getElementById("pcToast"); if (!t) { t = document.createElement("div"); t.id = "pcToast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 3200); }
async function api(path, body) { const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || L("沒有成功", "That didn't work")); return d; }

export function openPlayerCard(uid, name) {
  cssOnce(); document.getElementById("pcOv")?.remove();
  const ov = document.createElement("div"); ov.id = "pcOv";
  ov.innerHTML = `<div class="pcCard"><b class="pcName">${esc(name)}</b><small class="pcRel">${L("讀取中…", "Loading…")}</small>
    <div class="pcActs"><button data-a="wave">👋 ${L("打招呼", "Say hi")}</button><button data-a="add">🤝 ${L("加好友", "Add friend")}</button><button data-a="inv">🎮 ${L("邀請一起玩", "Invite to play")}</button></div>
    <div class="pcInv" hidden><small>${L("邀請一起去…（你先過去，對方接受就會出現在你身邊）", "Invite to… (head there; they'll appear beside you if they accept)")}</small>${TOUR.map(([k, zh, e]) => `<button data-inv="${k}">🛰 ${L(zh, e)}</button>`).join("")}</div>
    <div class="pcFoot"><button data-a="block" class="pcGhost">🚫 ${L("不想再遇到", "Don't show me this player")}</button><button data-a="x" class="pcGhost">${L("關閉", "Close")}</button></div></div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove(); ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  api("/api/world/card?uid=" + encodeURIComponent(uid)).then((c) => {
    const R = { friend: L("你的朋友", "Your friend"), neighbor: L("你的鄰居", "Your neighbour"), pending: L("好友邀請等待中", "Friend request waiting"), stranger: L("在這裡遇到的玩家", "A player you met here") };
    ov.querySelector(".pcRel").textContent = `${R[c.rel] || ""}${c.town ? L(`・住在${c.town}`, ` · lives in ${c.town}`) : ""}${c.online ? L("・在線上", " · online") : ""}`;
    if (c.rel === "friend") ov.querySelector('[data-a="add"]').remove(); else if (c.asked) { const b = ov.querySelector('[data-a="add"]'); b.disabled = true; b.textContent = L("🤝 已送出邀請", "🤝 Request sent"); }
    if (c.blocked) { const b = ov.querySelector('[data-a="block"]'); b.dataset.a = "unblock"; b.textContent = L("解除封鎖", "Unblock"); }
  }).catch((e) => { ov.querySelector(".pcRel").textContent = e.message; });
  ov.querySelectorAll("[data-inv]").forEach((b) => b.onclick = async () => { try { await api("/api/world/send", { to: uid, kind: "tour", city: b.dataset.inv }); const n = TOUR.find((q) => q[0] === b.dataset.inv); say(L(`🛰 邀請 ${name} 一起去${n[1]}了`, `🛰 Invited ${name} to ${n[2]}`)); close(); } catch (e) { say(e.message); } });
  ov.querySelectorAll("[data-a]").forEach((b) => b.onclick = async () => { const a = b.dataset.a;
    try {
      if (a === "x") return close();
      if (a === "wave") { await api("/api/world/wave", { to: uid }); say(L(`👋 跟 ${name} 打了招呼`, `👋 You waved at ${name}`)); return; }
      if (a === "add") { const r = await api("/api/world/friend/uid", { to: uid }); b.disabled = true; say(r.state === "ok" ? L(`🤝 你和 ${name} 成為朋友了`, `🤝 You and ${name} are now friends`) : L(`🤝 好友邀請送給 ${name} 了`, `🤝 Friend request sent to ${name}`)); return; }
      if (a === "inv") { const box = ov.querySelector(".pcInv"); box.hidden = !box.hidden; return; }
      if (a === "block") { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = L("再按一次——對方看不到你、也聯絡不到你", "Tap again — they won't see or contact you"); return; } await api("/api/world/block", { to: uid, on: true }); say(L(`🚫 不會再遇到 ${name} 了`, `🚫 You won't meet ${name} anymore`)); close(); return; }
      if (a === "unblock") { await api("/api/world/block", { to: uid, on: false }); say(L("解除封鎖了", "Unblocked")); close(); }
    } catch (e) { say(e.message); } });
}

export function showWaves(list) {
  for (const w of list || []) {
    cssOnce(); const el = document.createElement("div"); el.className = "pcWave"; el.innerHTML = `<span>👋 ${L(`${esc(w.name)} 跟你打招呼`, `${esc(w.name)} waved at you`)}</span><button>${L("回個招呼", "Wave back")}</button>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
    const bye = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 300); }; const tm = setTimeout(bye, 6000);
    el.querySelector("button").onclick = async () => { clearTimeout(tm); try { await api("/api/world/wave", { to: w.from }); } catch { } bye(); };
  }
}
