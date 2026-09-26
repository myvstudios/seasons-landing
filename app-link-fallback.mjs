const APP_STORE_URL = "https://apps.apple.com/gb/app/seasons-streaming-companion/id6502302869";

// appPath is the seasons:// form both apps parse; iOS names the settings host "preferences".
const fixedRoutes = new Map([
  ["/watchlist", { kind: "watchlist", label: "your watchlist", appPath: "watchlist" }],
  ["/plan", { kind: "plan", label: "your streaming plan", appPath: "plan" }],
  ["/subscriptions", { kind: "subscriptions", label: "your subscriptions", appPath: "subscriptions" }],
  ["/search", { kind: "search", message: "Continue in Seasons to search shows and movies.", appPath: "search" }],
  ["/settings", { kind: "settings", label: "your settings", appPath: "preferences" }],
  ["/feedback", { kind: "feedback", message: "Continue in Seasons to send feedback.", appPath: "feedback" }],
]);

const dynamicRoutes = [
  {
    expression: /^\/shows\/([^/]+)\/seasons\/([^/]+)\/episodes\/([^/]+)\/?$/,
    resolve: ([, show, season, episode]) => ({
      kind: "episode",
      identifier: show,
      label: "this episode",
      values: [show, season, episode],
    }),
  },
  {
    expression: /^\/movies\/([^/]+)\/?$/,
    resolve: ([, identifier]) => ({ kind: "movie", identifier, label: "this movie" }),
  },
  {
    expression: /^\/shows\/([^/]+)\/?$/,
    resolve: ([, identifier]) => ({ kind: "show", identifier, label: "this show" }),
  },
  {
    expression: /^\/plan\/actions\/([^/]+)\/?$/,
    resolve: ([, identifier]) => ({ kind: "planAction", identifier, label: "this plan action" }),
  },
  {
    expression: /^\/subscriptions\/([^/]+)\/?$/,
    resolve: ([, identifier]) => ({ kind: "subscription", identifier, label: "this recorded subscription" }),
  },
];

function decodeValues(candidate) {
  const encodedValues = candidate.values ?? [candidate.identifier];
  if (encodedValues.some((value) => /%2f/i.test(value))) return null;

  try {
    const values = encodedValues.map(decodeURIComponent);
    if (values.some((value) => !value || value.includes("/"))) return null;
    return { ...candidate, identifier: values[0], values };
  } catch {
    return null;
  }
}

export function resolveSeasonsAppLink(pathname) {
  // GitHub Pages redirects fixed-route directories such as /plan to /plan/.
  const fixed = fixedRoutes.get(pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname);
  if (fixed) return fixed;

  for (const route of dynamicRoutes) {
    const match = pathname.match(route.expression);
    if (match) return decodeValues(route.resolve(match));
  }
  return null;
}

export function seasonsSchemeURL(route, pathname, search = "") {
  return `seasons://${route.appPath ?? pathname.slice(1)}${search}`;
}

function startFallback() {
  const route = resolveSeasonsAppLink(window.location.pathname);
  const title = document.querySelector("[data-title]");
  const message = document.querySelector("[data-message]");
  const openButton = document.querySelector("[data-open-seasons]");
  const storeButton = document.querySelector("[data-app-store]");

  storeButton.href = APP_STORE_URL;
  if (!route) {
    title.textContent = "This Seasons link is not available";
    message.textContent = "The link may be incomplete or out of date.";
    openButton.hidden = true;
    return;
  }

  title.textContent = "Open in Seasons";
  message.textContent = route.message ?? `Continue in Seasons to view ${route.label}.`;
  openButton.href = seasonsSchemeURL(route, window.location.pathname, window.location.search);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  startFallback();
}
