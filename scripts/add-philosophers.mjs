// data/philosophers-*.json 의 인물을 public/data/people.json 에 추가한다.
//
// 가드레일:
// - 좌표를 손으로 적지 않는다. birthplace.geo / places[].geo 를 OSM Nominatim 으로 지오코딩한 결과만 쓴다.
//   지오코딩이 실패하면 lat/lng 를 null 로 두고 coords-unverified 를 단다(지어내지 않는다).
// - 모든 source_url 을 실제로 호출해 404/410 이면 배포를 막는다. 403·429 는 확인 불가로 경고만 한다.
// - legacy 문장은 data/legacy.json 으로 옮겨 기존 파이프라인(merge-legacy.mjs)이 담당하게 한다.
//
// 실행: node scripts/add-philosophers.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PEOPLE = join(ROOT, "public", "data", "people.json");
const LEGACY = join(ROOT, "data", "legacy.json");
const SOURCES = ["philosophers-west.json", "philosophers-east.json", "philosophers-2.json"]
  .map((f) => join(ROOT, "data", f));
const DRY = process.argv.includes("--dry");
const UA = "SageScroll/1.0 (https://sage.bluetronai.com; contact@bluetronai.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkUrl(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.status === 404 || res.status === 410) return { ok: false, status: res.status };
    if (res.ok) return { ok: true, status: res.status };
    return { ok: null, status: res.status }; // 403/429 등 — 봇 차단일 수 있어 확인 불가로 둔다
  } catch (e) {
    return { ok: null, status: e.message };
  }
}

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: "json", limit: "1" })}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lon), display: rows[0].display_name };
  } catch {
    return null;
  }
}

const all = SOURCES.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).people);
const people = JSON.parse(readFileSync(PEOPLE, "utf8"));
const legacyFile = JSON.parse(readFileSync(LEGACY, "utf8"));

// 이미 들어간 인물은 건너뛴다 — 스크립트를 여러 번 돌려도 같은 결과가 되게(멱등).
const existing = new Set(people.people.map((p) => p.id));
const incoming = all.filter((p) => !existing.has(p.id));
const skipped = all.length - incoming.length;
if (skipped) console.log(`이미 있어 건너뜀: ${skipped}명`);
if (!incoming.length) { console.log("추가할 인물 없음"); process.exit(0); }

// ── 1. 출처 URL 실검증 ────────────────────────────────────────
const urls = new Set();
for (const p of incoming) {
  const add = (u) => u && urls.add(u);
  add(p.birthplace?.source_url);
  for (const x of p.timeline || []) add(x.source_url);
  for (const x of p.works || []) add(x.source_url);
  for (const x of p.places || []) add(x.source_url);
}
console.log(`출처 URL ${urls.size}개 확인 중...`);
const dead = [], unknown = [];
for (const u of urls) {
  const r = await checkUrl(u);
  if (r.ok === false) dead.push(`${u} (${r.status})`);
  else if (r.ok === null) unknown.push(`${u} (${r.status})`);
  await sleep(150);
}
if (dead.length) { console.error(`끊긴 출처 ${dead.length}건:\n  ${dead.join("\n  ")}`); process.exit(1); }
console.log(`  살아있음 ${urls.size - unknown.length}개 · 확인 불가(봇 차단 등) ${unknown.length}개`);
if (unknown.length) console.log(`  ${unknown.join("\n  ")}`);

// ── 2. 좌표 지오코딩 ──────────────────────────────────────────
let geoOk = 0, geoFail = 0;
for (const p of incoming) {
  const targets = [p.birthplace, ...(p.places || [])].filter((x) => x && x.geo);
  for (const t of targets) {
    const hit = await geocode(t.geo);
    if (hit) {
      t.lat = hit.lat; t.lng = hit.lng;
      t.flags = [...new Set([...(t.flags || []), "coords-osm"])];
      geoOk += 1;
      console.log(`  ${p.id}: ${t.geo} → ${hit.lat.toFixed(4)}, ${hit.lng.toFixed(4)}`);
    } else {
      t.lat = null; t.lng = null;
      t.flags = [...new Set([...(t.flags || []), "coords-unverified"])];
      geoFail += 1;
      console.log(`  ${p.id}: ${t.geo} → 실패(좌표 null)`);
    }
    delete t.geo;
    await sleep(1100); // Nominatim 이용 정책: 초당 1회 이하
  }
}
console.log(`지오코딩 성공 ${geoOk} · 실패 ${geoFail}`);

// ── 3. 레코드 정규화 + 병합 ───────────────────────────────────
const GRADE_RANK = { A: 3, B: 2, C: 1 };
for (const p of incoming) {
  // legacy 문장은 legacy.json 이 단일 원본
  if (p.legacy) { legacyFile.legacy[p.id] = { ko: p.legacy.ko, en: p.legacy.en }; delete p.legacy; }
  for (const x of [p.birthplace, ...(p.timeline || []), ...(p.works || []), ...(p.places || [])]) {
    if (x && !Array.isArray(x.flags)) x.flags = [];
  }
  p.flags = p.flags || [];
  if (p.verified === undefined) p.verified = true;
  // 인물 등급 = 보유 출처 중 최고 등급
  const grades = [p.birthplace, ...(p.timeline || []), ...(p.works || []), ...(p.places || [])]
    .filter((x) => x && x.source_grade).map((x) => x.source_grade);
  p.source_grade = grades.sort((a, b) => (GRADE_RANK[b] || 0) - (GRADE_RANK[a] || 0))[0] || "C";
  people.people.push(p);
}

if (DRY) { console.log(`[dry] ${incoming.length}명 추가 예정 (파일 안 씀)`); process.exit(0); }
writeFileSync(PEOPLE, JSON.stringify(people, null, 2) + "\n", "utf8");
writeFileSync(LEGACY, JSON.stringify(legacyFile, null, 2) + "\n", "utf8");
console.log(`추가 ${incoming.length}명 → 총 ${people.people.length}명`);
