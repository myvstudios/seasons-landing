import assert from "node:assert/strict";
import test from "node:test";

import { resolveSeasonsAppLink, seasonsSchemeURL } from "../app-link-fallback.mjs";


const canonicalRoutes = [
  ["/movies/550", "movie"],
  ["/shows/1399", "show"],
  ["/shows/1399/seasons/2/episodes/9", "episode"],
  ["/watchlist", "watchlist"],
  ["/plan", "plan"],
  ["/plan/actions/action-123", "planAction"],
  ["/subscriptions/018f8d65-7a3e-7000-8000-acde48001122", "subscription"],
  ["/subscriptions", "subscriptions"],
  ["/search", "search"],
  ["/settings", "settings"],
  ["/feedback", "feedback"],
];

for (const [pathname, kind] of canonicalRoutes) {
  test(`recognizes ${pathname}`, () => {
    assert.equal(resolveSeasonsAppLink(pathname)?.kind, kind);
  });
}

test("rejects paths that only resemble canonical app links", () => {
  for (const pathname of [
    "/movies",
    "/movies/550/extra",
    "/shows/1399/seasons/2",
    "/shows/1399/seasons/2/episodes",
    "/plan/action/action-123",
    "/subscriptions/one/two",
    "/search/dune",
    "/settings/account",
    "/feedback/bug",
    "/preferences",
    "/privacy.html",
  ]) {
    assert.equal(resolveSeasonsAppLink(pathname), null, pathname);
  }
});

test("decodes identifiers without accepting encoded path separators", () => {
  assert.equal(resolveSeasonsAppLink("/movies/Dune%20Part%20Two")?.identifier, "Dune Part Two");
  assert.equal(resolveSeasonsAppLink("/movies/550%2Fextra"), null);
  assert.equal(resolveSeasonsAppLink("/movies/%E0%A4%A"), null);
});

test("accepts the trailing slash GitHub Pages adds to fixed-route directories", () => {
  for (const [pathname, kind] of [
    ["/watchlist/", "watchlist"],
    ["/plan/", "plan"],
    ["/subscriptions/", "subscriptions"],
    ["/search/", "search"],
    ["/settings/", "settings"],
    ["/feedback/", "feedback"],
  ]) {
    assert.equal(resolveSeasonsAppLink(pathname)?.kind, kind, pathname);
  }
});

test("builds the Seasons scheme URL each app understands", () => {
  const cases = [
    ["/subscriptions/", "", "seasons://subscriptions"],
    ["/search", "", "seasons://search"],
    ["/settings/", "", "seasons://preferences"],
    ["/feedback", "", "seasons://feedback"],
    ["/plan/", "", "seasons://plan"],
    ["/watchlist/", "", "seasons://watchlist"],
    ["/movies/550", "?ref=share", "seasons://movies/550?ref=share"],
    ["/subscriptions/client-1", "", "seasons://subscriptions/client-1"],
  ];
  for (const [pathname, search, expected] of cases) {
    const route = resolveSeasonsAppLink(pathname);
    assert.equal(seasonsSchemeURL(route, pathname, search), expected, pathname);
  }
});
