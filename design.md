# Sage Scroll — 디자인 시스템

이 문서는 `public/style.css`에 이미 구현된 실제 값을 그대로 옮긴 것이다. 화면 작업 전 반드시 먼저 읽고, 여기 없는 값은 새로 만들지 말고 기존 값을 재사용한다.

## 정체성 (한 문단)

Sage Scroll은 "종이 위에 먹으로 쓴 사료"의 결을 가진 지도형 에디토리얼이다. 따뜻한 미색 종이 배경과 세리프(Noto Serif KR) 인물명·인용문이 중심이고, 인주(印朱) 빨강 하나만을 유일한 강조색으로 써서 절제된 무게감을 준다. 지도(Carto Positron 톤)는 사료를 올려놓는 받침일 뿐 스스로 화려해지지 않는다. 장식·그라데이션·과한 그림자 없이, 인물의 생애·저작·말이 항상 주인공이다.

## 색상 (실제 hex)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--paper` | `#f4efe4` | 앱 배경(따뜻한 미색) |
| `--surface` | `#fbf8f1` | 패널·카드·상단바 |
| `--surface-2` | `#ece3d1` | 살짝 깊은 면(hover, 지도 배경) |
| `--ink` | `#211c17` | 본문 텍스트 |
| `--ink-soft` | `#6d6357` | 보조 텍스트 |
| `--ink-faint` | `#9c9081` | 메타 정보(연도, 캡션) |
| `--rule` | `#e2d9c6` | 가는 구분선(기본) |
| `--rule-soft` | `#ece4d5` | 구분선(옅음) |
| `--seal` | `#b23a2c` | 인주 빨강 — 유일한 강조색 |
| `--seal-soft` | `#c9705f` | 강조색 보조(테두리, hover) |

액센트는 `--seal` 하나뿐이다. 새 화면에 두 번째 강조색이나 그라데이션을 추가하지 않는다. 지도 핀 기본색은 `#4a4138`(먹색 계열), active 시 `--seal`로 전환.

## 타이포그래피

- 세리프(디스플레이·인물명·인용문): `--serif: "Noto Serif KR", Georgia, "Apple SD Gothic Neo", serif`
- 산세리프(UI·라벨·메타): `--sans: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif`

크기/굵기 스케일(실측값):

| 요소 | font-family | size | weight |
|---|---|---|---|
| 브랜드 h1 | serif | 21px | 700 |
| 인물 이름(`.person-name`) | serif | 33px (모바일 29px) | 700 |
| 히어로 인용문(`.hq-text`) | serif | 22px (모바일 20px) | 400, line-height 1.7 |
| 인용문 번역(`.hq-trans`) | sans | 14px | italic |
| 저작 제목(`.work-title`) | serif | 16px | 600 |
| 교류 칩 이름(`.lc-name`) | serif | 14px | 600 |
| 연표 연도(`.tl-year`) | serif | 13px | 600, tabular-nums |
| 연표 사건(`.tl-event`) | sans | 14.5px | line-height 1.62 |
| 섹션 타이틀(`.seg-title`) | sans | 11px | 600, letter-spacing .15em, uppercase |
| 인물 칩(`.person-chip`) | sans | 13.5px | — |
| 메타·캡션 | sans | 10~13px | — |

원칙: 사료 자체(이름·인용문·저작 제목)는 항상 세리프, 인터페이스 요소(탭·칩·라벨·메타)는 항상 산세리프. 이 역할 분담을 뒤집지 않는다.

## 여백

기준 단위는 대략 4px 배수. 실사용 스케일: `2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 42, 44, 56`(px).

대표 위치:
- 상단바/인물바 좌우 패딩: `24px`
- 인물 본문(`.person`) 패딩: `32px 32px 56px` (모바일 `26px 22px 44px`)
- 섹션 간 간격(`.seg`): `margin-top: 32px; padding-top: 22px`
- 칩 내부 패딩: `5~7px 12~14px`

