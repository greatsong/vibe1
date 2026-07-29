// ============================================================
// 2026 정보교사 1급 정교사 자격연수 · 데이터 바이브 코딩
// 작품 갤러리 — app.js
//
// 빌드 없는 정적 SPA. config.js 의 SUPABASE_URL/KEY 가 비어 있으면
// 데모 모드(메모리 안 샘플 데이터)로 동작한다.
// 표 이름도 config.js 에서 읽는다(15시간 과정 표와 분리).
// ============================================================

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 0. 금지어 필터 — 아래 배열에 단어만 추가하면 된다.
  // ---------------------------------------------------------
  const BANNED_WORDS = [
    "시발", "씨발", "씨팔", "시팔", "쓰발", "ㅅㅂ", "ㅆㅂ",
    "개새끼", "개새", "새끼", "병신", "ㅄ", "지랄", "좆", "좃",
    "존나", "존나게", "졸라", "닥쳐", "미친놈", "미친년", "쳐죽",
    "죽어", "꺼져", "걸레", "창녀", "년아", "놈아", "fuck", "shit",
    "bitch", "asshole", "damn", "faggot", "니미", "느그", "애미",
    "애비", "썅", "씹", "좇", "간나", "빙신", "새꺄", "새키",
  ];

  function findBannedWord(text) {
    if (!text) return null;
    const normalized = String(text).toLowerCase().replace(/\s+/g, "");
    for (const word of BANNED_WORDS) {
      if (normalized.includes(word.toLowerCase())) return word;
    }
    return null;
  }

  // ---------------------------------------------------------
  // 1. 모드 판별 (데모 vs 실제) & 표 이름
  // ---------------------------------------------------------
  const cfg = window.APP_CONFIG || {};
  const hasRealConfig = !!(cfg.SUPABASE_URL && cfg.SUPABASE_KEY &&
    cfg.SUPABASE_URL.trim() && cfg.SUPABASE_KEY.trim());

  const TABLE_APPS = cfg.TABLE_APPS || "vibe1_apps";
  const TABLE_FEEDBACK = cfg.TABLE_FEEDBACK || "vibe1_feedback";
  const RPC_INCREMENT_LIKES = cfg.RPC_INCREMENT_LIKES || "vibe1_increment_likes";

  const DEMO_MODE = !hasRealConfig;

  let supabaseClient = null;
  if (!DEMO_MODE) {
    try {
      supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    } catch (e) {
      console.error("Supabase 클라이언트 생성 실패, 데모 모드로 대체:", e);
    }
  }
  const useSupabase = !DEMO_MODE && !!supabaseClient;

  // ---------------------------------------------------------
  // 2. 데모 데이터 (메모리 전용, 새로고침 시 초기화)
  // ---------------------------------------------------------
  let demoIdSeq = 1000;
  function nextDemoId() { return "demo-" + (demoIdSeq++); }

  const demoApps = [
    {
      id: nextDemoId(), assignment: "STEP 1 · 인구·고령화 지도", nickname: "별사탕",
      url: "https://example.com/demo-population-map",
      description: "우리 지역 고령화율을 지도에서 확인하는 앱", likes: 6,
      feedback: [{ nickname: "물결", content: "색 구분이 한눈에 들어옵니다" }],
    },
    {
      id: nextDemoId(), assignment: "STEP 2 · 박스오피스", nickname: "라면왕",
      url: "https://example.com/demo-boxoffice",
      description: "날짜를 고르면 그날 흥행 순위를 보여주는 앱", likes: 9,
      feedback: [],
    },
    {
      id: nextDemoId(), assignment: "STEP 3 · AI 채팅앱", nickname: "코딩요정",
      url: "https://example.com/demo-ai-chat",
      description: "수업 활동을 함께 설계해 주는 AI 채팅앱", likes: 12,
      feedback: [
        { nickname: "산들바람", content: "답변 말투가 자연스럽습니다" },
        { nickname: "무지개", content: "수업에 바로 써 보겠습니다" },
      ],
    },
    {
      id: nextDemoId(), assignment: "STEP 4 · 합친 사이트", nickname: "파도소리",
      url: "https://example.com/demo-combined",
      description: "오늘 만든 앱을 한 주소에 모은 수업 도구 모음", likes: 15,
      feedback: [{ nickname: "하늘색", content: "메뉴 구성이 깔끔합니다" }],
    },
  ];

  // ---------------------------------------------------------
  // 3. 데이터 레이어 (데모 / 실제 공통 인터페이스)
  // ---------------------------------------------------------
  let appsCache = []; // 실제 모드에서 feedback을 합쳐 캐싱
  let loadFailed = false; // 표가 없거나 통신이 안 될 때 true

  async function loadApps() {
    if (!useSupabase) {
      appsCache = demoApps;
      return demoApps;
    }
    const { data: apps, error: appsErr } = await supabaseClient
      .from(TABLE_APPS)
      .select("*")
      .order("created_at", { ascending: false });
    if (appsErr) throw appsErr;

    const { data: fbRows, error: fbErr } = await supabaseClient
      .from(TABLE_FEEDBACK)
      .select("*")
      .order("created_at", { ascending: true });
    if (fbErr) throw fbErr;

    const fbByApp = {};
    (fbRows || []).forEach((row) => {
      if (!fbByApp[row.app_id]) fbByApp[row.app_id] = [];
      fbByApp[row.app_id].push({ nickname: row.nickname, content: row.content });
    });

    appsCache = (apps || []).map((a) => ({ ...a, feedback: fbByApp[a.id] || [] }));
    return appsCache;
  }

  async function insertApp(payload) {
    if (!useSupabase) {
      const newApp = { ...payload, id: nextDemoId(), likes: 0, feedback: [] };
      demoApps.unshift(newApp);
      return newApp;
    }
    const { data, error } = await supabaseClient
      .from(TABLE_APPS)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    data.feedback = [];
    appsCache.unshift(data);
    return data;
  }

  async function likeApp(appId) {
    if (!useSupabase) {
      const app = demoApps.find((a) => a.id === appId);
      if (!app) throw new Error("app not found");
      app.likes += 1;
      return app.likes;
    }
    const { data, error } = await supabaseClient.rpc(RPC_INCREMENT_LIKES, { p_app_id: appId });
    if (error) throw error;
    const app = appsCache.find((a) => a.id === appId);
    if (app) app.likes = data;
    return data;
  }

  async function insertFeedback(appId, nickname, content) {
    if (!useSupabase) {
      const app = demoApps.find((a) => a.id === appId);
      if (!app) throw new Error("app not found");
      app.feedback.push({ nickname, content });
      return;
    }
    const { error } = await supabaseClient
      .from(TABLE_FEEDBACK)
      .insert([{ app_id: appId, nickname, content }]);
    if (error) throw error;
    const app = appsCache.find((a) => a.id === appId);
    if (app) app.feedback.push({ nickname, content });
  }

  // ---------------------------------------------------------
  // 4. 좋아요 중복 방지 (같은 브라우저에서 같은 카드 재클릭 방지)
  //    15시간 과정 갤러리와 같은 도메인에 올라가므로 키를 따로 쓴다.
  // ---------------------------------------------------------
  const LIKED_KEY = "vibe1_gallery_liked_ids";
  function getLikedSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function saveLiked(id) {
    const s = getLikedSet();
    s.add(id);
    try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch (e) { /* noop */ }
  }

  // ---------------------------------------------------------
  // 5. 상태 & 필터
  // ---------------------------------------------------------
  let filterAssignment = "all";

  // ---------------------------------------------------------
  // 6. DOM 유틸
  // ---------------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function isHttpsUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------
  // 7. 렌더링
  // ---------------------------------------------------------
  const gridEl = $("#galleryGrid");
  const emptyEl = $("#galleryEmpty");
  const countEl = $("#galleryCount");
  const noticeEl = $("#galleryNotice");
  const cardTemplate = $("#cardTemplate");
  const likedSet = getLikedSet();

  const LOAD_FAIL_MSG = "작품 목록을 불러오지 못했습니다. Supabase 표가 아직 없거나 연결이 끊긴 상태입니다. " +
    "gallery/schema.sql 을 Supabase SQL Editor에서 한 번 실행하면 해결됩니다. (자동으로 다시 시도합니다)";

  function renderGallery() {
    const filtered = appsCache.filter((a) => {
      if (filterAssignment !== "all" && a.assignment !== filterAssignment) return false;
      return true;
    });

    gridEl.innerHTML = "";

    if (loadFailed) {
      noticeEl.hidden = false;
      noticeEl.textContent = LOAD_FAIL_MSG;
      countEl.hidden = true;
      emptyEl.hidden = true;
      return;
    }

    noticeEl.hidden = true;
    countEl.hidden = false;
    countEl.textContent = `총 ${filtered.length}개 작품`;
    emptyEl.hidden = filtered.length > 0;

    filtered.forEach((app) => {
      const node = cardTemplate.content.cloneNode(true);

      node.querySelector(".card").dataset.appId = app.id;
      node.querySelector(".assignment-badge").textContent = app.assignment;
      node.querySelector(".card-nickname").textContent = app.nickname;
      node.querySelector(".card-desc").textContent = app.description;

      const goBtn = node.querySelector(".btn-go");
      goBtn.href = app.url;

      const likeBtn = node.querySelector(".btn-like");
      const likeCountEl = node.querySelector(".like-count");
      likeCountEl.textContent = app.likes;
      if (likedSet.has(app.id)) {
        likeBtn.classList.add("liked");
        likeBtn.disabled = true;
      }
      likeBtn.addEventListener("click", async () => {
        if (likedSet.has(app.id)) return;
        likeBtn.disabled = true;
        try {
          const newCount = await likeApp(app.id);
          likeCountEl.textContent = newCount;
          likeBtn.classList.add("liked");
          likedSet.add(app.id);
          saveLiked(app.id);
        } catch (e) {
          console.error(e);
          likeBtn.disabled = false;
          alert("좋아요 처리 중 오류가 났습니다. 잠시 후 다시 눌러주세요.");
        }
      });

      const fbCountEl = node.querySelector(".fb-count");
      const fbListEl = node.querySelector(".fb-list");
      fbCountEl.textContent = `(${app.feedback.length})`;
      renderFeedbackList(fbListEl, app.feedback);

      const fbForm = node.querySelector(".fb-form");
      const fbMsg = node.querySelector(".fb-msg");
      fbForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nickInput = fbForm.querySelector(".fb-nickname");
        const contentInput = fbForm.querySelector(".fb-content");
        const nickname = nickInput.value.trim();
        const content = contentInput.value.trim();

        fbMsg.hidden = true;
        fbMsg.className = "fb-msg";

        if (!nickname || !content) {
          showFbMsg(fbMsg, "닉네임과 피드백을 모두 넣어주세요.", "error");
          return;
        }
        const banned = findBannedWord(nickname) || findBannedWord(content);
        if (banned) {
          showFbMsg(fbMsg, "부적절한 표현이 있어 등록할 수 없습니다.", "error");
          return;
        }

        const submitBtn = fbForm.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        try {
          await insertFeedback(app.id, nickname, content);
          nickInput.value = "";
          contentInput.value = "";
          // 등록 후 최신 데이터를 다시 받아 화면 전체를 새로 그린다.
          // (다른 선생님이 남긴 댓글·좋아요도 이때 함께 반영된다)
          try {
            await loadApps();
            renderGallery();
            const card = gridEl.querySelector(`.card[data-app-id="${app.id}"]`);
            if (card) {
              const det = card.querySelector("details.feedback-block");
              if (det) det.open = true;
              const msg = card.querySelector(".fb-msg");
              if (msg) showFbMsg(msg, "피드백을 남겼습니다. 고맙습니다.", "ok");
            }
          } catch (reloadErr) {
            // 다시 받아오지 못해도 방금 단 댓글은 캐시에 있으니 그 자리만 갱신
            fbCountEl.textContent = `(${app.feedback.length})`;
            renderFeedbackList(fbListEl, app.feedback);
            showFbMsg(fbMsg, "피드백을 남겼습니다. 고맙습니다.", "ok");
          }
        } catch (err) {
          console.error(err);
          showFbMsg(fbMsg, "등록 중 오류가 났습니다. 잠시 후 다시 시도해주세요.", "error");
        } finally {
          submitBtn.disabled = false;
        }
      });

      gridEl.appendChild(node);
    });
  }

  function showFbMsg(el, text, type) {
    el.textContent = text;
    el.hidden = false;
    el.className = "fb-msg " + type;
  }

  function renderFeedbackList(listEl, feedback) {
    listEl.innerHTML = "";
    if (!feedback.length) {
      const li = document.createElement("li");
      li.className = "fb-empty";
      li.textContent = "아직 피드백이 없습니다. 첫 피드백을 남겨보세요.";
      listEl.appendChild(li);
      return;
    }
    feedback.forEach((f) => {
      const li = document.createElement("li");
      const nickSpan = document.createElement("span");
      nickSpan.className = "fb-nick";
      nickSpan.textContent = f.nickname;
      li.appendChild(nickSpan);
      li.appendChild(document.createTextNode(f.content));
      listEl.appendChild(li);
    });
  }

  // ---------------------------------------------------------
  // 8. 탭 & 필터 이벤트
  // ---------------------------------------------------------
  function initTabs() {
    $all(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $all(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const view = btn.dataset.view;
        $all(".view").forEach((v) => v.classList.remove("active"));
        $("#view-" + view).classList.add("active");
      });
    });
  }

  function initFilters() {
    $all("#assignmentFilter .chip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $all("#assignmentFilter .chip-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        filterAssignment = btn.dataset.assignment;
        renderGallery();
      });
    });
  }

  // ---------------------------------------------------------
  // 9. 제출 폼
  // ---------------------------------------------------------
  function initSubmitForm() {
    const form = $("#submitForm");
    const msgEl = $("#formMsg");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msgEl.hidden = true;
      msgEl.className = "form-msg";

      const assignment = $("#f-assignment").value;
      const nickname = $("#f-nickname").value.trim();
      const url = $("#f-url").value.trim();
      const description = $("#f-desc").value.trim();

      if (!assignment || !nickname || !url || !description) {
        return showFormMsg("별표(*) 항목을 모두 넣어주세요.", "error");
      }
      if (!isHttpsUrl(url)) {
        return showFormMsg("앱 주소는 https:// 로 시작하는 주소여야 합니다.", "error");
      }
      if (nickname.length > 20 || description.length > 80) {
        return showFormMsg("글자 수가 너무 깁니다. 조금 줄여주세요.", "error");
      }

      const bannedHit = findBannedWord(nickname) || findBannedWord(description);
      if (bannedHit) {
        return showFormMsg("닉네임·소개에 부적절한 표현이 있습니다. 확인 후 다시 제출해주세요.", "error");
      }

      const submitBtn = form.querySelector(".btn-primary");
      submitBtn.disabled = true;
      try {
        await insertApp({ assignment, nickname, url, description });
        form.reset();
        loadFailed = false;
        showFormMsg("게시했습니다. 갤러리 탭에서 확인하세요.", "ok");
        renderGallery();
      } catch (err) {
        console.error(err);
        showFormMsg("게시 중 오류가 났습니다. 잠시 후 다시 시도해주세요. (계속 같은 오류라면 강사에게 알려주세요)", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });

    function showFormMsg(text, type) {
      msgEl.textContent = text;
      msgEl.hidden = false;
      msgEl.className = "form-msg " + type;
    }
  }

  // ---------------------------------------------------------
  // 10. 시작
  // ---------------------------------------------------------
  // 5초마다 새 작품을 받아온다. 다만 화면을 다시 그리면 하던 일이 끊기므로
  // (입력 중 · 피드백 펼침 · 제출 탭) 지금 건드리면 안 되는 상황이면 건너뛴다.
  const REFRESH_MS = 5000;

  function busyNow() {
    if (document.visibilityState !== "visible") return true;      // 다른 탭 보는 중
    if (document.querySelector(".tab.active")?.dataset.view !== "gallery") return true;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true; // 입력 중
    if (gridEl.querySelector("details[open]")) return true;        // 피드백 펼쳐 둠
    return false;
  }

  // 내용이 그대로면 다시 그리지 않는다 (깜빡임 방지)
  function snapshot() {
    return appsCache.map((a) => a.id + ":" + a.likes + ":" + (a.feedback ? a.feedback.length : 0)).join("|");
  }

  function startAutoRefresh() {
    if (!useSupabase) return; // 데모 모드는 받아올 곳이 없다
    let last = snapshot();
    setInterval(async () => {
      if (busyNow()) return;
      const wasFailed = loadFailed;
      try {
        await loadApps();
        loadFailed = false;
      } catch (e) {
        loadFailed = true;
        if (!wasFailed) renderGallery(); // 방금 끊겼다면 안내를 띄운다
        return;
      }
      const now = snapshot();
      if (!wasFailed && now === last) return; // 달라진 게 없으면 그대로 둔다
      last = now;
      renderGallery();
    }, REFRESH_MS);
  }

  async function init() {
    initTabs();
    initFilters();
    initSubmitForm();
    try {
      await loadApps();
      loadFailed = false;
    } catch (e) {
      console.error("데이터 로딩 실패:", e);
      appsCache = [];
      loadFailed = true;
    }
    renderGallery();
    startAutoRefresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

// ── 사용성 보강 ──
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-go-submit]");
  if (!btn) return;
  const tab = [...document.querySelectorAll(".tab")].find(b => (b.dataset.view || "") === "submit");
  if (tab) { tab.click(); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

// 입력이 최대 길이에 닿으면 조용히 잘리지 않게 안내
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.maxLength || el.maxLength < 0 || el.tagName !== "INPUT") return;
  if (el.value.length >= el.maxLength) {
    let hint = el.parentElement.querySelector(".len-hint");
    if (!hint) {
      hint = document.createElement("span");
      hint.className = "len-hint";
      el.parentElement.appendChild(hint);
    }
    hint.textContent = `최대 ${el.maxLength}자까지 쓸 수 있습니다.`;
  } else {
    const hint = el.parentElement.querySelector(".len-hint");
    if (hint) hint.remove();
  }
});
