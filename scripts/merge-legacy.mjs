// data/legacy.json 의 "무엇을 남겼나" 문장을 public/data/people.json 에 병합한다.
// 문장은 편집부가 쓴 것이므로 flags 에 editorial-summary 를 박아 인용문과 구분한다.
// 참고 출처는 그 인물 레코드에 이미 있는 가장 높은 등급의 출처를 그대로 쓴다(새 출처를 지어내지 않는다).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PEOPLE = join(ROOT, "public", "data", "people.json");
const LEGACY = join(ROOT, "data", "legacy.json");

const GRADE_RANK = { A: 3, B: 2, C: 1 };

// 인물 레코드 안에서 가장 높은 등급의 출처 하나를 고른다.
function bestSource(p) {
  const cands = [
    p.birthplace,
    ...(p.timeline || []),
    ...(p.works || []),
    ...(p.places || []),
  ].filter((x) => x && x.source_url);
  if (!cands.length) return null;
  cands.sort((a, b) => (GRADE_RANK[b.source_grade] || 0) - (GRADE_RANK[a.source_grade] || 0));
  return { url: cands[0].source_url, grade: cands[0].source_grade || "C" };
}

const people = JSON.parse(readFileSync(PEOPLE, "utf8"));
const { legacy } = JSON.parse(readFileSync(LEGACY, "utf8"));

let merged = 0;
const missing = [];
for (const p of people.people) {
  const entry = legacy[p.id];
  if (!entry) { missing.push(p.id); continue; }
  const src = bestSource(p);
  p.legacy = {
    ko: entry.ko,
    en: entry.en,
    source_url: src ? src.url : null,
    source_grade: src ? src.grade : null,
    flags: ["editorial-summary"],
  };
  merged += 1;
}

const extra = Object.keys(legacy).filter((id) => !people.people.some((p) => p.id === id));

writeFileSync(PEOPLE, JSON.stringify(people, null, 2) + "\n", "utf8");
console.log(`병합 ${merged}/${people.people.length}명`);
if (missing.length) console.log(`문장 없음: ${missing.join(", ")}`);
if (extra.length) console.log(`레코드 없는 id: ${extra.join(", ")}`);
if (missing.length || extra.length) process.exit(1);
