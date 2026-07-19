// Sage Scroll — 한국(→동아시아) 지성의 생애 지도.
// 사실 + 그들의 말(사료)만 렌더. 평가·교훈 생성 없음(스펙 §1 가드레일).
// 레퍼런스: 차분한 베이스맵(데이터가 튐), 사료를 주인공으로, 생애↔장소 연동. ko/en 이중언어.

const KOREA_CENTER = [36.5, 127.9];

// ── 언어 ──
// 함대 공용 쿠키(.bluetronai.com)에 저장한다. localStorage는 도메인 간 공유가 안 돼서
// 다른 Bluetron 사이트에서 고른 언어가 여기로 이어지지 않았다. 기존 ss_lang 값은 이어받는다.
function readBtLang() {
  const m = document.cookie.match(/(?:^|;\s*)bt_lang=(ko|en)\b/);
  if (m) return m[1];
  try {
    const s = localStorage.getItem("ss_lang");
    if (s === "ko" || s === "en") return s;
  } catch (e) {}
  return null;
}
function writeBtLang(lang) {
  // 미리보기(*.vercel.app)·로컬에서는 도메인을 붙이면 쿠키가 거부되므로 생략.
  const domain = location.hostname.indexOf("bluetronai.com") >= 0 ? "; domain=.bluetronai.com" : "";
  document.cookie = "bt_lang=" + lang + "; path=/" + domain + "; max-age=31536000; samesite=lax";
  try { localStorage.setItem("ss_lang", lang); } catch (e) {}
}
let LANG = (function () {
  try {
    const s = readBtLang();
    if (s === "ko" || s === "en") return s;
    return (navigator.language || "ko").toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
  } catch (e) { return "ko"; }
})();
function t(ko, en) { return LANG === "en" && en ? en : ko; }

