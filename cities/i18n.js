"use strict";
/* 中英文介面切換（書房、學習 App、模擬試題共用）。
 * 做法：介面字串都經過 T()。英文模式時先查整句對照，再做片語替換；
 * 片語替換後如果還剩中文（例如教材筆記、解析、伺服器訊息），就保留原文，不會變成中英夾雜。
 * 語言存在 localStorage「sora-lang」（和財務平台同一個鍵名）。
 */
(function () {
  let LANG = "zh";
  try { LANG = localStorage.getItem("sora-lang") === "en" ? "en" : "zh"; } catch { /* 無痕模式 */ }
  const CJK = /[㐀-鿿＀-￯　-〿]/;

  // 整句對照
  const EXACT = {
    "‹ 書房": "‹ Study", "模擬試題": "Mock Tests", "Part 5 練習": "Part 5 Practice", "閱讀練習": "Reading Practice", "閱讀測驗": "Reading", "練習試題": "Practice", "文法": "Grammar", "交卷，看答案與解析": "Submit and see answers", "回題組清單": "Back to sets", "‹ 題組": "‹ Sets", "再做一次": "Try again", "還沒做過": "Not tried yet", "Part 7 閱讀理解": "Part 7 Reading comprehension", "長篇閱讀（多篇文章）": "Long reading (multiple passages)", "文法知識": "Grammar", "單字": "Vocabulary",
    "主選單": "Main menu", "TOEIC 練習": "TOEIC Practice", "繼續上次的作答": "Continue where you left off", "繼續作答": "Continue",
    "放棄這份": "Discard", "限時模擬測驗": "Timed Mock Test", "開始模擬測驗": "Start mock test", "不限時小測驗": "Untimed Quiz",
    "題數": "Questions", "題型": "Question type", "全部": "All", "全部題型": "All types", "每答一題立即對答案、看解析": "Check each answer and see the explanation right away",
    "開始小測驗": "Start quiz", "最近成績": "Recent scores", "限時模擬": "Timed mock", "小測驗": "Quiz", "發生問題": "Something went wrong",
    "重試": "Retry", "回首頁": "Home", "‹ 首頁": "‹ Home", "回首頁（進度已保存）": "Home (progress saved)", "⌂ 書房": "⌂ Study", "回書房（進度已保存）": "Back to study (progress saved)",
    "依本機 TOEIC 教材整理的重點筆記。每個主題都可以直接練習。": "Key notes organised from the local TOEIC materials. Each topic can be practised directly. (Notes are in Chinese.)",
    "‹ 所有主題": "‹ All topics", "這個主題還沒有筆記。": "No notes for this topic yet.", "AI 整理": "AI summary",
    "搜尋單字或中文": "Search a word or meaning", "搜尋單字": "Search words", "遮住中文（點卡片顯示）": "Hide meanings (tap a card to show)",
    "字彙題練習 10 題": "10 vocabulary questions", "沒有符合的單字。": "No matching words.", "單字庫還是空的。": "The word list is empty.",
    "主題": "Topics", "上一題": "Previous", "下一題": "Next", "交卷": "Submit", "題號": "Questions", "題號導覽": "Question navigator",
    "已答": "Answered", "未答": "Unanswered", "標記": "Flagged", "已自動保存": "Saved", "保存中…": "Saving…", "離線，稍後重送": "Offline, will retry",
    "★ 已標記（稍後再看）": "★ Flagged (review later)", "☆ 標記這題": "☆ Flag this question", "答對了": "Correct",
    "等待連線以顯示解析…": "Waiting for connection to show the explanation…", "選項": "Options", "空格": "Blank", "剩餘時間": "Time left",
    "確認交卷": "Submit test?", "回去作答": "Back to test", "仍要交卷": "Submit anyway", "確定交卷": "Submit", "點題號可直接回去作答：": "Tap a number to go back to it:",
    "時間到，正在交卷…": "Time is up, submitting…", "連線中斷，3 秒後重試交卷": "Connection lost, retrying in 3 seconds", "交卷失敗": "Could not submit",
    "保存失敗": "Could not save", "操作失敗": "Action failed", "無法建立測驗": "Could not create the test", "無法連線到本機伺服器": "Cannot reach the local server",
    "無法連線到本機伺服器，請確認 python -m sle.server 仍在執行。": "Cannot reach the local server. Make sure python -m sle.server is still running.",
    "找不到這份測驗。": "Test not found.", "找不到成績。": "Result not found.", "找不到這個主題。": "Topic not found.", "找不到這次作答。": "Attempt not found.",
    "上一份限時測驗時間已到，已自動交卷": "Your last timed test ran out of time and was submitted automatically",
    "確定放棄這份測驗？作答紀錄不會計分。": "Discard this test? It will not be scored.",
    "還有一份未交卷的測驗。要放棄它並開始新的測驗嗎？": "You have an unsubmitted test. Discard it and start a new one?",
    "時間到，系統已自動交卷。": "Time was up; the test was submitted automatically.", "答對": "Correct", "答錯": "Wrong",
    "題型分析": "By question type", "這次沒有錯題。": "No mistakes this time.", "逐題檢討": "Review", "篩選": "Filter", "全部答對！": "All correct!",
    "你的答案：未作答": "Your answer: none", "（未答）": "(unanswered)", "（時間到）": " (time up)", "關閉": "Close",
    // 文法主題
    "詞性": "Parts of Speech", "時態": "Verb Tenses", "介係詞": "Prepositions", "連接詞": "Conjunctions", "關係詞": "Relative Clauses",
    "代名詞": "Pronouns", "分詞與被動": "Participles & Passive", "不定詞與動名詞": "Infinitives & Gerunds", "假設語氣": "Conditionals",
    "比較": "Comparisons", "主詞動詞一致": "Subject-Verb Agreement", "字彙": "Vocabulary",
    // 模擬試題
    "完整模擬試題": "Full Mock Tests", "完整模擬考": "Full test", "聽力測驗": "Listening test", "閱讀測驗": "Reading test",
    "依 TOEIC Listening & Reading 結構：聽力 100 題（約 45 分鐘，音檔只播一次）＋閱讀 100 題（75 分鐘）。": "Follows the TOEIC Listening & Reading format: 100 listening questions (about 45 min, audio plays once) + 100 reading questions (75 min).",
    "完整模擬考（200 題，約 2 小時）": "Full test (200 questions, about 2 hours)", "只考聽力（約 45 分）": "Listening only (about 45 min)", "只考閱讀（75 分）": "Reading only (75 min)",
    "分 Part 練習（不計時、可重播、可前後切換）": "Practise by part (untimed, replay allowed, move freely)", "作答紀錄": "History", "還沒有匯入試題。": "No tests imported yet.",
    "‹ 模擬試題": "‹ Mock Tests", "‹ 離開": "‹ Leave", "‹ 上一組": "‹ Previous set", "下一組 ›": "Next set ›", "‹ 上一頁": "‹ Previous page", "下一頁 ›": "Next page ›",
    "放棄": "Discard", "確定放棄這次作答？": "Discard this attempt?", "交卷看成績": "Submit and see score", "完成": "Done", "播放": "Play", "開始播放": "Start audio",
    "播放中…": "Playing…", "音檔無法播放": "Audio cannot be played", "瀏覽器擋下自動播放，請再按一次": "The browser blocked autoplay. Press again.", "請按「開始播放」": "Press \"Start audio\"",
    "聽力部分結束": "End of the listening section", "開始閱讀測驗（75 分鐘）": "Start the reading test (75 min)",
    "按下按鈕後閱讀開始計時 75 分鐘；聽力答案之後不能再修改。": "The 75-minute reading timer starts when you press the button; listening answers can no longer be changed.",
    "考試模式：音檔依序自動播放，不能暫停或重播；播完自動進入下一組。": "Test mode: audio plays automatically in order and cannot be paused or replayed; the next set starts when it ends.",
    "聽力文字稿": "Transcript", "文章": "Passage", "未作答": "Not answered", "不計時": "Untimed", "回到第一組": "Back to the first set", "回模擬試題": "Back to Mock Tests",
    "各 Part 正確率": "Accuracy by part", "估計總分（非官方換算，僅供參考）": "Estimated total score (unofficial conversion, for reference only)",
    "這次作答已放棄。": "This attempt was discarded.", "閱讀時間到，系統已自動交卷。": "Reading time was up; the test was submitted automatically.",
    "上一份測驗的閱讀時間已到，已自動交卷": "Your last test ran out of reading time and was submitted automatically",
    "完整模擬考約 2 小時：聽力音檔依序播放、不能暫停；聽力結束後閱讀 75 分鐘，時間到自動交卷。\n請準備好耳機再開始。": "The full test takes about 2 hours: listening audio plays in order and cannot be paused; then 75 minutes of reading, submitted automatically when time is up.\nGet your headphones ready.",
    "還有一份未交卷的模擬試題。要放棄它並開始新的嗎？": "You have an unsubmitted mock test. Discard it and start a new one?",
    "無法開始": "Could not start", "無法開始閱讀": "Could not start reading", "無法修改這一題": "This question cannot be changed",
    "答案尚未儲存（連線中斷），恢復後會自動補存": "Answer not saved yet (connection lost); it will be saved when the connection returns",
    "交卷失敗，請再試一次": "Could not submit, please try again", "交卷失敗（連線中斷），請再試一次": "Could not submit (connection lost), please try again",
    "確定交卷？": "Submit?", "（練習）": " (practice)",
    "閱讀計時練習（照 TOEIC 常見的時間分配，時間到自動交卷）": "Timed reading drills (typical TOEIC timing; submitted automatically when time is up)",
    "Part 5 計時（10 分）": "Part 5 timed (10 min)", "Part 6 計時（8 分）": "Part 6 timed (8 min)", "Part 7 計時（55 分）": "Part 7 timed (55 min)",
    "Part 6＋7 計時（63 分）": "Parts 6+7 timed (63 min)",
    "看圖片，選出最符合圖片的描述。選項只會唸一次，不會印在試題上。": "Look at the picture and choose the statement that best describes it. The statements are spoken once and are not printed.",
    "聽問句或陳述，選出最適當的回應。題目與選項都只唸一次。": "Listen to a question or statement and choose the best response. Everything is spoken only once.",
    "聽對話，回答每組三題。題目與選項印在畫面上。": "Listen to a conversation and answer three questions. Questions and options are printed on screen.",
    "聽一段獨白，回答每組三題。題目與選項印在畫面上。": "Listen to a talk and answer three questions. Questions and options are printed on screen.",
    "選出最適合填入空格的字或片語。": "Choose the word or phrase that best completes the sentence.",
    "閱讀文章，選出最適合填入空格的字、片語或句子。": "Read the text and choose the word, phrase or sentence that best fills each blank.",
    "閱讀文件，回答問題。": "Read the documents and answer the questions.",
  };
  // 片語（長的先換）；換完若還有中文就保留原句
  const PHRASES = Object.entries({
    "Part 1 照片描述": "Part 1 Photographs", "Part 2 應答問題": "Part 2 Question-Response", "Part 3 簡短對話": "Part 3 Conversations",
    "Part 4 簡短獨白": "Part 4 Talks", "Part 5 句子填空": "Part 5 Incomplete Sentences", "Part 6 段落填空": "Part 6 Text Completion",
    "Part 7 閱讀理解": "Part 7 Reading Comprehension", "完整模擬考": "Full test",
    "Part 5 計時（10 分）": "Part 5 timed (10 min)", "Part 6 計時（8 分）": "Part 6 timed (8 min)", "Part 7 計時（55 分）": "Part 7 timed (55 min)",
    "Part 6＋7 計時（63 分）": "Parts 6+7 timed (63 min)", "聽力測驗": "Listening test", "閱讀測驗": "Reading test",
    "限時模擬": "Timed mock", "小測驗": "Quiz", "（時間到）": " (time up)", "（練習）": " (practice)", "（未答）": "(unanswered)",
    "聽力音檔尚未產生": "listening audio not generated yet", "錯題與未答": "Wrong & unanswered", "你的答案：": "Your answer: ",
    "正確答案：": "Correct answer: ", "答錯了，正確答案是": "Wrong. The answer is", "依據教材：": "Source: ", "優先複習：": "Review first: ",
    "最佳估計": "best estimate", "正確率": "accuracy", "練習": "practice", "聽力": "Listening", "閱讀": "Reading", "全部": "All",
    "，已標記": ", flagged", "已答": "answered", "未答": "unanswered", "AI 整理": "AI summary", "、": ", ", "；": "; ", "：": ": ",
    ...Object.fromEntries(Object.entries(EXACT).filter(([k]) => k.length <= 9 && !/[，。？]/.test(k))),
  }).sort((a, b) => b[0].length - a[0].length);
  // 帶數字的句型
  const PATTERNS = [
    [/TOEIC 模擬試題 第 (\d+) 回/g, "TOEIC Mock Test $1"],
    [/Part ([67]) 小測驗 第 (\d+) 份/g, "Part $1 mini quiz $2"],
    [/^ (\d+) 題 (\d+) 分$/, " $1 Q · $2 min"],
    [/^Part 6／Part 7 小測驗（一份約 8–10 題、5–10 分鐘，時間到自動交卷）$/, "Part 6 / Part 7 mini quizzes (about 8–10 questions and 5–10 minutes each; submitted automatically when time is up)"],
    [/^Part 5 句子填空 · 題庫 (\d+) 題（依本機 TOEIC 教材由 AI 變化生成，並通過獨立作答驗證）$/, "Part 5 Incomplete Sentences · $1 questions (AI variations of the local TOEIC materials, checked by an independent solver)"],
    [/^仿 TOEIC Part 5：(\d+) 題、(\d+) 分鐘。時間到自動交卷，交卷後才看答案。$/, "TOEIC Part 5 style: $1 questions, $2 minutes. Submitted automatically when time is up; answers shown after submitting."],
    [/^多益高頻單字 (\d+) 個，依本機教材主題分類；例句由 AI 新寫。$/, "$1 high-frequency TOEIC words grouped by theme; example sentences newly written by AI."],
    [/^第 (\d+) \/ (\d+) 題$/, "Question $1 / $2"],
    [/第 (\d+)(–\d+)? 題的照片/g, "Photo for question $1$2"],
    [/第 (\d+)(–\d+)? 題/g, "Q$1$2"],
    [/題號 (\d+)\/(\d+)/g, "Questions $1/$2"],
    [/(\d+) 題都已作答。/g, "All $1 questions answered."],
    [/還有 (\d+) 題未作答，未答視為答錯。/g, "$1 questions unanswered; they count as wrong."],
    [/還有 (\d+) 題沒有作答，確定交卷？/g, "$1 questions unanswered. Submit anyway?"],
    [/有 (\d+) 題沒有作答。/g, "$1 questions were not answered."],
    [/標記的題目（(\d+)）：/g, "Flagged questions ($1):"],
    [/已答 (\d+) \/ (\d+)( 題)?/g, "Answered $1 / $2"],
    [/答對 (\d+) \/ (\d+) 題/g, "$1 / $2 correct"],
    [/將出 (\d+) 題（符合條件的題目共 (\d+) 題）/g, "$1 questions will be drawn (from $2 matching)"],
    [/練習這個主題（(\d+) 題，立即對答案）/g, "Practise this topic ($1 questions, instant feedback)"],
    [/(\d+) 篇筆記 · (\d+) 題/g, "$1 notes · $2 questions"],
    [/剩下 (\d+) 分鐘/g, "$1 minutes left"], [/閱讀剩 (\d+) 分鐘/g, "$1 minutes of reading left"],
    [/閱讀剩 /g, "reading left "], [/ · 剩 /g, " · left "], [/用時 /g, "time "],
    [/約 (\d+) 分/g, "about $1 pts"], [/估計 (\d+) 分/g, "estimate $1 pts"], [/(\d+) 分/g, "$1 pts"],
    [/聽 (\d+)\/(\d+)/g, "L $1/$2"], [/讀 (\d+)\/(\d+)/g, "R $1/$2"],
    [/空格 \((\d+)\)/g, "Blank ($1)"], [/(\d+) 題/g, "$1 questions"], [/全部 \((\d+)\)/g, "All ($1)"],
  ];

  function T(s) {
    if (LANG !== "en" || typeof s !== "string" || !CJK.test(s)) return s;
    if (EXACT[s] != null) return EXACT[s];
    let out = s;
    for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
    if (CJK.test(out)) for (const [zh, en] of PHRASES) if (out.includes(zh)) out = out.split(zh).join(en);
    return CJK.test(out) ? s : out;   // 還有中文＝內容文字，保留原文
  }

  // 靜態 HTML（書房首頁）：記住原文，切換回中文時還原
  const ORIG = new WeakMap();
  const ATTRS = ["aria-label", "title", "placeholder"];
  function translateDom(root, dict) {
    const tr = (s) => (dict && LANG === "en" && dict[s.trim()] != null) ? s.replace(s.trim(), dict[s.trim()]) : T(s);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.parentElement && n.parentElement.closest("[data-noi18n]")) continue;
      if (!ORIG.has(n)) ORIG.set(n, n.nodeValue);
      const o = ORIG.get(n);
      n.nodeValue = LANG === "en" ? tr(o) : o;
    }
    root.querySelectorAll("*").forEach(el => ATTRS.forEach(a => {
      if (!el.hasAttribute(a)) return;
      const key = "i18n" + a.replace(/-./g, m => m[1].toUpperCase());
      if (el.dataset[key] == null) el.dataset[key] = el.getAttribute(a);
      el.setAttribute(a, LANG === "en" ? tr(el.dataset[key]) : el.dataset[key]);
    }));
  }

  const nativeConfirm = window.confirm.bind(window);
  window.confirm = (msg) => nativeConfirm(T(msg));

  window.SLE_I18N = {
    T, translateDom,
    get lang() { return LANG; },
    set(lang) {
      LANG = lang === "en" ? "en" : "zh";
      try { localStorage.setItem("sora-lang", LANG); } catch { /* ignore */ }
      document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant";
    },
  };
  window.T = T;
  document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant";
})();
