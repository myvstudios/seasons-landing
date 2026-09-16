import assert from "node:assert/strict";
import test from "node:test";

import { resolveSeasonsAppLink } from "../app-link-fallback.mjs";


const canonicalRoutes = [
  ["/movies/550", "movie"],
  ["/shows/1399", "show"],
  ["/shows/1399/seasons/2/episodes/9", "episode"],
  ["/watchlist", "watchlist"],
  ["/plan", "plan"],
  ["/plan/actions/action-123", "planAction"],
  ["/subscriptions/018f8d65-7a3e-7000-8000-acde48001122", "subscription"],
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
    "/subscriptions",
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
