/* 小遊戲（熊 2026-11-13）：走進城市裡的光環入口就開始。玩完依分數得到 1–3 顆寶石（POST /api/city/play，每個入口一次）。
 * - 單字流星 meteor：英文單字從上面掉下來，落地前選出正確的中文意思（45 秒）。
 * - 寶石翻牌 match：12 張牌找出 6 對寶石，翻錯越少分數越高（60 秒）。
 * - 鐘樓拼字 spell：看中文提示，把打散的字母按順序排回英文單字（60 秒）。
 * 單字表是自己編的日常與工作常用字，不是 TOEIC 題庫的內容。 */
import { GEM_KINDS, GAME_INFO } from "./city-gems.js";

const WORDS = [
  ["meeting", "會議"], ["invoice", "發票"], ["schedule", "行程表"], ["deliver", "運送"], ["discount", "折扣"], ["receipt", "收據"],
  ["budget", "預算"], ["colleague", "同事"], ["deadline", "截止日"], ["customer", "顧客"], ["office", "辦公室"], ["manager", "經理"],
  ["contract", "合約"], ["travel", "旅行"], ["ticket", "票"], ["station", "車站"], ["library", "圖書館"], ["museum", "博物館"],
  ["weather", "天氣"], ["umbrella", "雨傘"], ["garden", "花園"], ["kitchen", "廚房"], ["breakfast", "早餐"], ["airport", "機場"],
  ["passenger", "乘客"], ["platform", "月台"], ["building", "建築物"], ["window", "窗戶"], ["bridge", "橋"], ["tower", "塔"],
  ["fountain", "噴泉"], ["market", "市場"], ["repair", "修理"], ["order", "訂購"], ["reserve", "預約"], ["cancel", "取消"],
  ["confirm", "確認"], ["arrive", "抵達"], ["depart", "出發"], ["borrow", "借入"], ["return", "歸還"], ["purchase", "購買"],
  ["salary", "薪水"], ["employee", "員工"], ["package", "包裹"], ["address", "地址"], ["promise", "承諾"], ["improve", "改善"],
  ["explain", "解釋"], ["clock", "時鐘"], ["square", "廣場"], ["lamp", "燈"], ["street", "街道"], ["corner", "轉角"],
];
// 念出來（熊：路人講德語也要有聲音）：照語言挑聲音；遊戲裡的「英語語音」關掉（sora-voice=0）就不念
const LANGV = { zh: "zh-TW", ja: "ja-JP", en: "en-US", de: "de-DE" };
// 熊 2026-11-14（FIN-U49）：要自然——優先挑系統裡比較自然的聲音（Siri、增強版、Neural、Google），每個人自己的音高；預設開著（只有遊戲裡關掉才不念）
const NATURAL = /siri|enhanced|premium|natural|neural|google|online/i;
let quiet = false; export function setQuiet(on) { quiet = !!on; }   // 熊 FIN-U57：圖書館裡講話小聲
// 熊 FIN-U86（有時候開了語音卻沒講話）：自己排隊——最多留 3 句、超過 6 秒的丟掉；語音清單還沒載好先等（最多 3 秒），還是沒有就交給系統依語言挑；
// 念一句超過 12 秒沒結束（Chrome 偶爾會卡住）就重來；每次念之前先 resume（從背景回來時 Chrome 會停在暫停）
const sQ = []; let sBusy = 0;
export function speak(text, lang = "en", opt = {}) {
  try { if (!window.speechSynthesis || localStorage.getItem("sora-voice") === "0" || document.hidden) return;
    try { const fe = window.frameElement; if (fe && (!fe.offsetParent || window.parent.document.hidden)) return; } catch { }   /* 熊 FIN-U56：看不到畫面就不念 */
    sQ.push({ text, lang, opt, t: performance.now(), tries: 0 }); if (sQ.length > 3) sQ.splice(0, sQ.length - 3); speakNext(); } catch { }
}
function speakNext() {
  try { if (sBusy) return; while (sQ.length && performance.now() - sQ[0].t > 6000) sQ.shift(); const it = sQ.shift(); if (!it) return;
    const want = LANGV[it.lang] || it.lang, vs = speechSynthesis.getVoices();
    if (!vs.length && ++it.tries < 6) { sQ.unshift(it); setTimeout(speakNext, 500); return; }
    const u = new SpeechSynthesisUtterance(it.text); u.lang = want;
    const same = vs.filter(x => x.lang.replace("_", "-") === want), near = same.length ? same : vs.filter(x => x.lang.toLowerCase().startsWith(want.slice(0, 2).toLowerCase()));
    const good = near.filter(x => NATURAL.test(x.name)), pool = good.length ? good : near, v = pool.length ? pool[(it.opt.voice || 0) % pool.length] : null;
    if (!v && vs.length) { setTimeout(speakNext, 0); return; }   // 這台裝置沒有這種語言的聲音（例如沒有日文語音）：跳過這句，不要用別的語言亂念
    if (v) u.voice = v;
    u.rate = (it.opt.rate || 0.97) * (quiet ? 0.92 : 1); u.pitch = it.opt.pitch || 1; u.volume = quiet ? 0.3 : 1;
    u.onend = u.onerror = () => { sBusy = 0; setTimeout(speakNext, 80); };
    sBusy = performance.now(); try { speechSynthesis.resume(); } catch { } speechSynthesis.speak(u); } catch { sBusy = 0; }
}
setInterval(() => { try { if (!window.speechSynthesis) return; const n = performance.now();
  if (sBusy && n - sBusy > 12000) { speechSynthesis.cancel(); sBusy = 0; speakNext(); }
  else if (sBusy && n - sBusy > 1500 && !speechSynthesis.speaking && !speechSynthesis.pending) { sBusy = 0; speakNext(); } } catch { } }, 1000);
