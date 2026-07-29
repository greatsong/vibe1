// ============================================================
// 작품 갤러리 설정 파일
// ------------------------------------------------------------
// SUPABASE_URL / SUPABASE_KEY 가 채워져 있으면 실제 Supabase와 연동됩니다.
// 두 값을 비우면 데모 모드(브라우저 메모리 안 샘플 작품)로 동작합니다.
//
// TABLE_APPS / TABLE_FEEDBACK / RPC_INCREMENT_LIKES 는 이 연수 전용 이름입니다.
// 서울대 15시간 과정의 apps / feedback 표와 데이터가 섞이지 않도록
// 같은 Supabase 프로젝트 안에 별도 표를 씁니다. schema.sql 참고.
//
// ⚠️ publishable(공개용 anon) 키만 넣습니다. secret 키는 넣지 않습니다.
// ============================================================
window.APP_CONFIG = {
  SUPABASE_URL: "https://ipcherzsnaevkkjrclvn.supabase.co",
  SUPABASE_KEY: "sb_publishable_AuRR576neh5CoGt1dZM4_g_vov4KtVm",

  TABLE_APPS: "vibe1_apps",
  TABLE_FEEDBACK: "vibe1_feedback",
  RPC_INCREMENT_LIKES: "vibe1_increment_likes"
};
