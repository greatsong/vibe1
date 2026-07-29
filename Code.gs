/************ 오프닝 '전국 선생님 지도' 백엔드 (Google Apps Script) ************
 * 참가자 폰이 보낸 학교·바이브 코딩 경험·교육경력(POST)을 구글 시트에 쌓고,
 * 보드가 물어보면(GET) 접속한 학교 목록과 집계를 돌려줍니다.
 *
 * 강사 준비 순서
 *  1) 새 구글 스프레드시트를 만든다 (연수 전용 · 워크샵 시트와 별도)
 *  2) 확장 프로그램 · Apps Script를 열고 이 파일 내용을 전부 붙여넣는다
 *  3) 배포 · 새 배포 · 유형 '웹 앱' · 액세스 권한 '모든 사용자'로 배포한다
 *  4) 나온 웹 앱 URL을 map.html과 board.html의 API_URL에 각각 넣는다
 ***************************************************************************/

const SHEET_NAME = 'map4';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['시각', '학교', '지역', '위도', '경도', '바이브경험', '교육경력', '자신분야', '비자신분야', '전문성점수']);
  }
  return sh;
}

// 한 건 저장 (폰이 POST)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);
    getSheet_().appendRow([new Date(), d.school || '', d.region || '', d.lat, d.lon, d.vibe || '', d.career || '', d.confident || '', d.unconfident || '', d.skills || '']);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 접속한 학교 목록 반환 (보드가 GET). 같은 학교는 1번만, 대신 인원수(count)를 함께 준다.
// tally는 사람 수 기준 집계 — 강사가 청중 분포를 읽는 계기판.
function doGet(e) {
  const sh = getSheet_();
  const schools = [];
  const index = {};
  const tally = { vibe: {}, career: {}, confident: {}, unconfident: {} };
  const scores = {};   // 분야별 [합계, 인원]
  if (sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
    rows.forEach(function (r) {
      const name = String(r[1]);
      if (!name) return;
      const vibe = String(r[5]), career = String(r[6]);
      if (vibe) tally.vibe[vibe] = (tally.vibe[vibe] || 0) + 1;
      if (career) tally.career[career] = (tally.career[career] || 0) + 1;
      addSplit_(tally.confident, r[7]);
      addSplit_(tally.unconfident, r[8]);
      addScores_(scores, r[9]);
      if (name in index) { schools[index[name]].count++; return; }
      index[name] = schools.length;
      schools.push({ school: name, region: String(r[2]), lat: r[3], lon: r[4], vibe: vibe, career: career, count: 1 });
    });
  }
  // 분야별 평균 자신감(1~5, 소수 둘째 자리)
  tally.skillAvg = {};
  Object.keys(scores).forEach(function (k) {
    tally.skillAvg[k] = Math.round(scores[k][0] / scores[k][1] * 100) / 100;
  });
  return out_({ ok: true, schools: schools, tally: tally });
}

// '분야=점수, 분야=점수' 형태 문자열을 분야별 [합계, 인원]으로 누적
function addScores_(map, v) {
  String(v || '').split(',').forEach(function (s) {
    const parts = s.split('=');
    if (parts.length !== 2) return;
    const k = parts[0].trim(), n = Number(parts[1]);
    if (!k || !(n >= 1 && n <= 5)) return;
    if (!map[k]) map[k] = [0, 0];
    map[k][0] += n; map[k][1] += 1;
  });
}

// '분야1, 분야2' 형태 문자열을 분야별 인원수로 집계
function addSplit_(map, v) {
  String(v || '').split(',').forEach(function (s) {
    s = s.trim();
    if (s) map[s] = (map[s] || 0) + 1;
  });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
