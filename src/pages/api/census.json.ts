export const prerender = false;

const ALLOWED_VARIABLES = "NAME,B01003_001E,B19013_001E,B25003_003E,B25064_001E,B25002_003E";

export async function GET({ request, locals }) {
  const runtime = locals.runtime;
  const env = runtime?.env || {};
  const apiKey = env.CENSUS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Census API key is not configured on the server." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const incoming = new URL(request.url);
  const tract = incoming.searchParams.get("for");
  const state = incoming.searchParams.get("state");
  const county = incoming.searchParams.get("county");

  if (!/^\d{6}$/.test(tract || "") || !/^\d{2}$/.test(state || "") || !/^\d{3}$/.test(county || "")) {
    return Response.json({ error: "Invalid Census geography parameters." }, { status: 400 });
  }

  const upstream = new URL("https://api.census.gov/data/2024/acs/acs5");
  upstream.searchParams.set("get", ALLOWED_VARIABLES);
  upstream.searchParams.set("for", "tract:" + tract);
  upstream.searchParams.set("in", "state:" + state);
  upstream.searchParams.append("in", "county:" + county);
  upstream.searchParams.set("key", apiKey);

  try {
    const response = await fetch(upstream.toString(), {
      headers: { Accept: "application/json" }
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch {
    return Response.json(
      { error: "Census data service is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