새 컴포넌트도 이 스케일 안에서 값을 고르고, 임의의 13px, 17px 같은 값을 새로 발명하지 않는다.

## 모양 (radius, 버튼/칩/카드)

- 알약형(pill) — 999px: 언어 토글, route-picker는 6px지만 대부분의 버튼·칩·검색창·오늘의 인물 버튼·book-shop 링크는 `border-radius: 999px`
- 카드/패널 — 10~14px: 검색 결과(10px), intro 카드(14px), map-roster(12px), intro-today(10px)
- 작은 이미지/썸네일 — 5~7px: 인물 초상(7px), 저작 이미지(5px), pin-label(6px)
- 핀: 원형(`border-radius: 50%`), 기본 13px, hover 시 1.35배 확대, active 시 1.4배 + seal 색
- 그림자: 아주 옅고 낮게만 사용한다. 예) `0 1px 4px rgba(60,50,35,.16)`, `0 10px 22px -14px rgba(33,28,23,.5)`. 강한 드롭섀도우·네온 글로우 금지.
  - 모달/오버레이 티어(예외적으로 더 큰 값 허용): 화면을 덮는 `#intro` 같은 카드에 한해 `0 30px 70px -30px rgba(33,28,23,.65)`까지 쓴다. 이 값은 페이지에 얹힌 일반 패널·칩·카드에는 쓰지 않는다 — 전체 화면을 덮는 모달류 전용 티어다.
- 테두리: 대부분 `1px solid var(--rule)`. 강조가 필요하면 `var(--seal-soft)`로 테두리 색만 바꾸고 두께는 유지.

## 컴포넌트 공통 규칙

- **칩(person-chip, link-chip, mr-item 등)**: 기본은 투명 배경 + `1px solid var(--rule)` 테두리, hover 시 테두리/텍스트만 `--seal` 계열로 변하고, active/on 상태만 `background: var(--seal); color: #fff`로 채운다. 칩 색을 화면마다 다르게 만들지 않는다.
- **인물 카드/헤더**: 초상(92×118px, object-fit cover) + 세리프 이름 + 얇은 verify 배지. 초상이 없거나 로드 실패 시 조용히 숨김(`onerror`), 빈 자리를 placeholder 이미지로 채우지 않는다.
- **출처마크(`.src-mark`, `.trust-note`)**: 항상 작고(11px) 옅은 회색(`--ink-faint`), 밑줄은 점선(`dotted`). 절대 본문보다 크거나 진하게 만들지 않는다 — 출처는 "조용히" 존재해야 한다.
- **링크/교류 칩**: hover 시 이름만 seal로 바뀌고 배경은 변하지 않는다(과한 hover 애니메이션 금지).
- **인용문(hero-quote, work-quote)**: 큰 따옴표(`\201C`, seal색 42% 불투명)로 시작하는 것 외에 별도 장식 없음. 번역은 항상 italic sans, 출처는 항상 `— ` 접두사.

## 공유용 인물 프로필 페이지 (`.profile-*`)

`/person/:id`에서 쓰는 단독 공유 페이지. 지도 없이 세로 스크롤 문서 하나로 구성되지만, 색·타이포 원칙은 위 공통 규칙을 그대로 따른다 — 새 팔레트나 새 폰트를 들이지 않는다.

