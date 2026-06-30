# 이어서 작업하기 (CONTINUATION)

> 다른 머신(집 PC 등)에서 이어받을 때 **이 파일부터** 읽으세요. (메모리는 머신별이라 안 따라옴 — 맥락은 이 repo가 정본)

## 현황 (2026-06-30)
- **Sage Scroll** = 한국→동아시아 지성의 **연고지·생애·저작을 검증된 출처로 지도화**하는 정적 사이트. Leaflet + **Carto Positron**(차분 베이스맵, 기본 OSM 타일 금지).
- **라이브**: https://place-atlas.vercel.app · **GitHub**: https://github.com/sjmania78/sage-scroll (공개)
- **적재 63인 39개국** (전세계 6대륙). 한국 23 + 동아시아 4(공자·두보·바쇼·무라사키) + 전세계 36(유럽·중동·남아시아·동남아·아프리카·아메리카·오세아니아 각국 1명꼴).
- **한 인물당 마커 1개**(첫 연고지). 62/63 마커(최한기만 없음=정상). 생애지도(연표 📍→지도 이동) 작동. 지도 fitBounds 전세계.
- 인물 인덱스 분야 4그룹(사상·학문/시인·문인/화가·예술/국민 위인). **시인·문인이 42로 비대** — 필요시 대륙/국가 하위그룹 추가 검토(현재 미구현).
- **디자인**: 종이+먹 editorial(Noto Serif KR + 인주빨강). 인물의 **사료(말)가 히어로**. 인물 인덱스 분야별 4그룹.
- **영문탭(ko/en 토글)**: UI·인물명·분야·연표·저작 전부 영문(_en). **인용문은 원문 유지 + 외국어면 아래 해석(KO=quote_ko·EN=quote_en, qTrans)**. bluetronai.com 허브 실험실 그룹에 카드 등록됨.

## 이어받기
```bash
git clone https://github.com/sjmania78/sage-scroll.git
cd sage-scroll/public && python3 -m http.server 8000   # → http://localhost:8000
```

## 구조
- `public/` = 웹루트 (index.html · app.js · style.css). Vercel이 이 폴더를 서빙 (`vercel.json`).
- `public/data/people.json` = **인물 데이터 (진짜 자산)**. `data/raw/*.json` = 수집 원자료(seed=통영 보류분, qufu=중국 확장 보류분 포함).
- `docs/작업지시서.md` = 스펙. **§1 비목표 = 빌드 가드레일, 반드시 읽을 것.**

## 절대 규칙 (가드레일)
- **"왜 위대했나 / 교훈 / 배울 점"을 AI가 생성 금지.** 사실 + 출처만. 해석은 독자 몫.
- 미검증(좌표 없음·위키 단독·출생지 논쟁)은 숨기지 말고 `flags` 배지로 노출.
- 좌표는 공식에 수치 없으면 OSM Nominatim 지오코딩(`coords-osm`), 그래도 없으면 `null`+`coords-unverified`. **지어내기 금지.**

## 다음 할 일
1. **좌표 보완 — ✅ 완료 (2026-06-30)**
   - OSM 지오코딩 3곳(`coords-osm`): 정지용 문학관(옥천)·세종 영릉(여주)·이충무공 묘(아산, 기념관 아닌 실제 묘소).
   - 카카오 지오코딩 5곳(`coords-kakao`): 한용운 생가지·심우장·신채호 생가지·신채호 사당묘·김환기 고택. (OSM 미등록 → 카카오 키워드 검색, 지역·주소 일치 검증.) 카카오 키는 repo에 미저장.
   - 마커 19→27. **18/19 인물 마커 보유. 최한기만 없음**(개성 출생=추정·북한, 검증 연고지 없음 → 정상).
2. **자동배포 연동** — 지금은 CLI 직접배포라 push해도 자동 안 됨. Vercel 대시보드 → 이 repo Git 연동하면 push마다 자동배포 (권장).
3. **인물 추가** — 시인·음악가·과학자 등. 흐름: raw 수집(서브에이전트) → 좌표 지오코딩 → `people.json` 머지 → 재배포.

## 재배포 (수동)
```bash
vercel --prod --yes --cwd .    # vercel CLI 로그인 필요 (계정 sjmania78)
```