// ── 책 어필리에이트 (저작을 Amazon에서 찾기) ──
// 사실·출처와 분리된 '쇼핑' 링크(rel=sponsored)로 명시 — 지도의 신뢰도(사실+출처만)를 훼손하지 않는다.
// 활성화 단계(Joe): Amazon Associates 계정에 sage.bluetronai.com 사이트를 추가하고
//   트래킹ID(예: sagescrolls-20)를 만든 뒤, 아래 AMAZON_TAG를 그 값으로 설정. (빈 문자열이면 링크 미표시)
const AMAZON_TAG = "sagescrolls-20";
const COUPANG_DISCLOSURE_KO = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
const COUPANG_DISCLOSURE_EN = "As part of the Coupang Partners program, this site earns a commission from qualifying purchases.";
const COUPANG_BOOKS = {
  dostoevsky: {
    url: "https://link.coupang.com/a/fqsgNbrmWi",
    labelKo: "『죄와 벌』 전2권 현재 가격 보기",
    labelEn: "Crime and Punishment: 2-volume Korean edition",
  },
};
const COUPANG_READING_GEAR = [
  {
    id: "book-stand",
    url: "https://link.coupang.com/a/fulAK5Ox5g",
    nameKo: "이룸 프라임 엘리베이터 2단 독서대 PL560",
    nameEn: "Eroom Prime Elevator PL560 book stand",
    benefitKo: "손으로 책을 계속 누르지 않아도 되면 자세가 편해지고, 한 장 더 읽을 여유가 생깁니다.",
    benefitEn: "Free your hands and settle into a more comfortable reading position.",
    ctaKo: "책을 내려놓고 이야기에 더 오래 머물기",
    ctaEn: "Set the book down and stay with the story",
  },
  {
    id: "ebook-reader",
    url: "https://link.coupang.com/a/fulDapmAfs",
    nameKo: "오닉스 BOOX 리프5 이북리더기",
    nameEn: "BOOX Leaf 5 e-reader",
    benefitKo: "여러 권을 한 기기에 담아 이동 중에도 읽던 흐름을 이어갈 수 있습니다.",
    benefitEn: "Keep several books close and continue reading wherever you go.",
    ctaKo: "읽고 싶은 책을 가볍게 들고 다니기",
    ctaEn: "Carry the books you want to read",
  },
  {
    id: "fountain-pen",
    url: "https://link.coupang.com/a/fulHPTWs0W",
    nameKo: "라미 사파리 만년필",
    nameEn: "LAMY Safari fountain pen",
    benefitKo: "마음에 남은 문장과 생각을 손으로 천천히 기록하는 시간을 준비합니다.",
    benefitEn: "Make room to write down the passages and ideas worth keeping.",
    ctaKo: "읽은 생각을 오래 남기기",
    ctaEn: "Keep the thoughts that reading leaves",
  },
  {
    id: "blue-light-glasses",
    url: "https://link.coupang.com/a/fulKnCpAVo",
    nameKo: "슈비코 긱시크 블루라이트 차단 안경",
    nameEn: "Shuvico geek-chic blue-light glasses",
    benefitKo: "화면으로 자료를 읽는 시간이 길 때 눈앞의 빛 부담을 줄이는 선택지입니다.",
    benefitEn: "An option for easing screen-light strain during long digital reading sessions.",
    ctaKo: "화면 읽기 시간을 더 편안하게",
    ctaEn: "Make screen reading more comfortable",
  },
];
function escapeBookText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function bookShopLink(p) {
  if (!AMAZON_TAG) return "";
  const name = p.name_en || p.name_ko || "";
  if (!name) return "";
  const work = (p.works || []).find((item) => item.title_en || item.title);
  const workTitle = work ? (LANG === "en" ? (work.title_en || work.title) : (work.title || work.title_en)) : "";
  const query = workTitle ? `${workTitle} ${name}` : `${name} books`;
  const contentId = String(p.id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "unknown";
  const url = "https://www.amazon.com/s?i=stripbooks&k=" + encodeURIComponent(query) + "&tag=" + AMAZON_TAG;
  const label = workTitle
    ? t(`『${escapeBookText(workTitle)}』를 곁에 두고 다시 펼치기`, `Keep ${escapeBookText(workTitle)} close to revisit`)
    : t("이 인물의 생각을 책으로 오래 만나기", "Stay with this person's ideas in print");
  const coupang = COUPANG_BOOKS[p.id];
  const coupangLink = coupang
    ? `<a class="book-shop book-shop-coupang" href="${coupang.url}" target="_blank" rel="sponsored noopener noreferrer" data-network="coupang" data-content-id="${contentId}" data-placement="person-card-coupang">${t(coupang.labelKo, coupang.labelEn)} <span class="bs-amz">Coupang</span></a>`
    : "";
  const coupangDisclosure = coupang ? `<p class="affiliate-note">${t(COUPANG_DISCLOSURE_KO, COUPANG_DISCLOSURE_EN)}</p>` : "";
  return `<div class="book-affiliate book-shop-list"><div class="book-shop-row"><a class="book-shop" href="${url}" target="_blank" rel="sponsored noopener noreferrer" data-network="amazon" data-content-id="${contentId}" data-placement="person-card">`
    + `${label} <span class="bs-amz">Amazon</span></a>${coupangLink}</div>`
    + `<p class="region-hint book-disclosure affiliate-note">${t("제휴 링크입니다. 적격 구매 시 수수료가 사이트 운영에 쓰이며, 가격은 동일합니다. 저작 정보와 순위에는 영향을 주지 않습니다.", "Affiliate link. As an Amazon Associate, Sage Scroll may earn from qualifying purchases at no extra cost. Links do not affect editorial information.")}</p>${coupangDisclosure}</div>`;
}
function readingGearLinks(p) {
  const contentId = String(p.id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "unknown";
  // 헌장 6-1-5: 아이템당 쿠팡 최대 2개 — 배열 상위 2개(독서대·이북리더기)만 노출
  const cards = COUPANG_READING_GEAR.slice(0, 2).map((item) => `<article class="reading-gear-card"><p class="reading-gear-name">${t(item.nameKo, item.nameEn)}</p><p class="reading-gear-benefit">${t(item.benefitKo, item.benefitEn)}</p><a class="book-shop book-shop-coupang" href="${item.url}" target="_blank" rel="sponsored noopener noreferrer" data-network="coupang" data-content-id="${contentId}-${item.id}" data-placement="person-card-reading-gear">${t(item.ctaKo, item.ctaEn)} <span class="bs-amz">Coupang</span></a></article>`).join("");
  return `<div class="reading-gear"><p class="reading-gear-kicker">${t("독서의 시간을 더 편안하게", "Make reading time more comfortable")}</p><h4>${t("책을 사는 순간보다, 오래 읽는 시간을 준비하세요", "Prepare for the time you will actually spend reading")}</h4><div class="reading-gear-grid">${cards}</div><p class="affiliate-note">${t(COUPANG_DISCLOSURE_KO, COUPANG_DISCLOSURE_EN)}</p></div>`;
}

window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};
document.addEventListener("click", function (event) {
  const link = event.target.closest("a.book-shop[data-content-id]");
  if (!link) return;
  window.va("event", {
    name: "affiliate_click",
    data: {
      network: link.dataset.network || "amazon",
      content_id: link.dataset.contentId || "unknown",
      placement: link.dataset.placement || "person-card",
    },
  });
});

const map = L.map("map", {
  zoomControl: true, scrollWheelZoom: true,
  zoomSnap: 0.5, zoomDelta: 0.5, wheelPxPerZoomLevel: 130,
}).setView(KOREA_CENTER, 6);

// 차분한 editorial 베이스맵 (Carto Positron — 무료·키 불필요, 지도는 물러나고 데이터가 튐)
// noWrap + maxBounds — 초광폭 화면에서 세계지도가 3번 반복되던 것 차단(비율 어색함의 주범)
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd", maxZoom: 19, noWrap: true,
  // bounds: 세계 밖 좌표(z0의 x=-1 등)까지 타일을 요청해 CARTO가 400을 뱉던 것을 차단.
  // noWrap 만으로는 초저줌·초광폭에서 가장자리 타일 요청이 남는다.
  bounds: [[-85.06, -180], [85.06, 180]],
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);
map.setMaxBounds([[-85, -180], [85, 180]]);

const placeIndex = {};
const personMarkers = {};
const personChips = {};
const personById = {};
let activePersonId = null;
let currentPerson = null;
let allPeople = [];
let activeRegion = "all";
let activeEra = "all";
let activeField = "all";
let allBounds = [];
let routeLayer = null;

