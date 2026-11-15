export const prerender = false;

const ALLOWED_VARIABLES = "NAME,B01003_001E,B19013_001E,B25003_003E,B25064_001E,B25002_003E";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-BrokerPal-Census-Route": "active"
    }
  });
}

export async function GET({ request, locals }) {
  try {
    const runtime = locals?.runtime;
    const env = runtime?.env ?? {};
    const apiKey = env.CENSUS_API_KEY;

    if (!apiKey) {
      return json({ error: "Census API is not configured. Please try again later.", route: "census-api-active" }, 503);
    }

    const incoming = new URL(request.url);
    const tract = incoming.searchParams.get("for");
    const state = incoming.searchParams.get("state");
    const county = incoming.searchParams.get("county");

    if (!/^\\d{6}$/.test(tract || "") || !/^\\d{2}$/.test(state || "") || !/^\\d{3}$/.test(county || "")) {
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
  } catch {
    return json({
      error: "The Census data service is temporarily unavailable."
    }, 500);
  }
}
