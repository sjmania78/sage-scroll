// Sage Scroll — 한국(→동아시아) 지성의 생애 지도.
// 사실 + 그들의 말(사료)만 렌더. 평가·교훈 생성 없음(스펙 §1 가드레일).
// 레퍼런스: 차분한 베이스맵(데이터가 튐), 사료를 주인공으로, 생애↔장소 연동. ko/en 이중언어.

const KOREA_CENTER = [36.5, 127.9];

// ── 언어 ──
let LANG = (function () {
  try {
    const s = localStorage.getItem("ss_lang");
    if (s === "ko" || s === "en") return s;
    return (navigator.language || "ko").toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
  } catch (e) { return "ko"; }
})();
function t(ko, en) { return LANG === "en" && en ? en : ko; }

const map = L.map("map", {
  zoomControl: true, scrollWheelZoom: true,
  zoomSnap: 0.5, zoomDelta: 0.5, wheelPxPerZoomLevel: 130,
}).setView(KOREA_CENTER, 6);

// 차분한 editorial 베이스맵 (Carto Positron — 무료·키 불필요, 지도는 물러나고 데이터가 튐)
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd", maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

const placeIndex = {};
const personMarkers = {};
const personChips = {};
let activePersonId = null;
let currentPerson = null;
let allPeople = [];
let activeRegion = "all";
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
};

const PERSON_CATS = [
  { key: "thought", ko: "사상·학문", en: "Thinkers" },
  { key: "letters", ko: "시인·문인", en: "Poets & Writers" },
  { key: "art", ko: "화가·예술", en: "Artists" },
  { key: "icon", ko: "국민 위인", en: "National Figures" },
];
function categoryOf(field) {
  const f = field || "";
  if (/국왕|군주|무신|장군|왕$/.test(f)) return "icon";
  if (/실학|철학|성리|유학|사학|사상/.test(f)) return "thought";
  if (/화가|미술|조각|서예/.test(f)) return "art";
  return "letters";
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

function setActivePerson(p, fly) {
  if (activePersonId && personChips[activePersonId]) personChips[activePersonId].classList.remove("active");
  if (personChips[p.id]) personChips[p.id].classList.add("active");
  if (activePersonId && personMarkers[activePersonId]) personMarkers[activePersonId].forEach((m) => m.setIcon(pinIcon(false)));
  if (personMarkers[p.id]) personMarkers[p.id].forEach((m) => m.setIcon(pinIcon(true)));
  activePersonId = p.id;
  if (fly && personMarkers[p.id] && personMarkers[p.id].length) {
    const pts = personMarkers[p.id].map((m) => m.getLatLng());
    if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 9), { animate: true });
    else map.fitBounds(pts, { padding: [70, 70], maxZoom: 11, animate: true });
  }
}