// 신뢰 관련 플래그만 조용히 노출(좌표 출처 등 메타 노이즈는 숨김)
const TRUST_FLAGS = {
  "wiki-only": ["위키 단독", "Wikipedia only"],
  "birthplace-disputed": ["출생지 이설", "birthplace disputed"],
  "birthplace-presumed": ["출생지 추정", "birthplace presumed"],
  "birthplace-traditional": ["출생지 전승", "birthplace by tradition"],
  "authorship-disputed": ["저자 이설", "authorship disputed"],
  "authorship-traditional": ["전통적 귀속", "traditional attribution"],
  "death-disputed": ["사망 이설", "death disputed"],
  "deathyear-disputed": ["몰년 이설", "death year disputed"],
  "birthdate-variant": ["생일 이설", "birth date varies"],
  "year-approx": ["연도 근사", "approx. date"],
  "grave-unknown": ["묘소 미상", "grave unknown"],
  "overseas": ["국외", "overseas"],
  "coords-approx": ["좌표 근사(도시 중심)", "approx. location (city centroid)"],
};

const PERSON_CATS = [
  { key: "thought", ko: "사상·학문", en: "Thinkers" },
  { key: "tech", ko: "기술·컴퓨팅", en: "Technology" },
  { key: "poet", ko: "시인", en: "Poets" },
  { key: "prose", ko: "소설·극", en: "Fiction & Drama" },
  { key: "art", ko: "예술", en: "Arts" },
  { key: "icon", ko: "국민 위인", en: "National Figures" },
];
function categoryOf(field) {
  const f = field || "";
  // 기술·컴퓨팅 — 컴퓨팅 특화 용어만(발명가/공학 단독은 제외해 다빈치 등 오분류 방지)
  if (/컴퓨터|반도체|소프트웨어|인공지능|컴퓨팅|전산|로보틱스|프로그래|마이크로프로세서|월드와이드웹|GPU/.test(f)) return "tech";
  const lead = f.split(/[·,(]/)[0]; // 첫(주된) 역할로 판정
  if (/국왕|군주|무신|장군|왕|대통령|정치|혁명|민족운동|반아파르트헤이트|독립운동/.test(lead)) return "icon";
  if (/작곡|음악|피아니스트|화가|미술|조각|서예|금석/.test(lead)) return "art";
  if (/실학|철학|성리|유학|사학|사상|학자|법학|박물|과학|여행가|탐험/.test(lead)) return "thought";
  if (/소설|극작|동화|수필/.test(lead)) return "prose";
  if (/시인|시조시인|하이쿠/.test(lead)) return "poet";
  // 선두가 '작가' 등 모호하면 전체 문자열로 보조 판정
  if (/소설|극작|동화|수필|작가/.test(f)) return "prose";
  if (/시인/.test(f)) return "poet";
  if (/화가|서예|미술|작곡/.test(f)) return "art";
  if (/철학|사상|학자/.test(f)) return "thought";
  return "prose";
}

function fmtYear(y) {
  if (y == null) return "?";
  if (y < 0) return t(`기원전 ${-y}`, `${-y} BCE`);
  return `${y}`;
}

function nameOf(p) { return t(p.name_ko, p.name_en); }
function subNameOf(p) { return t(p.name_en, p.name_ko); }

function srcMark(url) {
  if (!url) return "";
  return ` <a class="src-mark" href="${url}" target="_blank" rel="noopener">${t("출처", "source")}</a>`;
}
function trustNote(flags) {
  if (!flags || !flags.length) return "";
  const ns = flags.map((f) => TRUST_FLAGS[f]).filter(Boolean).map((pair) => t(pair[0], pair[1]));
  return ns.length ? ` <span class="trust-note">${ns.join(" · ")}</span>` : "";
}

function pickHeroWork(p) { return (p.works || []).find((w) => w.quote) || null; }
// 인용문 아래 해석: KO 모드=한국어역(quote_ko), EN 모드=영어역(quote_en). 원문이 해당 언어면 비움.
function qTrans(q) { return LANG === "en" ? (q.quote_en || "") : (q.quote_ko || ""); }

function pinIcon(active) {
  return L.divIcon({
    className: "",
    html: `<div class="scroll-pin${active ? " active" : ""}"></div>`,
    iconSize: [17, 17], iconAnchor: [8.5, 8.5],
  });
}

function focusPlace(id) {
  const p = placeIndex[id];
  if (!p || p.lat == null) return;
  map.setView([p.lat, p.lng], 13, { animate: true });
  if (p.marker) p.marker.openPopup();
}

// 교류·영향 선 — 선택 인물과 관계 인물의 핀을 잇는 붉은 점선. 선택이 바뀌면 지운다.
let linkLines = null;
function drawLinkLines(p) {
  if (linkLines) { map.removeLayer(linkLines); linkLines = null; }
  const from = (personMarkers[p.id] || [])[0];
  if (!from || !p.links || !p.links.length) return;
  const lines = [];
  p.links.forEach((l) => {
    const to = (personMarkers[l.id] || [])[0];
    if (!to) return;
    lines.push(L.polyline([from.getLatLng(), to.getLatLng()], {
      color: "#b23a2c", weight: 2, opacity: 0.55, dashArray: "4 7", interactive: false,
    }));
  });
  if (lines.length) linkLines = L.layerGroup(lines).addTo(map);
}

function setActivePerson(p, fly) {
  if (activePersonId && personChips[activePersonId]) personChips[activePersonId].classList.remove("active");
  if (personChips[p.id]) personChips[p.id].classList.add("active");
  if (activePersonId && personMarkers[activePersonId]) personMarkers[activePersonId].forEach((m) => m.setIcon(pinIcon(false)));
  if (personMarkers[p.id]) personMarkers[p.id].forEach((m) => m.setIcon(pinIcon(true)));
  activePersonId = p.id;
  drawLinkLines(p);
  if (fly && personMarkers[p.id] && personMarkers[p.id].length) {
    const pts = personMarkers[p.id].map((m) => m.getLatLng());
    if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 9), { animate: true });
    else map.fitBounds(pts, { padding: [70, 70], maxZoom: 11, animate: true });
  }
}