- **배경/폭**: `.profile-page`는 `--paper` 배경 위에 `.profile-shell`(폭 `min(780px, calc(100% - 32px))`, `margin: 0 auto`, `padding: 30px 0 72px`)이 문서를 담는다.
- **상단 nav**: `.profile-shell nav`는 `space-between` 플렉스, `600 13px sans`, 링크 색은 `--seal`.
- **히어로**: `.profile-hero` — 초상(`112×136px`, `radius 8px`, `object-fit: cover`, `filter: saturate(.7)`, 모바일 `84×104px`) + 텍스트. 눈썹 라벨(직함 등, `.profile-hero p`)은 `600 12px sans`에 `--seal` 색. 이름(`h1`)만 세리프 `700 clamp(36px, 7vw, 58px)/1.08`. 메타 줄(`strong`)은 `500 14px sans` `--ink-soft`. 부제(`.profile-alt`)는 `400 16px 세리프` `--ink-soft` — 프로필 안에서 세리프를 쓰는 유일한 보조 텍스트다.
- **액션 버튼**: `.profile-actions a/button` — 알약형(`999px`), `1px solid var(--rule)`, `padding 9px 15px`, `600 13px sans`. 첫 번째(주 액션)만 `border-color: var(--seal-soft); color: var(--seal)` — 두 번째 액센트를 새로 만들지 않고 테두리·글자색만 seal로 바꾸는 기존 칩 규칙과 동일하다.
- **섹션**: `.profile-section`은 `margin-top: 42px`. 제목(`h2`)은 세리프 `700 22px/1.3`, 아래 `1px solid var(--rule)` 구분선.
- **타임라인**: `.profile-timeline li`는 `grid: 78px 1fr auto`(모바일 `62px 1fr`), `padding: 11px 0`, `border-bottom: 1px dotted var(--rule)`. 연도(`time`)만 `--seal` `600 13px sans`.
- **저작**: `.profile-works article`은 카드(`padding 16px`, `1px solid var(--rule)`, `radius 10px`, `--surface` 배경). 제목(`h3`)만 세리프 `600 16px`, 설명(`p`)은 `--ink-soft` `14px`.
- **출처 링크**: `.profile-timeline a`, `.profile-works a`, `.profile-sources a`는 전부 `--ink-faint` `500 11px sans` — `.src-mark`와 같은 "조용한 출처" 원칙을 프로필 페이지에서도 그대로 적용한 것.
- **하단 노트**: `.profile-note`는 `--ink-faint` `400 12px/1.7 sans`.

## 반응형

- 분기점: `780px`(레이아웃 전환), `720px`(nav-search, map-roster 숨김)
- 모바일(`≤780px`): `#layout`이 세로(column)로 전환, 지도는 `flex: 0 0 48vh`로 높이 고정(48vh), 패널은 지도 아래로 100% 폭. 인물 이름 33→29px, 인용문 22→20px로 축소.
- PC: `#panel`은 `clamp(400px, 32vw, 560px)`로 화면 폭에 비례해 늘어나되 상한·하한을 둔다. 초광폭 모니터에서 지도만 무한히 넓어지지 않도록 하는 장치이므로 고정폭으로 되돌리지 않는다.
- `map-roster`, `nav-search` 등 지도 위 오버레이는 모바일에서 숨기거나(`720px` 이하) relative 레이아웃으로 전환한다 — 좁은 화면에서 지도를 가리지 않는 것이 원칙.

## ✋ 금지

**공통**
- 화면마다 새 색·새 폰트·새 radius 값을 추가하지 않는다. 위 표에 없는 값이 필요하면 먼저 표를 확장할지 판단하고, 그 전엔 가장 가까운 기존 값을 쓴다.
- 보라색 계열 그라데이션 금지.
- 떠다니는 이모지, 문장마다 붙는 아이콘 금지.
- 과한 그림자(진한 drop-shadow, 네온 글로우)·과도하게 둥근 카드(24px+ radius) 금지.
- 컴포넌트마다 곡률·여백을 제각각으로 만들지 않는다 — 반드시 위 스케일에서 고른다.

**Sage Scroll 고유**
- 화려한 장식·그라데이션·배경 텍스처 금지 — 사실과 사료가 항상 주인공이고 UI는 물러나 있어야 한다.
- 세리프 정체성 훼손 금지: 인물명·인용문·저작 제목 같은 "사료" 텍스트를 산세리프 디스플레이 폰트로 바꾸지 않는다.
- 지도가 데이터(인물·핀·패널)를 압도하는 디자인 금지 — 지도는 항상 `--surface-2` 톤의 옅은 배경이고, 강조는 핀과 패널 쪽에 남겨둔다.
- 인주 빨강(`--seal`) 외의 두 번째 액센트 컬러를 새로 들이지 않는다.
