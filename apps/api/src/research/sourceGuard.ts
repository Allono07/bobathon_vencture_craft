// Login-walled or personal-profile sites: never fetched (no logged-in scraping, no personal data).
const BLOCKED_HOSTS = ["facebook.com", "instagram.com", "linkedin.com", "x.com", "twitter.com", "tiktok.com"];
const FREE_MAIL = ["gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "rediffmail.com"];

export function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return !BLOCKED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function hostEndsWith(raw: string, suffixes: readonly string[]): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return suffixes.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

const squash = (s: string): string => s.replace(/\s+/g, " ").toLowerCase();

/** True when `needle` occurs verbatim (ignoring case and whitespace) in `haystack`. */
export function appearsIn(needle: string, haystack: string): boolean {
  const n = squash(needle).trim();
  if (n.length === 0) return false;
  const h = squash(haystack);
  return h.includes(n) || h.includes(n.replace(/\/$/, ""));
}

export function isPersonalMail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return FREE_MAIL.includes(domain);
}
