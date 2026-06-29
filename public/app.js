// Sage Scroll — 한국 지성의 생애 지도.
// 사실 + 그들의 말(사료)만 렌더. 평가·교훈 생성 없음(스펙 §1 가드레일).
// 레퍼런스 적용: 차분한 베이스맵(데이터가 튐), 사료를 주인공으로, 생애↔장소 연동.

const KOREA_CENTER = [36.4, 127.9];

const map = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: true,
  zoomSnap: 0.5,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 130, // 휠 줌 더 부드럽게
}).setView(KOREA_CENTER, 7);

// 차분한 editorial 베이스맵 (Carto Positron — 무료·키 불필요, Stamen 원리: 지도는 물러나고 데이터가 튐)
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd",
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

const placeIndex = {};      // place.id -> { lat, lng, marker, person }
const personMarkers = {};   // person.id -> [marker, ...]
const personChips = {};     // person.id -> chip element
let activePersonId = null;
let routeLayer = null;

// 화면에 조용히 surface할 신뢰 관련 플래그만 (좌표 출처 등 메타 노이즈는 의도적으로 숨김)
const TRUST_FLAGS = {
  "wiki-only": "위키 단독",
  "birthplace-disputed": "출생지 이설",
  "birthplace-presumed": "출생지 추정",
  "birthplace-traditional": "출생지 전승",
  "authorship-disputed": "저자 이설",
  "death-disputed": "사망 이설",
  "deathyear-disputed": "몰년 이설",
  "birthdate-variant": "생일 이설",
  "year-approx": "연도 근사",
};

function fmtYear(y) {
  if (y == null) return "?";
  return y < 0 ? `기원전 ${-y}` : `${y}`;
}

// 인물 인덱스: 분야별로 묶어 정리(가로 스크롤 제거)
const PERSON_CATS = [
  { key: "thought", label: "사상·학문" },
  { key: "letters", label: "시인·문인" },
  { key: "art", label: "화가·예술" },
  { key: "icon", label: "국민 위인" },
];
function categoryOf(field) {
  const f = field || "";
  if (/국왕|무신|장군/.test(f)) return "icon";
  if (/실학|철학|성리|유학|사학/.test(f)) return "thought";
  if (/화가|미술|조각/.test(f)) return "art";
  return "letters"; // 시인·소설·작가·극작 등
}
function buildPersonIndex(people, container) {
  if (!container) return;
  const buckets = {};
  PERSON_CATS.forEach((c) => (buckets[c.key] = []));
  people.forEach((p) => buckets[categoryOf(p.field)].push(p));
  PERSON_CATS.forEach((c) => {
    if (!buckets[c.key].length) return;
    const grp = document.createElement("div");
    grp.className = "pgroup";
    const lab = document.createElement("span");
    lab.className = "pgroup-label";
    lab.textContent = c.label;
    const chips = document.createElement("div");
    chips.className = "pgroup-chips";
    buckets[c.key].forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "person-chip";
      btn.textContent = p.name_ko;
      btn.addEventListener("click", () => renderPerson(p));
      personChips[p.id] = btn;
      chips.appendChild(btn);
    });
    grp.appendChild(lab);
    grp.appendChild(chips);
    container.appendChild(grp);
  });
}

function srcMark(url) {
  if (!url) return "";
  return ` <a class="src-mark" href="${url}" target="_blank" rel="noopener">출처</a>`;
}

function trustNote(flags) {
  if (!flags || !flags.length) return "";
  const ns = flags.map((f) => TRUST_FLAGS[f]).filter(Boolean);
  return ns.length ? ` <span class="trust-note">${ns.join(" · ")}</span>` : "";
}

function pickHeroWork(p) {
  return (p.works || []).find((w) => w.quote) || null;
}

function pinIcon(active) {
  return L.divIcon({
    className: "",
    html: `<div class="scroll-pin${active ? " active" : ""}"></div>`,
    iconSize: [17, 17],
    iconAnchor: [8.5, 8.5],
  });
}

