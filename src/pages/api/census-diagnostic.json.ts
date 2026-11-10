export const prerender = false;

export async function GET({ locals }) {
  const runtime = locals.runtime;
  const env = runtime?.env;

  return Response.json(
    {
      hasRuntime: Boolean(runtime),
      hasEnv: Boolean(env),
      hasCensusApiKey: typeof env?.CENSUS_API_KEY === "string" && env.CENSUS_API_KEY.length > 0
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
