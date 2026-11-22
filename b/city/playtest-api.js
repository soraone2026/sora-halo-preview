/* 公開試玩版（GitHub Pages）的「替身伺服器」：只給 B 版試玩用，正式站不會載入這個檔。
 * 城區原本要靠本機伺服器（車票、寶石掉落、小遊戲入口）；靜態網站沒有伺服器，這裡在試玩者自己的瀏覽器裡回應同樣的 API。
 * - B 幣、原石、謎題進度都寫在遊戲存檔（localStorage「sora-universe-v0」），和家裡同一份。
 * - 寶石收藏袋、撿過的寶石、玩過的入口存在「sora-playtest-city」。
 * - 朋友、在線、邀請、寄明信片：試玩版不提供（回 404，畫面會照原本「連不上」的方式處理）。 */
(function () {
  "use strict";
  var KEY = "sora-universe-v0", CK = "sora-playtest-city", PRICE = 3, WINDOW = 2 * 3600, PER = 5;
  var KINDS = [["ruby", 25], ["sapphire", 25], ["emerald", 20], ["amethyst", 18], ["topaz", 10], ["star", 2]];
  var GAMES = { meteor: [20, 6, 12], match: [12, 4, 8], spell: [10, 4, 7] };
  // 城區的存檔模組要知道「現在是誰」：試玩版固定一個本機帳號
  try { if (!localStorage.getItem("sle.uid")) localStorage.setItem("sle.uid", "playtest"); window.__sleAcct = localStorage.getItem("sle.uid"); } catch (e) { window.__sleAcct = "playtest"; }
  function rd(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function city() { var c = rd(CK, null); if (!c || !c.salt) { c = { salt: Math.random().toString(36).slice(2), got: [], played: [], bag: {} }; wr(CK, c); } return c; }
  function rng(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function kind(r) { var tot = 0, i; for (i = 0; i < KINDS.length; i++) tot += KINDS[i][1]; var x = r() * tot; for (i = 0; i < KINDS.length; i++) { x -= KINDS[i][1]; if (x < 0) return KINDS[i][0]; } return KINDS[0][0]; }
  function drops(salt, w) { var r = rng(salt + ":" + w), gems = [];
    for (var i = 0; i < PER; i++) gems.push({ id: "G" + w + "-" + i, kind: kind(r), place: i === PER - 1 ? "library" : "plaza", seed: 1 + Math.floor(r() * 2147483646) });
    var names = Object.keys(GAMES).sort(); return { gems: gems, portal: { id: "P" + w, game: names[Math.floor(r() * names.length)], place: "plaza", seed: 1 + Math.floor(r() * 2147483646) } }; }
  function live(c) { var w = Math.floor(Date.now() / 1000 / WINDOW), a = drops(c.salt, w - 1), b = drops(c.salt, w); return { w: w, gems: a.gems.concat(b.gems), portals: [a.portal, b.portal] }; }
  function bag(c) { var out = {}, tot = 0; KINDS.forEach(function (k) { out[k[0]] = c.bag[k[0]] || 0; tot += out[k[0]]; }); return { by_kind: out, total: tot }; }
  function coins() { var s = rd(KEY, null); return s && s.avatar && s.avatar.finance ? (s.avatar.finance.bcoins || 0) : 0; }
  function reply(status, data) { return Promise.resolve(new Response(JSON.stringify(data), { status: status, headers: { "Content-Type": "application/json" } })); }
  function handle(method, path, body) {
    var c, L, m;
    if (method === "GET" && path === "/api/desk/state") return reply(200, { coins: coins(), user: null, playtest: true });
    if (method === "POST" && path === "/api/city/ticket") { var s = rd(KEY, null), f = s && s.avatar && s.avatar.finance;
      if (!f || (f.bcoins || 0) < PRICE) return reply(409, { message: "B 幣不夠（車票 " + PRICE + " B）" });
      f.bcoins -= PRICE; (s.bloom_log = s.bloom_log || []).push({ date: new Date().toISOString().slice(0, 10), amount: -PRICE, reason: "metro-ticket" }); s.saved_at = s.updated_at = Date.now(); wr(KEY, s);
      return reply(200, { ticket: "T" + Date.now(), price: PRICE, kind: "round_trip", wallet: { total: f.bcoins }, rides: 1 }); }
    if (method === "GET" && path === "/api/city/world") { c = city(); L = live(c);
      return reply(200, { window: L.w, next_at: (L.w + 1) * WINDOW, gems: L.gems.filter(function (g) { return c.got.indexOf(g.id) < 0; }),
        portals: L.portals.slice(-1).filter(function (p) { return c.played.indexOf(p.id) < 0; }), bag: bag(c) }); }
    if (method === "POST" && (m = path.match(/^\/api\/city\/gems\/(G\d+-\d)$/))) { c = city(); L = live(c);
      var g = L.gems.filter(function (x) { return x.id === m[1]; })[0]; if (!g) return reply(404, { message: "這顆寶石已經消失了" });
      if (c.got.indexOf(g.id) >= 0) return reply(409, { message: "這顆寶石已經撿過了" });
      c.got.push(g.id); c.got = c.got.slice(-60); c.bag[g.kind] = (c.bag[g.kind] || 0) + 1; wr(CK, c); return reply(200, { gem: g, bag: bag(c) }); }
    if (method === "POST" && path === "/api/city/play") { c = city(); L = live(c);
      var p = L.portals.filter(function (x) { return x.id === body.portal; })[0]; if (!p) return reply(404, { message: "這個入口已經關了" });
      if (body.game !== p.game) return reply(400, { message: "遊戲不符" });
      if (c.played.indexOf(p.id) >= 0) return reply(409, { message: "這個入口已經玩過了" });
      var G = GAMES[p.game], sc = Math.max(0, Math.min(G[0], body.score | 0)), n = 1 + (sc >= G[1] ? 1 : 0) + (sc >= G[2] ? 1 : 0), r = rng(c.salt + ":" + p.id + ":reward"), won = [];
      for (var i = 0; i < n; i++) { var k = kind(r); won.push(k); c.bag[k] = (c.bag[k] || 0) + 1; }
      c.played.push(p.id); c.played = c.played.slice(-30); wr(CK, c); return reply(200, { game: p.game, score: sc, gems: won, bag: bag(c) }); }
    return reply(404, { message: "試玩版沒有這個功能", playtest: true });
  }
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "", u; try { u = new URL(url, location.href); } catch (e) { return real(input, init); }
    if (u.origin !== location.origin || u.pathname.indexOf("/api/") !== 0) return real(input, init);
    var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase(), body = {};
    try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (e) { body = {}; }
    return handle(method, u.pathname, body);
  };
})();