function renderPerson(p, fly = true) {
  currentPerson = p;
  // 딥링크 동기화 — URL이 항상 현재 인물을 가리켜 그대로 공유 가능 (#p=<id>)
  try { history.replaceState(null, "", "#p=" + p.id); } catch (e) {}
  setActivePerson(p, fly);
  document.getElementById("panel-empty").hidden = true;
  const box = document.getElementById("panel-content");
  box.hidden = false;
  box.scrollTop = 0;

  const lifespan = [fmtYear(p.birth_year), fmtYear(p.death_year)].join("–");
  const verify = p.verified === false
    ? `<span class="person-verify unv">${t("미검증", "Unverified")}</span>`
    : `<span class="person-verify">${t("검증", "Verified")} ${p.source_grade || "?"}</span>`;

  const birth = p.birthplace || {};
  const birthAdmin = t(birth.admin, birth.admin_en);
  const birthLine = birthAdmin
    ? `<div class="person-birth">${t("출생지", "Born")} · ${birthAdmin}${trustNote(birth.flags)}</div>` : "";

  const hero = pickHeroWork(p);
  const heroHtml = hero
    ? `<blockquote class="hero-quote">
         <p class="hq-text">${hero.quote}</p>
         ${qTrans(hero) ? `<p class="hq-trans">${qTrans(hero)}</p>` : ""}
         <cite class="hq-cite">${t(hero.quote_source, hero.quote_source_en) || nameOf2(hero)}</cite>
       </blockquote>` : "";

  const timelineHtml = (p.timeline || []).map((tl) => {
    const clickable = tl.place_id && placeIndex[tl.place_id] && placeIndex[tl.place_id].lat != null;
    return `<li class="tl ${clickable ? "clickable" : ""}" ${clickable ? `data-place="${tl.place_id}"` : ""}>
      <span class="tl-year">${fmtYear(tl.year)}</span>
      <span class="tl-event">${t(tl.event, tl.event_en)}${clickable ? ` <span class="tl-pin"></span>` : ""}${srcMark(tl.source_url)}${trustNote(tl.flags)}</span>
    </li>`;
  }).join("") || `<div class="seg-empty">${t("기록 없음", "No records")}</div>`;

  const worksHtml = (p.works || []).map((w) => {
    const isHero = hero && w === hero;
    const q = w.quote && !isHero
      ? `<blockquote class="work-quote">${w.quote}${qTrans(w) ? `<span class="wq-trans">${qTrans(w)}</span>` : ""}${w.quote_source ? `<cite>${t(w.quote_source, w.quote_source_en)}</cite>` : ""}</blockquote>` : "";
    const img = w.image
      ? `<a class="work-img" href="${w.image.source_url}" target="_blank" rel="noopener" title="Wikimedia"><img src="${w.image.url}" alt="${t(w.title, w.title_en) || ""}" loading="lazy" onerror="this.parentElement.style.display='none'" /></a>` : "";
    return `<div class="work${img ? " has-img" : ""}">${img}<div class="work-main">
      <span class="work-title">${t(w.title, w.title_en)}</span>${w.year != null ? `<span class="work-year">${fmtYear(w.year)}</span>` : ""}
      ${w.note ? `<span class="work-note">${t(w.note, w.note_en)}</span>` : ""}${q}
      <span class="work-src">${srcMark(w.source_url)}${trustNote(w.flags)}</span>
    </div></div>`;
  }).join("") || `<div class="seg-empty">${t("기록 없음", "No records")}</div>`;

  // 교류·영향 — 위키데이터(P737·P1066 등) 기준, 데이터셋 안의 인물 쌍만. 사실 관계만 표기(가드레일).
  const REL_TAG = {
    student_of: ["스승", "teacher"],
    teacher_of: ["제자", "student"],
    influenced_by: ["영향 받음", "influenced by"],
    influenced: ["영향 줌", "influenced"],
    exchanged: ["교류", "exchanged"],
  };
  const linkChips = (p.links || []).map((l) => {
    const q2 = personById[l.id];
    if (!q2) return "";
    const tag = REL_TAG[l.rel] || ["관계", "related"];
    return `<button type="button" class="link-chip" data-person="${l.id}">
      <span class="lc-name">${nameOf(q2)}</span><span class="lc-rel">${t(tag[0], tag[1])}</span>
      <span class="lc-life">${fmtYear(q2.birth_year)}–${fmtYear(q2.death_year)}</span>${srcMark(l.source_url)}</button>`;
  }).join("");
  const linksSection = linkChips
    ? `<section class="seg"><h3 class="seg-title">${t("교류·영향", "Connections")}<span class="hint">${t("위키데이터 기준 · 지도에 붉은 선", "from Wikidata · red lines on the map")}</span></h3><div class="link-chips">${linkChips}</div></section>` : "";

  const placesHtml = (p.places || []).map((pl) => {
    const clickable = placeIndex[pl.id] && placeIndex[pl.id].lat != null;
    return `<div class="place ${clickable ? "clickable" : ""}" ${clickable ? `data-place="${pl.id}"` : ""}>
      <span class="place-name">${t(pl.name, pl.name_en)}</span><span class="place-type">${t(pl.type, pl.type_en) || ""}</span>${srcMark(pl.source_url)}${trustNote(pl.flags)}
    </div>`;
  }).join("") || `<div class="seg-empty">${t("검증된 연고 장소 없음", "No verified places")}</div>`;

  const portraitHtml = p.portrait
    ? `<figure class="person-portrait"><img src="${p.portrait.url}" alt="${nameOf(p)}" onerror="this.closest('.person-portrait').style.display='none'" /><figcaption><a href="${p.portrait.source_url}" target="_blank" rel="noopener">Wikimedia</a></figcaption></figure>` : "";

  box.innerHTML = `
    <article class="person">
      <header class="person-head">
        <div class="person-head-text">
          <h2 class="person-name">${nameOf(p)}${verify}</h2>
          <div class="person-en">${subNameOf(p)}</div>
          <div class="person-meta">${[t(p.field, p.field_en), lifespan].filter(Boolean).join(" · ")}</div>
          ${birthLine}
        </div>
        ${portraitHtml}
      </header>
      <div class="person-public-link"><a href="${LANG === "en" ? "/en" : ""}/person/${p.id}">${t("공유용 인물 페이지", "Shareable profile")} →</a></div>
      ${heroHtml}
      <section class="seg"><h3 class="seg-title">${t("생애", "Life")}<span class="hint">${t("누르면 지도가 그곳으로", "tap to move the map")}</span></h3><ol class="timeline">${timelineHtml}</ol></section>
      <section class="seg"><h3 class="seg-title">${t("저작", "Works")}<span class="hint">${t("사료 원문", "primary sources")}</span></h3>${worksHtml}${bookShopLink(p)}${readingGearLinks(p)}</section>
      ${linksSection}
      <section class="seg"><h3 class="seg-title">${t("연고 장소", "Places")}</h3>${placesHtml}</section>
    </article>`;
}
function nameOf2(w) { return t(w.title, w.title_en) || ""; }

