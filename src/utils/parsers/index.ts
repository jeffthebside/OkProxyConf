import type { ParsedNode } from '@/types'
import { decodeBase64, looksLikeBase64 } from './base64'
import { parseClashYaml } from './clash'
import { parseSingboxJson } from './singbox'
import { parseUriList } from './uri'

/**
 * Auto-detect subscription format and return parsed nodes.
 *
 * Detection order (each step is tried only if the previous yields 0 nodes):
 *  1. SingBox JSON       → starts with '{'
 *  2. Clash YAML         → contains known top-level Clash keys
 *  3. Base64 blob        → decode → recurse once (handles V2Ray / SS subscriptions)
 *  4. URI list           → newline-separated proxy:// lines
 */
export function parseSubscriptionContent(text: string, _depth = 0): ParsedNode[] {
  const t = text.trim()
  if (!t) return []

  // 1. SingBox JSON
  if (t.startsWith('{')) {
    const nodes = parseSingboxJson(t)
    if (nodes.length > 0) return dedup(nodes)
  }

  // 2. Clash YAML
  // Match any of the common top-level keys a Clash config may start with,
  // not just "proxies:" — many configs begin with port/mode/allow-lan/etc.
  if (isClashYaml(t)) {
    const nodes = parseClashYaml(t)
    if (nodes.length > 0) return dedup(nodes)
    // If we matched as YAML but got 0 nodes (e.g. a proxies-less config),
    // don't fall through to base64 — it's definitely not base64.
    return []
  }

  // 3. Base64 blob → decode → recurse (one level only to avoid infinite loops)
  if (_depth === 0 && looksLikeBase64(t)) {
    const decoded = decodeBase64(t)
    if (decoded && decoded !== t) {
      const nodes = parseSubscriptionContent(decoded, 1)
      if (nodes.length > 0) return nodes
    }
  }

  // 4. URI list  (ss:// vmess:// vless:// trojan:// hy2:// tuic:// …)
  const uriNodes = parseUriList(t)
  if (uriNodes.length > 0) return dedup(uriNodes)

  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Heuristic to detect Clash YAML without requiring "proxies:" at line 1.
 * Matches any standard Clash / Clash.Meta top-level key.
 */
const CLASH_TOP_LEVEL_KEYS = [
  'proxies:',
  'proxy-groups:',
  'proxy-providers:',
  'rules:',
  'rule-providers:',
  'mixed-port:',
  'port:',
  'socks-port:',
  'allow-lan:',
  'mode:',
  'log-level:',
  'external-controller:',
  'dns:',
  'tun:',
  'profile:',
]

function isClashYaml(text: string): boolean {
  // Must contain at least one known Clash key at the start of a line
  for (const key of CLASH_TOP_LEVEL_KEYS) {
    if (text.startsWith(key) || text.includes('\n' + key)) return true
  }
  return false
}

/** Remove nodes with duplicate tags, keeping first occurrence */
function dedup(nodes: ParsedNode[]): ParsedNode[] {
  const seen = new Set<string>()
  return nodes.filter(({ name }) => {
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
}