try { const un = () => { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch { } }; addEventListener("pointerdown", un, { once: true, capture: true }); } catch { }   // iPhone：第一次點畫面時解鎖語音
// 圖書館閱讀台的「今日一句」（自己寫的日常英文，附中文）
// 熊 FIN-U57：除了英文，也問簡單的歷史、科學、美術、工程、地理、數學（Claude 自己設計的題目）。lv 越高越難一點
const TRIVIA = [
  { s: ["歷史", "History"], lv: 1, q: ["第一個登上月球的人是誰？", "Who was the first person to walk on the Moon?"], a: ["阿姆斯壯", "Neil Armstrong"], w: [["加加林", "Yuri Gagarin"], ["哥倫布", "Christopher Columbus"]] },
  { s: ["歷史", "History"], lv: 1, q: ["古埃及的金字塔主要是用來做什麼的？", "What were the Egyptian pyramids mainly built as?"], a: ["法老的陵墓", "Tombs for pharaohs"], w: [["市場", "Markets"], ["學校", "Schools"]] },
  { s: ["歷史", "History"], lv: 2, q: ["萬里長城主要是為了什麼而建？", "Why was the Great Wall of China mainly built?"], a: ["抵禦北方的入侵", "To defend against invasions from the north"], w: [["儲存稻米", "To store rice"], ["當作河道", "As a river channel"]] },
  { s: ["歷史", "History"], lv: 2, q: ["在歐洲發明活字印刷機的是誰？", "Who developed the movable-type printing press in Europe?"], a: ["古騰堡", "Johannes Gutenberg"], w: [["牛頓", "Isaac Newton"], ["達爾文", "Charles Darwin"]] },
  { s: ["科學", "Science"], lv: 1, q: ["在海平面，水幾度會沸騰？", "At sea level, water boils at…"], a: ["100°C", "100°C"], w: [["50°C", "50°C"], ["150°C", "150°C"]] },
  { s: ["科學", "Science"], lv: 1, q: ["哪一顆行星被叫做「紅色星球」？", "Which planet is called the Red Planet?"], a: ["火星", "Mars"], w: [["金星", "Venus"], ["木星", "Jupiter"]] },
  { s: ["科學", "Science"], lv: 1, q: ["昆蟲有幾隻腳？", "How many legs does an insect have?"], a: ["6 隻", "6"], w: [["8 隻", "8"], ["4 隻", "4"]] },
  { s: ["科學", "Science"], lv: 2, q: ["植物用陽光製造養分，這叫做？", "Plants make food from sunlight by…"], a: ["光合作用", "Photosynthesis"], w: [["蒸發", "Evaporation"], ["消化", "Digestion"]] },
  { s: ["科學", "Science"], lv: 2, q: ["離地球最近的恆星是？", "The star closest to Earth is…"], a: ["太陽", "The Sun"], w: [["天狼星", "Sirius"], ["北極星", "Polaris"]] },
  { s: ["科學", "Science"], lv: 3, q: ["我們吸進去、身體需要的氣體是？", "Which gas do our bodies need from the air we breathe?"], a: ["氧氣", "Oxygen"], w: [["二氧化碳", "Carbon dioxide"], ["氦氣", "Helium"]] },
  { s: ["美術", "Art"], lv: 1, q: ["藍色和黃色顏料混在一起會變成？", "Mixing blue and yellow paint makes…"], a: ["綠色", "Green"], w: [["紫色", "Purple"], ["橘色", "Orange"]] },
  { s: ["美術", "Art"], lv: 1, q: ["《蒙娜麗莎》是誰畫的？", "Who painted the Mona Lisa?"], a: ["達文西", "Leonardo da Vinci"], w: [["梵谷", "Vincent van Gogh"], ["畢卡索", "Pablo Picasso"]] },
  { s: ["美術", "Art"], lv: 2, q: ["《星夜》是誰畫的？", "Who painted The Starry Night?"], a: ["梵谷", "Vincent van Gogh"], w: [["莫內", "Claude Monet"], ["林布蘭", "Rembrandt"]] },
  { s: ["美術", "Art"], lv: 3, q: ["紅色和白色顏料混在一起會變成？", "Mixing red and white paint makes…"], a: ["粉紅色", "Pink"], w: [["棕色", "Brown"], ["灰色", "Grey"]] },
  { s: ["工程", "Engineering"], lv: 1, q: ["橋和鐵塔常用哪一種形狀，因為它很穩固？", "Which shape is used in bridges and towers because it is very strong?"], a: ["三角形", "Triangle"], w: [["圓形", "Circle"], ["正方形", "Square"]] },
  { s: ["工程", "Engineering"], lv: 2, q: ["用輪子和繩子把重物拉上去的簡單機械是？", "A simple machine with a wheel and rope for lifting is a…"], a: ["滑輪", "Pulley"], w: [["槓桿", "Lever"], ["斜坡", "Ramp"]] },
  { s: ["工程", "Engineering"], lv: 2, q: ["哪一種材料最容易導電？", "Which material conducts electricity best?"], a: ["銅", "Copper"], w: [["木頭", "Wood"], ["玻璃", "Glass"]] },
  { s: ["工程", "Engineering"], lv: 3, q: ["拱橋為什麼做成拱形？", "Why are many bridges built with an arch?"], a: ["把重量往兩邊分散", "It spreads the weight to the sides"], w: [["只是比較好看", "Only to look nice"], ["比較省油漆", "To save paint"]] },
  { s: ["地理", "Geography"], lv: 1, q: ["地球上最大的海洋是？", "The largest ocean on Earth is the…"], a: ["太平洋", "Pacific Ocean"], w: [["大西洋", "Atlantic Ocean"], ["印度洋", "Indian Ocean"]] },
  { s: ["地理", "Geography"], lv: 2, q: ["地球上一般說有幾個洲？", "How many continents are there?"], a: ["7 個", "7"], w: [["5 個", "5"], ["9 個", "9"]] },
  { s: ["數學", "Math"], lv: 1, q: ["7 × 8 = ?", "7 × 8 = ?"], a: ["56", "56"], w: [["54", "54"], ["64", "64"]] },
  { s: ["數學", "Math"], lv: 2, q: ["三角形的三個角加起來是幾度？", "The angles of a triangle add up to…"], a: ["180°", "180°"], w: [["90°", "90°"], ["360°", "360°"]] },
  { s: ["數學", "Math"], lv: 3, q: ["一個正方形邊長 5，面積是？", "A square with sides of 5 has an area of…"], a: ["25", "25"], w: [["20", "20"], ["10", "10"]] },
];
const TKEY = "sle.triviaLv";
const triviaLv = () => { try { return Math.max(1, Math.min(3, Number(localStorage.getItem(TKEY)) || 1)); } catch { return 1; } };
const triviaUp = (ok) => { try { const n = Number(localStorage.getItem(TKEY + "N")) || 0, v = ok ? n + 1 : Math.max(0, n - 1); localStorage.setItem(TKEY + "N", String(v)); localStorage.setItem(TKEY, String(1 + Math.min(2, Math.floor(v / 4)))); } catch { } };   // 答對 4 題升一級，答錯慢慢退
const SENTENCES = [
  ["Every small step still moves you forward.", "每一小步都還是在往前走。"], ["Could you tell me where the history section is?", "可以告訴我歷史區在哪裡嗎？"],
  ["I usually read a few pages before bed.", "我通常睡前會讀幾頁書。"], ["The library opens at nine on weekdays.", "圖書館平日九點開門。"],
  ["Saving a little each week adds up quickly.", "每週存一點，很快就累積起來。"], ["This book was recommended by a friend.", "這本書是朋友推薦的。"],
  ["Please return the books by Friday.", "請在星期五前歸還書本。"], ["Let's meet at the station after lunch.", "午餐後在車站見吧。"],
  ["The rain makes the old town look even prettier.", "下雨讓老城區看起來更美了。"], ["I'm learning one new word every day.", "我每天學一個新單字。"],
  ["Mistakes are proof that you are trying.", "犯錯證明你正在努力。"], ["Could I borrow a pen for a moment?", "可以借我一下筆嗎？"],
  ["The clock tower rings every hour.", "鐘樓每個小時會響一次。"], ["Reading on the train is my favourite part of the day.", "在車上看書是我一天中最喜歡的時刻。"],
  ["She keeps a notebook of new expressions.", "她有一本記新說法的筆記本。"], ["Quiet voices, please. People are studying.", "請小聲一點，大家在讀書。"],
  ["Tomorrow is a fresh page.", "明天是新的一頁。"], ["How long can I keep this book?", "這本書可以借多久？"],
  ["A cup of tea and a good story — perfect.", "一杯茶配一個好故事，完美。"], ["Practice a little, practice often.", "練習一點點，但常常練。"],
];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

