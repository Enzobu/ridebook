const ALLOWED_GOOGLE_HOST_SUFFIXES = [".google.com", ".google.fr"] as const;
const ALLOWED_GOOGLE_HOSTS = ["google.com", "google.fr", "www.google.com", "www.google.fr"] as const;

export function assertValidGoogleMapsEmbedUrl(embedUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(embedUrl);
  } catch {
    throw new Error("URL embed Google Maps invalide.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("URL embed Google Maps non HTTPS refusée.");
  }

  if (!isAllowedGoogleHost(parsed.hostname)) {
    throw new Error("Origine Google Maps embed non autorisée.");
  }

  if (!isMapsEmbedPath(parsed)) {
    throw new Error("URL Google Maps embed non reconnue.");
  }

  return parsed.toString();
}

function isAllowedGoogleHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();

  if (ALLOWED_GOOGLE_HOSTS.includes(normalizedHostname as (typeof ALLOWED_GOOGLE_HOSTS)[number])) {
    return true;
  }

  return ALLOWED_GOOGLE_HOST_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix));
}

function isMapsEmbedPath(parsed: URL): boolean {
  return parsed.pathname.startsWith("/maps/embed");
}
