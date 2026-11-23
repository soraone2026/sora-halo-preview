/* 一份存檔（熊 2026-11-14）：書房、城市和遊戲主畫面在同一個網站，直接讀寫同一份遊戲存檔（localStorage「sora-universe-v0」）。
 * 遊戲主畫面會聽 storage 事件，馬上跟著換、再送回伺服器，所以不用存來存去。
 * 規則和數字照遊戲的 core（universe-core.js）：宇宙元液最多 30 滴；原石 3 小時鑑定；外星人每天 2 份；小遊戲每天 3 場有獎勵。 */
(function () {
  "use strict";
  var KEY = "sora-universe-v0", CAP = 30;
  // 原石裡是哪一種寶石：照遊戲的稀有度抽（常見 10、稀有 4、珍貴 1.5、特別版 0.4、未知星石 0.3）
  var RAR = { c: ["G-4", "G-5", "G-6", "G-7", "G-8", "G-14", "G-18", "G-19", "G-23", "G-25", "G-26", "G-28", "G-29", "G-41"], r: ["G-1", "G-2", "G-3", "G-9", "G-11", "G-13", "G-15", "G-20", "G-24", "G-27", "G-31", "G-42"],
    e: ["G-10", "G-12", "G-16", "G-17", "G-30", "G-40", "G-43"], s: ["G-21", "G-22", "G-44"], x: ["G-32", "G-33", "G-34", "G-35"] };
  var W = { c: 10, r: 4, e: 1.5, s: 0.4, x: 0.3 };
  // 城市寶石的種類 → 遊戲圖鑑裡的寶石
  var KIND = { ruby: "G-1", sapphire: "G-2", emerald: "G-3", amethyst: "G-4", topaz: "G-5", star: "G-10" };
  function pickGem() { var all = [], tot = 0; Object.keys(RAR).forEach(function (k) { RAR[k].forEach(function (id) { all.push([id, W[k]]); tot += W[k]; }); });
    var x = Math.random() * tot; for (var i = 0; i < all.length; i++) { x -= all[i][1]; if (x < 0) return all[i][0]; } return all[all.length - 1][0]; }
  function today() { var d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
  // 帳號隔離（2026-11-20）：記住這頁打開時是誰的存檔；別的分頁換了人登入，就不再讀寫（重新整理後才換成新的人）
  var UID0 = null; try { UID0 = localStorage.getItem("sle.uid"); } catch (e) { } var UID_LOAD = UID0;
  var ME = null; try { var q = new XMLHttpRequest(); q.open("GET", "/api/world/me", false); q.send(); if (q.status === 200) { var j = JSON.parse(q.responseText); ME = j && (j.cloud ? j.uid : "owner") || null; } } catch (e) { ME = null; }
  if (typeof window !== "undefined" && window.__sleAcct) ME = window.__sleAcct;   /* FIN-U240：伺服器寫在頁面上的帳號（acct-guard.js）最準 */
  if (!ME && typeof location !== "undefined" && location.protocol === "https:") UID0 = "(unknown-account)";   /* FIN-U240（Codex 審查）：雲端網站上確認不了是誰：不讀不寫（不會拿這台舊的存檔當成現在的人） */
  if (ME) UID0 = ME;   // 伺服器說現在登入的是誰；這台的存檔不是這個人的（還沒在主畫面換過帳號）就不讀不寫
  function sameAcct() { var u = null; try { u = localStorage.getItem("sle.uid"); } catch (e) { } if (u === UID0) return true; if (ME && u == null && !localStorage.getItem(KEY)) return true; if (u === UID_LOAD) return false; /* 一開始就不是這個人的：不讀不寫，也不要一直重新整理 */ try { if (!document.hidden) location.reload(); else if (!sameAcct.wait) { sameAcct.wait = true; document.addEventListener("visibilitychange", function () { if (!document.hidden) location.reload(); }); } } catch (e) { } return false; }   /* FIN-U240：只掛一次 */
  function read() { if (!sameAcct()) return null; try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function write(s) { if (!sameAcct()) return; s.saved_at = s.updated_at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
  function ess(s) { s.essence = s.essence || { n: 0, lens: 0, log: [] }; s.essence.log = s.essence.log || []; return s.essence; }
  function addEss(s, n, reason) { var e = ess(s), b = e.n || 0; e.n = Math.max(0, Math.min(CAP, b + n)); var d = e.n - b; if (d) { e.log.push({ date: today(), n: d, reason: reason }); if (e.log.length > 80) e.log = e.log.slice(-80); } return d; }
  function bloom(s, n, reason) { var f = s.avatar && s.avatar.finance; if (!f) return; f.bcoins = (f.bcoins || 0) + n; (s.bloom_log = s.bloom_log || []).push({ date: today(), amount: n, reason: reason }); }
  function ore(s, gem) { var now = Date.now(); (s.ores = s.ores || []).push({ id: "O-" + now + "-" + Math.floor(Math.random() * 1e6), at: now, date: today(), gem: gem || pickGem() }); }
  /* FIN-U185（熊：「宇宙城市上也加要修補的地方，讓玩家可以去修」）：
   * 兩種城市材料——曦晶（lux，曦環城裡拿到）、時砂（sand，凝瞬城裡拿到）；再加上家裡的元液（ess）和重複的寶石（gem）。
   * 每座城三處要修，順序不限；後面兩處都要另一座城的材料（兩座城要互相幫忙）。材料可以分好幾次放進去，放滿就修好。
   * mats.k = { in: 總共拿到, out: 總共用掉 }——跨裝置合併時各取大的（core mergeStates），不會變多。 */
  var FIX = {
    halo: [{ id: "bridge", need: { lux: 6, ess: 1 }, b: 6, ore: 0 }, { id: "beacon", need: { lux: 10, sand: 3, gem: 1 }, b: 8, ore: 1 }, { id: "bell", need: { lux: 16, sand: 5, ess: 3 }, b: 12, ore: 2 }],
    still: [{ id: "sundial", need: { sand: 6, ess: 1 }, b: 6, ore: 0 }, { id: "column", need: { sand: 10, lux: 3, gem: 1 }, b: 8, ore: 1 }, { id: "pendulum", need: { sand: 16, lux: 5, ess: 3 }, b: 12, ore: 2 }],
    harbor: [{ id: "lens", need: { pearl: 6, ess: 1 }, b: 6, ore: 0 }, { id: "pier", need: { pearl: 10, lux: 3, gem: 1 }, b: 8, ore: 1 }, { id: "organ", need: { pearl: 16, sand: 5, ess: 3 }, b: 12, ore: 2 }],   // FIN-U213 潮光港
    grove: [{ id: "tree", need: { moss: 6, ess: 1 }, b: 6, ore: 0 }, { id: "wheel", need: { moss: 10, pearl: 3, gem: 1 }, b: 8, ore: 1 }, { id: "arch", need: { moss: 16, lux: 4, sand: 3, ess: 3 }, b: 12, ore: 2 }],
    liubai: [{ id: "plaque", need: { ink: 6, ess: 1 }, b: 6, ore: 0 }, { id: "bridge", need: { ink: 10, moss: 3, gem: 1 }, b: 8, ore: 1 }, { id: "fall", need: { ink: 16, pearl: 4, sand: 3, ess: 3 }, b: 12, ore: 2 }],
    mingsha: [{ id: "bell", need: { tone: 8, ess: 1 }, b: 7, ore: 0 }, { id: "harp", need: { tone: 12, lux: 3, gem: 1 }, b: 9, ore: 1 }, { id: "metro", need: { tone: 18, ink: 4, pearl: 3, ess: 3 }, b: 13, ore: 2 }] };   // 2026-11-23 第七座：鳴沙城   // 2026-11-23 第六座：留白城   // FIN-U217 螢苔林
  var FIX_ALL = { b: 10, ore: 1 };
  var STAR_MAT = { liubai: "ink", mingsha: "tone" };   // 第六座以後：每座城自己的材料
  function mats(s) { var m = s.mats = s.mats || {}; ["lux", "sand", "pearl", "moss", "ink", "tone"].forEach(function (k) { m[k] = m[k] || { in: 0, out: 0 }; }); return m; }
  function gainMat(s, k, n) { mats(s)[k].in += n; return n; }
  function dupGems(s) { var g = s.gems || {}, n = 0; Object.keys(g).forEach(function (k) { n += Math.max(0, (g[k] | 0) - 1); }); return n; }
  function have(s, k) { if (k === "ess") return (s.essence && s.essence.n) || 0; if (k === "gem") return dupGems(s); var m = mats(s)[k]; return Math.max(0, m.in - m.out); }
  function spend(s, k, n) { if (k === "ess") { addEss(s, -n, "fix"); return; }
    if (k === "gem") { for (var q = 0; q < n; q++) { var g = s.gems || {}, best = null; Object.keys(g).forEach(function (id) { if ((g[id] | 0) >= 2 && (!best || g[id] > g[best])) best = id; }); if (best) { g[best]--; var go = s.gem_out = s.gem_out || {}; go[best] = (go[best] || 0) + 1; } } return; }   /* FIN-U186：記用掉幾顆，合併時才不會跑回來 */
    mats(s)[k].out += n; }
  function fixOf(s, city) { var F = s.fix = s.fix || {}, c = F[city] = F[city] || { done: [], put: {}, all: null }; c.done = c.done || []; c.put = c.put || {}; return c; }
  window.FinSave = {
    ok: function () { return !!read(); },
    essence: function () { var s = read(); return s ? (s.essence && s.essence.n) || 0 : 0; },
    spendEssence: function (n, reason) { var s = read(); if (!s || ((s.essence && s.essence.n) || 0) < n) return false; addEss(s, -n, reason); write(s); return true; },
    // 城市撿到的寶石：變成一顆未鑑定原石，放進遊戲的元液瓶（3 小時後或用放大鏡鑑定）
    addOre: function (kind) { var s = read(); if (!s) return false; ore(s, KIND[kind]); write(s); return true; },
    // 小遊戲：和遊戲裡的拼字流星共用每天 3 場的獎勵（一分 2 B，最多 8 B；3 分以上 +1 元液）
    // 圖書館（熊 2026-11-14：不只撿寶石）：館員的單字挑戰、閱讀台的今日一句，每天各一次有 B 幣
    // 熊 FIN-U62：學習賺 B 幣——一份測驗答對一題 1 B，一份最多 8 B，一天最多算 3 份（同一份只算一次）
    studyReward: function (sid, correct) { var s = read(); if (!s) return 0; var d = today(), p = s.profile = s.profile || {}, R = p.studyRw && p.studyRw.d === d ? p.studyRw : { d: d, ids: [] };
      if (R.ids.indexOf(String(sid)) >= 0 || R.ids.length >= 3) return 0; var n = Math.min(8, Math.max(0, correct | 0)); if (!n) return 0; R.ids.push(String(sid)); p.studyRw = R; bloom(s, n, "study:quiz"); write(s); return n; },
    libReward: function (kind, n) { var s = read(); if (!s) return 0; var d = today(), p = s.profile = s.profile || {}, L = p.lib && p.lib.d === d ? p.lib : { d: d, k: [] };
      if (L.k.indexOf(kind) >= 0) return 0; L.k.push(kind); p.lib = L; bloom(s, n, "library:" + kind); write(s); return n; },
    // 城市的霞光（熊 2026-11-14：少見，出現一定會掉東西）：原石、B 幣或元液
    auroraGift: function () { var s = read(); if (!s) return null; var r = Math.random(), g;
      if (r < 0.4) { ore(s); g = { type: "ore" }; } else if (r < 0.75) { var n = 5 + Math.floor(Math.random() * 4); bloom(s, n, "aurora"); g = { type: "bloom", n: n }; } else { addEss(s, 2, "aurora"); g = { type: "dew", n: 2 }; }
      write(s); return g; },
    // 圖書館發光的書（熊 2026-11-14）：每天第一次打開會掉一個小東西（原石、元液或 B 幣）
    bookGift: function () { var s = read(); if (!s) return null; var d = today(), p = s.profile = s.profile || {}; if (p.book_day === d) return null; p.book_day = d; var r = Math.random(), g;
      if (r < 0.3) { ore(s); g = { type: "ore" }; } else if (r < 0.55) { addEss(s, 1, "book"); g = { type: "dew", n: 1 }; } else { var n = 3 + Math.floor(Math.random() * 3); bloom(s, n, "book"); g = { type: "bloom", n: n }; }
      write(s); return g; },
    miniReward: function (game, score) { var s = read(); if (!s) return null; var d = today(), list = s.mini = s.mini || [], n = list.filter(function (m) { return m.date === d; }).length;
      var b = n >= 3 ? 0 : Math.min(8, Math.max(0, Math.floor(score)) * 2), e = 0; if (b) bloom(s, b, "mini:" + game); if (n < 3 && score >= 3) e = addEss(s, 1, "mini");
      list.push({ date: d, game: game, score: score, b: b }); if (list.length > 60) s.mini = list.slice(-60); write(s); return { b: b, e: e }; },
    // 外星人的禮物：和遊戲小鎮的外星人共用每天 2 份；原石、元液露珠或 B 幣
    alienGift: function () { var s = read(); if (!s) return null; var d = today(), log = s.gift_log = s.gift_log || [];
      if (log.filter(function (g) { return g.date === d && g.alien; }).length >= 2) return null;
      var r = Math.random(), g; if (r < 0.5) { ore(s); g = { type: "ore" }; } else if (r < 0.8) { addEss(s, 1, "dew"); g = { type: "dew" }; } else { var n = 2 + Math.floor(Math.random() * 3); bloom(s, n, "gift"); g = { type: "bloom", n: n }; }
      log.push({ date: d, type: g.type, alien: true }); write(s); return g; },
    // FIN-U179 曦環城：每天五個回聲（一個 1 B），五個都找到會有一次共鳴（原石、元液或 B 幣）；光鯨一天送一次
    haloState: function () { var s = read(), d = today(), H = s && s.halo && s.halo.d === d ? s.halo : null; return { ok: !!s, got: H ? H.got.slice() : [], whale: !!(H && H.whale), days: (s && s.halo && s.halo.days) || 0, rq: H ? (H.rq || []).slice() : [], rqN: (s && s.halo && s.halo.rqN) || 0 }; },
    // FIN-U181 居民的委託：每天三件（slot 0–2），完成一件 2–4 B／元液 +1／偶爾一顆原石；rqN 是總共完成幾件（委託的種類跟著它長）
    haloReq: function (slot) { var s = read(); if (!s) return null; var d = today(), prev = s.halo || {}, H = prev.d === d ? prev : { d: d, got: [], whale: 0, days: prev.days || 0, rqN: prev.rqN || 0 }; H.rq = H.rq || [];
      slot = slot | 0; if (slot < 0 || slot > 2 || H.rq.indexOf(slot) >= 0) return null; H.rq.push(slot); H.rqN = (H.rqN || 0) + 1; var r = Math.random(), g;
      if (r < 0.1) { ore(s); g = { type: "ore" }; } else { var dw = r < 0.35 ? addEss(s, 1, "halo:req") : 0; if (dw) g = { type: "dew", n: dw }; else { var n = 2 + Math.floor(Math.random() * 3); bloom(s, n, "halo:req"); g = { type: "bloom", n: n }; } }
      g.total = H.rqN; g.lux = gainMat(s, "lux", 1); s.halo = H; write(s); return g; },
    haloEcho: function (i) { var s = read(); if (!s) return null; var d = today(), H = s.halo && s.halo.d === d ? s.halo : { d: d, got: [], whale: 0, days: (s.halo && s.halo.days) || 0, rqN: (s.halo && s.halo.rqN) || 0 };
      i = i | 0; if (i < 0 || i > 4 || H.got.indexOf(i) >= 0) return null; H.got.push(i); bloom(s, 1, "halo:echo"); var out = { n: H.got.length, b: 1, lux: gainMat(s, "lux", 1) };
      if (H.got.length === 5) { H.days = (H.days || 0) + 1; out.lux += gainMat(s, "lux", 1); var r = Math.random(); if (r < 0.35) { ore(s); out.bonus = { type: "ore" }; } else { var dw = r < 0.65 ? addEss(s, 2, "halo") : 0; if (dw) out.bonus = { type: "dew", n: dw }; else { var n = 4 + Math.floor(Math.random() * 5); bloom(s, n, "halo:resonance"); out.bonus = { type: "bloom", n: n }; } }   /* 元液滿了就改給 B 幣 */ out.days = H.days; }
      s.halo = H; write(s); return out; },
    haloWhale: function () { var s = read(); if (!s) return null; var d = today(), H = s.halo && s.halo.d === d ? s.halo : { d: d, got: [], whale: 0, days: (s.halo && s.halo.days) || 0, rqN: (s.halo && s.halo.rqN) || 0 }; if (H.whale) return null; H.whale = 1; var g;
      var dw2 = Math.random() < 0.5 ? 0 : addEss(s, 1, "halo"); if (dw2) g = { type: "dew", n: dw2 }; else { ore(s); g = { type: "ore" }; } g.lux = gainMat(s, "lux", 1); s.halo = H; write(s); return g; },
    // FIN-U183 凝瞬城：每天五個凍住的瞬間，讓它們走完一個 1 B；五個都走完有一次回響；n 是總共走完幾個（鐘樓跟著它拼回去）
    stillState: function () { var s = read(), d = today(), T = s && s.still && s.still.d === d ? s.still : null; return { ok: !!s, got: T ? T.got.slice() : [], n: (s && s.still && s.still.n) || 0, days: (s && s.still && s.still.days) || 0 }; },
    stillThaw: function (i) { var s = read(); if (!s) return null; var d = today(), prev = s.still || {}, T = prev.d === d ? prev : { d: d, got: [], n: prev.n || 0, days: prev.days || 0 };
      i = i | 0; if (i < 0 || i > 4 || T.got.indexOf(i) >= 0) return null; T.got.push(i); T.n = (T.n || 0) + 1; bloom(s, 1, "still:thaw"); var out = { count: T.got.length, n: T.n, sand: gainMat(s, "sand", 1) };
      if (T.got.length === 5) { T.days = (T.days || 0) + 1; out.sand += gainMat(s, "sand", 1); var r = Math.random(); if (r < 0.35) { ore(s); out.bonus = { type: "ore" }; } else { var dw = r < 0.65 ? addEss(s, 2, "still") : 0; if (dw) out.bonus = { type: "dew", n: dw }; else { var n = 4 + Math.floor(Math.random() * 5); bloom(s, n, "still:bonus"); out.bonus = { type: "bloom", n: n }; } } }
      s.still = T; write(s); return out; },
    // FIN-U224 凝瞬城的碎島（三處都修好後長出橋）：每座島上一只停錯時間的懷錶，對準這座城停住的那一刻 → 2 B＋1 份時砂（每天每座一次；三座都對好再 1 份時砂）
    //   s.stillx = { d: 今天, got: [島], n: 總共對好幾次, br: 第一次看到橋長出來的日期 }
    stillShardState: function () { var s = read(), d = today(), X = (s && s.stillx) || {}; return { ok: !!s, got: X.d === d ? (X.got || []).slice() : [], n: X.n || 0, br: X.br || null }; },
    stillBridgeSeen: function () { var s = read(); if (!s) return false; var X = s.stillx = s.stillx || {}; if (X.br) return false; X.br = today(); write(s); return true; },
    stillShardDone: function (i) { var s = read(); if (!s) return null; var d = today(), prev = s.stillx || {}, X = prev.d === d ? prev : { d: d, got: [], n: prev.n || 0, br: prev.br || null };
      i = i | 0; if (i < 0 || i > 2 || X.got.indexOf(i) >= 0) return null; X.got.push(i); X.n = (X.n || 0) + 1; bloom(s, 2, "still:shard"); var out = { count: X.got.length, b: 2, sand: gainMat(s, "sand", 1) };
      if (X.got.length === 3) out.sand += gainMat(s, "sand", 1); s.stillx = X; write(s); return out; },
    // FIN-U213 潮光港：每天五件小事（撈星星、解纜、潮鐘），做完一件 1 B＋1 顆潮珠；五件都做完有一次回響
    harborState: function () { var s = read(), d = today(), T = s && s.harbor && s.harbor.d === d ? s.harbor : null; return { ok: !!s, got: T ? T.got.slice() : [], n: (s && s.harbor && s.harbor.n) || 0, days: (s && s.harbor && s.harbor.days) || 0 }; },
    harborDone: function (i) { var s = read(); if (!s) return null; var d = today(), prev = s.harbor || {}, T = prev.d === d ? prev : { d: d, got: [], n: prev.n || 0, days: prev.days || 0 };
      i = i | 0; if (i < 0 || i > 4 || T.got.indexOf(i) >= 0) return null; T.got.push(i); T.n = (T.n || 0) + 1; bloom(s, 1, "harbor:task"); var out = { count: T.got.length, n: T.n, pearl: gainMat(s, "pearl", 1) };
      if (T.got.length === 5) { T.days = (T.days || 0) + 1; out.pearl += gainMat(s, "pearl", 1); var r = Math.random(); if (r < 0.35) { ore(s); out.bonus = { type: "ore" }; } else { var dw = r < 0.65 ? addEss(s, 2, "harbor") : 0; if (dw) out.bonus = { type: "dew", n: dw }; else { var n = 4 + Math.floor(Math.random() * 5); bloom(s, n, "harbor:bonus"); out.bonus = { type: "bloom", n: n }; } } }
      s.harbor = T; write(s); return out; },
    // FIN-U225 潮光港修好以後：出海（撈星輝、遇見神祕生物）、遠方的心之燈塔、兩件新的港邊小事（補漁網、潮池）
    //   存檔 s.harborx = { d, sea: 今天付過獎勵的出海次數, q: [今天做完的港邊小事], trips: 總出海次數, seen: [見過的生物], heart: 心之燈塔最後點亮的日期, hn: 點亮次數 }
    harborxState: function () { var s = read(), d = today(), X = (s && s.harborx) || {}, td = X.d === d; return { ok: !!s, sea: td ? (X.sea || 0) : 0, q: td ? (X.q || []).slice() : [], trips: X.trips || 0, seen: (X.seen || []).slice(), heart: X.heart === d, hn: X.hn || 0 }; },
    harborSea: function (motes, creature) { var s = read(); if (!s) return null; var d = today(), X = s.harborx || {}; if (X.d !== d) { X.d = d; X.sea = 0; X.q = []; }
      X.trips = (X.trips || 0) + 1; X.seen = X.seen || []; var out = { trips: X.trips, b: 0, pearl: 0, ess: 0, isNew: false };
      motes = Math.max(0, Math.min(20, motes | 0));
      if ((X.sea || 0) < 3 && motes > 0) { X.sea = (X.sea || 0) + 1; out.b = Math.min(5, 1 + Math.floor(motes / 3)); bloom(s, out.b, "harbor:sea"); out.pearl = gainMat(s, "pearl", motes >= 8 ? 2 : 1); }
      if (creature && /^[a-z]{2,12}$/.test(String(creature)) && X.seen.indexOf(creature) < 0 && X.seen.length < 12) { X.seen.push(String(creature)); out.isNew = true; out.ess = addEss(s, 1, "harbor:creature"); }
      s.harborx = X; write(s); return out; },
    harborHeart: function () { var s = read(); if (!s) return null; var d = today(), X = s.harborx || {}; if ((X.trips || 0) < 3 || X.heart === d) return null;
      X.heart = d; X.hn = (X.hn || 0) + 1; bloom(s, 3, "harbor:heart"); var out = { b: 3, ess: addEss(s, 1, "harbor:heart"), hn: X.hn }; s.harborx = X; write(s); return out; },
    harborQuest: function (k) { var s = read(); if (!s) return null; if (k !== "net" && k !== "pool") return null; var d = today(), X = s.harborx || {}; if (X.d !== d) { X.d = d; X.sea = 0; X.q = []; }
      X.q = X.q || []; if (X.q.indexOf(k) >= 0) return null; X.q.push(k); bloom(s, 1, "harbor:" + k); var out = { b: 1, pearl: gainMat(s, "pearl", 1), n: X.q.length }; s.harborx = X; write(s); return out; },
    // FIN-U217 螢苔林：每天五件小事（跟著螢火蟲、照順序踩符文石、吹孢子球），做完一件 1 B＋1 份苔光；五件都做完有一次回響
    groveState: function () { var s = read(), d = today(), T = s && s.grove && s.grove.d === d ? s.grove : null; return { ok: !!s, got: T ? T.got.slice() : [], n: (s && s.grove && s.grove.n) || 0, days: (s && s.grove && s.grove.days) || 0 }; },
    groveDone: function (i) { var s = read(); if (!s) return null; var d = today(), prev = s.grove || {}, T = prev.d === d ? prev : { d: d, got: [], n: prev.n || 0, days: prev.days || 0 };
      i = i | 0; if (i < 0 || i > 4 || T.got.indexOf(i) >= 0) return null; T.got.push(i); T.n = (T.n || 0) + 1; bloom(s, 1, "grove:task"); var out = { count: T.got.length, n: T.n, moss: gainMat(s, "moss", 1) };
      if (T.got.length === 5) { T.days = (T.days || 0) + 1; out.moss += gainMat(s, "moss", 1); var r = Math.random(); if (r < 0.35) { ore(s); out.bonus = { type: "ore" }; } else { var dw = r < 0.65 ? addEss(s, 2, "grove") : 0; if (dw) out.bonus = { type: "dew", n: dw }; else { var n = 4 + Math.floor(Math.random() * 5); bloom(s, n, "grove:bonus"); out.bonus = { type: "bloom", n: n }; } } }
      s.grove = T; write(s); return out; },
    // 2026-11-21 每座城市多一件每天的小事（三個發光的東西都點亮）：s.cityx = { d: 今天, done: [今天完成的城市], n: 總共完成幾次 }
    //   獎勵：2 B＋那座城的材料 1 份（奧蕾莉亞沒有材料：3 B）；三成機會再 1 滴元液
    cityxState: function (city) { var s = read(), d = today(), X = (s && s.cityx) || {}; return { ok: !!s, done: X.d === d && (X.done || []).indexOf(city) >= 0, n: X.n || 0 }; },
    cityxDo: function (city) { var s = read(); if (!s) return null; var C = { halo: "lux", still: "sand", harbor: "pearl", grove: "moss", liubai: "ink", mingsha: "tone", aurelia: "" }; if (!Object.prototype.hasOwnProperty.call(C, city)) return null;
      var d = today(), X = s.cityx || {}; if (X.d !== d) { X.d = d; X.done = []; } X.done = X.done || []; if (X.done.indexOf(city) >= 0) return null; X.done.push(city); X.n = (X.n || 0) + 1;
      var m = C[city], b = m ? 2 : 3; bloom(s, b, "cityx:" + city); var out = { b: b, mat: m, matN: m ? gainMat(s, m, 1) : 0, ess: 0 }; if (Math.random() < 0.3) out.ess = addEss(s, 1, "cityx:" + city);
      s.cityx = X; write(s); return out; },
    // 2026-11-21 星際城市的小遊戲：每個遊戲每天一次獎勵；s.cgames = { d, done: ["城市:遊戲"…], best: { "城市:遊戲": 最高分 }, n }
    cgameState: function (key) { var s = read(), d = today(), X = (s && s.cgames) || {}; return { ok: !!s, done: X.d === d && (X.done || []).indexOf(key) >= 0, best: (X.best || {})[key] || 0, n: X.n || 0 }; },
    cgameDo: function (city, game, score, pass) { var s = read(); if (!s) return null; var C = { halo: "lux", still: "sand", harbor: "pearl", grove: "moss", liubai: "ink", mingsha: "tone", aurelia: "" }; if (!Object.prototype.hasOwnProperty.call(C, city)) return null;
      var key = city + ":" + String(game).slice(0, 20), d = today(), X = s.cgames || {}; X.best = X.best || {}; var best = false; score = Math.max(0, Math.min(99, Math.floor(Number(score) || 0))); if (score > (X.best[key] || 0)) { X.best[key] = score; best = true; }
      if (X.d !== d) { X.d = d; X.done = []; } X.done = X.done || []; var out = { b: 0, matN: 0, ess: 0, best: best, again: false, matZh: "", matEn: "" };
      if (X.done.indexOf(key) >= 0) { out.again = true; s.cgames = X; write(s); return out; }
      X.done.push(key); X.n = (X.n || 0) + 1; var m = C[city], NM = { lux: ["曦晶", "halo crystal"], sand: ["時砂", "time sand"], pearl: ["潮珠", "tide pearl"], moss: ["苔光", "moss light"], ink: ["松煙墨", "pine-soot ink"], tone: ["音晶", "tone crystal"] };
      out.b = pass ? (m ? 2 : 3) : 1; bloom(s, out.b, "cgame:" + key); if (pass && m) { out.matN = gainMat(s, m, 1); out.matZh = NM[m][0]; out.matEn = NM[m][1]; } if (pass && Math.random() < 0.15) out.ess = addEss(s, 1, "cgame:" + key);
      s.cgames = X; write(s); return out; },
    // FIN-U213 星際城市修好一處就送一張海報（城市自己拍一張 JPEG）；存在 s.city_posters["城市:地點"]，最多 24 張（舊的先拿掉）
    cityPoster: function (city, id, url, zh, en) { var s = read(); if (!s || typeof url !== "string" || url.indexOf("data:image/jpeg") !== 0 || url.length > 200000) return false;
      var P = s.city_posters = s.city_posters || {}, key = city + ":" + id; P[key] = { city: city, id: id, url: url, date: today(), zh: zh || "", en: en || "" };
      var keys = Object.keys(P).sort(function (a, b) { return String(P[a].date).localeCompare(String(P[b].date)); }); while (keys.length > 24) delete P[keys.shift()];
      write(s); return true; },
    cityPosters: function (city) { var s = read(), P = (s && s.city_posters) || {}; return Object.keys(P).filter(function (k) { return !city || P[k].city === city; }).map(function (k) { return P[k]; }); },
    // FIN-U185 修補：fixState(city) 給城市畫面用（材料、每一處放了多少、修好沒）；fixPut 把手上有的材料放進去
    fixState: function (city) { var s = read(), list = FIX[city] || []; if (!s) return { ok: false, have: {}, sites: list.map(function (f) { return { id: f.id, need: f.need, put: {}, done: false, k: 0 }; }) };
      var c = fixOf(s, city), H = { lux: have(s, "lux"), sand: have(s, "sand"), pearl: have(s, "pearl"), moss: have(s, "moss"), ink: have(s, "ink"), tone: have(s, "tone"), ess: have(s, "ess"), gem: have(s, "gem") };
      return { ok: true, have: H, all: !!c.all, sites: list.map(function (f) { var p = c.put[f.id] || {}, tot = 0, got = 0; Object.keys(f.need).forEach(function (k) { tot += f.need[k]; got += Math.min(f.need[k], p[k] || 0); });
        return { id: f.id, need: f.need, put: p, done: c.done.indexOf(f.id) >= 0, k: c.done.indexOf(f.id) >= 0 ? 1 : got / tot }; }) }; },
    fixPut: function (city, id) { var s = read(), f = (FIX[city] || []).filter(function (x) { return x.id === id; })[0]; if (!s || !f) return null; var c = fixOf(s, city); if (c.done.indexOf(id) >= 0) return { done: true, gave: {} };
      var p = c.put[id] = c.put[id] || {}, gave = {}, any = 0, full = true;
      Object.keys(f.need).forEach(function (k) { var want = f.need[k] - (p[k] || 0); if (want <= 0) return; var n = Math.min(want, have(s, k)); if (n > 0) { spend(s, k, n); p[k] = (p[k] || 0) + n; gave[k] = n; any = 1; } if ((p[k] || 0) < f.need[k]) full = false; });
      var out = { gave: gave, done: false };
      if (full) { c.done.push(id); out.done = true; if (f.b) bloom(s, f.b, "fix:" + city); for (var q = 0; q < f.ore; q++) ore(s); out.reward = { b: f.b, ore: f.ore };
        if (!c.all && c.done.length >= FIX[city].length) { c.all = today(); bloom(s, FIX_ALL.b, "fix-all:" + city); for (var r = 0; r < FIX_ALL.ore; r++) ore(s); out.all = { b: FIX_ALL.b, ore: FIX_ALL.ore }; } }
      if (!any && !full) return { gave: {}, done: false, none: true }; write(s); return out; },
    /* 2026-11-23 第六座以後的星際城市（熊：「會逐漸長大、依每個玩家不同的行為長成不同樣子」）
     * starState / starDone：每天五件小事（通用版）。s.stars[city] = { d, got, n, days }；做完一件 1 B＋那座城的材料 1 份；五件都做完有一次回響。
     * feed(since)：since 之後玩家的生活（只看記帳的項目、類別、日期——不看金額和備註；加上學習、玩的紀錄），分成六類算次數。
     * growState / growVisit / growChoose / growStory：城市的成長。s.grow[city] = { steps, slots[], lv{}, last, visits, night, pend, story }；只會變多，跨裝置合併取大的。 */
    starState: function (city) { var s = read(), d = today(), A = (s && s.stars && s.stars[city]) || {}, T = A.d === d ? A : null; return { ok: !!s, got: T ? (T.got || []).slice() : [], n: A.n || 0, days: A.days || 0 }; },
    starDone: function (city, i) { var s = read(); if (!s || !STAR_MAT[city]) return null; var d = today(), S = s.stars = s.stars || {}, prev = S[city] || {}, T = prev.d === d ? prev : { d: d, got: [], n: prev.n || 0, days: prev.days || 0 };
      i = i | 0; if (i < 0 || i > 4 || T.got.indexOf(i) >= 0) return null; T.got.push(i); T.n = (T.n || 0) + 1; bloom(s, 1, "star:" + city); var out = { count: T.got.length, n: T.n, mat: gainMat(s, STAR_MAT[city], 1) };
      if (T.got.length === 5) { T.days = (T.days || 0) + 1; out.mat += gainMat(s, STAR_MAT[city], 1); var r = Math.random(); if (r < 0.35) { ore(s); out.bonus = { type: "ore" }; } else { var dw = r < 0.65 ? addEss(s, 2, city) : 0; if (dw) out.bonus = { type: "dew", n: dw }; else { var n = 4 + Math.floor(Math.random() * 3); bloom(s, n, city + ":echo"); out.bonus = { type: "bloom", n: n }; } } }
      S[city] = T; write(s); return out; },
    feed: function (since) { var s = read(); if (!s) return null; var B = { food: 0, move: 0, home: 0, save: 0, learn: 0, play: 0 }, days = {};
      ((s.records && s.records.finance) || []).forEach(function (r) { if (!r || !r.date || (since && String(r.date) <= since)) return; days[r.date] = 1; var it = String(r.item || ""), k = String(r.kind || "");
        if (k === "收入" || k === "投資" || k === "還款" || /投資|定期|儲蓄|存/.test(it)) B.save++; else if (/早餐|午餐|晚餐|奶茶|咖啡|食品|餐|飲|吃|麵包|甜點/.test(it)) B.food++; else if (/捷運|交通|公車|計程|加油|車|機票|高鐵|船/.test(it)) B.move++; else B.home++; });
      (s.bloom_log || []).forEach(function (e) { if (!e || !e.date || (since && String(e.date) <= since)) return; var r = String(e.reason || ""); if (/^(study|library|quiz|read)/.test(r)) B.learn++; else if (/^(mini|cgame|claw|fair|film|grove|harbor|halo|still|happen|star|fmkt|cafe)/.test(r)) B.play++; });
      return { b: B, recDays: Object.keys(days).length }; },
    growState: function (city) { var s = read(), G = (s && s.grow && s.grow[city]) || {}; return { ok: !!s, steps: G.steps || 0, slots: (G.slots || []).slice(), lv: JSON.parse(JSON.stringify(G.lv || {})), last: G.last || null, visits: G.visits || 0, night: G.night || 0, pend: G.pend || null, story: G.story || null }; },
    growVisit: function (city, hour, offer) { var s = read(); if (!s) return null; var d = today(), R = s.grow = s.grow || {}, G = R[city] = R[city] || { steps: 0, slots: [], lv: {} };
      if (G.last === d) return this.growState(city); G.last = d; G.visits = (G.visits || 0) + 1; if (hour >= 18 || hour < 6) G.night = (G.night || 0) + 1;
      if (!G.pend && offer && offer.length >= 1) G.pend = { d: d, o: offer.slice(0, 2) }; write(s); return this.growState(city); },
    growChoose: function (city, type, max, store) { var s = read(); if (!s) return null; var G = s.grow && s.grow[city]; if (!G || !G.pend || !G.pend.o.some(function (x) { return x === type || String(x).split("@")[0] === type; })) return null;   /* 舊版存的是「plum@3」也認得；store：實際存進去的樣子（例如留白城：描稿描出來的濃淡「bamboo@3」） */
      var slot = -1; if ((G.slots || []).length < (max || 12)) { G.slots = G.slots || []; G.slots.push(store || type); slot = G.slots.length - 1; } else { G.lv = G.lv || {}; G.lv[type] = Math.min(3, (G.lv[type] || 0) + 1); }
      G.steps = (G.steps || 0) + 1; G.pend = null; write(s); return { slot: slot, state: this.growState(city) }; },
    /* growMark：城市自己的收藏（鳴沙城的聲紋 f:鍵）；記在 lv 裡，跨裝置合併取大的，只會變多 */
    growMark: function (city, key) { var s = read(); if (!s) return false; var R = s.grow = s.grow || {}, G = R[city] = R[city] || { steps: 0, slots: [], lv: {} }; G.lv = G.lv || {}; if (G.lv[key]) return false; G.lv[key] = 1; write(s); return true; },
    growStory: function (city) { var s = read(); if (!s) return false; var G = (s.grow = s.grow || {})[city] = (s.grow[city] || { steps: 0, slots: [], lv: {} }); if (G.story) return false; G.story = today(); write(s); return true; },
    /* 2026-11-23 留白城（熊：「一筆可以自己畫」「可以玩的、可以收集的太少」）：s.paint = { d, used, marks[], seals{}, met{}, scrolls[] }
     * - 閒筆：每天能畫的筆數＝3＋今天做完的小事＋（今天有記帳就再 2）；畫出來的小東西存在 marks（最多 80 筆，舊的先拿掉）
     * - 印譜 seals{id: 第一次拿到的日期}、畫中人 met{id: 日期}、長卷 scrolls[{wk, url}]（最多 8 段） */
    paintState: function () { var s = read(), d = today(), P = (s && s.paint) || {}, allow = this.paintAllow();
      return { ok: !!s, used: P.d === d ? P.used || 0 : 0, allow: allow, marks: (P.marks || []).slice(), seals: JSON.parse(JSON.stringify(P.seals || {})), met: JSON.parse(JSON.stringify(P.met || {})), scrolls: (P.scrolls || []).slice() }; },
    paintAllow: function () { var s = read(); if (!s) return 0; var d = today(), T = s.stars && s.stars.liubai, n = 5 + (T && T.d === d ? (T.got || []).length : 0), hr = new Date().getHours();   /* 熊 2026-11-23：墨太少 → 底 5 滴，一天裡隨時間再回 4 滴，畫題完成再 +2 */
      [8, 12, 16, 20].forEach(function (h) { if (hr >= h) n += 1; }); if (s.paint && s.paint.seals && s.paint.seals["d:" + d]) n += 2;
      if (((s.records && s.records.finance) || []).some(function (r) { return r && r.date === d; })) n += 2; return n; },
    paintMark: function (m) { var s = read(); if (!s || !m || !m.k) return null; var d = today(), P = s.paint = s.paint || {}; if (P.d !== d) { P.d = d; P.used = 0; } var allow = this.paintAllow();
      if ((P.used || 0) >= allow) return { ok: false, left: 0 }; P.used = (P.used || 0) + 1; P.marks = P.marks || []; m.id = m.id || ("M" + Date.now().toString(36) + Math.floor(Math.random() * 1e4)); m.day = d; P.marks.push(m); while (P.marks.length > 80) P.marks.shift();
      write(s); return { ok: true, left: allow - P.used, id: m.id }; },
    paintSeal: function (id) { var s = read(); if (!s) return false; var P = s.paint = s.paint || {}; P.seals = P.seals || {}; if (P.seals[id]) return false; P.seals[id] = today(); write(s); return true; },
    paintMet: function (id) { var s = read(); if (!s) return false; var P = s.paint = s.paint || {}; P.met = P.met || {}; if (P.met[id]) return false; P.met[id] = today(); write(s); return true; },
    paintScroll: function (wk, url) { var s = read(); if (!s || typeof url !== "string" || url.indexOf("data:image/jpeg") !== 0 || url.length > 120000) return false; var P = s.paint = s.paint || {}; P.scrolls = (P.scrolls || []).filter(function (x) { return x.wk !== wk; });
      P.scrolls.push({ wk: wk, url: url, date: today() }); while (P.scrolls.length > 8) P.scrolls.shift(); write(s); return true; },
    // 小鎮修到哪裡（星門修好，城市的星港之環就打開）
    townDone: function (id) { var s = read(); return !!s && !!s.town && (s.town.done || []).indexOf(id) >= 0; },
  };
})();
