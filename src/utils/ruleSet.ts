/**
 * Determine whether a rule-set tag targets IP addresses rather than domains.
 * IP rule-sets must be placed AFTER the `resolve` action in the route rules
 * so that domain names have already been resolved to IPs before matching.
 *
 * Heuristics:
 *   geoip-*        → always IP
 *   ip-*           → common naming convention
 *   *-ip-*         → e.g. "custom-ip-private"
 */
export function isIpRuleSet(tag: string): boolean {
  const t = tag.toLowerCase()
  return t.startsWith('geoip') || t.startsWith('ip-') || t.includes('-ip-')
}