import { pvQuiz } from "./city-pv.js";   /* 曦環城入口 B 版預覽 */
export function createGames({ api, L, toast, onBag, onOpen, onClose }) {
  let open = false;
  /* 熊 2026-11-16：熊的單字書（Chapter 1–2）隨機出現在小遊戲和圖書館問答；伺服器上有才會出現 */
  let BOOK = [];
  try { api("GET", "/api/vocab?pack=book-vocab").then(r => { if (r && r.ok) BOOK = (r.data.entries || []).map(e => [e.word, String(e.meaning).split(/[、；;，]/)[0]]); }).catch(() => { }); } catch { }
  const deckOf = (maxLen = 99) => { const b = shuffle(BOOK.filter(w => w[0].length <= maxLen)), base = shuffle(WORDS), out = [];
    while (b.length || base.length) { const pick = b.length && (!base.length || Math.random() < 0.5) ? b.pop() : base.pop(); out.push(pick); } return out; };

  function shell(game) {
    const info = GAME_INFO[game];
    const root = el("div", "game"); root.setAttribute("role", "dialog");
    const card = el("div", "game-card"); root.append(card);
    const head = el("div", "game-head");
    const title = el("strong", "", "🎮 " + L(...info.name));
    const time = el("span", "game-time"), score = el("span", "game-score");
    const quit = el("button", "btn", L("離開", "Leave")); quit.type = "button";
    head.append(title, el("span", "spacer"), time, score, quit);
    const body = el("div", "game-body");
    card.append(head, body);
    document.body.append(root);
    card.style.setProperty("--accent", info.color);
    return { root, body, time, score, quit };
  }

  function play(game, portalId, onPlayed) {
    if (open) return; open = true; onOpen();
    const ui = shell(game);
    let pts = 0, left = game === "meteor" ? 45 : 60, ended = false, raf = 0, tick = 0;
    const setScore = () => { ui.score.textContent = L(`得分 ${pts}`, `Score ${pts}`); };
    const setTime = () => { ui.time.textContent = `⏱ ${Math.max(0, Math.ceil(left))}`; };
    setScore(); setTime();
    const close = () => { cancelAnimationFrame(raf); clearInterval(tick); ui.root.remove(); open = false; onClose(); };
    ui.quit.addEventListener("click", () => (ended ? close() : finish(L("提早離開，", "You left early. "))));
    tick = setInterval(() => { left -= 0.25; setTime(); if (left <= 0) finish(""); }, 250);

    async function finish(prefix) {
      if (ended) return; ended = true; cancelAnimationFrame(raf); clearInterval(tick);
      ui.body.replaceChildren(el("p", "game-result", prefix + L(`得分 ${pts}，結算中…`, `score ${pts}, counting…`)));
      const r = await api("POST", "/api/city/play", { portal: portalId, game, score: pts });
      const res = el("div", "game-end");
      if (r.ok) {
        onBag(r.data.bag); onPlayed();
        res.append(el("p", "game-result", L(`得分 ${r.data.score}！得到 ${r.data.gems.length} 顆寶石：`, `Score ${r.data.score}! You won ${r.data.gems.length} gem(s):`)));
        const row = el("div", "gem-row");
        r.data.gems.forEach(k => { const g = el("span", "gem-chip"); g.append(el("i", "gem-ico k-" + k), document.createTextNode(L(...GEM_KINDS[k].name))); row.append(g); });
        res.append(row);
        const fr = window.FinSave && FinSave.miniReward(game, pts >= 3 ? Math.min(4, Math.floor(pts / 3)) : 0);   // 和家裡的拼字流星共用每天 3 場的獎勵
        if (fr && (fr.b || fr.e)) res.append(el("p", "game-result", L(`小遊戲獎勵：+${fr.b} B${fr.e ? "、+1 滴宇宙元液" : ""}`, `Mini-game reward: +${fr.b} B${fr.e ? ", +1 drop of essence" : ""}`)));
      } else res.append(el("p", "game-result", r.data.message || L("這個入口已經關了。", "This portal has closed.")));
      const ok = el("button", "btn primary", L("好", "OK")); ok.type = "button"; ok.addEventListener("click", close);
      res.append(ok); ui.body.replaceChildren(res); ui.quit.hidden = true;   // 熊 FIN-U54：結果畫面只留一個「好」
    }

    const GAMES = { meteor, match, spell };
    GAMES[game]();

    /* 單字流星 */
    function meteor() {
      const sky = el("div", "meteor-sky"), word = el("div", "meteor-word"), opts = el("div", "opts"), hint = el("p", "muted", L("單字落地前，選出正確的中文意思。", "Pick the meaning before the word lands."));
      sky.append(word); ui.body.append(hint, sky, opts);
      const deck = deckOf(); let i = 0, y = 0, speed = 0.16, cur = null, lock = false;
      function next() {
        if (i >= 20 || ended) return finish("");
        cur = deck[i++]; y = 0; lock = false; word.textContent = cur[0]; word.classList.remove("hit", "miss");
        const pool = BOOK.includes(cur) && BOOK.length > 6 ? BOOK : WORDS, choices = shuffle([cur, ...shuffle(pool.filter(w => w !== cur && w[1] !== cur[1])).slice(0, 3)]);
        opts.replaceChildren(...choices.map(c => { const b = el("button", "opt", c[1]); b.type = "button"; b.addEventListener("click", () => answer(c === cur, b)); return b; }));
      }
      function answer(ok, b) {
        if (lock || ended) return; lock = true;
        if (ok) { pts++; setScore(); word.classList.add("hit"); speed = Math.min(0.32, speed + 0.01); } else { word.classList.add("miss"); if (b) b.classList.add("wrong"); [...opts.children].find(x => x.textContent === cur[1])?.classList.add("right"); }
        setTimeout(next, ok ? 380 : 900);
      }
      let last = performance.now();
      const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!lock) { y += speed * dt; if (y >= 1) answer(false, null); } word.style.transform = `translate(-50%, ${(y * (sky.clientHeight - 44)) | 0}px)`; raf = requestAnimationFrame(loop); };
      next(); raf = requestAnimationFrame(loop);
    }

    /* 寶石翻牌 */
    function match() {
      const kinds = Object.keys(GEM_KINDS), grid = el("div", "cards");
      ui.body.append(el("p", "muted", L("翻開兩張一樣的寶石就配對成功。翻錯越少，分數越高。", "Flip two matching gems. Fewer misses, higher score.")), grid);
      let first = null, wait = false, found = 0, miss = 0;
      shuffle([...kinds, ...kinds]).forEach(k => {
        const c = el("button", "card-g"); c.type = "button"; c.append(el("i", "gem-ico k-" + k)); c.dataset.k = k;
        c.addEventListener("click", () => {
          if (wait || ended || c.classList.contains("up")) return;
          c.classList.add("up");
          if (!first) { first = c; return; }
          if (first.dataset.k === k) { first.classList.add("done"); c.classList.add("done"); first = null; found++; pts = found * 2 - Math.min(found * 2, Math.floor(miss / 2)); if (found === kinds.length) { pts = Math.max(found, 12 - Math.floor(miss / 2)); setScore(); setTimeout(() => finish(L("全部配對完成！", "All matched! ")), 500); } setScore(); return; }
          miss++; wait = true; const a = first; first = null; setTimeout(() => { a.classList.remove("up"); c.classList.remove("up"); wait = false; }, 650);
        });
        grid.append(c);
      });
    }

    /* 鐘樓拼字 */
    function spell() {
      const hint = el("p", "spell-hint"), slots = el("div", "spell-slots"), tiles = el("div", "spell-tiles"), row = el("div", "opts");
      const back = el("button", "opt", L("⌫ 退一格", "⌫ Back")), skip = el("button", "opt", L("跳過", "Skip")); back.type = skip.type = "button";
      row.append(back, skip); ui.body.append(el("p", "muted", L("看中文，按順序點字母拼出英文單字。", "Tap the letters in order to spell the word.")), hint, slots, tiles, row);
      const deck = deckOf(8).filter(w => w[0].length <= 8); let i = 0, cur = null, typed = [];
      function next() {
        if (i >= 10 || ended) return finish("");
        cur = deck[i++]; typed = []; hint.textContent = cur[1];
        let letters = shuffle([...cur[0]]); if (letters.join("") === cur[0]) letters = letters.reverse();
        tiles.replaceChildren(...letters.map(ch => { const b = el("button", "tile", ch); b.type = "button"; b.addEventListener("click", () => { if (b.disabled || ended) return; b.disabled = true; typed.push(b); draw(); check(); }); return b; }));
        draw();
      }
      function draw() { slots.replaceChildren(...[...cur[0]].map((_, k) => el("span", "slot", typed[k] ? typed[k].textContent : ""))); }
      function check() {
        if (typed.length < cur[0].length) return;
        if (typed.map(b => b.textContent).join("") === cur[0]) { pts++; setScore(); slots.classList.add("ok"); setTimeout(() => { slots.classList.remove("ok"); next(); }, 450); }
        else { slots.classList.add("bad"); setTimeout(() => { slots.classList.remove("bad"); typed.forEach(b => { b.disabled = false; }); typed = []; draw(); }, 600); }
      }
      back.addEventListener("click", () => { const b = typed.pop(); if (b) { b.disabled = false; draw(); } });
      skip.addEventListener("click", () => { if (!ended) { toast(L(`答案是 ${cur[0]}`, `It was "${cur[0]}"`), 1800); next(); } });
      next();
    }
  }

  function showBag(bag) {
    if (open || !bag) return;
    open = true; onOpen();
    const root = el("div", "game"), card = el("div", "game-card bag"); root.append(card);
    const head = el("div", "game-head"), x = el("button", "btn", L("關閉", "Close")); x.type = "button";
    head.append(el("strong", "", L(`💎 寶石收藏（${bag.total} 顆）`, `💎 Gem collection (${bag.total})`)), el("span", "spacer"), x);
    const grid = el("div", "bag-grid");
    Object.entries(GEM_KINDS).forEach(([k, info]) => { const c = el("div", "bag-cell" + (bag.by_kind[k] ? "" : " none")); c.append(el("i", "gem-ico big k-" + k), el("b", "", String(bag.by_kind[k] || 0)), el("span", "muted", L(...info.name))); grid.append(c); });
    card.append(head, grid, el("p", "muted", L("寶石每 2 小時會在老城廣場和圖書館重新掉落，走過去就能撿。光環入口是小遊戲，玩完也會得到寶石。寶石之後會用來裝飾和建造城市。",
      "New gems fall in the Old Town Square and the library every 2 hours; walk over to pick them up. Glowing rings are mini-games that also give gems. Gems will be used to decorate and build the city.")));
    const close = () => { root.remove(); open = false; onClose(); };
    x.addEventListener("click", close); root.addEventListener("click", (e) => { if (e.target === root) close(); });
    document.body.append(root);
  }

  // ---- 圖書館：館員的「今日三題」（每天第一次全對 +2 B）、閱讀台的「今日一句」（每天第一次 +1 B，可以聽發音） ----
  function card(title) { const root = el("div", "game"), c = el("div", "game-card"); root.append(c); const head = el("div", "game-head"), x = el("button", "btn", L("關閉", "Close")); x.type = "button";
    head.append(el("strong", "", title), el("span", "spacer"), x); const body = el("div", "game-body"); c.append(head, body); document.body.append(root); open = true; onOpen();
    const close = () => { root.remove(); open = false; onClose(); }; x.addEventListener("click", close); root.addEventListener("click", (e) => { if (e.target === root) close(); }); return { body, close }; }
  function quiz() {
    if (open) return; const ui = card("📚 " + L("館員的今日三題", "The librarian's three words")); let qs = deckOf().slice(0, 3); let i = 0, right = 0;
    try { if (localStorage.getItem("sora-pv") === "haloB") qs = [qs[0], ...pvQuiz(L)]; } catch { }   /* B 版預覽：英文只考一題 */
    const ask = () => { ui.body.innerHTML = ""; if (i >= qs.length) { const got = right === 3 && window.FinSave ? FinSave.libReward("quiz", 2) : 0;
        ui.body.append(el("p", "game-result", L(`答對 ${right} / 3`, `${right} / 3 correct`)), el("p", "muted", right === 3 ? (got ? L("全對！館員給你 2 B。", "All correct! The librarian gives you 2 B.") : L("全對！（今天的獎勵已經拿過了）", "All correct! (Today's reward was already given)")) : L("明天再來挑戰吧！", "Come back tomorrow for another try!")));
        speak(right === 3 ? "Excellent work!" : "Nice try. See you tomorrow!", "en"); return; }
      if (!Array.isArray(qs[i])) { const Q = qs[i], row = el("div", "opts"), h = el(Q.small ? "p" : "h2", Q.small ? "game-result" : "", Q.h);
        ui.body.append(el("p", "muted", L(`第 ${i + 1} 題：`, `Question ${i + 1}: `) + Q.q), h, row);
        Q.opts.forEach(o => { const b = el("button", "btn", o); b.type = "button"; b.onclick = () => { if (o === Q.a) right++; b.classList.add(o === Q.a ? "ok" : "bad"); row.querySelectorAll("button").forEach(x => { x.disabled = true; }); setTimeout(() => { i++; ask(); }, 700); }; row.append(b); }); return; }
      const [w, zh] = qs[i], opts = shuffle([zh, ...shuffle((BOOK.length > 6 && BOOK.some(x => x[0] === w) ? BOOK : WORDS).filter(x => x[0] !== w && x[1] !== zh)).slice(0, 2).map(x => x[1])]), row = el("div", "opts");
      ui.body.append(el("p", "muted", L(`第 ${i + 1} 題：這個字是什麼意思？`, `Question ${i + 1}: what does this word mean?`)), el("h2", "", w), row); speak(w, "en");
      opts.forEach(o => { const b = el("button", "btn", o); b.type = "button"; b.onclick = () => { if (o === zh) right++; b.classList.add(o === zh ? "ok" : "bad"); row.querySelectorAll("button").forEach(x => { x.disabled = true; }); setTimeout(() => { i++; ask(); }, 700); }; row.append(b); }); };
    ask();
  }
  function reading() {
    if (open) return; const d = new Date(), k = (d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate()) % SENTENCES.length, [en, zh] = SENTENCES[k];
    const ui = card("📖 " + L("閱讀台・今日一句", "Reading stand · Sentence of the day")), z = el("p", "muted", zh); z.hidden = true;
    const row = el("div", "opts"), say = el("button", "btn", "🔊 " + L("聽發音", "Listen")), tr = el("button", "btn", L("看中文", "Show Chinese")); say.type = tr.type = "button";
    say.onclick = () => speak(en, "en"); tr.onclick = () => { z.hidden = !z.hidden; }; row.append(say, tr);
    ui.body.append(el("h2", "", en), z, row); speak(en, "en");
    const got = window.FinSave ? FinSave.libReward("read", 1) : 0; if (got) toast(L("讀了今日一句，+1 B", "Read today's sentence: +1 B"));
  }
  function trivia(who) {   // 點圖書館裡的人：問一題（歷史、科學、美術、工程、地理、數學）
    if (open) return; const lv = triviaLv(), pool = TRIVIA.filter(t => t.lv <= lv);
    let t = pool[(Math.random() * pool.length) | 0];
    if (BOOK.length > 6 && Math.random() < 0.4) { const [w, m] = BOOK[(Math.random() * BOOK.length) | 0], ws = shuffle(BOOK.filter(x => x[1] !== m)).slice(0, 3);   // 熊 2026-11-16：有時候考單字書
      t = { s: ["📕 單字書", "📕 Word book"], q: [`「${w}」是什麼意思？`, `What does "${w}" mean?`], a: [m, m], w: ws.map(x => [x[1], x[1]]) }; }
    const ui = card("💬 " + L(`${who || "讀者"}想考考你`, `${who || "A reader"} has a question`)), row = el("div", "opts");
    ui.body.append(el("p", "muted", L(`${t.s[0]}・難度 ${lv}`, `${t.s[1]} · level ${lv}`)), el("h2", "", L(t.q[0], t.q[1])), row);
    shuffle([t.a, ...t.w]).forEach(o => { const b = el("button", "btn", L(o[0], o[1])); b.type = "button"; b.addEventListener("pointerdown", (e) => { e.preventDefault(); if (b.disabled) return; const ok = o === t.a; triviaUp(ok);
      b.classList.add(ok ? "ok" : "bad"); row.querySelectorAll("button").forEach(x => { x.disabled = true; if (x.textContent === L(t.a[0], t.a[1])) x.classList.add("ok"); });
      const got = ok && window.FinSave ? FinSave.libReward("trivia", 1) : 0; ui.body.append(el("p", "game-result", ok ? L(`答對了！${got ? "+1 B" : ""}`, `Correct! ${got ? "+1 B" : ""}`) : L(`答案是：${t.a[0]}`, `The answer: ${t.a[1]}`))); }); row.append(b); });
  }
  return { play, showBag, quiz, reading, trivia, isOpen: () => open };
}
