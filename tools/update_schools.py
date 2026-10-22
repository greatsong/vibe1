"""schools.json(학교 검색·지도용 학교 목록)을 공공데이터포털 최신본으로 다시 만든다.

원본: 전국초중등학교위치표준데이터(공공데이터포털 15021148, 한국교육시설안전원, 매월 초 병합).
포털의 'CSV 다운로드' 버튼이 쓰는 공개 JSON(열 목록 + 1만 건씩 데이터)을 그대로 받는다.
형식: {"schools": [[학교명, 지역(시도 시군구, 세종은 시도만), 위도, 경도, 초/중/고], ...]}

실행: python3 tools/update_schools.py
  → 저장소 맨 위의 schools.json과 schools.meta.json(기준일·확인 시각·학교 수)을 덮어쓴다.
  GitHub Actions(.github/workflows/update-schools.yml)가 매달 자동으로 실행한다.
"""
import datetime, json, os, sys, urllib.parse, urllib.request

PK = '15021148'
H = {'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest',
     'Referer': f'https://www.data.go.kr/data/{PK}/standard.do'}
KIND = {'초등학교': '초', '중학교': '중', '고등학교': '고'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT, META = os.path.join(ROOT, 'schools.json'), os.path.join(ROOT, 'schools.meta.json')
MIN_SCHOOLS = 11000   # 이보다 적게 오면 받다가 잘린 것으로 보고 덮어쓰지 않는다


def get(url):
    req = urllib.request.Request(url, headers=H)
    return json.load(urllib.request.urlopen(req, timeout=180))


def region(r):
    t = (r['RDNMADR'] or r['LNMADR']).split()
    return t[0] if t[0].startswith('세종') else ' '.join(t[:2])


cols = get(f'https://www.data.go.kr/download/columList.json?pk={PK}&ext=CSV')
names, total, tbl = cols['tableVO']['colNmList'], cols['totalCount'], cols['tableVO']['svcTableNm']
raw = []
for page in range(1, (total + 9999) // 10000 + 1):
    q = [('publicDataPk', PK)] + [('colNmList', c) for c in names] + \
        [('totalCount', total), ('svcTableNm', tbl), ('perPage', 10000), ('page', page)]
    raw += get('https://www.data.go.kr/download/standard.json?' + urllib.parse.urlencode(q))

rows = sorted([[r['SCHOOL_NM'].strip(), region(r), round(float(r['LATITUDE']), 5),
                round(float(r['LONGITUDE']), 5), KIND[r['SCHOOL_SE']]]
               for r in raw if r.get('LATITUDE') and r.get('LONGITUDE') and r.get('SCHOOL_SE') in KIND],
              key=lambda x: (x[0], x[1]))
ref_date = raw[0].get('REFERENCE_DATE', '') if raw else ''
if len(rows) < MIN_SCHOOLS:
    sys.exit(f'받은 학교가 {len(rows)}곳뿐이라 덮어쓰지 않았습니다 (기준 {MIN_SCHOOLS}곳 이상).')

# 바뀐 학교 요약(Actions 실행 화면에 표시)
old = []
if os.path.exists(OUT):
    old = json.load(open(OUT, encoding='utf-8')).get('schools', [])
key = lambda x: (x[0], x[1])
oldk, newk = {key(x) for x in old}, {key(x) for x in rows}
added, removed = sorted(newk - oldk), sorted(oldk - newk)
summary = [f'### 학교 목록 최신화 · 기준일 {ref_date}',
           f'- 학교 수: {len(old):,} → {len(rows):,}',
           f'- 새로 생긴 학교 {len(added)}곳, 빠진 학교 {len(removed)}곳']
summary += [f'  - ＋ {n} ({r})' for n, r in added[:60]]
summary += [f'  - － {n} ({r})' for n, r in removed[:60]]
print('\n'.join(summary))
if os.environ.get('GITHUB_STEP_SUMMARY'):
    open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('\n'.join(summary) + '\n')
if os.environ.get('GITHUB_OUTPUT'):
    open(os.environ['GITHUB_OUTPUT'], 'a').write(f'ref_date={ref_date}\nadded={len(added)}\nremoved={len(removed)}\n')

json.dump({'schools': rows}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'source': '공공데이터포털 전국초중등학교위치표준데이터(15021148)', 'reference_date': ref_date,
           'checked_at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M KST'),
           'schools': len(rows)}, open(META, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
