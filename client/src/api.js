export function getRouteContext(pathname = typeof window !== "undefined" ? window.location.pathname : "/") {
  const clean = pathname.replace(new RegExp("/+$"), "") || "/";
  const isPortal = clean === "/" || clean === "/login" || clean === "/comunidade";
  const match = clean.match(new RegExp("^/comunidade/([^/]+)(/natal(?:/.*)?)?$", "i"));

  if (!match) {
    return { isPortal: true, communitySlug: null, isEvent: false, isCommunity: false };
  }

  const rawSlug = match[1].toLowerCase();
  const communitySlug = rawSlug === "ducks" ? "heaven" : rawSlug;
  const isEvent = Boolean(match[2]);

  return {
    isPortal: false,
    communitySlug,
    isEvent,
    isCommunity: !isEvent,
  };
}

export function getCommunitySlug(pathname) {
  return getRouteContext(pathname).communitySlug;
}

export function getCommunityBasePath(pathname) {
  const { communitySlug, isEvent } = getRouteContext(pathname);
  if (!communitySlug) return "/comunidade";
  return isEvent ? `/comunidade/${communitySlug}/natal` : `/comunidade/${communitySlug}`;
}

async function req(url, opts = {}) {
  const community = getCommunitySlug();
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = community ? `${url}${sep}community=${encodeURIComponent(community)}` : url;

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (community) headers["X-Community"] = community;

  const res = await fetch(fullUrl, {
    credentials: "include",
    ...opts,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Erro na requisição");
  return data;
}

export const api = {
  me: () => req("/api/me"),
  event: () => req("/api/event"),
  ranking: () => req("/api/ranking"),
  prizes: () => req("/api/prizes"),
  letters: (limit = 24) => req(`/api/letters?limit=${limit}`),
  postLetter: (text, anonymous) =>
    req("/api/letters", { method: "POST", body: JSON.stringify({ text, anonymous }) }),
  readLetter: (id) => req(`/api/letters/${id}/read`, { method: "POST" }),
  complete: (day, proof) =>
    req(`/api/missions/${day}/complete`, { method: "POST", body: JSON.stringify({ proof }) }),
  gallery: () => req("/api/gallery"),
  postGallery: (payload) =>
    req("/api/gallery", { method: "POST", body: JSON.stringify(payload) }),
  reviewGallery: (id, status) =>
    req(`/api/gallery/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  logout: () => req("/auth/logout", { method: "POST" }),
};
