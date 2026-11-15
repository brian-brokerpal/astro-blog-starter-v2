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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

const ALLOWED_HOSTNAMES = new Set(["yourbrokerpal.com", "www.yourbrokerpal.com"]);

async function verifyTurnstile(token, request, secret) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname)) return false;
  if (!token || token.length > 2048) return false;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || ""
    })
  });
  if (!response.ok) return null;
  const result = await response.json().catch(() => null);
  return result?.success === true &&
    ALLOWED_HOSTNAMES.has(String(result.hostname || "").toLowerCase());
}

export async function GET({ request, locals }) {
  try {
    const env = locals?.runtime?.env ?? {};
    const db = env.PROPERTY_USAGE_DB;
    const apiKey = env.RENTCAST_API_KEY;
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;

    if (!turnstileSecret) return json({ error: "Property valuation security verification is not configured." }, 503);
    const token = request.headers.get("x-turnstile-token") || "";
    const verified = await verifyTurnstile(token, request, turnstileSecret);
    if (verified === null) return json({ error: "Security verification is temporarily unavailable. No valuation request was made." }, 503);
    if (!verified) return json({ error: "Complete the security check and retry. No valuation request was made." }, 403);

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
    ).bind(cacheKey).first();

    if (cached?.response_json) {
      return json({ ...(JSON.parse(cached.response_json)), cached: true, usageCounted: false });
    }

    // Reserve a request atomically. The conditional UPSERT cannot raise the monthly
    // counter above 50, even when multiple visitors submit at the same time.
    const monthKey = new Date().toISOString().slice(0, 7);
    const reservation = await db.prepare(
      "INSERT INTO rentcast_monthly_usage (month_key, request_count, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP) ON CONFLICT(month_key) DO UPDATE SET request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP WHERE request_count < 50 RETURNING request_count"
    ).bind(monthKey).first();

    let approvedGrant = null;
    if (!reservation) {
      approvedGrant = await db.prepare(
        "UPDATE rentcast_overage_requests SET status = 'consumed', consumed_at = CURRENT_TIMESTAMP WHERE cache_key = ? AND month_key = ? AND status = 'approved' RETURNING id"
      ).bind(cacheKey, monthKey).first();

      if (!approvedGrant) {
        await db.prepare(
          "INSERT INTO rentcast_overage_requests (id, cache_key, month_key, property_address, property_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(cache_key, month_key) DO UPDATE SET updated_at = CURRENT_TIMESTAMP WHERE rentcast_overage_requests.status = 'pending'"
        ).bind(crypto.randomUUID(), cacheKey, monthKey, address, propertyType).run();

        return json({
          error: "The 50-request monthly limit has been reached. Your request has been sent for owner review. No additional provider request was made.",
          quotaReached: true,
          approvalRequired: true
        }, 429);
      }
    }

    const monthlyRemaining = reservation
      ? Math.max(0, 50 - Number(reservation.request_count))
      : 0;

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
        remainingFreeRequests: monthlyRemaining
      }, upstream.status === 404 ? 404 : 502);
    }

    let valuation;
    try { valuation = JSON.parse(body); }
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
      remainingFreeRequests: monthlyRemaining,
      approvedOverage: Boolean(approvedGrant)
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
}