function buildPersonIndex(people, container) {
  if (!container) return;
  container.innerHTML = "";
  const buckets = {};
  PERSON_CATS.forEach((c) => (buckets[c.key] = []));
  people.forEach((p) => buckets[categoryOf(p.field)].push(p));
  PERSON_CATS.forEach((c) => {
    if (!buckets[c.key].length) return;
    const grp = document.createElement("div");
    grp.className = "pgroup";
    const lab = document.createElement("span");
    lab.className = "pgroup-label";
    lab.textContent = t(c.ko, c.en);
    const chips = document.createElement("div");
    chips.className = "pgroup-chips";
    buckets[c.key].forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "person-chip";
      btn.textContent = nameOf(p);
      if (p.id === activePersonId) btn.classList.add("active");
      btn.addEventListener("click", () => renderPerson(p));
      personChips[p.id] = btn;
      chips.appendChild(btn);
    });
    grp.appendChild(lab);
    grp.appendChild(chips);
    container.appendChild(grp);
  });
}

// 지역(대륙) 내비게이션 — 63인을 한눈에 못 보니 지역으로 좁혀 보기
const REGIONS = [
  { key: "all", ko: "전체", en: "All" },
  { key: "korea", ko: "한국", en: "Korea" },
  { key: "eastasia", ko: "동아시아", en: "East Asia" },
  { key: "europe", ko: "유럽", en: "Europe" },
  { key: "westasia", ko: "서아시아", en: "West Asia" },
  { key: "southasia", ko: "남·동남아", en: "S/SE Asia" },
  { key: "africa", ko: "아프리카", en: "Africa" },
  { key: "americas", ko: "아메리카", en: "Americas" },
  { key: "oceania", ko: "오세아니아", en: "Oceania" },
];
const NATION_REGION = {
  KR: "korea", CN: "eastasia", JP: "eastasia", TW: "eastasia",
  GR: "europe", GB: "europe", DE: "europe", IT: "europe", RU: "europe", FR: "europe", ES: "europe", NL: "europe", IE: "europe", AT: "europe", PL: "europe", CZ: "europe", NO: "europe", DK: "europe", SE: "europe", PT: "europe", HU: "europe", FI: "europe", CH: "europe", BE: "europe", UA: "europe",
  TR: "westasia", IR: "westasia", LB: "westasia", UZ: "westasia",
  IN: "southasia", PK: "southasia", VN: "southasia", ID: "southasia", PH: "southasia", TH: "southasia",
  EG: "africa", NG: "africa", ZA: "africa", MA: "africa", SN: "africa", DZ: "africa", TN: "africa", ML: "africa",
  US: "americas", CL: "americas", AR: "americas", CO: "americas", MX: "americas", BR: "americas", CA: "americas", PE: "americas", CU: "americas", NI: "americas", VE: "americas",
  NZ: "oceania", AU: "oceania",
};
function regionOf(p) { return NATION_REGION[p.nation || "KR"] || "korea"; }

const ERAS = [
  { key: "all", ko: "전체 시대", en: "All eras" },
  { key: "ancient", ko: "고대", en: "Ancient" },
  { key: "medieval", ko: "중세", en: "Medieval" },
  { key: "earlymodern", ko: "근세", en: "Early Modern" },
  { key: "c1819", ko: "18–19세기", en: "18–19th c." },
  { key: "modern", ko: "근현대", en: "Modern" },
];
function eraOf(p) {
  const y = p.birth_year;
  if (y == null) return "modern";
  if (y < 600) return "ancient";
  if (y < 1400) return "medieval";
  if (y < 1700) return "earlymodern";
  if (y < 1880) return "c1819";
  return "modern";
}