function renderPerson(p, fly = true) {
  currentPerson = p;
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
      <span class="tl-event">${t(tl.event, tl.event_en)}${clickable ? ` <span class="tl-pin">📍</span>` : ""}${srcMark(tl.source_url)}${trustNote(tl.flags)}</span>
    </li>`;
  }).join("") || `<div class="seg-empty">${t("기록 없음", "No records")}</div>`;

  const worksHtml = (p.works || []).map((w) => {
    const isHero = hero && w === hero;
    const q = w.quote && !isHero
      ? `<blockquote class="work-quote">${w.quote}${qTrans(w) ? `<span class="wq-trans">${qTrans(w)}</span>` : ""}${w.quote_source ? `<cite>${t(w.quote_source, w.quote_source_en)}</cite>` : ""}</blockquote>` : "";
    return `<div class="work">
      <span class="work-title">${t(w.title, w.title_en)}</span>${w.year != null ? `<span class="work-year">${fmtYear(w.year)}</span>` : ""}
      ${w.note ? `<span class="work-note">${t(w.note, w.note_en)}</span>` : ""}${q}
      <span class="work-src">${srcMark(w.source_url)}${trustNote(w.flags)}</span>
    </div>`;
  }).join("") || `<div class="seg-empty">${t("기록 없음", "No records")}</div>`;

  const placesHtml = (p.places || []).map((pl) => {
    const clickable = placeIndex[pl.id] && placeIndex[pl.id].lat != null;
    return `<div class="place ${clickable ? "clickable" : ""}" ${clickable ? `data-place="${pl.id}"` : ""}>
      <span class="place-name">${t(pl.name, pl.name_en)}</span><span class="place-type">${t(pl.type, pl.type_en) || ""}</span>${srcMark(pl.source_url)}${trustNote(pl.flags)}
    </div>`;
  }).join("") || `<div class="seg-empty">${t("검증된 연고 장소 없음", "No verified places")}</div>`;

  box.innerHTML = `
    <article class="person">
      <header class="person-head">
        <h2 class="person-name">${nameOf(p)}${verify}</h2>
        <div class="person-en">${subNameOf(p)}</div>
        <div class="person-meta">${[t(p.field, p.field_en), lifespan].filter(Boolean).join(" · ")}</div>
        ${birthLine}
      </header>
      ${heroHtml}
      <section class="seg"><h3 class="seg-title">${t("생애", "Life")}<span class="hint">${t("📍 누르면 지도가 그곳으로", "📍 tap to move the map")}</span></h3><ol class="timeline">${timelineHtml}</ol></section>
      <section class="seg"><h3 class="seg-title">${t("저작", "Works")}<span class="hint">${t("사료 원문", "primary sources")}</span></h3>${worksHtml}</section>
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
  KR: "korea", CN: "eastasia", JP: "eastasia",
  GR: "europe", GB: "europe", DE: "europe", IT: "europe", RU: "europe", FR: "europe", ES: "europe", NL: "europe", IE: "europe", AT: "europe", PL: "europe", CZ: "europe", NO: "europe", DK: "europe", SE: "europe",
  TR: "westasia", IR: "westasia", LB: "westasia",
  IN: "southasia", PK: "southasia", VN: "southasia", ID: "southasia", PH: "southasia",
  EG: "africa", NG: "africa", ZA: "africa", MA: "africa",
  US: "americas", CL: "americas", AR: "americas", CO: "americas", MX: "americas", BR: "americas", CA: "americas",
  NZ: "oceania", AU: "oceania",
};
function regionOf(p) { return NATION_REGION[p.nation || "KR"] || "korea"; }

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

function selectRegion(key, fly = true) {
  activeRegion = key;
  document.querySelectorAll("#region-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.region === key));
  const list = document.getElementById("person-list");
  if (!list) return;
  if (key === "all") {
    list.innerHTML = `<div class="region-hint">${t("지역 탭을 누르거나, 지도의 핀·이름을 선택하세요.", "Pick a region tab, or select a pin or a name on the map.")}</div>`;
    if (fly && allBounds.length) map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 12, animate: true });
    return;
  }
  const people = allPeople.filter((p) => regionOf(p) === key);
  buildPersonIndex(people, list);
  if (fly) {
    const pts = [];
    people.forEach((p) => (personMarkers[p.id] || []).forEach((m) => pts.push(m.getLatLng())));
    if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 7, animate: true });
  }
}

function addMarker(lat, lng, person, place) {
  const m = L.marker([lat, lng], { icon: pinIcon(false) }).addTo(map);
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
}
function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem("ss_lang", lang); } catch (e) {}
  applyLanguage();
  updateStats(allPeople, statCache.placeCount, statCache.verifiedCount);
  buildRegionTabs(document.getElementById("region-tabs"));
  selectRegion(activeRegion, false);
  if (currentPerson) renderPerson(currentPerson, false);
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
  });

  statCache = { placeCount, verifiedCount };
  allBounds = bounds;
  updateStats(people, placeCount, verifiedCount);
  buildRegionTabs(document.getElementById("region-tabs"));
  selectRegion("all", false);
  if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

  document.getElementById("panel-content").addEventListener("click", (e) => {
    if (e.target.closest(".src-mark")) return;
    const el = e.target.closest("[data-place]");
    if (el) focusPlace(el.getAttribute("data-place"));
  });

  const routes = (routesData && routesData.routes) || [];
  const picker = document.querySelector(".route-picker");
  if (!routes.length && picker) picker.style.display = "none";

  if (people.length) renderPerson(people[0], false);
}

init();
