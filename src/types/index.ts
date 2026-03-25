// ─────────────────────────────────────────────
// Parsed node (one proxy entry)
// ─────────────────────────────────────────────
export interface ParsedNode {
  /** Display name / tag */
  name: string
  /** Ready-to-use SingBox outbound object */
  outbound: SingboxOutbound
}

// ─────────────────────────────────────────────
// Node group produced by geographic clustering
// ─────────────────────────────────────────────
export interface NaturalGroup {
  /** e.g. "🇭🇰 香港" / "US" */
  name: string
  nodes: ParsedNode[]
  urltest:  boolean  // whether to generate an Auto urltest outbound
}

// ─────────────────────────────────────────────
// User-defined logical group (streaming, gaming…)
// ─────────────────────────────────────────────
export interface LogicGroup {
  name: string
  /** 'selector' | 'urltest' */
  type: 'selector' | 'urltest'
  /** Names of NaturalGroups whose nodes are included */
  naturalGroupNames: string[]
}

// ─────────────────────────────────────────────
// Rule-set entry (custom, added by user)
// ─────────────────────────────────────────────
export interface RuleSetEntry {
  tag: string
  url: string
  /** outbound tag to route matched traffic */
  outbound: string
}

// ─────────────────────────────────────────────
// SingBox outbound types (subset used by generator)
// ─────────────────────────────────────────────
export type SingboxOutboundType =
  | 'direct'
  | 'dns'
  | 'selector'
  | 'urltest'
  | 'shadowsocks'
  | 'vmess'
  | 'vless'
  | 'trojan'
  | 'hysteria'
  | 'hysteria2'
  | 'tuic'
  | 'wireguard'
  | 'socks'
  | 'http'

export interface SingboxOutbound {
  tag: string
  type: SingboxOutboundType
  [key: string]: unknown
}

// ─────────────────────────────────────────────
// Final assembled SingBox config shape
// ─────────────────────────────────────────────
export interface SingboxConfig {
  log: Record<string, unknown>
  dns: Record<string, unknown>
  inbounds: unknown[]
  outbounds: SingboxOutbound[]
  route: Record<string, unknown>
  experimental: Record<string, unknown>
}

// ─────────────────────────────────────────────
// Subscription input modes
// ─────────────────────────────────────────────
export type InputMode = 'paste-url' | 'paste-content'

/**
 * User-supplied base template — only the static sections.
 * outbounds and route are always owned by the generator.
 */
export interface CustomTemplate {
  log?:          Record<string, unknown>
  dns?:          Record<string, unknown>
  inbounds?:     unknown[]
  experimental?: Record<string, unknown>
}