function buildRegionTabs(container) {
  if (!container) return;
  container.innerHTML = "";
  REGIONS.forEach((r) => {
    const count = r.key === "all" ? allPeople.length : allPeople.filter((p) => regionOf(p) === r.key).length;
    if (r.key !== "all" && count === 0) return;
    const b = document.createElement("button");
    b.dataset.region = r.key;
    if (r.key === activeRegion) b.classList.add("on");
    b.innerHTML = `${t(r.ko, r.en)}<span class="rt-count">${count}</span>`;
    b.addEventListener("click", () => selectRegion(r.key));
    container.appendChild(b);
  });
}

function buildEraTabs(container) {
  if (!container) return;
  container.innerHTML = "";
  ERAS.forEach((e) => {
    const count = e.key === "all" ? allPeople.length : allPeople.filter((p) => eraOf(p) === e.key).length;
    if (e.key !== "all" && count === 0) return;
    const b = document.createElement("button");
    b.dataset.era = e.key;
    if (e.key === activeEra) b.classList.add("on");
    b.innerHTML = `${t(e.ko, e.en)}<span class="rt-count">${count}</span>`;
    b.addEventListener("click", () => selectEra(e.key));
    container.appendChild(b);
  });
}

function selectRegion(key, fly = true) {
  activeRegion = key;
  document.querySelectorAll("#region-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.region === key));
  refreshList(fly);
}

function selectEra(key, fly = true) {
  activeEra = key;
  document.querySelectorAll("#era-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.era === key));
  refreshList(fly);
}

function buildFieldTabs(container) {
  if (!container) return;
  container.innerHTML = "";
  const cats = [{ key: "all", ko: "전체 분야", en: "All fields" }, ...PERSON_CATS];
  cats.forEach((c) => {
    const count = c.key === "all" ? allPeople.length : allPeople.filter((p) => categoryOf(p.field) === c.key).length;
    if (c.key !== "all" && count === 0) return;
    const b = document.createElement("button");
    b.dataset.field = c.key;
    if (c.key === activeField) b.classList.add("on");
    b.innerHTML = `${t(c.ko, c.en)}<span class="rt-count">${count}</span>`;
    b.addEventListener("click", () => selectField(c.key));
    container.appendChild(b);
  });
}

function selectField(key, fly = true) {
  activeField = key;
  document.querySelectorAll("#field-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.field === key));
  refreshList(fly);
}

// 지역·시대·분야 세 축을 AND로 교차 필터링
function refreshList(fly = true) {
  const list = document.getElementById("person-list");
  if (!list) return;
  const people = allPeople.filter(
    (p) => (activeRegion === "all" || regionOf(p) === activeRegion) &&
           (activeEra === "all" || eraOf(p) === activeEra) &&
           (activeField === "all" || categoryOf(p.field) === activeField)
  );
  if (activeRegion === "all" && activeEra === "all" && activeField === "all") {
    list.innerHTML = `<div class="region-hint">${t("지역·시대·분야 탭으로 좁히거나, 지도의 핀·이름을 선택하세요.", "Narrow by region, era, or field, or select a pin or a name on the map.")}</div>`;
    if (fly && allBounds.length) map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 12, animate: true });
    return;
  }
  if (!people.length) {
    list.innerHTML = `<div class="region-hint">${t("해당하는 인물이 없습니다.", "No figures match these filters.")}</div>`;
    return;
  }
  buildPersonIndex(people, list);
  if (fly) {
    const pts = [];
    people.forEach((p) => (personMarkers[p.id] || []).forEach((m) => pts.push(m.getLatLng())));
    if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 7, animate: true });
  }
}

function addMarker(lat, lng, person, place) {
  const m = L.marker([lat, lng], { icon: pinIcon(false) }).addTo(map);
  // 접근성: 지도 마커는 키보드 포커스 대상이지만 이름이 없어 스크린리더가 못 읽었다(120개 무명 요소).
  const markerEl = m.getElement();
  if (markerEl) {
    markerEl.setAttribute("role", "button");
    markerEl.setAttribute("aria-label", nameOf(person));
  }
  m.bindPopup("");
  m.on("popupopen", () => {
    const label = place ? `${t(place.name, place.name_en)} · ${nameOf(person)}` : nameOf(person);
    m.setPopupContent(label);
  });
  m.on("click", () => renderPerson(person));
  (personMarkers[person.id] = personMarkers[person.id] || []).push(m);
  return m;
}

function updateStats(people, placeCount, verifiedCount) {
  document.getElementById("stat-people").textContent = `${t("인물", "Figures")} ${people.length}`;
  document.getElementById("stat-places").textContent = `${t("장소", "Places")} ${placeCount}`;
  document.getElementById("stat-verified").textContent = `${t("검증", "Verified")} ${verifiedCount}/${people.length}`;
}
let statCache = { placeCount: 0, verifiedCount: 0 };

