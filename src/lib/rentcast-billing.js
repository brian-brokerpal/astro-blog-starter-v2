/**
 * Validate the operator-controlled RentCast billing-period key.
 * A new key must only be configured after the provider confirms the free
 * request allowance has reset. Missing or malformed values fail closed.
 */
export function getRentCastBillingPeriodKey(value) {
  const key = String(value ?? "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(key) ? key : null;
}
