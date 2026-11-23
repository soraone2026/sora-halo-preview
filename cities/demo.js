/* 星際城市試玩版的存檔（只在 GitHub Pages 的試玩版用）：沒有存檔就建一份，給足修理材料；首頁的按鈕也用這裡的函式。 */
(function () {
  "use strict";
  var KEY = "sora-universe-v0";
  function day(off) { var d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + (off || 0) * 864e5); return d.toISOString().slice(0, 10); }
  var SAMPLES = {
    food: ["早餐", "午餐", "晚餐", "奶茶", "咖啡廳", "食品採買"], move: ["捷運", "交通費(捷運之外)", "捷運", "捷運"],
    home: ["生活用品", "生活用品", "房租水電"], save: ["定期定額", "薪水", "投資"], learn: [], play: []
  };
  function fresh(name) {
    return { avatar: { name: name || "試玩者", finance: { bcoins: 80 }, owned: [] }, profile: { setup_done: true }, records: { finance: [] }, bloom_log: [],
      mats: { glim: { in: 40, out: 0 }, moss: { in: 12, out: 0 }, pearl: { in: 12, out: 0 }, sand: { in: 12, out: 0 }, lux: { in: 8, out: 0 } },
      essence: { n: 20, lens: 0, log: [] }, gems: { "G-4": 3, "G-5": 2, "G-6": 2 }, updated_at: Date.now() };
  }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function write(s) { s.updated_at = s.saved_at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
  if (!read()) write(fresh());
  window.StarDemo = {
    reset: function () { write(fresh()); try { localStorage.removeItem("sora-playtest-city"); } catch (e) { } },
    /* 生活樣本：最近十天的記帳（只有項目和日期）＋學習、玩的紀錄 */
    life: function (kind) { var s = read() || fresh(), recs = [], log = [], n = 0, pick = kind === "mix" ? ["food", "move", "home", "save", "learn", "play"] : [kind];
      for (var i = 0; i < 16; i++) { var k = pick[i % pick.length], d = day(-(i % 10));
        if (k === "learn") log.push({ date: d, amount: 2, reason: "study:quiz" }); else if (k === "play") log.push({ date: d, amount: 2, reason: "mini:game" });
        else { var L = SAMPLES[k]; recs.push({ id: "T-demo-" + (++n), date: d, kind: k === "save" ? "收入" : "消費", item: L[i % L.length], amount: 0 }); } }
      s.records = { finance: recs }; s.bloom_log = log; s.life = kind; var G = s.grow && s.grow.ferry; if (G) { G.pend = null; G.last = "2000-01-01"; } write(s); },
    /* 跳到明天：下次進城就像新的一天（會再漂來兩座） */
    tomorrow: function () { var s = read() || fresh(), R = s.grow = s.grow || {}; Object.keys(R).forEach(function (c) { R[c].last = "2000-01-01"; R[c].pend = null; }); write(s); },
    info: function () { var s = read() || {}, G = (s.grow || {}).ferry || {}; return { life: s.life || "", isles: (G.slots || []).length, steps: G.steps || 0, fixed: (((s.fix || {}).ferry || {}).done || []).length }; }
  };
})();
