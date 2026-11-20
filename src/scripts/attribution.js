const STORAGE_KEY = "brokerpal_attribution_v1";
const MAX_FIELD = 120;

function clean(value, max = MAX_FIELD) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max)
    : "";
}

function externalReferrerHost(referrer, hostname) {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host && host !== String(hostname || "").toLowerCase() ? clean(host, 120) : "";
  } catch {
    return "";
  }
}

function referrerMedium(host) {
  if (/(^|\.)(google|bing|yahoo|duckduckgo)\./i.test(host)) return "organic";
  if (/(facebook|instagram|linkedin|tiktok|x|twitter)\./i.test(host)) return "social";
  return "referral";
}

export function buildAttribution({ search = "", referrer = "", hostname = "", stored = {} } = {}) {
  const params = new URLSearchParams(search);
  const param = (...names) => {
    for (const name of names) {
      const value = clean(params.get(name), 120);
      if (value) return value;
    }
    return "";
  };

  const referralCode = clean(param("referralCode", "ref", "partner") || stored.referralCode || "", 64);
  const newReferralCode = !!param("referralCode", "ref", "partner") && param("referralCode", "ref", "partner") !== stored.referralCode;
  const referrerHost = externalReferrerHost(referrer, hostname);
  const utmSource = param("utm_source");
  const utmMedium = param("utm_medium");
  const utmCampaign = param("utm_campaign");
  const utmContent = param("utm_content");
  const utmTerm = param("utm_term");
  const hasUtmTouch = !!(utmSource || utmMedium || utmCampaign || utmContent || utmTerm);
  const explicitLatestSource = param("latestTouchSource");
  const explicitLatestMedium = param("latestTouchMedium");
  const explicitLatestCampaign = param("latestTouchCampaign");
  const explicitLatestContent = param("latestTouchContent");
  const explicitLatestTerm = param("latestTouchTerm");
  const hasExternalTouch = !!referrerHost;
  const hasNewTouch = hasUtmTouch || hasExternalTouch || newReferralCode;

  const incomingFirstSource = param("firstTouchSource") || utmSource;
  const incomingFirstMedium = param("firstTouchMedium") || utmMedium;
  const incomingFirstCampaign = param("firstTouchCampaign") || utmCampaign;
  const incomingFirstContent = param("firstTouchContent") || utmContent;
  const incomingFirstTerm = param("firstTouchTerm") || utmTerm;

  const fallbackSource = referrerHost || (referralCode ? "partner_referral" : "direct");
  const fallbackMedium = referrerHost ? referrerMedium(referrerHost) : referralCode ? "referral" : "direct";
  const firstTouchSource = clean(stored.firstTouchSource || incomingFirstSource || fallbackSource);
  const firstTouchMedium = clean(stored.firstTouchMedium || incomingFirstMedium || (firstTouchSource === "direct" ? "direct" : referrerHost || referralCode ? fallbackMedium : "other"));
  const firstTouchCampaign = clean(stored.firstTouchCampaign || incomingFirstCampaign);
  const firstTouchContent = clean(stored.firstTouchContent || incomingFirstContent);
  const firstTouchTerm = clean(stored.firstTouchTerm || incomingFirstTerm);

  const latestTouchSource = clean(
    utmSource || explicitLatestSource || (hasExternalTouch ? referrerHost : newReferralCode ? "partner_referral" : "") ||
    (hasNewTouch ? firstTouchSource : stored.latestTouchSource || firstTouchSource)
  );
  const latestTouchMedium = clean(
    utmMedium || explicitLatestMedium || (hasExternalTouch ? referrerMedium(referrerHost) : newReferralCode ? "referral" : "") ||
    (hasNewTouch ? firstTouchMedium : stored.latestTouchMedium || firstTouchMedium)
  );
  const latestTouchCampaign = clean(hasNewTouch ? utmCampaign || explicitLatestCampaign : stored.latestTouchCampaign || explicitLatestCampaign || firstTouchCampaign);
  const latestTouchContent = clean(hasNewTouch ? utmContent || explicitLatestContent : stored.latestTouchContent || explicitLatestContent || firstTouchContent);
  const latestTouchTerm = clean(hasNewTouch ? utmTerm || explicitLatestTerm : stored.latestTouchTerm || explicitLatestTerm || firstTouchTerm);

  return {
    firstTouchSource: firstTouchSource || "direct",
    firstTouchMedium: firstTouchMedium || "direct",
    firstTouchCampaign,
    firstTouchContent,
    firstTouchTerm,
    latestTouchSource: latestTouchSource || firstTouchSource || "direct",
    latestTouchMedium: latestTouchMedium || firstTouchMedium || "direct",
    latestTouchCampaign,
    latestTouchContent,
    latestTouchTerm,
    referralCode
  };
}

export function initializeAttribution() {
  let stored = {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed;
  } catch {}

  const attribution = buildAttribution({
    search: window.location.search,
    referrer: document.referrer,
    hostname: window.location.hostname,
    stored
  });

  window.BrokerPalAttribution = attribution;
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution)); } catch {}

  const applyLink = document.getElementById("los-apply-link");
  if (applyLink) {
    const target = new URL(applyLink.href, window.location.href);
    for (const [key, value] of Object.entries(attribution)) {
      if (value) target.searchParams.set(key, value);
    }
    applyLink.href = target.toString();
  }

  return attribution;
}
