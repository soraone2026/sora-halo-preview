/* 留白城的收藏（2026-11-23，熊：「可以收集的東西很少，不夠有趣」）
 * - 印譜：三十七方印。添過的每一種景、每一種閒筆、遇過的天氣、湊出來的組合、遇見的畫中人、筆數……第一次做到就蓋一方。
 * - 題詩：四位畫中人各送一句，四句湊成一首詩，題在畫卷上。
 * - 長卷：每週自動拍一段整座城，收在這裡往回翻。
 * 資料在 FinSave.paintState / paintSeal / paintMet（s.paint）。 */
export const SEALS = [
  ["e:plum", "梅", "梅邊小立"], ["e:cot", "炊", "山居炊煙"], ["e:boat", "舟", "孤舟遠影"], ["e:crane", "鶴", "鶴歸晚晴"], ["e:pav", "亭", "半山閒亭"], ["e:court", "院", "月門深院"],
  ["e:rock", "石", "石上清泉"], ["e:hill", "山", "遠山一抹"], ["e:bamboo", "竹", "竹窗聽雨"], ["e:pagoda", "塔", "孤塔凌雲"], ["e:kite", "鳶", "紙鳶東風"], ["e:lamp", "燈", "燈火闌珊"],
  ["m:plum", "點梅", "隨手點一朵梅"], ["m:lantern", "天燈", "在天上點一下"], ["m:lotus", "蓮", "在地上畫一個圈"], ["m:shoot", "筍", "畫一豎"], ["m:reed", "蘆", "在地上畫一橫"], ["m:geese", "雁", "在天上畫一橫"], ["m:path", "徑", "在地上畫一道彎"], ["m:cloud", "雲", "在天上畫一道彎"],
  ["w:rain", "聽雨", "下雨天來"], ["w:snow", "踏雪", "下雪天來"], ["w:mist", "入霧", "起霧的日子來"],
  ["c:night", "夜泊", "舟和燈都在"], ["c:study", "竹亭", "竹和亭都在"], ["c:snowplum", "梅雪", "下雪天的梅"], ["c:cloudcrane", "雲鶴", "鶴和塔都在"],
  ["n:10", "十筆", "畫裡有十筆"], ["n:30", "卅筆", "畫裡有三十筆"], ["d:dark", "濃墨", "三筆描得又慢又滿"], ["d:light", "飛白", "三筆描得又快又輕"],
  ["f:all", "落款", "三處都修好"], ["p:scholar", "讀", "遇見讀書人"], ["p:fisher", "漁", "遇見漁翁"], ["p:plum", "賞", "遇見賞梅人"], ["p:kite", "童", "遇見放鳶的孩子"], ["poem", "詩成", "湊齊一首詩"]];
export const PEOPLE = {
  scholar: { name: ["讀書人", "the scholar"], line: ["留白三分天自遠，", "Leave a third blank, and the sky goes on forever;"], say: ["竹子這麼多，亭子這麼靜，我就來讀書了。送你一句。", "So much bamboo, so quiet a pavilion — I had to come and read. A line for you."] },
  fisher: { name: ["漁翁", "the old fisherman"], line: ["一舟搖碎半江煙。", "one small boat rocks half the river's mist to pieces."], say: ["有水、有舟，就有我。這句你拿去。", "Where there's water and a boat, there's me. Take this line."] },
  plum: { name: ["賞梅人", "the plum watcher"], line: ["梅開不問誰家雪，", "The plum blooms without asking whose snow it is;"], say: ["這麼多梅，我站了一下午。給你一句。", "So much plum blossom — I've stood here all afternoon. Here's a line."] },
  kite: { name: ["放鳶的孩子", "the kite child"], line: ["紙鳶牽我到雲邊。", "a paper kite leads me to the edge of the clouds."], say: ["風好大！線差點斷了。這句給你！", "The wind's so strong! The string nearly snapped. This line's for you!"] } };
export const POEM_ORDER = ["scholar", "fisher", "plum", "kite"];

