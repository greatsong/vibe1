# 작품 갤러리 — 강사용 설정 가이드

이 폴더(`vibe1/gallery/`)는 빌드 없이 정적 파일(HTML/CSS/JS)만으로 도는 작품 갤러리입니다.
2026 정보교사 1급 정교사 자격연수 · 데이터 바이브 코딩 전용입니다.

## 1. 15시간 과정 갤러리와의 관계

같은 Supabase 프로젝트를 쓰되 **표를 따로 씁니다.**

| 과정 | 작품 표 | 피드백 표 | 좋아요 함수 |
|---|---|---|---|
| 서울대 15시간(`web/gallery/`) | `apps` | `feedback` | `increment_likes` |
| 이 연수(`vibe1/gallery/`) | `vibe1_apps` | `vibe1_feedback` | `vibe1_increment_likes` |

`schema.sql`은 `vibe1_` 로 시작하는 것만 만듭니다. 기존 표는 손대지 않으므로
15시간 과정 데이터가 바뀌거나 섞일 일이 없습니다.

## 2. 표 만들기 (강의 전 1회, 1분)

1. Supabase 대시보드 → 왼쪽 **SQL Editor** → **New query**
2. 이 폴더의 `schema.sql` 내용을 전부 붙여넣기
3. **Run** 클릭 → 성공 메시지 확인

`vibe1_apps`, `vibe1_feedback` 두 표와 좋아요 증가 함수, RLS 정책이 한 번에 생깁니다.
여러 번 실행해도 안전합니다.

이 SQL을 실행하기 전에는 갤러리 화면에 빨간 안내문이 뜹니다(화면은 깨지지 않습니다).
실행하고 5초 정도 기다리면 안내문이 사라지고 목록이 나타납니다.

## 3. config.js

`config.js`에는 Supabase 주소와 publishable(anon) 키, 그리고 표 이름이 들어 있습니다.
15시간 과정과 같은 프로젝트를 쓰므로 주소·키는 그대로 두고, 표 이름만 이 연수용입니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_KEY: "anon(publishable) 키",
  TABLE_APPS: "vibe1_apps",
  TABLE_FEEDBACK: "vibe1_feedback",
  RPC_INCREMENT_LIKES: "vibe1_increment_likes"
};
```

- ⚠️ **service_role(secret) 키는 넣지 마세요.** 화면에 들어가면 누구나 데이터를 지울 수 있습니다.
- publishable 키는 공개돼도 안전합니다. update/delete는 RLS로 전면 차단, 좋아요는 함수로만 증가합니다.
- `SUPABASE_URL`/`SUPABASE_KEY`를 비우면 데모 모드로 바뀌어 샘플 작품 4개가 보입니다(저장 안 됨).

## 4. 산출물 종류

| 종류 | 단계 |
|---|---|
| STEP 1 · 인구·고령화 지도 | STEP 1 |
| STEP 2 · 박스오피스 | STEP 2 |
| STEP 3 · AI 채팅앱 | STEP 3 |
| STEP 4 · 합친 사이트 | STEP 4 |

이 네 값은 `index.html`(필터 단추·제출 폼 select)과 `schema.sql`의 check 제약에
같은 문자열로 들어 있습니다. 바꿀 때는 세 곳을 함께 고쳐야 합니다.

종류를 고친 뒤에는 `schema.sql`을 다시 한 번 Run 하면 됩니다. 표가 이미 있어도
check 제약을 다시 걸어 주므로 목록이 최신 상태로 맞춰집니다.

## 5. 배포

`vibe1/` 폴더째로 GitHub Pages에 올라가면 `.../vibe1/gallery/` 주소로 열립니다.
로컬 확인은 `python3 -m http.server` 로 띄운 뒤 `/vibe1/gallery/` 에 접속합니다.

## 6. 운영 수칙

- **연수 전날 1회 접속** — Supabase 무료 요금제는 7일간 활동이 없으면 프로젝트가 멈춥니다. 전날 한 번 열어 깨워 둡니다.
- **장애 시 대체** — 갤러리가 열리지 않으면 패들렛 같은 예비 게시판에 앱 주소를 남기게 안내하고 진행합니다.
- **확인** — Supabase **Table Editor**에서 `vibe1_apps`, `vibe1_feedback` 표를 열면 올라온 작품과 피드백이 보입니다. 별도 강사 화면은 없습니다.
- **금지어** — `app.js` 맨 위 `BANNED_WORDS` 배열에 단어 문자열만 추가하면 닉네임·소개·피드백에서 걸러집니다.

## 7. 공개 안내

- 닉네임·소개·앱 주소는 누구나 볼 수 있게 공개됩니다.
- 제출 폼에 직접 넣고 누르는 행위가 공개 의사 표시입니다. 원치 않으면 올리지 않으면 됩니다.
- 실명 대신 닉네임 사용을 권합니다.

## 8. 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 화면 구조 (갤러리 / 작품 제출 두 화면) |
| `style.css` | 디자인 (교재와 같은 크림·골드 계열, 이 폴더 안에서 자족) |
| `app.js` | 데모·실제 모드 분기, 데이터 처리, 금지어 필터, 렌더링 |
| `config.js` | Supabase 주소·publishable 키·표 이름 |
| `schema.sql` | Supabase에 붙여넣을 표·RLS·함수 정의 |
| `SETUP.md` | 이 문서 |
