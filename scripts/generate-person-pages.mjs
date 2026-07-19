import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "public");
const baseUrl = "https://sage.bluetronai.com";
const amazonTag = "sagescrolls-20";
const coupangDisclosureKo = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
const coupangDisclosureEn = "As part of the Coupang Partners program, this site earns a commission from qualifying purchases.";
const coupangBooks = {
  dostoevsky: {
    title: "죄와 벌",
    url: "https://link.coupang.com/a/fqsgNbrmWi",
  },
};
const coupangReadingGear = [
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
const { people } = JSON.parse(await readFile(resolve(publicDir, "data/people.json"), "utf8"));

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const absoluteSource = (value) => /^https:\/\//.test(value || "") ? value : null;
const year = (value, lang) => value == null ? "?" : value < 0 ? (lang === "en" ? `${-value} BCE` : `기원전 ${-value}`) : String(value);
const amazonBookUrl = (person, item) => {
  const title = item?.title_en || item?.title || "";
  const name = person.name_en || person.name_ko || "";
  const query = [title, name].filter(Boolean).join(" ") || `${name} books`;
  return `https://www.amazon.com/s?i=stripbooks&k=${encodeURIComponent(query)}&tag=${amazonTag}`;
};

function pageFor(person, lang) {
  const en = lang === "en";
  const name = en ? (person.name_en || person.name_ko) : person.name_ko;
  const field = en ? (person.field_en || person.field) : person.field;
  const path = en ? `/en/person/${person.id}` : `/person/${person.id}`;
  const otherPath = en ? `/person/${person.id}` : `/en/person/${person.id}`;
  const description = en
    ? `${name}: a sourced timeline, works, and associated places in Sage Scroll.`
    : `${name}의 생애·저작·연고 장소를 검증된 출처와 함께 정리한 Sage Scroll 인물 페이지입니다.`;
  const backPath = en ? `/en#p=${person.id}` : `/#p=${person.id}`;
  const sources = new Map();
  const addSource = (url, label) => { if (absoluteSource(url) && !sources.has(url)) sources.set(url, label); };
  addSource(person.birthplace?.source_url, en ? "Birthplace source" : "출생지 출처");
  for (const item of person.timeline || []) addSource(item.source_url, en ? "Timeline source" : "생애 출처");
  for (const item of person.works || []) addSource(item.source_url, en ? "Work source" : "저작 출처");
  for (const item of person.places || []) addSource(item.source_url, en ? "Place source" : "장소 출처");
  addSource(person.portrait?.source_url, "Wikimedia Commons");

  const timeline = (person.timeline || []).map((item) => {
    const text = en ? (item.event_en || item.event) : item.event;
    return `<li><time>${escapeHtml(year(item.year, lang))}</time><span>${escapeHtml(text)}</span>${absoluteSource(item.source_url) ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">${en ? "source" : "출처"}</a>` : ""}</li>`;
  }).join("");
  const works = (person.works || []).map((item) => {
    const title = en ? (item.title_en || item.title) : item.title;
    const note = en ? (item.note_en || item.note) : item.note;
    const coupang = coupangBooks[person.id];
    const coupangLink = coupang?.title === item.title
      ? `<a class="book-shop book-shop-coupang" href="${coupang.url}" target="_blank" rel="sponsored noopener noreferrer" data-content-id="${escapeHtml(person.id)}" data-placement="person-profile-work-coupang">${en ? "2-volume Korean edition" : "『죄와 벌』 전2권 현재 가격 보기"} <span class="bs-amz">Coupang</span></a>`
      : "";
    return `<article><h3>${escapeHtml(title)}${item.year != null ? ` <small>${escapeHtml(year(item.year, lang))}</small>` : ""}</h3>${note ? `<p>${escapeHtml(note)}</p>` : ""}${absoluteSource(item.source_url) ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer">${en ? "Verify source" : "출처 확인"}</a>` : ""}<div class="book-shop-row"><a class="book-shop" href="${escapeHtml(amazonBookUrl(person, item))}" target="_blank" rel="sponsored noopener noreferrer" data-content-id="${escapeHtml(person.id)}" data-placement="person-profile-work">${en ? "Keep this work close to revisit" : "마음에 남은 책을 곁에 두고 다시 펼치기"} <span class="bs-amz">Amazon</span></a>${coupangLink}</div></article>`;
  }).join("");
  const hasCoupangBook = (person.works || []).some((item) => coupangBooks[person.id]?.title === item.title);
  const affiliateNote = works ? `<p class="affiliate-note">${en ? "As an Amazon Associate, Sage Scroll may earn from qualifying purchases. Shopping links are separate from sources and do not affect editorial information." : "Sage Scroll은 아마존 어소시에이트로서 적격 구매에서 수수료를 받을 수 있습니다. 쇼핑 링크는 근거 출처와 분리되며 저작 정보에 영향을 주지 않습니다."}</p>${hasCoupangBook ? `<p class="affiliate-note">${en ? coupangDisclosureEn : coupangDisclosureKo}</p>` : ""}` : "";
  const readingGear = `<div class="reading-gear"><p class="reading-gear-kicker">${en ? "MAKE READING TIME MORE COMFORTABLE" : "독서의 시간을 더 편안하게"}</p><h3>${en ? "Prepare for the time you will actually spend reading" : "책을 사는 순간보다, 오래 읽는 시간을 준비하세요"}</h3><div class="reading-gear-grid">${coupangReadingGear.slice(0, 2).map((item) => `<article class="reading-gear-card"><p class="reading-gear-name">${escapeHtml(en ? item.nameEn : item.nameKo)}</p><p class="reading-gear-benefit">${escapeHtml(en ? item.benefitEn : item.benefitKo)}</p><a class="book-shop book-shop-coupang" href="${item.url}" target="_blank" rel="sponsored noopener noreferrer" data-network="coupang" data-content-id="${escapeHtml(person.id)}-${item.id}" data-placement="person-profile-reading-gear">${escapeHtml(en ? item.ctaEn : item.ctaKo)} <span class="bs-amz">Coupang</span></a></article>`).join("")}</div><p class="affiliate-note">${en ? coupangDisclosureEn : coupangDisclosureKo}</p></div>`;
  const sourceList = [...sources].map(([url, label]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></li>`).join("");
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    alternateName: en ? person.name_ko : person.name_en,
    description,
    mainEntityOfPage: `${baseUrl}${path}`,
    image: absoluteSource(person.portrait?.url) || undefined,
  }).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="${en ? "en" : "ko"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(name)} — Sage Scroll</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${baseUrl}${path}"><link rel="alternate" hreflang="ko-KR" href="${baseUrl}/person/${person.id}"><link rel="alternate" hreflang="en" href="${baseUrl}/en/person/${person.id}"><link rel="alternate" hreflang="x-default" href="${baseUrl}/person/${person.id}">
<meta property="og:type" content="profile"><meta property="og:url" content="${baseUrl}${path}"><meta property="og:site_name" content="Sage Scroll"><meta property="og:title" content="${escapeHtml(name)} — Sage Scroll"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${baseUrl}/og.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(name)} — Sage Scroll"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${baseUrl}/og.png">
<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/style.css"><script type="application/ld+json">${jsonLd}</script><script defer src="/_vercel/insights/script.js"></script></head>
<body class="profile-page"><main class="profile-shell"><nav><a href="${backPath}">← ${en ? "Open on the map" : "지도에서 보기"}</a><a href="${otherPath}">${en ? "한국어" : "English"}</a></nav>
<header class="profile-hero">${person.portrait?.url ? `<img src="${escapeHtml(person.portrait.url)}" alt="${escapeHtml(name)}" onerror="this.remove()">` : ""}<div><p>Sage Scroll · ${person.verified === false ? (en ? "Unverified" : "미검증") : (en ? "Verified sources" : "출처 검증")}</p><h1>${escapeHtml(name)}</h1>${en && person.name_ko ? `<div class="profile-alt">${escapeHtml(person.name_ko)}</div>` : (!en && person.name_en ? `<div class="profile-alt">${escapeHtml(person.name_en)}</div>` : "")}<strong>${escapeHtml(field || "")} · ${escapeHtml(year(person.birth_year, lang))}–${escapeHtml(year(person.death_year, lang))}</strong></div></header>
<div class="profile-actions"><a href="${backPath}">${en ? "Explore places on the map" : "지도에서 연고지 보기"}</a><button type="button" id="share-profile">${en ? "Share" : "공유하기"}</button></div>
<section class="profile-section"><h2>${en ? "Life" : "생애"}</h2><ol class="profile-timeline">${timeline}</ol></section>
<section class="profile-section"><h2>${en ? "Works" : "저작"}</h2><div class="profile-works">${works}</div>${affiliateNote}${readingGear}</section>
<section class="profile-section"><h2>${en ? "Sources" : "근거 출처"}</h2><ul class="profile-sources">${sourceList}</ul><p class="profile-note">${en ? "Facts are shown with their recorded sources; this page does not rank or evaluate the person." : "사실은 기록된 출처와 함께 표시하며, 인물을 순위화하거나 평가하지 않습니다."}</p></section>
</main><script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};document.addEventListener("click",event=>{const link=event.target.closest("a.book-shop[data-content-id]");if(link)window.va("event",{name:"affiliate_click",data:{network:link.dataset.network||"amazon",content_id:(link.dataset.contentId||"unknown").slice(0,80),placement:link.dataset.placement||"person-profile-work"}})});document.getElementById("share-profile").addEventListener("click",async()=>{const u=new URL("${path}",location.origin);u.searchParams.set("utm_source","sage-scroll");u.searchParams.set("utm_medium","share");u.searchParams.set("utm_campaign","person_profile");try{if(navigator.share){await navigator.share({title:${JSON.stringify(name)},url:u.toString()})}else{await navigator.clipboard.writeText(u.toString());alert(${JSON.stringify(en ? "Share link copied." : "공유 링크를 복사했습니다.")})}}catch(e){}});</script></body></html>`;
}

for (const person of people) {
  for (const lang of ["ko", "en"]) {
    const file = resolve(publicDir, lang === "en" ? `en/person/${person.id}/index.html` : `person/${person.id}/index.html`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, pageFor(person, lang), "utf8");
  }
}

const entries = [
  { ko: `${baseUrl}/`, en: `${baseUrl}/en` },
  ...people.map((person) => ({ ko: `${baseUrl}/person/${person.id}`, en: `${baseUrl}/en/person/${person.id}` })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.flatMap(({ ko, en }) => [ko, en].map((loc) => `  <url><loc>${loc}</loc><xhtml:link rel="alternate" hreflang="ko-KR" href="${ko}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${ko}"/></url>`)).join("\n")}\n</urlset>\n`;
await writeFile(resolve(publicDir, "sitemap.xml"), sitemap, "utf8");

console.log(`Generated ${people.length * 2} person pages and ${entries.length * 2} sitemap URLs.`);
