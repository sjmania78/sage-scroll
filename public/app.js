// 위인 고향도시 아틀라스 — 검증 MVP (파일럿: 취푸/공자)
// 생애 지도: 검증된 생애 연표를 장소에 매핑. 평가·교훈 생성 없음 — 사실 + 출처만 렌더.

const CITY_CENTER = [36.5, 127.8]; // 한국 중앙. 데이터 좌표로 자동 fit됨
const map = L.map("map", { zoomControl: true }).setView(CITY_CENTER, 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const gradeClass = (g) => (g === "A" ? "a" : g === "B" ? "b" : "c");
const placeIndex = {}; // place.id -> { lat, lng, name, marker, person }
let routeLayer = null;

function fmtYear(y) {
  if (y == null) return "?";
  return y < 0 ? `기원전 ${-y}` : `${y}`;
}

function pinIcon(grade) {
  return L.divIcon({
    className: "",
    html: `<div class="atlas-pin ${gradeClass(grade)}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function srcLink(url, grade) {
  if (!url) return `<span class="badge unverified">출처 없음</span>`;
  return `<span class="src"><a href="${url}" target="_blank" rel="noopener">출처</a></span>`
       + `<span class="badge ${gradeClass(grade)}">${grade || "C"}</span>`;
}

function flagBadges(flags) {
  if (!flags || !flags.length) return "";
  const label = {
    "wiki-only": "위키 단독·미검증",
    "coords-unverified": "좌표 미확인",
    "coords-osm": "좌표: OSM 지오코딩",
    "coords-kakao": "좌표: 카카오 지오코딩",
    "birthplace-disputed": "출생지 논쟁",
    "birthplace-traditional": "출생지 전승",
    "authorship-disputed": "저자 논쟁",
    "near-qufu-outside-city": "취푸 인근(시外)",
  };
  return flags.map((f) => `<span class="badge flag">${label[f] || f}</span>`).join("");
}

// 생애 지도: 연표 항목 클릭 → 지도가 해당 장소로 이동
function focusPlace(id) {
  const p = placeIndex[id];
  if (!p || p.lat == null) return;
  map.setView([p.lat, p.lng], 15);
  if (p.marker) p.marker.openPopup();
}

function renderPerson(p) {
  document.getElementById("panel-empty").hidden = true;
  const box = document.getElementById("panel-content");
  box.hidden = false;

  const verifiedBadge = p.verified === false
    ? `<span class="badge unverified">미검증</span>`
    : `<span class="badge ${gradeClass(p.source_grade)}">${p.source_grade || "C"}</span>`;
  const lifespan = [fmtYear(p.birth_year), fmtYear(p.death_year)].join(" – ");

  const birth = p.birthplace || {};
  const birthHtml = `
    <div class="place-item">
      <strong>${birth.admin || "출생지"}</strong> <span class="place-type">· 출생지</span>
      ${birth.lat == null ? `<span class="badge flag">좌표 미확인</span>` : ""}
      <div>${srcLink(birth.source_url, birth.source_grade)} ${flagBadges(birth.flags)}</div>
    </div>`;

  const timelineHtml = (p.timeline || []).map((t) => {
    const clickable = t.place_id && placeIndex[t.place_id] && placeIndex[t.place_id].lat != null;
    return `<li class="tl ${clickable ? "clickable" : ""}" ${clickable ? `data-place="${t.place_id}"` : ""}>
      <span class="tl-year">${fmtYear(t.year)}</span>
      <div class="tl-body">
        <span class="tl-event">${t.event}${clickable ? ` <span class="tl-pin">📍</span>` : ""}</span>
        <span class="tl-src">${srcLink(t.source_url, t.source_grade)} ${flagBadges(t.flags)}</span>
      </div>
    </li>`;
  }).join("") || `<div class="panel-empty">등록된 연표 없음</div>`;

  const placesHtml = (p.places || []).map((pl) => `
    <div class="place-item">
      <strong>${pl.name}</strong> <span class="place-type">· ${pl.type || "장소"}</span>
      ${pl.lat == null ? `<span class="badge flag">좌표 미확인</span>` : ""}
      <div>${srcLink(pl.source_url, pl.source_grade)} ${flagBadges(pl.flags)}</div>
    </div>`).join("") || `<div class="panel-empty">등록된 연고 장소 없음</div>`;

  const worksHtml = (p.works || []).map((w) => `
    <div class="work-item">
      <strong>${w.title}</strong> <span class="work-year">${w.year != null ? `(${fmtYear(w.year)})` : ""}</span>
      ${w.note ? `<span class="work-note">${w.note}</span>` : ""}
      ${w.quote ? `<blockquote class="src-quote">${w.quote}${w.quote_source ? `<cite>— ${w.quote_source}</cite>` : ""}</blockquote>` : ""}
      ${w.source_url ? `<div>${srcLink(w.source_url, w.source_grade)} ${flagBadges(w.flags)}</div>` : ""}
    </div>`).join("") || `<div class="panel-empty">등록된 저작 없음</div>`;

  box.innerHTML = `
    <h2 class="person-name">${p.name_ko} ${verifiedBadge}</h2>
    <div class="person-en">${p.name_en || ""}</div>
    <div class="person-meta">${[p.field, lifespan].filter(Boolean).join(" · ")}</div>
    ${flagBadges(p.flags)}
    <div class="section-title">출생지</div>
    ${birthHtml}
    <div class="section-title">생애 연표 <span class="hint">📍를 누르면 지도가 그 장소로 이동</span></div>
    <ol class="timeline">${timelineHtml}</ol>
    <div class="section-title">연고 장소</div>
    ${placesHtml}
    <div class="section-title">저작 <span class="hint">전통적 귀속 · 사료 인용</span></div>
    ${worksHtml}
  `;
}

function addMarker(lat, lng, grade, person, label) {
  const m = L.marker([lat, lng], { icon: pinIcon(grade) }).addTo(map);
  if (label) m.bindPopup(label);
  m.on("click", () => renderPerson(person));
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

  // 인물 선택 리스트 (좌측 위)
  const personList = document.getElementById("person-list");

  people.forEach((p, i) => {
    if (p.verified !== false) verifiedCount++;

    const b = p.birthplace;
    if (b && b.lat != null && b.lng != null) {
      const m = addMarker(b.lat, b.lng, b.source_grade || p.source_grade, p, `${p.name_ko} 출생지`);
      bounds.push([b.lat, b.lng]);
      placeIndex[`${p.id}-birth`] = { lat: b.lat, lng: b.lng, name: b.admin, marker: m, person: p };
    }
    (p.places || []).forEach((pl) => {
      placeCount++;
      if (pl.lat != null && pl.lng != null) {
        const m = addMarker(pl.lat, pl.lng, pl.source_grade || p.source_grade, p, `${pl.name} (${p.name_ko})`);
        bounds.push([pl.lat, pl.lng]);
        placeIndex[pl.id] = { ...pl, marker: m, person: p };
      }
    });

    if (personList) {
      const btn = document.createElement("button");
      btn.className = "person-chip";
      btn.textContent = p.name_ko;
      btn.addEventListener("click", () => renderPerson(p));
      personList.appendChild(btn);
    }
  });

  document.getElementById("stat-people").textContent = `인물 ${people.length}`;
  document.getElementById("stat-places").textContent = `장소 ${placeCount}`;
  document.getElementById("stat-verified").textContent = `검증 ${verifiedCount}/${people.length}`;
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

  // 생애 지도: 패널 연표 클릭 → 지도 연동 (이벤트 위임)
  document.getElementById("panel-content").addEventListener("click", (e) => {
    const li = e.target.closest("[data-place]");
    if (li) focusPlace(li.getAttribute("data-place"));
  });

  // 동선 (후순위 — 데이터 있을 때만 노출)
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
      routeLayer = L.polyline(pts, { color: "#4f9cf9", weight: 4, opacity: 0.8 }).addTo(map);
      map.fitBounds(pts, { padding: [50, 50] });
    }
  });

  // 첫 인물 자동 표시
  if (people.length) renderPerson(people[0]);
}

init();
