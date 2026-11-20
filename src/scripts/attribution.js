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
  const externalHost = externalReferrerHost(referrer, hostname);
  const utmSource = param("utm_source");
  const utmMedium = param("utm_medium");
  const incomingFirstSource = param("firstTouchSource") || utmSource;
  const incomingFirstMedium = param("firstTouchMedium") || utmMedium;
  const incomingFirstCampaign = param("firstTouchCampaign", "utm_campaign");
  const incomingFirstContent = param("firstTouchContent", "utm_content");
  const incomingFirstTerm = param("firstTouchTerm", "utm_term");

  const firstTouchSource = clean(stored.firstTouchSource || incomingFirstSource || (referralCode ? "referral" : externalHost || "direct"));
  const firstTouchMedium = clean(stored.firstTouchMedium || incomingFirstMedium || (referralCode || externalHost ? "referral" : firstTouchSource === "direct" ? "direct" : "other"));
  const firstTouchCampaign = clean(stored.firstTouchCampaign || incomingFirstCampaign);
  const firstTouchContent = clean(stored.firstTouchContent || incomingFirstContent);
  const firstTouchTerm = clean(stored.firstTouchTerm || incomingFirstTerm);

  const latestTouchSource = clean(utmSource || param("latestTouchSource") || (referralCode && referralCode !== stored.referralCode ? "referral" : stored.latestTouchSource) || firstTouchSource);
  const latestTouchMedium = clean(utmMedium || param("latestTouchMedium") || (referralCode && referralCode !== stored.referralCode ? "referral" : stored.latestTouchMedium) || firstTouchMedium);
  const latestTouchCampaign = clean(param("utm_campaign", "latestTouchCampaign") || stored.latestTouchCampaign || firstTouchCampaign);
  const latestTouchContent = clean(param("utm_content", "latestTouchContent") || stored.latestTouchContent || firstTouchContent);
  const latestTouchTerm = clean(param("utm_term", "latestTouchTerm") || stored.latestTouchTerm || firstTouchTerm);

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
    for (const [key, value] of Object.entries({
      firstTouchSource: attribution.firstTouchSource,
      firstTouchMedium: attribution.firstTouchMedium,
      firstTouchCampaign: attribution.firstTouchCampaign,
      firstTouchContent: attribution.firstTouchContent,
      firstTouchTerm: attribution.firstTouchTerm,
      latestTouchSource: attribution.latestTouchSource,
      latestTouchMedium: attribution.latestTouchMedium,
      latestTouchCampaign: attribution.latestTouchCampaign,
      latestTouchContent: attribution.latestTouchContent,
      latestTouchTerm: attribution.latestTouchTerm,
      referralCode: attribution.referralCode
    })) {
      if (value) target.searchParams.set(key, value);
    }
    applyLink.href = target.toString();
  }

  return attribution;
}