function applyLanguage() {
  document.documentElement.classList.remove("lang-ko", "lang-en");
  document.documentElement.classList.add("lang-" + LANG);
  document.documentElement.lang = LANG;
  document.querySelectorAll(".lang-toggle button").forEach((b) => b.classList.toggle("on", b.dataset.lang === LANG));
  const si = document.getElementById("person-search");
  if (si) si.placeholder = t("인물 검색…", "Search figures…");
}
function setLang(lang) {
  LANG = lang;
  writeBtLang(lang);
  applyLanguage();
  updateStats(allPeople, statCache.placeCount, statCache.verifiedCount);
  buildRegionTabs(document.getElementById("region-tabs"));
  buildEraTabs(document.getElementById("era-tabs"));
  buildFieldTabs(document.getElementById("field-tabs"));
  refreshList(false);
  renderTodaySage();
  refreshMapRoster();
  if (currentPerson) renderPerson(currentPerson, false);
}

// 오늘의 인물 스트립 — 인자 없이 부르면 언어만 갱신(setLang 경로). 사실 필드만 표기(스펙 §1 가드레일).
let todaySagePerson = null;
function renderTodaySage(p) {
  if (p) todaySagePerson = p;
  const ts = todaySagePerson;
  const bar = document.getElementById("today-sage");
  const btn = document.getElementById("today-sage-btn");
  const meta = document.getElementById("today-sage-meta");
  if (!bar || !btn || !ts) return;
  btn.textContent = nameOf(ts);
  const birth = ts.birthplace || {};
  meta.textContent = [
    t(ts.field, ts.field_en),
    `${fmtYear(ts.birth_year)}–${fmtYear(ts.death_year)}`,
    t(birth.admin, birth.admin_en) || "",
  ].filter(Boolean).join(" · ");
  if (!btn.dataset.bound) {
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => renderPerson(todaySagePerson));
  }
  bar.hidden = false;
}

// 첫 방문 인트로 — 첫 화면이 빈 지도+필터뿐이라 생기는 즉시 이탈 대응.
// 오늘의 인물을 문 앞에서 바로 건네고, 재방문(localStorage)·딥링크 진입은 건너뛴다.
function wireIntro(today) {
  const box = document.getElementById("intro");
  if (!box || !today) return;
  try { if (localStorage.getItem("ss_intro") === "1") return; } catch (e) {}
  document.querySelectorAll(".intro-count").forEach((el) => (el.textContent = allPeople.length));
  document.getElementById("intro-today-name").textContent = nameOf(today);
  document.getElementById("intro-today-meta").textContent = [
    t(today.field, today.field_en),
    `${fmtYear(today.birth_year)}–${fmtYear(today.death_year)}`,
  ].filter(Boolean).join(" · ");
  document.getElementById("intro-today").hidden = false;
  const close = () => {
    box.hidden = true;
    try { localStorage.setItem("ss_intro", "1"); } catch (e) {}
  };
  document.getElementById("intro-open").addEventListener("click", () => {
    close();
    renderPerson(today);
    // 모바일은 패널이 지도 아래라 화면 밖 — 펼친 내용이 보이게 스크롤
    if (window.innerWidth <= 780) document.getElementById("panel").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("intro-skip").addEventListener("click", close);
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  box.hidden = false;
}

// 인물 딥링크 — #p=<id> 해시에서 인물을 찾는다 (공유 링크 진입·hashchange용).
function personFromHash() {
  const m = (location.hash || "").match(/^#p=([\w-]+)/);
  return m ? allPeople.find((p) => p.id === m[1]) : null;
}

// 인물 검색 — 이름(한/영)·분야 부분일치 최대 10명. 선택 시 지도 이동 + 패널.
function wireSearch() {
  const input = document.getElementById("person-search");
  const results = document.getElementById("search-results");
  if (!input || !results) return;
  const close = () => { results.hidden = true; results.innerHTML = ""; };
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return close();
    const hits = allPeople.filter((p) =>
      (p.name_ko || "").toLowerCase().includes(q) ||
      (p.name_en || "").toLowerCase().includes(q) ||
      (p.field || "").toLowerCase().includes(q) ||
      (p.field_en || "").toLowerCase().includes(q)
    ).slice(0, 10);
    results.innerHTML = hits.length
      ? hits.map((p) =>
          `<button type="button" class="sr-item" data-person="${p.id}">${nameOf(p)}` +
          `<span class="sr-sub">${[t(p.field, p.field_en), `${fmtYear(p.birth_year)}–${fmtYear(p.death_year)}`].filter(Boolean).join(" · ")}</span></button>`
        ).join("")
      : `<div class="sr-empty">${t("결과 없음", "No matches")}</div>`;
    results.hidden = false;
  });
  results.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-person]");
    if (!btn) return;
    const p = allPeople.find((x) => x.id === btn.getAttribute("data-person"));
    if (p) { renderPerson(p); input.value = ""; close(); }
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { input.value = ""; close(); input.blur(); } });
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav-search")) close(); });
}

// 핀 옆 이름 라벨 — 화면 안 인물이 적을 때만 켠다(밀집 지역 겹침 방지). 언어 전환 시 내용 갱신.
const PIN_LABEL_MAX = 18;
function updatePinLabels(inView) {
  const show = new Set(inView.length <= PIN_LABEL_MAX ? inView.map((p) => p.id) : []);
  allPeople.forEach((p) => {
    const m = (personMarkers[p.id] || [])[0];
    if (!m) return;
    if (show.has(p.id)) {
      if (m.getTooltip()) m.setTooltipContent(nameOf(p));
      else m.bindTooltip(nameOf(p), { permanent: true, direction: "right", offset: [9, 0], className: "pin-label", interactive: false });
    } else if (m.getTooltip()) {
      m.unbindTooltip();
    }
  });
}

