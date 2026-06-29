# Sage Scroll

> 코드네임/디렉터리: `place-atlas`

한국·아시아 인물·장소 아틀라스 — **검증 MVP**.
특정 지역이 배출한 인물과 핵심 작품을 **검증된 데이터로 지도화**하고, 인근 장소를 **여행 동선**으로 묶는다.

> **"왜 위대했나"는 다루지 않는다.** 생존편향 서술·교훈·인물 평가는 스펙에서 금지.
> 사실 + 출처만. → [작업지시서](docs/작업지시서.md)

**파일럿 지역: 통영** (윤이상·박경리·유치환·김춘수·전혁림 등 거장 밀집, 공식 기념관 = A급 출처, 통영시 관광 홍보 활발).

## 구조
```
place-atlas/
├─ docs/작업지시서.md     # 스펙 (비목표 = 빌드 가드레일)
├─ data/
│  ├─ people.json         # 인물 레코드 (진짜 자산)
│  ├─ routes.json         # 여행 동선 (places[].id 참조)
│  └─ raw/                # 수집 원자료 (seed-*.json)
└─ public/                # 정적 사이트 (Leaflet + OSM, 무료)
   ├─ index.html
   ├─ app.js
   └─ style.css
```

## 실행
```bash
cd public && python3 -m http.server 8080
# http://localhost:8080
```
정적 파일만. 빌드 없음.

## 데이터 규칙
- 모든 좌표·사실에 **출처 URL 필수**. `source_grade`: A(공공/공식) · B(언론/학술) · C(위키).
- 나무위키/위키 **단독** → `verified:false` + `flags:["wiki-only"]` → 화면에 "미검증" 배지.
- 좌표 불확실 → `lat/lng:null` + `flags:["coords-unverified"]`. **좌표 환각 금지.**

## 완료 정의 (DoD)
- [ ] 통영 검증 인물 15~30명 적재 / 전 레코드 출처 URL
- [ ] 장소 클릭 → 인물·작품·출처 표시
- [ ] 여행 동선 1개 이상 작동
- [ ] 비목표 항목 0개
