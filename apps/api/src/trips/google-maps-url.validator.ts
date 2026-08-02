import { BadRequestException } from "@nestjs/common";

const ALLOWED_HOSTNAMES = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "www.google.com",
  "google.fr",
  "www.google.fr",
]);

const MAPS_PATH_PATTERNS = [/^\/maps(\/|$)/, /^\/maps\//, /^\/maps\?/, /^\/maps$/, /^\/maps\/place\//, /^\/maps\/dir\//];

export function assertGoogleMapsUrl(value: string): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new BadRequestException("Le lien Google Maps est invalide.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new BadRequestException("Le lien Google Maps doit utiliser HTTPS.");
  }

  if (!ALLOWED_HOSTNAMES.has(parsedUrl.hostname)) {
    throw new BadRequestException("Le domaine du lien Google Maps n'est pas autorisé.");
  }

  if (isPrivateOrLocalHostname(parsedUrl.hostname)) {
    throw new BadRequestException("Le lien Google Maps ne peut pas cibler une adresse locale.");
  }

  if (parsedUrl.hostname === "maps.app.goo.gl" || parsedUrl.hostname === "goo.gl") {
    return;
  }

  if (!MAPS_PATH_PATTERNS.some((pattern) => pattern.test(parsedUrl.pathname))) {
    throw new BadRequestException("Le lien doit pointer vers Google Maps.");
  }
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".local") || isIpAddress(hostname);
}

function isIpAddress(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
}