export function createAlbum({ L, FS, toast, sound }) {
  const st = () => (FS && FS.paintState ? FS.paintState() : { seals: {}, met: {}, scrolls: [], marks: [] });
  /* 蓋一方印：畫面中間一方朱印「咚」地蓋下來，再縮到右上角 */
  function stamp(chars) { const s = document.createElement("div"); s.className = "stamp"; s.textContent = chars; if (chars.length > 2) s.classList.add("s3"); document.body.append(s); requestAnimationFrame(() => s.classList.add("on")); setTimeout(() => s.classList.add("out"), 1400); setTimeout(() => s.remove(), 2100); }
  function grant(id) { if (!FS || !FS.paintSeal) return false; const S = SEALS.find((x) => x[0] === id); if (!S || !FS.paintSeal(id)) return false;
    stamp(S[1]); sound && sound(); const n = Object.keys(st().seals).length; if (n === 1) toast(L(`你的第一方印「${S[1]}」。右上角紅色的「印」打開印譜：在畫裡做過的事都會蓋一方印，還有題詩和每週的長卷。`, `Your first seal: "${S[1]}". The red 印 button (top right) opens your album — seals for what you've done in the painting, plus the poem and weekly scrolls.`), 9000);
    else toast(L(`印譜多了一方「${S[1]}」（${n} / ${SEALS.length}）`, `A new seal for your album: "${S[1]}" (${n} / ${SEALS.length})`), 4200); return true; }
  let box = null;
  function open(tab = "seal") { close(); const P = st(), en = L("", "x") === "x";
    box = document.createElement("div"); box.className = "albumov"; box.addEventListener("pointerdown", (e) => e.stopPropagation()); box.addEventListener("pointerup", (e) => e.stopPropagation());
    const got = Object.keys(P.seals || {}).length;
    const seals = SEALS.map(([id, ch, hint]) => { const has = !!(P.seals || {})[id]; return `<button type="button" class="sl ${has ? "has" : ""}" data-h="${has ? `${ch}・${(P.seals || {})[id]}` : hint}"><span>${has ? ch : "？"}</span></button>`; }).join("");
    const lines = POEM_ORDER.map((k) => (P.met || {})[k] ? `<p>${L(PEOPLE[k].line[0], PEOPLE[k].line[1])}</p>` : `<p class="blank">${L("（還沒遇見" + PEOPLE[k].name[0] + "）", "(not yet met " + PEOPLE[k].name[1] + ")")}</p>`).join("");
    const scrolls = (P.scrolls || []).slice().reverse().map((x) => `<figure><img alt="" data-src="${x.wk}"><figcaption>${x.wk}</figcaption></figure>`).join("") || `<p class="blank">${L("每個禮拜第一次來，會自動拍一段長卷收在這裡。", "Each week, your first visit adds a length of scroll here.")}</p>`;
    box.innerHTML = `<div class="abox"><div class="atabs"><button type="button" data-t="seal">${L("印譜", "Seals")} <small>${got}/${SEALS.length}</small></button><button type="button" data-t="poem">${L("題詩", "Poem")}</button><button type="button" data-t="scroll">${L("長卷", "Scrolls")}</button><button type="button" class="ax">✕</button></div>
      <div class="apane" data-p="seal"><p class="alead">${L("畫師的印譜。第一次畫出某樣東西、遇到某種天氣、湊出某些景，都會蓋上一方朱印。「？」是還沒拿到的。", "The painter's seal album. The first time you paint something, meet a kind of weather, or bring certain scenes together, a red seal goes in. \"？\" ones are still to find.")}</p><div class="sgrid">${seals}</div><p class="ahint">${L("點一方印看它是怎麼來的。", "Tap a seal to see how it's earned.")}</p></div>
      <div class="apane" data-p="poem"><p class="alead">${L("畫裡湊齊某些景，會有四位畫中人走進來。跟他們說話，每人留下一句詩，四句湊成一首。", "When the right scenes are painted, four people walk into the picture. Talk to each one — each leaves a line, and four lines make a poem.")}</p><div class="poem">${lines}</div><p class="ahint">${L("畫裡湊齊某些景，就會有人走進來。找到他們，跟他們說說話。", "When the right things are painted, someone walks into the picture. Find them and talk to them.")}</p></div>
      <div class="apane" data-p="scroll"><p class="alead">${L("每個禮拜第一次來，畫師會把整座城收成一段長卷。一週一段，看得出這幅畫怎麼慢慢長大。", "On your first visit each week, the painter rolls the whole town into a length of scroll — one a week, so you can see the painting grow.")}</p><div class="scrolls">${scrolls}</div></div></div>`;
    document.body.append(box); void en;
    (P.scrolls || []).forEach((x) => { const im = box.querySelector(`img[data-src="${x.wk}"]`); if (im) im.src = x.url; });
    const show = (t) => { box.querySelectorAll(".atabs [data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === t)); box.querySelectorAll(".apane").forEach((p) => { p.hidden = p.dataset.p !== t; }); };
    box.querySelectorAll(".atabs [data-t]").forEach((b) => b.onclick = () => show(b.dataset.t)); box.querySelector(".ax").onclick = close;
    box.querySelectorAll(".sl").forEach((b) => b.onclick = () => { box.querySelector('[data-p="seal"] .ahint').textContent = b.dataset.h; }); show(tab); }
  function close() { if (box) { box.remove(); box = null; } }
  return { grant, open, close, state: st, get isOpen() { return !!box; } };
}
