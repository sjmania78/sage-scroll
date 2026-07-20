// 홈페이지에 크롤러가 읽을 수 있는 전체 인물 색인을 심는다.
//
// 왜 필요한가: 홈은 지도 중심 UI라 #person-list 를 app.js 가 채우고, 필터가
// 없을 때는 안내 문구로 덮어쓴다. 그 결과 서버가 내보내는 HTML 에는 인물
// 페이지로 가는 링크가 단 하나도 없었다(푸터 Bluetron 링크 제외).
// JS 를 실행하지 않는 크롤러는 120명 · 246페이지로 들어갈 통로를 찾지 못한다.
//
// 이 스크립트가 만드는 <section id="all-people"> 은 app.js 가 건드리지 않으므로
// 사람에게도 그대로 남는 색인이고, 크롤러에게는 정적 내부 링크가 된다.
//
// 실행: node scripts/generate-home-index.mjs
// Vercel 에 빌드 단계가 없으므로(outputDirectory: public) 결과 HTML 을 커밋해야 한다.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "public");

const START = "<!-- ALL-PEOPLE:START -->";
const END = "<!-- ALL-PEOPLE:END -->";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function lifespan(p) {
  const b = p.birth_year;
  const d = p.death_year;
  if (!b && !d) return "";
  return `${b ?? "?"}–${d ?? ""}`;
}

// 언어 전환(app.js setLang)은 페이지를 이동하지 않고 html 클래스만 바꾼다.
// 그래서 사이트 전체가 .ko/.en 두 벌을 함께 심어두는 방식을 쓴다. 여기도 따른다.
const bi = (koText, enText) =>
  `<span class="ko">${esc(koText)}</span><span class="en">${esc(enText)}</span>`;

function buildSection(people, lang) {
  const ko = lang === "ko";
  // href 는 이 파일의 로케일 고정 — ko 파일은 /person/, en 파일은 /en/person/.
  // 한 문서 안에 두 URL 을 함께 넣으면 크롤러에게 중복 링크가 된다.
  const base = ko ? "/person/" : "/en/person/";
  const koName = (p) => p.name_ko || p.name_en || p.id;
  const enName = (p) => p.name_en || p.name_ko || p.id;

  const sorted = [...people].sort((a, b) =>
    (ko ? koName(a) : enName(a)).localeCompare(
      ko ? koName(b) : enName(b),
      ko ? "ko" : "en",
    ),
  );

  const items = sorted
    .map((p) => {
      const years = lifespan(p);
      const metaKo = [p.field, years].filter(Boolean).join(" · ");
      const metaEn = [p.field_en, years].filter(Boolean).join(" · ");
      return (
        `      <li><a href="${base}${esc(p.id)}">${bi(koName(p), enName(p))}</a>` +
        (metaKo || metaEn
          ? `<span class="ap-meta">${bi(metaKo, metaEn)}</span>`
          : "") +
        `</li>`
      );
    })
    .join("\n");

  return [
    START,
    `  <section id="all-people" aria-labelledby="all-people-h">`,
    `    <h2 id="all-people-h">${bi(`전체 인물 ${sorted.length}명`, `All ${sorted.length} figures`)}</h2>`,
    `    <p class="ap-note">${bi("지도에서 찾기 어려우면 이름으로 바로 들어가세요.", "Prefer names to pins? Enter directly from here.")}</p>`,
    `    <ul class="ap-list">`,
    items,
    `    </ul>`,
    `  </section>`,
    `  ${END}`,
  ].join("\n");
}

function replaceBetween(html, block, file) {
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) {
    throw new Error(
      `${file}: ${START} / ${END} 마커를 찾지 못했습니다. 먼저 마커를 넣으세요.`,
    );
  }
  return html.slice(0, s) + block + html.slice(e + END.length);
}

// 푸터의 "인물 0 · 장소 0 · 검증 0" 은 하드코딩이라 크롤러가 0 으로 읽는다.
// app.js 가 나중에 갱신하지만, 첫 HTML 에 실제 숫자가 있어야 한다.
function fillStats(html, people, lang) {
  const ko = lang === "ko";
  const places = people.reduce(
    (n, p) => n + (Array.isArray(p.places) ? p.places.length : 0),
    0,
  );
  const verified = people.filter((p) => p.verified).length;
  const label = (koText, enText, n) => (ko ? `${koText} ${n}` : `${n} ${enText}`);
  return html
    .replace(
      /(<span id="stat-people">)[^<]*(<\/span>)/,
      `$1${label("인물", "figures", people.length)}$2`,
    )
    .replace(
      /(<span id="stat-places">)[^<]*(<\/span>)/,
      `$1${label("장소", "places", places)}$2`,
    )
    .replace(
      /(<span id="stat-verified">)[^<]*(<\/span>)/,
      `$1${label("검증", "verified", verified)}$2`,
    );
}

const raw = JSON.parse(
  await readFile(resolve(publicDir, "data/people.json"), "utf-8"),
);
const people = Array.isArray(raw) ? raw : raw.people;
if (!Array.isArray(people) || !people.length) {
  throw new Error("people.json 을 읽지 못했거나 비어 있습니다.");
}

for (const [file, lang] of [
  ["index.html", "ko"],
  ["en/index.html", "en"],
]) {
  const path = resolve(publicDir, file);
  let html = await readFile(path, "utf-8");
  html = replaceBetween(html, buildSection(people, lang), file);
  html = fillStats(html, people, lang);
  await writeFile(path, html, "utf-8");
  console.log(`[OK] ${file} — 인물 ${people.length}명 색인 반영`);
}
