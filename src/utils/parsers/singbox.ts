import type { ParsedNode, SingboxOutbound, SingboxOutboundType } from '@/types'

const PROXY_TYPES = new Set<SingboxOutboundType>([
  'shadowsocks', 'vmess', 'vless', 'trojan',
  'hysteria', 'hysteria2', 'tuic', 'wireguard', 'socks', 'http',
])

export function parseSingboxJson(text: string): ParsedNode[] {
  try {
    const doc = JSON.parse(text) as { outbounds?: SingboxOutbound[] }
    if (!doc?.outbounds) return []
    return doc.outbounds
      .filter((o) => PROXY_TYPES.has(o.type as SingboxOutboundType))
      .map((o) => ({ name: o.tag, outbound: o }))
  } catch {
    return []
  }
}