// 시야 연동 인물 리스트 — 지도를 움직일 때마다 현재 화면 안에 마커가 있는 인물을 갱신해 보여준다.
function refreshMapRoster() {
  const box = document.getElementById("map-roster");
  if (!box || !allPeople.length) return;
  const b = map.getBounds();
  const inView = allPeople.filter((p) => (personMarkers[p.id] || []).some((m) => m && b.contains(m.getLatLng())));
  updatePinLabels(inView);
  if (!inView.length) { box.hidden = true; return; }
  inView.sort((x, y) => (x.birth_year ?? 9999) - (y.birth_year ?? 9999));
  // 전원을 여러 줄 박스로 한 번에(스크롤 없이). 인원이 많으면 연도를 생략해 칩을 컴팩트하게.
  const showLife = inView.length <= 25;
  box.innerHTML =
    `<div class="mr-title">${t("이 지도 안의 인물", "In this view")} <span class="mr-count">${inView.length}</span></div>` +
    inView.map((p) =>
      `<button type="button" class="mr-item${p.id === activePersonId ? " on" : ""}" data-person="${p.id}">` +
      `${nameOf(p)}${showLife ? `<span class="mr-life">${fmtYear(p.birth_year)}–${fmtYear(p.death_year)}</span>` : ""}</button>`
    ).join("");
  box.hidden = false;
}

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) { console.error("load failed:", path, e); return null; }
}

async function init() {
  applyLanguage();
  document.querySelectorAll(".lang-toggle button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang)));

  const peopleData = await loadJSON("data/people.json");
  const routesData = await loadJSON("data/routes.json");
  const people = (peopleData && peopleData.people) || [];
  allPeople = people;
  const bounds = [];
  let placeCount = 0, verifiedCount = 0;

  people.forEach((p) => {
    personById[p.id] = p;
    if (p.verified !== false) verifiedCount++;
    let hasMarker = false; // 한 인물당 마커 1개 (첫 좌표 장소)
    (p.places || []).forEach((pl) => {
      placeCount++;
      if (pl.lat != null && pl.lng != null) {
        bounds.push([pl.lat, pl.lng]);
        const m = hasMarker ? null : addMarker(pl.lat, pl.lng, p, pl);
        if (m) hasMarker = true;
        placeIndex[pl.id] = { ...pl, marker: m, person: p };
      }
    });
    // 장소 마커가 하나도 없으면 출생지 좌표로 대신 — 좌표 있는 인물이 지도에서 안 보이는 문제 방지
    // (테크 선구자 16인이 places 없이 birthplace 좌표만 갖고 있던 케이스).
    const b = p.birthplace;
    if (!hasMarker && b && b.lat != null && b.lng != null) {
      bounds.push([b.lat, b.lng]);
      const m = addMarker(b.lat, b.lng, p, { name: "출생지", name_en: "Birthplace" });
      placeIndex[`${p.id}-birth`] = { id: `${p.id}-birth`, lat: b.lat, lng: b.lng, name: b.admin, marker: m, person: p };
    }
  });

  statCache = { placeCount, verifiedCount };
  allBounds = bounds;
  updateStats(people, placeCount, verifiedCount);
  buildRegionTabs(document.getElementById("region-tabs"));
  buildEraTabs(document.getElementById("era-tabs"));
  buildFieldTabs(document.getElementById("field-tabs"));
  refreshList(false);
  if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

  document.getElementById("panel-content").addEventListener("click", (e) => {
    if (e.target.closest(".src-mark")) return;
    const pb = e.target.closest("[data-person]");
    if (pb) { const q = personById[pb.getAttribute("data-person")]; if (q) renderPerson(q); return; }
    const el = e.target.closest("[data-place]");
    if (el) focusPlace(el.getAttribute("data-place"));
  });

  const routes = (routesData && routesData.routes) || [];
  const picker = document.querySelector(".route-picker");
  if (!routes.length && picker) picker.style.display = "none";

  // 시야 연동 인물 리스트 — 지도 이동/줌 때마다 갱신, 클릭하면 시점 유지한 채 패널 표시.
  map.on("moveend", refreshMapRoster);
  const roster = document.getElementById("map-roster");
  if (roster) {
    roster.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-person]");
      if (!btn) return;
      const p = allPeople.find((x) => x.id === btn.getAttribute("data-person"));
      if (p) { renderPerson(p, false); refreshMapRoster(); }
    });
  }
  refreshMapRoster();

  // 오늘의 인물 — KST 날짜수 % 인물수로 결정적 로테이션. 매일 KST 자정 교체, 서버 불필요.
  // 인물이 늘면 주기도 자연히 늘어난다. 첫 화면 패널도 오늘의 인물로 연다.
  let todaySage = null;
  if (people.length) {
    const kstDay = Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000);
    todaySage = people[kstDay % people.length];
    renderTodaySage(todaySage);
  }
  // 검색 + 딥링크 — 공유 링크(#p=id)로 들어오면 그 인물을 바로 연다(오늘의 인물보다 우선).
  wireSearch();
  window.addEventListener("hashchange", () => {
    const p = personFromHash();
    if (p && p !== currentPerson) renderPerson(p);
  });
  const linked = personFromHash();
  if (linked) renderPerson(linked);
  else if (todaySage) renderPerson(todaySage, false);
  else if (people.length) renderPerson(people[0], false);
  if (!linked) wireIntro(todaySage);
}

init();
