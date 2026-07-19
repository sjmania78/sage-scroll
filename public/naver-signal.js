(() => {
  const API = "https://www.bluetronai.com/api/naver-signals";

  if (!document.getElementById("naver-signal-styles")) {
    const style = document.createElement("style");
    style.id = "naver-signal-styles";
    style.textContent = `
      .naver-signal{max-width:1120px;margin:24px auto;padding:20px;border:1px solid rgba(148,163,184,.28);border-radius:18px;background:#0b1224;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .naver-signal[data-theme="light"]{background:#fff;color:#211c17;border-color:#e2d9c6}
      .naver-signal[data-compact="true"]{width:calc(100% - 48px);max-width:none;margin:10px 24px;padding:12px 16px;border-radius:12px}
      .naver-signal__top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .naver-signal__source{font:800 10px/1.2 ui-monospace,monospace;letter-spacing:.16em;color:#10b981}
      .naver-signal__title{margin:5px 0 0;font-size:18px;line-height:1.2}
      .naver-signal__note,.naver-signal__status,.naver-signal__disclosure{color:#94a3b8;font-size:11px}
      [data-theme="light"] .naver-signal__note,[data-theme="light"] .naver-signal__status,[data-theme="light"] .naver-signal__disclosure{color:#6d6357}
      .naver-signal__trends{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}
      .naver-signal__trend{padding:8px 10px;border:1px solid rgba(148,163,184,.25);border-radius:10px;font-size:12px}
      .naver-signal__trend b{margin-left:7px;color:#10b981}
      .naver-signal__trend b.down{color:#f43f5e}
      .naver-signal__news{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0 0;padding:0;list-style:none}
      .naver-signal__news a{display:block;height:100%;padding:10px;border:1px solid rgba(148,163,184,.25);border-radius:10px;color:inherit;text-decoration:none;font-size:12px;font-weight:700;line-height:1.45}
      .naver-signal__news a:hover{border-color:#10b981}
      .naver-signal__disclosure{margin:12px 0 0}
      @media(max-width:700px){.naver-signal{margin:16px;padding:16px}.naver-signal[data-compact="true"]{width:calc(100% - 24px);margin:8px 12px}.naver-signal__top{display:block}.naver-signal__note{display:block;margin-top:5px}.naver-signal__news{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function text(tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
  }

  function render(root) {
    const site = root.dataset.naverSignalSite;
    if (!site) return;
    const en = document.documentElement.lang.toLowerCase().startsWith("en");
    root.classList.add("naver-signal");
    root.setAttribute("aria-label", en ? "NAVER API HUB signals" : "네이버 API 허브 신호");

    const top = document.createElement("div");
    top.className = "naver-signal__top";
    const heading = document.createElement("div");
    heading.append(
      text("div", "naver-signal__source", "NAVER API HUB"),
      text("h2", "naver-signal__title", en ? "Search interest and current coverage" : "검색 관심도와 최신 보도"),
    );
    top.append(
      heading,
      text("span", "naver-signal__note", en ? "Recent 4 weeks vs prior 12" : "최근 4주 · 이전 12주 대비"),
    );
    const status = text("p", "naver-signal__status", en ? "Loading NAVER signals…" : "NAVER 신호를 불러오는 중…");
    root.replaceChildren(top, status);

    fetch(`${API}?site=${encodeURIComponent(site)}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((data) => {
        status.remove();
        const trends = document.createElement("div");
        trends.className = "naver-signal__trends";
        for (const item of data.trends || []) {
          const trend = document.createElement("span");
          trend.className = "naver-signal__trend";
          trend.append(document.createTextNode(item.label || item.id));
          const value = document.createElement("b");
          if (typeof item.changePct === "number") {
            value.textContent = `${item.changePct > 0 ? "+" : ""}${item.changePct}%`;
            if (item.changePct < 0) value.className = "down";
          } else {
            value.textContent = "—";
          }
          trend.append(value);
          trends.append(trend);
        }
        root.append(trends);

        if (Array.isArray(data.news) && data.news.length) {
          const news = document.createElement("ul");
          news.className = "naver-signal__news";
          for (const item of data.news.slice(0, 3)) {
            if (!String(item.url || "").startsWith("http")) continue;
            const row = document.createElement("li");
            const link = document.createElement("a");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = item.title;
            row.append(link);
            news.append(row);
          }
          if (news.childElementCount) root.append(news);
        }

        root.append(text(
          "p",
          "naver-signal__disclosure",
          en
            ? "Relative search index; not an absolute search-volume count. News links open the original publisher."
            : "상대 검색지수이며 절대 검색량이 아닙니다. 뉴스는 원문 매체로 연결됩니다.",
        ));
      })
      .catch(() => {
        status.textContent = en ? "The next signal refresh is being prepared." : "다음 신호 갱신을 준비하고 있습니다.";
      });
  }

  document.querySelectorAll("[data-naver-signal-site]").forEach(render);
})();
