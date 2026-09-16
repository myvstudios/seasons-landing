const APP_STORE_URL = "https://apps.apple.com/gb/app/seasons-streaming-companion/id6502302869";

const fixedRoutes = new Map([
  ["/watchlist", { kind: "watchlist", label: "your watchlist" }],
  ["/plan", { kind: "plan", label: "your streaming plan" }],
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
  const fixed = fixedRoutes.get(pathname);
  if (fixed) return fixed;

  for (const route of dynamicRoutes) {
    const match = pathname.match(route.expression);
    if (match) return decodeValues(route.resolve(match));
  }
  return null;
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
  message.textContent = `Continue in Seasons to view ${route.label}.`;
  openButton.href = `seasons://${window.location.pathname.slice(1)}${window.location.search}`;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  startFallback();
}
