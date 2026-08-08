/**
 * 계측 게이트 (정적 사이트용) — 운영 통계에 들어갈 트래픽만 통과시킨다.
 *
 * 왜 이 파일이 있나: Next.js 서비스들은 <SiteAnalytics/> 안의 beforeSend 로 Joe 접속과
 * 프리뷰를 걸러낸다. 정적 사이트는 /_vercel/insights/script.js 를 그냥 싣기 때문에 그
 * 통로가 없었다. 2026-08-08 측정에서 함대 16곳 중 3곳만 게이트가 있었고, 주간 방문자
 * 119명 중 79명이 걸러지지 않은 상태였다.
 *
 * 어떻게 되나: insights 스크립트는 자기가 뜰 때 window.vaq 에 쌓인 호출을 먼저 비우고,
 * 그 다음에 첫 페이지뷰를 보낸다(스크립트 본문 확인, 2026-08-09). 그래서 스크립트보다
 * 먼저 vaq 에 beforeSend 를 밀어 넣으면 첫 페이지뷰까지 걸러진다.
 *
 * ⚠ 이 파일은 defer 없이, insights 스크립트보다 먼저 실려야 한다. defer 를 붙이면
 *   insights 스크립트와 순서가 뒤바뀌어 첫 페이지뷰가 그냥 나간다.
 * ⚠ 판정 규칙은 Next.js 쪽 SiteAnalytics.tsx 와 같아야 한다. 한쪽만 고치면 같은
 *   방문자가 어떤 사이트에서는 세어지고 어떤 사이트에서는 빠진다.
 */
(function () {
  var INTERNAL_KEY = "bt_internal";
  var COOKIE_DOMAIN = ".bluetronai.com";
  // 10년. 사실상 영구이며 해제는 ?internal=0.
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 3650;

  // 문자열 끝 비교를 손으로 세면 틀린다 — 실제로 ".vercel.app" 를 12자로 세는 버그가
  // 한 번 나왔다(11자다). 길이 계산을 한곳에 모아 그 실수를 막는다.
  function endsWith(value, suffix) {
    return value.length >= suffix.length && value.slice(value.length - suffix.length) === suffix;
  }

  function writeInternalFlag(on) {
    // 프리뷰(*.vercel.app)에서는 domain 지정이 거부되므로 그때만 호스트 쿠키로 떨어뜨린다.
    var scoped = endsWith(location.hostname, "bluetronai.com")
      ? "; domain=" + COOKIE_DOMAIN
      : "";
    var age = on ? COOKIE_MAX_AGE : 0;
    document.cookie =
      INTERNAL_KEY + "=" + (on ? "1" : "") + "; path=/; max-age=" + age + "; SameSite=Lax" + scoped;
  }

  function isInternalUser() {
    try {
      var p = new URLSearchParams(location.search).get("internal");
      if (p === "1") writeInternalFlag(true);
      else if (p === "0") writeInternalFlag(false);
      return document.cookie.split("; ").indexOf(INTERNAL_KEY + "=1") !== -1;
    } catch (e) {
      // 쿠키를 못 읽는 환경 — 막지 않는다. 진짜 방문자를 잃는 쪽이 더 나쁘다.
      return false;
    }
  }

  /** 로컬 개발 · 프리뷰 배포인가. 프리뷰는 vercel 이 붙이는 `-git-`·해시 패턴으로 판별. */
  function isNonProductionHost(host) {
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
    if (endsWith(host, ".local")) return true;
    if (!endsWith(host, ".vercel.app")) return false;
    // 브랜치 프리뷰: <project>-git-<branch>-<scope>.vercel.app
    if (host.indexOf("-git-") !== -1) return true;
    // 커밋 프리뷰: <project>-<9자 해시>-<scope>.vercel.app
    return /-[a-z0-9]{9}-[^.]+\.vercel\.app$/.test(host);
  }

  window.vaq = window.vaq || [];
  window.vaq.push([
    "beforeSend",
    function (event) {
      if (isInternalUser()) return null;
      if (isNonProductionHost(location.hostname)) return null;
      return event;
    },
  ]);
})();
