import type {
  LogicGroup,
  NaturalGroup,
  RuleSetEntry,
  CustomTemplate,
  SingboxConfig,
  SingboxOutbound,
} from "@/types";
import {
  BASE_TEMPLATE,
  BASE_TEMPLATE_FAKEIP,
  BASE_ROUTE_RULES_REDIR,
  BASE_ROUTE_RULES_FAKEIP,
  GEO_RULE_SETS,
  STATIC_OUTBOUNDS,
  MARKER_CUSTOM_DOMAIN,
  MARKER_CUSTOM_IP,
} from "@/config/template";
import { isIpRuleSet } from "@/utils/ruleSet";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect fakeip mode by checking whether any DNS server has address "fakeip".
 * Used to auto-select the correct BASE_ROUTE_RULES variant.
 */
export function hasFakeip(dns: Record<string, unknown> | undefined): boolean {
  if (!dns) return false
  const servers = dns.servers as Array<Record<string, unknown>> | undefined
  return servers?.some((s) => s.type === 'fakeip') ?? false
}

// ─────────────────────────────────────────────────────────────────────────────
// buildConfig
// ─────────────────────────────────────────────────────────────────────────────

export function buildConfig(
  naturalGroups: NaturalGroup[],
  logicGroups: LogicGroup[],
  customRuleSets: RuleSetEntry[],
  customTemplate: CustomTemplate = {},
  dnsMode: 'redir-host' | 'fakeip' = 'redir-host',
): SingboxConfig {
  // ── Resolve effective DNS mode ────────────────────────────────────────────
  // If the user's custom template (or built-in default) uses fakeip,
  // switch to the fakeip route rules automatically.
  const effectiveDns = (customTemplate.dns ?? BASE_TEMPLATE.dns) as Record<
    string,
    unknown
  >;
  const isFakeip = hasFakeip(effectiveDns) || dnsMode === 'fakeip';

  const builtinBase = isFakeip ? BASE_TEMPLATE_FAKEIP : BASE_TEMPLATE;

  const base = {
    log: customTemplate.log ?? builtinBase.log,
    dns: customTemplate.dns ?? builtinBase.dns,
    inbounds: customTemplate.inbounds ?? builtinBase.inbounds,
    experimental: customTemplate.experimental ?? builtinBase.experimental,
  };

  // ── 1. Outbounds ──────────────────────────────────────────────────────────
  const naturalGroupTags = naturalGroups.map((g) => g.name);
  const proxyOptions = [...naturalGroupTags];

  const naturalOutbounds: SingboxOutbound[] = naturalGroups.flatMap((g) => {
    const nodeTags = g.nodes.map((n) => n.name)

    if (!g.urltest) {
      return [{
        tag:       g.name,
        type:      'selector',
        outbounds: nodeTags,
        default:   nodeTags[0],
      }]
    }

    const autoTag = `${g.name} Auto`
    return [
      {
        tag:       autoTag,
        type:      'urltest',
        outbounds: nodeTags,
        url:       'http://www.gstatic.com/generate_204',
        interval:  '3m',
        tolerance: 50,
      },
      {
        tag:       g.name,
        type:      'selector',
        outbounds: [autoTag, ...nodeTags],
        default:   autoTag,
      },
    ]
  })

  const logicOutbounds: SingboxOutbound[] = logicGroups.map((g) => {
    const STATIC_TAGS = new Set(['direct', 'proxy'])

    const referencedTags = g.naturalGroupNames.filter((name) =>
      STATIC_TAGS.has(name) || naturalGroups.some((ng) => ng.name === name),
    );

    return {
      tag: g.name,
      type: g.type,
      outbounds: referencedTags,
      ...(g.type === "urltest"
        ? {
          url: "http://www.gstatic.com/generate_204",
          interval: "3m",
          tolerance: 50,
        }
        : {}),
      ...(g.type === "selector" && referencedTags[0]
        ? { default: referencedTags[0] }
        : {}),
    };
  });

  const seenTags = new Set<string>();
  const nodeOutbounds: SingboxOutbound[] = naturalGroups
    .flatMap((g) => g.nodes)
    .filter(({ name }) => {
      if (seenTags.has(name)) return false;
      seenTags.add(name);
      return true;
    })
    .map((n) => n.outbound);

  const outbounds: SingboxOutbound[] = [
    {
      tag: "proxy",
      type: "selector",
      outbounds: proxyOptions.length ? proxyOptions : ["direct"],
      ...(proxyOptions[0] ? { default: proxyOptions[0] } : {}),
    },
    {
      tag: "final",
      type: "selector",
      outbounds: ["proxy", "direct"],
      default: "proxy",
    },
    ...STATIC_OUTBOUNDS,
    ...logicOutbounds,
    ...naturalOutbounds,
    ...nodeOutbounds,
  ];

  // ── 2. Route rules ────────────────────────────────────────────────────────
  const baseRules = isFakeip ? BASE_ROUTE_RULES_FAKEIP : BASE_ROUTE_RULES_REDIR;
  const routeRules = structuredClone(baseRules) as Array<
    Record<string, unknown>
  >;

  // Split custom rule sets into domain (before resolve) and IP (after resolve).
  // In fakeip mode there is no resolve step — all custom rules go before geoip-cn.
  const domainRules: Record<string, unknown>[] = [];
  const ipRules: Record<string, unknown>[] = [];

  for (const rs of customRuleSets) {
    const rule = { rule_set: [rs.tag], action: "route", outbound: rs.outbound };
    if (isIpRuleSet(rs.tag)) {
      ipRules.push(rule);
    } else {
      domainRules.push(rule);
    }
  }

  // Find marker positions and replace with actual rules
  const domainMarkerIdx = routeRules.findIndex((r) => r.__marker === MARKER_CUSTOM_DOMAIN)
  // Replace domain marker: remove marker, insert domain rules in its place
  if (domainMarkerIdx >= 0) {
    routeRules.splice(domainMarkerIdx, 1, ...domainRules)
  }
  // Find marker positions and replace with actual rules
  const ipMarkerIdx = routeRules.findIndex((r) => r.__marker === MARKER_CUSTOM_IP)
  // Replace IP marker: remove marker, insert IP rules in its place
  if (ipMarkerIdx >= 0) {
    routeRules.splice(ipMarkerIdx, 1, ...ipRules)
  }

  // ── 3. Rule sets ──────────────────────────────────────────────────────────
  const extraRuleSets = customRuleSets.map((rs) => ({
    tag: rs.tag,
    type: "remote",
    format: "binary",
    url: rs.url,
    download_detour: "direct",
  }));

  // ── 4. Assemble ───────────────────────────────────────────────────────────
  return {
    ...base,
    outbounds,
    route: {
      default_domain_resolver: { server: "dns_local" },
      rules: routeRules,
      final: "final",
      auto_detect_interface: true,
      rule_set: [...GEO_RULE_SETS, ...extraRuleSets],
    },
  };
}