// 생애 지도: 연표/장소 클릭 → 지도가 해당 장소로 이동
function focusPlace(id) {
  const p = placeIndex[id];
  if (!p || p.lat == null) return;
  map.setView([p.lat, p.lng], 14, { animate: true });
  if (p.marker) p.marker.openPopup();
}

// 인물 선택 → 칩·핀 활성화 + 지도를 그 사람의 자취로 이동
function setActivePerson(p, fly) {
  if (activePersonId && personChips[activePersonId]) personChips[activePersonId].classList.remove("active");
  if (personChips[p.id]) personChips[p.id].classList.add("active");

  if (activePersonId && personMarkers[activePersonId])
    personMarkers[activePersonId].forEach((m) => m.setIcon(pinIcon(false)));
  if (personMarkers[p.id]) personMarkers[p.id].forEach((m) => m.setIcon(pinIcon(true)));

  activePersonId = p.id;

  if (fly && personMarkers[p.id] && personMarkers[p.id].length) {
    const pts = personMarkers[p.id].map((m) => m.getLatLng());
    if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 10), { animate: true });
    else map.fitBounds(pts, { padding: [70, 70], maxZoom: 12, animate: true });
  }
}

function renderPerson(p, fly = true) {
  setActivePerson(p, fly);
  document.getElementById("panel-empty").hidden = true;
  const box = document.getElementById("panel-content");
  box.hidden = false;
  box.scrollTop = 0;

  const lifespan = [fmtYear(p.birth_year), fmtYear(p.death_year)].join("–");
  const verify =
    p.verified === false
      ? `<span class="person-verify unv">미검증</span>`
      : `<span class="person-verify">검증 ${p.source_grade || "?"}</span>`;

  const birth = p.birthplace || {};
  const birthLine = birth.admin
    ? `<div class="person-birth">출생지 · ${birth.admin}${trustNote(birth.flags)}</div>`
    : "";

  const hero = pickHeroWork(p);
  const heroHtml = hero
    ? `<blockquote class="hero-quote">
         <p class="hq-text">${hero.quote}</p>
         <cite class="hq-cite">${hero.quote_source || hero.title}</cite>
       </blockquote>`
    : "";

  const timelineHtml =
    (p.timeline || [])
      .map((t) => {
        const clickable = t.place_id && placeIndex[t.place_id] && placeIndex[t.place_id].lat != null;
        return `<li class="tl ${clickable ? "clickable" : ""}" ${clickable ? `data-place="${t.place_id}"` : ""}>
          <span class="tl-year">${fmtYear(t.year)}</span>
          <span class="tl-event">${t.event}${clickable ? ` <span class="tl-pin">📍</span>` : ""}${srcMark(t.source_url)}${trustNote(t.flags)}</span>
        </li>`;
      })
      .join("") || `<div class="seg-empty">기록 없음</div>`;

  const worksHtml =
    (p.works || [])
      .map((w) => {
        const isHero = hero && w === hero;
        const q =
          w.quote && !isHero
            ? `<blockquote class="work-quote">${w.quote}${w.quote_source ? `<cite>${w.quote_source}</cite>` : ""}</blockquote>`
            : "";
        return `<div class="work">
          <span class="work-title">${w.title}</span>${w.year != null ? `<span class="work-year">${fmtYear(w.year)}</span>` : ""}
          ${w.note ? `<span class="work-note">${w.note}</span>` : ""}${q}
          <span class="work-src">${srcMark(w.source_url)}${trustNote(w.flags)}</span>
        </div>`;
      })
      .join("") || `<div class="seg-empty">기록 없음</div>`;

  const placesHtml =
    (p.places || [])
      .map((pl) => {
        const clickable = placeIndex[pl.id] && placeIndex[pl.id].lat != null;
        return `<div class="place ${clickable ? "clickable" : ""}" ${clickable ? `data-place="${pl.id}"` : ""}>
          <span class="place-name">${pl.name}</span><span class="place-type">${pl.type || ""}</span>${srcMark(pl.source_url)}${trustNote(pl.flags)}
        </div>`;
      })
      .join("") || `<div class="seg-empty">검증된 연고 장소 없음</div>`;

  box.innerHTML = `
    <article class="person">
      <header class="person-head">
        <h2 class="person-name">${p.name_ko}${verify}</h2>
        <div class="person-en">${p.name_en || ""}</div>
        <div class="person-meta">${[p.field, lifespan].filter(Boolean).join(" · ")}</div>
        ${birthLine}
      </header>
      ${heroHtml}
      <section class="seg"><h3 class="seg-title">생애<span class="hint">📍 누르면 지도가 그곳으로</span></h3><ol class="timeline">${timelineHtml}</ol></section>
      <section class="seg"><h3 class="seg-title">저작<span class="hint">사료 원문</span></h3>${worksHtml}</section>
      <section class="seg"><h3 class="seg-title">연고 장소</h3>${placesHtml}</section>
    </article>`;
}

