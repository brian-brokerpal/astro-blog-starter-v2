import type { APIRoute } from "astro";

export const prerender = false;

const ALLOWED_VARIABLES = "NAME,B01003_001E,B19013_001E,B25003_003E,B25064_001E,B25002_003E";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-BrokerPal-Census-Route": "active"
    }
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals?.runtime;
    const env = runtime?.env ?? {};
    const apiKey = env.CENSUS_API_KEY;
    const incoming = new URL(request.url);

    // Safe diagnostic: confirms route and secret binding without exposing the key.
    if (incoming.searchParams.get("diagnostic") === "1") {
      return json({
        route: "census-api-active",
        runtimeAvailable: Boolean(runtime),
        envAvailable: Boolean(runtime?.env),
        censusApiKeyAvailable: Boolean(apiKey),
        worker: "astro-blog-starter-v2"
      });
    }

    if (incoming.searchParams.get("diagnostic") === "tract-list") {
      if (!apiKey) return json({ error: "Census API key is not configured." }, 503);
      const check = new URL("https://api.census.gov/data/2024/acs/acs5");
      check.searchParams.set("get", "NAME,B01003_001E");
      check.searchParams.set("for", "tract:*");
      check.searchParams.set("in", "state:13");
      check.searchParams.append("in", "county:121");
      check.searchParams.set("key", apiKey);
      const checkResponse = await fetch(check.toString());
      const checkBody = await checkResponse.text();
      return json({
        status: checkResponse.status,
        contentType: checkResponse.headers.get("content-type"),
        bodyPreview: checkBody.slice(0, 1200)
      }, 200);
    }

    if (!apiKey) {
      return json({ error: "Census API key is not configured on the server.", route: "census-api-active" }, 503);
    }

    const tract = incoming.searchParams.get("for");
    const state = incoming.searchParams.get("state");
    const county = incoming.searchParams.get("county");

    if (!/^\d{6}$/.test(tract || "") || !/^\d{2}$/.test(state || "") || !/^\d{3}$/.test(county || "")) {
      return json({ error: "Invalid Census geography parameters.", route: "census-api-active" }, 400);
    }

    const upstream = new URL("https://api.census.gov/data/2024/acs/acs5");
    upstream.searchParams.set("get", ALLOWED_VARIABLES);
    upstream.searchParams.set("for", "tract:" + tract);
    upstream.searchParams.set("in", "state:" + state);
    upstream.searchParams.append("in", "county:" + county);
    upstream.searchParams.set("key", apiKey);

    const response = await fetch(upstream.toString(), { headers: { Accept: "application/json" } });
    const body = await response.text();

    return new Response(body || JSON.stringify({
      error: "Census returned an empty response.",
      upstreamStatus: response.status
    }), {
      status: body ? response.status : 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-BrokerPal-Census-Route": "active"
      }
    });
  } catch (error) {
    return json({
      error: "Census API route failed before completing the request.",
      detail: error instanceof Error ? error.message : "Unknown runtime error"
    }, 500);
  }
};
