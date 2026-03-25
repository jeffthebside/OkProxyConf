import type { SingboxConfig, SingboxOutbound } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Shared / static sections
// ─────────────────────────────────────────────────────────────────────────────

const SHARED_LOG = { disabled: false, level: 'error', timestamp: true }

const SHARED_INBOUNDS = [
  {
    tag:           'tun-in',
    type:          'tun',
    address:       ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
    mtu:           9000,
    auto_route:    true,
    auto_redirect: true,
    strict_route:  true,
    stack:         'system',
  },
  {
    tag:         'mixed-in',
    type:        'mixed',
    listen:      '127.0.0.1',
    listen_port: 7890,
  },
]

const SHARED_EXPERIMENTAL = {
  clash_api: {
    external_controller:         '0.0.0.0:9095',
    external_ui:                 'ui',
    external_ui_download_url:
      'https://gh-proxy.com/https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages.zip',
    external_ui_download_detour: 'direct',
  },
  cache_file: { enabled: true, path: 'cache.db' },
}

// ─────────────────────────────────────────────────────────────────────────────
// redir-host template
// ─────────────────────────────────────────────────────────────────────────────

export const MARKER_CUSTOM_DOMAIN = 'custom-domain'
export const MARKER_CUSTOM_IP     = 'custom-ip'

export const BASE_TEMPLATE: Omit<SingboxConfig, 'outbounds' | 'route'> = {
  log: SHARED_LOG,
  dns: {
    servers: [
      { tag: 'dns_remote', type: 'https', server: '1.1.1.1',   detour: 'proxy' },
      { tag: 'dns_cn',     type: 'https', server: '223.5.5.5' },
      { tag: 'dns_local',  type: 'udp',   server: '223.5.5.5' },
    ],
    rules: [
      { clash_mode: 'direct', server: 'dns_cn' },
      { clash_mode: 'global', server: 'dns_remote' },
      { rule_set: 'geosite-cn', server: 'dns_cn' },
      {
        type: 'logical',
        mode: 'and',
        rules: [
          { rule_set: 'geosite-geolocation-!cn', invert: true },
          { rule_set: 'geoip-cn' },
        ],
        server:        'dns_remote',
        client_subnet: '223.5.5.0/24',
      },
    ],
    final:             'dns_remote',
    independent_cache: true,
    strategy:          'prefer_ipv4',
  },
  inbounds:     SHARED_INBOUNDS,
  experimental: SHARED_EXPERIMENTAL,
}

/**
 * redir-host route rules.
 * Insertion points for buildConfig():
 *   - custom domain rules  → before `resolve`
 *   - custom IP rules      → after `resolve`
 */
export const BASE_ROUTE_RULES_REDIR: unknown[] = [
  { action: 'sniff', sniffer: ['http', 'tls', 'quic', 'dns'], timeout: '500ms' },
  {
    type: 'logical', mode: 'or',
    rules: [{ port: 53 }, { protocol: 'dns' }],
    action: 'hijack-dns',
  },
  { ip_is_private: true,                            action: 'route', outbound: 'direct' },
  { rule_set: ['geosite-category-ads-all'],          action: 'reject' },
  { clash_mode: 'Global',                            action: 'route', outbound: 'proxy' },
  { clash_mode: 'Direct',                            action: 'route', outbound: 'direct' },
  // ── ⑥ 内置专属服务规则（如有）可在此扩展 ──────────────────────────────
  // ← 用户自定义 domain 规则集插这里（marker: 'custom-domain'）
  { __marker: MARKER_CUSTOM_DOMAIN },
  {
    type: 'logical', mode: 'and',
    rules: [
      { rule_set: 'geosite-geolocation-!cn' },
      { invert: true, rule_set: ['geosite-cn'] },
    ],
    action: 'route', outbound: 'proxy',
  },
  { rule_set: ['geosite-cn'], action: 'route', outbound: 'direct' },
  { action: 'resolve' },
  // ← 用户自定义 IP 规则集插这里（marker: 'custom-ip'）
  { __marker: MARKER_CUSTOM_IP },
  { rule_set: ['geoip-cn'], action: 'route', outbound: 'direct' },
]