function addMarker(lat, lng, person, label) {
  const m = L.marker([lat, lng], { icon: pinIcon(false) }).addTo(map);
  if (label) m.bindPopup(label);
  m.on("click", () => renderPerson(person));
  (personMarkers[person.id] = personMarkers[person.id] || []).push(m);
  return m;
}

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.error("load failed:", path, e);
    return null;
  }
}

async function init() {
  const peopleData = await loadJSON("data/people.json");
  const routesData = await loadJSON("data/routes.json");
  const people = (peopleData && peopleData.people) || [];
  const bounds = [];
  let placeCount = 0, verifiedCount = 0;

  const personList = document.getElementById("person-list");

  people.forEach((p) => {
    if (p.verified !== false) verifiedCount++;

    const b = p.birthplace;
    if (b && b.lat != null && b.lng != null) {
      const m = addMarker(b.lat, b.lng, p, `${p.name_ko} 출생지`);
      bounds.push([b.lat, b.lng]);
      placeIndex[`${p.id}-birth`] = { lat: b.lat, lng: b.lng, marker: m, person: p };
    }
    (p.places || []).forEach((pl) => {
      placeCount++;
      if (pl.lat != null && pl.lng != null) {
        const m = addMarker(pl.lat, pl.lng, p, `${pl.name} · ${p.name_ko}`);
        bounds.push([pl.lat, pl.lng]);
        placeIndex[pl.id] = { ...pl, marker: m, person: p };
      }
    });
  });

  buildPersonIndex(people, personList);

  document.getElementById("stat-people").textContent = `인물 ${people.length}`;
  document.getElementById("stat-places").textContent = `장소 ${placeCount}`;
  document.getElementById("stat-verified").textContent = `검증 ${verifiedCount}/${people.length}`;
  if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });

  // 패널 연표/장소 클릭 → 지도 연동 (이벤트 위임)
  document.getElementById("panel-content").addEventListener("click", (e) => {
    if (e.target.closest(".src-mark")) return; // 출처 링크는 그대로 열림
    const el = e.target.closest("[data-place]");
    if (el) focusPlace(el.getAttribute("data-place"));
  });

  // 동선 (후순위 — 데이터 있을 때만)
  const routes = (routesData && routesData.routes) || [];
  const picker = document.querySelector(".route-picker");
  if (!routes.length && picker) picker.style.display = "none";
  const select = document.getElementById("route-select");
  routes.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id; opt.textContent = r.name;
    select.appendChild(opt);
  });
  select.addEventListener("change", (e) => {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    const r = routes.find((x) => x.id === e.target.value);
    if (!r) return;
    const pts = (r.stops || []).map((id) => placeIndex[id]).filter((s) => s && s.lat != null).map((s) => [s.lat, s.lng]);
    if (pts.length >= 2) {
      routeLayer = L.polyline(pts, { color: "#b23a2c", weight: 3, opacity: 0.8, dashArray: "4 6" }).addTo(map);
      map.fitBounds(pts, { padding: [60, 60] });
    }
  });

  // 첫 인물 패널만 표시(지도는 전체 유지 — fly 안 함)
  if (people.length) renderPerson(people[0], false);
}

init();
