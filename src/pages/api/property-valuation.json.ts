import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
};
type D1DatabaseLike = { prepare(query: string): D1PreparedStatementLike };
type PropertyBindings = { PROPERTY_USAGE_DB?: D1DatabaseLike; RENTCAST_API_KEY?: string };
const bindings = env as unknown as PropertyBindings;

export const prerender = false;

const ALLOWED_TYPES = new Set([
  "Single Family",
  "Condo",
  "Townhouse",
  "Manufactured",
  "Multi-Family",
  "Apartment",
  "Land"
]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

type RentCastValuation = {
  price?: unknown;
  priceRangeLow?: unknown;
  priceRangeHigh?: unknown;
  subjectProperty?: unknown;
  comparables?: unknown;
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const db = bindings.PROPERTY_USAGE_DB;
    const apiKey = bindings.RENTCAST_API_KEY;

    if (!db) return json({ error: "Property valuation usage database is not configured." }, 503);
    if (!apiKey) return json({ error: "Property valuation provider key is not configured." }, 503);

    const incoming = new URL(request.url);
    const address = (incoming.searchParams.get("address") || "").trim();
    const propertyType = (incoming.searchParams.get("propertyType") || "").trim();
    const bedrooms = incoming.searchParams.get("bedrooms");
    const bathrooms = incoming.searchParams.get("bathrooms");
    const squareFootage = incoming.searchParams.get("squareFootage");

    if (address.length < 8 || address.length > 300) {
      return json({ error: "Enter a complete property address." }, 400);
    }
    if (!ALLOWED_TYPES.has(propertyType)) {
      return json({
        error: "An automated valuation is not available for this property type through the connected provider.",
        unavailable: true
      }, 422);
    }

    const params = new URLSearchParams({ address, propertyType, compCount: "5" });
    if (bedrooms !== null && /^\d{1,2}(\.\d)?$/.test(bedrooms)) params.set("bedrooms", bedrooms);
    if (bathrooms !== null && /^\d{1,2}(\.\d)?$/.test(bathrooms)) params.set("bathrooms", bathrooms);
    if (squareFootage !== null && /^\d{1,7}$/.test(squareFootage)) params.set("squareFootage", squareFootage);

    const cacheKey = await sha256(params.toString().toLowerCase());
    const cached = await db.prepare(
      "SELECT response_json FROM rentcast_valuation_cache WHERE cache_key = ? AND created_at >= datetime('now', '-30 days')"
    ).bind(cacheKey).first<{ response_json: string }>();

    if (cached?.response_json) {
      return json({ ...(JSON.parse(cached.response_json)), cached: true, usageCounted: false });
    }

    // Reserve a request atomically. The conditional UPSERT cannot raise the monthly
    // counter above 50, even when multiple visitors submit at the same time.
    const monthKey = new Date().toISOString().slice(0, 7);
    const reservation = await db.prepare(
      "INSERT INTO rentcast_monthly_usage (month_key, request_count, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP) ON CONFLICT(month_key) DO UPDATE SET request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP WHERE request_count < 50 RETURNING request_count"
    ).bind(monthKey).first<{ request_count: number }>();

    if (!reservation) {
      return json({
        error: "The free monthly property-valuation allowance has been reached. No additional provider request was made. Please try again next month.",
        quotaReached: true
      }, 429);
    }

    const upstream = await fetch("https://api.rentcast.io/v1/avm/value?" + params.toString(), {
      method: "GET",
      headers: { Accept: "application/json", "X-Api-Key": apiKey }
    });

    const body = await upstream.text();
    if (!upstream.ok) {
      return json({
        error: upstream.status === 404
          ? "The provider could not find enough property data to estimate this address."
          : "The property valuation provider could not complete the estimate.",
        providerStatus: upstream.status,
        usageCounted: true,
        remainingFreeRequests: Math.max(0, 50 - Number(reservation.request_count))
      }, upstream.status === 404 ? 404 : 502);
    }

    let valuation: RentCastValuation;
    try { valuation = JSON.parse(body) as RentCastValuation; }
    catch { return json({ error: "The valuation provider returned an unreadable response.", usageCounted: true }, 502); }

    if (typeof valuation.price !== "number" ||
        typeof valuation.priceRangeLow !== "number" ||
        typeof valuation.priceRangeHigh !== "number") {
      return json({ error: "The provider did not return a complete value estimate for this property.", usageCounted: true }, 502);
    }

    const safeResult = {
      price: valuation.price,
      priceRangeLow: valuation.priceRangeLow,
      priceRangeHigh: valuation.priceRangeHigh,
      subjectProperty: valuation.subjectProperty || null,
      comparables: Array.isArray(valuation.comparables) ? valuation.comparables.slice(0, 5) : [],
      provider: "RentCast",
      cached: false,
      usageCounted: true,
      remainingFreeRequests: Math.max(0, 50 - Number(reservation.request_count))
    };

    await db.prepare(
      "INSERT OR REPLACE INTO rentcast_valuation_cache (cache_key, response_json, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
    ).bind(cacheKey, JSON.stringify(safeResult)).run();

    return json(safeResult);
  } catch (error) {
    return json({
      error: "The property valuation service encountered an unexpected error.",
      detail: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
};
