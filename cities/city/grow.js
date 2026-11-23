/* 會長大的星際城市（2026-11-23，熊：「會逐漸長大、動態成長、依每個玩家不同的行為長成不同樣子」）——第六座以後共用。
 * - 每天第一次進城，城市會長一步：兩個「可以長出來的東西」漂過來，玩家挑一個留下（另一個漂走）。
 * - 漂過來的是哪兩個，看玩家上次來之後的生活：FinSave.feed(上次來的日期) 回傳六類的次數
 *   （food 吃喝、move 移動、home 家裡、save 收入存錢、learn 學習、play 玩）；最多的那類一定在裡面，另一個是第二多的（都沒有就隨機）。
 *   只看記帳的「項目、類別、日期」，不看金額和備註。
 * - 存檔：FinSave.growState / growVisit / growChoose（s.grow[city]，只會變多，跨裝置取大的）。
 * 用法：const G = growStart({ city, map, L, rnd, hour }) → { state, offer }；有 offer 就 growPanel(...)。 */
export const BUCKETS = ["food", "move", "home", "save", "learn", "play"];

export function growOffer(feed, map, rnd = Math.random) {
  const b = (feed && feed.b) || {}, order = BUCKETS.slice().sort((x, y) => (b[y] || 0) - (b[x] || 0) || rnd() - 0.5);
  const types = [...new Set(BUCKETS.map((k) => map[k]))], first = (b[order[0]] || 0) > 0 ? map[order[0]] : types[Math.floor(rnd() * types.length)];
  let second = null; for (const k of order.slice(1)) if ((b[k] || 0) > 0 && map[k] !== first) { second = map[k]; break; }
  if (!second) { const rest = types.filter((t) => t !== first); second = rest[Math.floor(rnd() * rest.length)]; }
  return { offer: [first, second], top: (b[order[0]] || 0) > 0 ? order[0] : null };
}

/* 進城時呼叫：新的一天就記一次來訪，並準備今天漂過來的兩個（已經有還沒選的，就沿用那兩個） */
export function growStart({ city, map, rnd = Math.random, hour = new Date().getHours() }) {
  const FS = window.FinSave && window.FinSave.ok && window.FinSave.ok() ? window.FinSave : null;
  if (!FS || !FS.growState) return { state: null, offer: null, top: null };
  let st = FS.growState(city), top = null;
  if (!st.pend) { const f = FS.feed ? FS.feed(st.last) : null, o = typeof map === "function" ? map(f, rnd) : growOffer(f, map, rnd);   /* map 也可以是城市自己的挑選規則 (feed, rnd) => { offer, top } */ top = o.top; st = FS.growVisit(city, hour, o.offer) || st; }
  else st = FS.growVisit(city, hour, null) || st;
  return { state: st, offer: st.pend ? st.pend.o : null, top, FS };
}

/* 挑一個留下的小面板。info[type] = { icon, name:[zh,en], desc:[zh,en] }；why：為什麼是這兩個（一句話，可以不給） */
export function growPanel({ L, info, offer, title, why, onPick, onLater }) {
  const box = document.createElement("div"); box.className = "growp"; box.setAttribute("role", "dialog");
  box.addEventListener("pointerdown", (e) => e.stopPropagation()); box.addEventListener("pointerup", (e) => e.stopPropagation());
  const card = (t) => { const I = typeof info === "function" ? info(t) : info[t]; return `<button class="gopt" type="button" data-t="${t}"><span class="gic">${I.icon}</span><b>${L(I.name[0], I.name[1])}</b><small>${L(I.desc[0], I.desc[1])}</small></button>`; };
  box.innerHTML = `<b class="gtt">${title}</b>${why ? `<p class="gwhy">${why}</p>` : ""}<div class="gopts">${offer.map(card).join("")}</div><button class="btn glater" type="button">${L("等一下再決定", "Decide later")}</button>`;
  document.body.append(box); requestAnimationFrame(() => box.classList.add("on"));
  const close = () => { box.classList.remove("on"); setTimeout(() => box.remove(), 300); };
  box.querySelectorAll(".gopt").forEach((b) => b.onclick = () => { close(); onPick(b.dataset.t); });
  box.querySelector(".glater").onclick = () => { close(); onLater && onLater(); };
  return { close };
}

/* 修好三處之後的故事：一張卡，一段一段出現 */
export function storyCard({ L, chapter, title, paras, sign, next, keep, onClose }) {
  const ov = document.createElement("div"); ov.className = "storyov"; ov.addEventListener("pointerdown", (e) => e.stopPropagation()); ov.addEventListener("pointerup", (e) => e.stopPropagation());
  ov.innerHTML = `<div class="scard"><small>${chapter}</small><b>${title}</b>${paras.map((p) => `<p>${p}</p>`).join("")}${sign ? `<p class="ssign">${sign}</p>` : ""}${next ? `<p class="snext">${next}</p>` : ""}<button class="btn primary" type="button">${keep || L("收好", "Keep it")}</button></div>`;
  ov.querySelectorAll("p").forEach((p, i) => { p.style.animationDelay = (0.4 + i * 1.1).toFixed(1) + "s"; });   /* CSP 不讓 HTML 裡寫 style：用程式設 */
  ov.querySelector("button").onclick = () => { ov.remove(); onClose && onClose(); };
  document.body.append(ov); return ov;
}