// ─────────────────────────────────────────────────────────────────────────────
// fakeip template
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_TEMPLATE_FAKEIP: Omit<SingboxConfig, 'outbounds' | 'route'> = {
  log: SHARED_LOG,
  dns: {
    servers: [
      { tag: 'dns_remote', type: 'https', server: '1.1.1.1',   detour: 'proxy' },
      { tag: 'dns_cn',     type: 'https', server: '223.5.5.5' },
      { tag: 'dns_local',  type: 'udp',   server: '223.5.5.5' },
      {
        tag:          'dns_fakeip',
        type:         'fakeip',
        inet4_range:  '198.18.0.0/15',
        inet6_range:  'fc00::/18',
      },
    ],
    rules: [
      { clash_mode: 'direct', server: 'dns_cn' },
      { clash_mode: 'global', server: 'dns_remote' },
      { rule_set: 'geosite-cn', server: 'dns_cn' },
      {
        query_type: ['A', 'AAAA'],
        rule_set:   'geosite-geolocation-!cn',
        server:     'dns_fakeip',
      },
    ],
    final:             'dns_remote',
    independent_cache: true,
  },
  inbounds:     SHARED_INBOUNDS,
  experimental: SHARED_EXPERIMENTAL,
}

/**
 * fakeip route rules — no `resolve` step needed.
 * DNS already handled fakeip ↔ domain mapping at query time.
 * Insertion point for buildConfig():
 *   - all custom rule sets (domain + IP) → before `geoip-cn`
 */
export const BASE_ROUTE_RULES_FAKEIP: unknown[] = [
  { action: 'sniff', sniffer: ['http', 'tls', 'quic', 'dns'], timeout: '500ms' },
  {
    type: 'logical', mode: 'or',
    rules: [{ port: 53 }, { protocol: 'dns' }],
    action: 'hijack-dns',
  },
  { ip_is_private: true,                   action: 'route', outbound: 'direct' },
  { rule_set: ['geosite-category-ads-all'], action: 'reject' },
  { clash_mode: 'Global',                  action: 'route', outbound: 'proxy'  },
  { clash_mode: 'Direct',                  action: 'route', outbound: 'direct' },
  // ← 用户自定义 domain 规则集插这里（marker: 'custom-domain'）
  { __marker: MARKER_CUSTOM_DOMAIN },
  {
    type: 'logical', mode: 'and',
    rules: [
      { rule_set: 'geosite-geolocation-!cn' },
      { invert: true, rule_set: ['geosite-cn'] },
    ],
    action: 'route', outbound: 'proxy',
  },
  { rule_set: ['geosite-cn'], action: 'route', outbound: 'direct' },
  // ← 用户自定义 IP 规则集插这里（marker: 'custom-ip'）
  { __marker: MARKER_CUSTOM_IP },
  { rule_set: ['geoip-cn'], action: 'route', outbound: 'direct' },
]

// Keep original name as alias so existing imports don't break
export const BASE_ROUTE_RULES = BASE_ROUTE_RULES_REDIR

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

export const GEO_RULE_SETS = [
  {
    tag: 'geosite-category-ads-all', type: 'remote', format: 'binary',
    url: 'https://ghfast.top/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/sing/geo/geosite/category-ads-all.srs',
    download_detour: 'direct',
  },
  {
    tag: 'geoip-cn', type: 'remote', format: 'binary',
    url: 'https://ghfast.top/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/sing/geo/geoip/cn.srs',
    download_detour: 'direct',
  },
  {
    tag: 'geosite-cn', type: 'remote', format: 'binary',
    url: 'https://ghfast.top/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/sing/geo/geosite/cn.srs',
    download_detour: 'direct',
  },
  {
    tag: 'geosite-geolocation-!cn', type: 'remote', format: 'binary',
    url: 'https://ghfast.top/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/sing/geo/geosite/geolocation-!cn.srs',
    download_detour: 'direct',
  },
]

export const STATIC_OUTBOUNDS: SingboxOutbound[] = [
  { tag: 'direct', type: 'direct' },
]