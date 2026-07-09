# -*- coding: utf-8 -*-
"""Sage Scroll 데이터 보강 — 위키백과/위키데이터에서 (1) 인물 초상 (2) 저작 이미지 (3) 인물 간 영향 관계.

가드레일 준수:
- 모든 이미지·관계에 출처 URL을 함께 저장 (위키백과 문서/위키미디어 커먼즈 파일/위키데이터 항목).
- 동명이인 방지: 위키데이터 생년(P569)이 우리 데이터 생년과 ±3년 이내일 때만 채택. 불일치는 버리고 로그.
- 저작 이미지는 정확히 같은 제목의 문서가 있고 동음이의 문서가 아닐 때만 채택.

실행: python scripts/enrich.py            (people.json 갱신, .bak 백업 생성)
      python scripts/enrich.py --dry     (파일 안 쓰고 커버리지만 출력)
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(errors="replace")  # cp949 콘솔에서 특수문자 크래시 방지 (로켓 IPO 사고 교훈)

ROOT = Path(__file__).resolve().parents[1]
PEOPLE = ROOT / "public" / "data" / "people.json"
UA = {"User-Agent": "SageScroll/1.0 (https://sage.bluetronai.com; contact@bluetronai.com)"}
SLEEP = 0.06

# 동명이인 등으로 자동 매칭이 빗나가는 인물의 위키 문서명 수동 지정
MANUAL_TITLES = {
    "kim-yujeong": ("ko", "김유정 (소설가)"),
}

# 위키데이터 관계 속성 → (rel, 역방향 rel)
REL_PROPS = {
    "P737": ("influenced_by", "influenced"),   # ~에게 영향을 받음
    "P1066": ("student_of", "teacher_of"),     # ~의 제자
    "P184": ("student_of", "teacher_of"),      # 박사 지도교수
    "P802": ("teacher_of", "student_of"),      # 제자
    "P185": ("teacher_of", "student_of"),      # 박사 제자
}

# 위키데이터가 비어 있는(서양 편중) 동아시아·아시아 교류/영향 — 사료로 잘 문서화된 것만 큐레이션.
# (a, b, rel, source_url). rel=exchanged 는 상호 교류(대칭). 근거는 각 줄 주석 + 출처 URL.
CURATED_LINKS = [
    # 1558년 이이가 도산으로 이황을 찾아 사흘 문답, 이후 서신 왕래 지속 — 조선 유학사의 대표 교류
    ("yi-i", "yi-hwang", "exchanged", "https://ko.wikipedia.org/wiki/이이"),
    # 윤동주는 정지용 시의 깊은 영향 아래 습작(본인 스크랩·탐독), 정지용은 유고시집 서문을 씀
    ("yun-dongju", "jeong-jiyong", "influenced_by", "https://ko.wikipedia.org/wiki/윤동주"),
    # 이상·김유정 — 구인회 동인이자 절친, 1937년 보름 간격 요절 후 합동 추도식
    ("yi-sang", "kim-yujeong", "exchanged", "https://ko.wikipedia.org/wiki/김유정_(소설가)"),
    # 744년 낙양에서 만나 함께 유랑, 두보가 이백을 그리는 시 다수(춘일억이백 등)
    ("du-fu", "li-bai", "exchanged", "https://ko.wikipedia.org/wiki/두보"),
    # 타고르·간디 — 수십 년 서신·공개 논쟁·상호 존경('마하트마' 호칭 대중화)
    ("tagore", "gandhi", "exchanged", "https://en.wikipedia.org/wiki/Rabindranath_Tagore"),
    # 한용운 「님의 침묵」의 타고르 수용(김억 역 『기탄자리』 독서, 「타골의 시를 읽고」 화답시)
    ("han-yongun", "tagore", "influenced_by", "https://ko.wikipedia.org/wiki/님의_침묵"),
    # 김환기·이중섭 — 신사실파 동인(이중섭은 1953년 제3회전 참여)으로 함께 활동
    ("kim-whanki", "lee-jung-seop", "exchanged", "https://ko.wikipedia.org/wiki/이중섭"),
]


def get_json(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def wiki_page(lang: str, title: str):
    """위키백과 문서 조회 — pageprops(위키데이터 QID·동음이의 여부) + 대표 이미지 썸네일."""
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "redirects": 1, "titles": title,
        "prop": "pageprops|pageimages", "ppprop": "wikibase_item|disambiguation",
        "piprop": "thumbnail", "pithumbsize": 400,
    })
    try:
        data = get_json(f"https://{lang}.wikipedia.org/w/api.php?{q}")
        pages = (data.get("query") or {}).get("pages") or {}
        for pid, pg in pages.items():
            if pid == "-1" or "missing" in pg:
                return None
            props = pg.get("pageprops") or {}
            if "disambiguation" in props:
                return None
            thumb = (pg.get("thumbnail") or {}).get("source")
            return {
                "qid": props.get("wikibase_item"),
                "thumb": thumb,
                "page_url": f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(pg.get('title', title).replace(' ', '_'))}",
            }
    except Exception as e:  # noqa: BLE001
        print(f"  warn wiki_page {lang}:{title}: {e}")
    return None


def wd_entities(qids: list[str]) -> dict:
    """위키데이터 항목 일괄 조회(50개씩) — claims만."""
    out = {}
    for i in range(0, len(qids), 50):
        chunk = qids[i:i + 50]
        q = urllib.parse.urlencode({
            "action": "wbgetentities", "format": "json", "ids": "|".join(chunk), "props": "claims",
        })
        try:
            data = get_json(f"https://www.wikidata.org/w/api.php?{q}")
            out.update(data.get("entities") or {})
        except Exception as e:  # noqa: BLE001
            print(f"  warn wbgetentities chunk {i}: {e}")
        time.sleep(SLEEP)
    return out


def claim_year(ent: dict, prop: str):
    """P569 등 time 클레임에서 연도(int, BCE는 음수). 없으면 None."""
    for c in (ent.get("claims") or {}).get(prop, []):
        try:
            t = c["mainsnak"]["datavalue"]["value"]["time"]  # "+1762-06-22T..." / "-0550-..."
            sign = -1 if t.startswith("-") else 1
            return sign * int(t[1:5])
        except (KeyError, TypeError, ValueError):
            continue
    return None


def claim_items(ent: dict, prop: str) -> list[str]:
    out = []
    for c in (ent.get("claims") or {}).get(prop, []):
        try:
            out.append(c["mainsnak"]["datavalue"]["value"]["id"])
        except (KeyError, TypeError):
            continue
    return out


def claim_image(ent: dict):
    """P18 대표 이미지 → 커먼즈 썸네일 URL + 파일 문서(출처)."""
    for c in (ent.get("claims") or {}).get("P18", []):
        try:
            f = c["mainsnak"]["datavalue"]["value"]
            fq = urllib.parse.quote(f.replace(" ", "_"))
            return {
                "url": f"https://commons.wikimedia.org/wiki/Special:FilePath/{fq}?width=400",
                "source_url": f"https://commons.wikimedia.org/wiki/File:{fq}",
            }
        except (KeyError, TypeError):
            continue
    return None


def main() -> None:
    dry = "--dry" in sys.argv
    data = json.loads(PEOPLE.read_text(encoding="utf-8"))
    people = data["people"]

    # 1) 인물 → 위키 문서(QID·썸네일). ko 우선, en 폴백.
    hits = {}
    for p in people:
        if p["id"] in MANUAL_TITLES:
            lang, title = MANUAL_TITLES[p["id"]]
            pg = wiki_page(lang, title)
        else:
            pg = wiki_page("ko", p["name_ko"]) or (p.get("name_en") and wiki_page("en", p["name_en"]))
        time.sleep(SLEEP)
        if pg and pg.get("qid"):
            hits[p["id"]] = pg
        else:
            print(f"  miss wiki: {p['id']} ({p['name_ko']})")

    # 2) 위키데이터 일괄 조회 + 생년 대조(동명이인 컷)
    ents = wd_entities([h["qid"] for h in hits.values()])
    qid_of = {}
    for p in people:
        h = hits.get(p["id"])
        if not h:
            continue
        ent = ents.get(h["qid"]) or {}
        wd_year = claim_year(ent, "P569")
        ours = p.get("birth_year")
        # 생년에 이설·근사 플래그가 있는 인물(무라사키·하페즈·알콰리즈미 등)은 허용폭 완화
        flags = (p.get("flags") or []) + ((p.get("birthplace") or {}).get("flags") or [])
        tol = 30 if any(f in ("year-approx", "birthdate-variant", "birth-disputed") for f in flags) else 3
        if ours is not None and wd_year is not None and abs(wd_year - ours) > tol:
            print(f"  REJECT {p['id']} ({p['name_ko']}): 생년 불일치 ours={ours} wd={wd_year}")
            continue
        qid_of[p["id"]] = h["qid"]

    # 3) 초상 — P18 우선, 없으면 위키 문서 대표 썸네일
    portraits = 0
    for p in people:
        qid = qid_of.get(p["id"])
        if not qid:
            continue
        img = claim_image(ents.get(qid) or {})
        if not img:
            h = hits[p["id"]]
            if h.get("thumb"):
                img = {"url": h["thumb"], "source_url": h["page_url"]}
        if img:
            p["portrait"] = img
            portraits += 1

    # 4) 영향 관계 — 우리 데이터셋 안의 쌍만. 양방향으로 저장.
    person_by_qid = {q: pid for pid, q in qid_of.items()}
    links: dict[str, dict] = {pid: {} for pid in qid_of}
    for pid, qid in qid_of.items():
        ent = ents.get(qid) or {}
        for prop, (rel, inv) in REL_PROPS.items():
            for tq in claim_items(ent, prop):
                tid = person_by_qid.get(tq)
                if not tid or tid == pid:
                    continue
                src = f"https://www.wikidata.org/wiki/{qid}"
                links[pid][(tid, rel)] = {"id": tid, "rel": rel, "source_url": src}
                links.setdefault(tid, {})[(pid, inv)] = {"id": pid, "rel": inv, "source_url": src}
    # 큐레이션 관계 병합 — 위키데이터 에지와 같은 구조로(대칭 rel 처리 포함)
    INV = {"influenced_by": "influenced", "influenced": "influenced_by",
           "student_of": "teacher_of", "teacher_of": "student_of", "exchanged": "exchanged"}
    ids = {p["id"] for p in people}
    for a, b, rel, src in CURATED_LINKS:
        if a not in ids or b not in ids:
            print(f"  warn CURATED: 미존재 id {a} 또는 {b}")
            continue
        links.setdefault(a, {})[(b, rel)] = {"id": b, "rel": rel, "source_url": src}
        links.setdefault(b, {})[(a, INV[rel])] = {"id": a, "rel": INV[rel], "source_url": src}

    edges = 0
    for p in people:
        ls = list(links.get(p["id"], {}).values())
        # influenced_by와 student_of가 중복될 때(사제=영향) 사제 관계를 우선해 한 인물당 한 항목만
        seen: dict[str, dict] = {}
        rank = {"student_of": 3, "teacher_of": 3, "exchanged": 2, "influenced_by": 1, "influenced": 1}
        for l in ls:
            k = l["id"]
            if k not in seen or rank[l["rel"]] > rank[seen[k]["rel"]]:
                seen[k] = l
        if seen:
            p["links"] = sorted(seen.values(), key=lambda x: x["id"])
            edges += len(seen)

    # 5) 저작 이미지 — 같은 제목의 위키 문서 대표 이미지(동음이의 제외)
    workimgs = 0
    for p in people:
        for w in p.get("works") or []:
            pg = None
            if w.get("title") and len(w["title"]) >= 2:
                pg = wiki_page("ko", w["title"])
            if (not pg or not pg.get("thumb")) and w.get("title_en") and len(w["title_en"]) >= 3:
                pg = wiki_page("en", w["title_en"]) or pg
            time.sleep(SLEEP)
            if pg and pg.get("thumb"):
                w["image"] = {"url": pg["thumb"], "source_url": pg["page_url"]}
                workimgs += 1

    total_links = sum(len(p.get("links") or []) for p in people)
    print(f"\n인물 {len(people)} | 위키매칭 {len(qid_of)} | 초상 {portraits} | 관계(양방향) {total_links} | 저작이미지 {workimgs}/{sum(len(p.get('works') or []) for p in people)}")
    if dry:
        print("(dry — 파일 안 씀)")
        return
    bak = PEOPLE.with_suffix(".json.bak")
    if not bak.exists():  # 최초 1회만 백업 — 재실행이 원본 백업을 덮지 않게
        bak.write_text(PEOPLE.read_text(encoding="utf-8"), encoding="utf-8")
    PEOPLE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"저장: {PEOPLE} (백업 {bak.name})")


if __name__ == "__main__":
    main()
