/**
 * Only the public production domains may invoke upstream services or write leads.
 * Cloudflare Workers Builds previews and isolated preview Workers fail closed.
 */
export function isProductionHost(value) {
  const host = String(value ?? "").trim().toLowerCase().replace(/\.$/, "");
  return host === "yourbrokerpal.com" || host === "www.yourbrokerpal.com";
}
