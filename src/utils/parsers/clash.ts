import yaml from 'js-yaml'
import type { ParsedNode, SingboxOutbound } from '@/types'

interface ClashProxy {
  name: string
  type: string
  server: string
  port: number | string
  [key: string]: unknown
}

function toPort(v: unknown): number {
  return typeof v === 'number' ? v : parseInt(String(v), 10)
}

/** Build SingBox TLS block from a Clash proxy object */
function buildTls(p: ClashProxy, alwaysTls = false): Record<string, unknown> | undefined {
  const hasTls = p.tls === true || alwaysTls
  const insecure = p['skip-cert-verify'] === true
  const sni = (p.sni ?? p.servername) as string | undefined
  const alpn = p.alpn as string[] | string | undefined

  if (!hasTls && !insecure && !sni) return undefined

  const tls: Record<string, unknown> = { enabled: true, insecure }
  if (sni) tls.server_name = sni
  if (alpn) tls.alpn = Array.isArray(alpn) ? alpn : [alpn]

  // uTLS fingerprint (Clash.Meta)
  const fp = p['client-fingerprint'] as string | undefined
  if (fp) tls.utls = { enabled: true, fingerprint: fp }

  // Reality (Clash.Meta vless + reality-opts)
  const realityOpts = p['reality-opts'] as Record<string, string> | undefined
  if (realityOpts) {
    tls.reality = {
      enabled: true,
      public_key: realityOpts['public-key'] ?? '',
      short_id: realityOpts['short-id'] ?? '',
    }
  }

  return tls
}

/** Build SingBox transport block from a Clash proxy object */
function buildTransport(p: ClashProxy): Record<string, unknown> | undefined {
  const network = (p.network as string | undefined)?.toLowerCase()
  if (!network || network === 'tcp') return undefined

  if (network === 'ws') {
    const opts = p['ws-opts'] as Record<string, unknown> | undefined
    // headers may be map[string]string or map[string][]string
    const rawHeaders = opts?.headers as Record<string, unknown> | undefined
    const headers: Record<string, string> = {}
    if (rawHeaders) {
      for (const [k, v] of Object.entries(rawHeaders)) {
        headers[k] = Array.isArray(v) ? v[0] : String(v)
      }
    }
    return {
      type: 'ws',
      path: (opts?.path as string) ?? '/',
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    }
  }

  if (network === 'grpc') {
    const opts = p['grpc-opts'] as Record<string, unknown> | undefined
    // Both key variants exist in the wild
    const svcName =
      (opts?.['grpc-service-name'] as string) ??
      (opts?.serviceName as string) ??
      (p['grpc-service-name'] as string) ??
      ''
    return { type: 'grpc', service_name: svcName }
  }

  if (network === 'h2') {
    const opts = p['h2-opts'] as Record<string, unknown> | undefined
    return {
      type: 'http',
      host: (opts?.host as string[]) ?? [],
      path: (opts?.path as string) ?? '/',
    }
  }

  if (network === 'http') {
    const opts = p['http-opts'] as Record<string, unknown> | undefined
    const pathArr = opts?.path as string[] | string | undefined
    return {
      type: 'http',
      host: (opts?.headers as Record<string, string[]>)?.Host ?? [],
      path: Array.isArray(pathArr) ? pathArr[0] : (pathArr ?? '/'),
    }
  }

  if (network === 'httpupgrade') {
    const opts = p['httpupgrade-opts'] as Record<string, unknown> | undefined
    return {
      type: 'httpupgrade',
      host: (opts?.host as string) ?? '',
      path: (opts?.path as string) ?? '/',
    }
  }

  return undefined
}

function convertProxy(p: ClashProxy): SingboxOutbound | null {
  const tag = p.name
  const server = p.server
  const server_port = toPort(p.port)

  switch (p.type?.toLowerCase()) {
    // ── Shadowsocks ────────────────────────────────────────────────────────
    case 'ss':
    case 'shadowsocks': {
      // plugin= is silently dropped (obfs-local / v2ray-plugin can't be
      // trivially mapped to a single SingBox shadowsocks outbound)
      return {
        tag, type: 'shadowsocks', server, server_port,
        method: (p.cipher as string) ?? (p.method as string) ?? 'aes-256-gcm',
        password: p.password as string,
      }
    }

    // ── VMess ─────────────────────────────────────────────────────────────
    case 'vmess': {
      const tls = buildTls(p)
      const transport = buildTransport(p)
      return {
        tag, type: 'vmess', server, server_port,
        uuid: p.uuid as string,
        security: (p.cipher as string) ?? 'auto',
        alter_id: toPort(p.alterId ?? p['alter-id'] ?? 0),
        ...(tls ? { tls } : {}),
        ...(transport ? { transport } : {}),
      }
    }

    // ── VLESS ─────────────────────────────────────────────────────────────
    case 'vless': {
      const tls = buildTls(p)
      const transport = buildTransport(p)
      return {
        tag, type: 'vless', server, server_port,
        uuid: p.uuid as string,
        ...(p.flow ? { flow: p.flow as string } : {}),
        ...(tls ? { tls } : {}),
        ...(transport ? { transport } : {}),
      }
    }

    // ── Trojan ────────────────────────────────────────────────────────────
    case 'trojan': {
      // Trojan always has TLS
      const tls = buildTls(p, true) ?? { enabled: true }
      const transport = buildTransport(p)
      return {
        tag, type: 'trojan', server, server_port,
        password: p.password as string,
        tls,
        ...(transport ? { transport } : {}),
      }
    }

    // ── Hysteria v1 ───────────────────────────────────────────────────────
    case 'hysteria': {
      return {
        tag, type: 'hysteria', server, server_port,
        auth_str: (p['auth-str'] ?? p.auth ?? '') as string,
        ...(p['up-speed'] || p.up ? { up_mbps: toPort(p['up-speed'] ?? p.up) } : {}),
        ...(p['down-speed'] || p.down ? { down_mbps: toPort(p['down-speed'] ?? p.down) } : {}),
        ...(p.obfs ? { obfs: p.obfs as string } : {}),
        tls: {
          enabled: true,
          insecure: p['skip-cert-verify'] === true,
          server_name: (p.sni ?? p.servername ?? server) as string,
          ...(p.alpn ? { alpn: Array.isArray(p.alpn) ? p.alpn : [p.alpn] } : {}),
        },
      }
    }

    // ── Hysteria 2 (优化 alpn 和 insecure) ──────────────────
    case 'hysteria2':
    case 'hy2': {
      return {
        tag, type: 'hysteria2', server, server_port,
        password: (p.password ?? p.auth ?? p['auth-str']) as string,
        ...(p.obfs || p['obfs-password']
          ? { obfs: { type: 'salamander', password: (p['obfs-password'] ?? p.obfs) as string } }
          : {}),
        tls: {
          enabled: true,
          insecure: !!(p['skip-cert-verify'] ?? p.insecure),
          server_name: (p.sni ?? p.servername ?? server) as string,
          alpn: Array.isArray(p.alpn) ? p.alpn : (p.alpn ? [p.alpn] : ['h3']),
        },
      };
    }

    // ── TUIC (优化 alpn) ───────────────────────────────────
    case 'tuic': {
      return {
        tag, type: 'tuic', server, server_port,
        uuid: p.uuid as string,
        password: (p.password ?? p.token) as string,
        congestion_control: (p['congestion-controller'] ?? p.cc ?? 'bbr') as string,
        tls: {
          enabled: true,
          insecure: !!(p['skip-cert-verify'] ?? p.insecure),
          server_name: (p.sni ?? server) as string,
          alpn: p.alpn ? (Array.isArray(p.alpn) ? p.alpn : [p.alpn]) : ['h3'],
        },
      };
    }

    // ── WireGuard (Clash.Meta) ────────────────────────────────────────────
    case 'wireguard': {
      const peers = p.peers as Array<Record<string, any>> | undefined;

      // 1. 获取公钥（优先从 peers 数组取，兼容 Meta 格式）
      const peerPublicKey = (peers?.[0]?.['public-key'] ?? p['public-key']) as string;

      // 2. 修复 filter 报错 & 自动补全掩码
      const rawIps = (p['ips'] ?? (p.ip ? [p.ip] : [])) as any[];
      const localAddress = rawIps
        .filter((i): i is string => typeof i === 'string' && i.length > 0)
        .map(ip => {
          if (ip.includes('/')) return ip; // 已有掩码，保持原样
          return ip.includes(':') ? `${ip}/128` : `${ip}/32`; // 根据 IPv4/v6 补全
        });

      return {
        type: 'wireguard',
        tag,
        server,
        server_port,
        private_key: p['private-key'] as string,
        peer_public_key: peerPublicKey,
        local_address: localAddress,
        // 额外支持 sing-box 常用可选字段
        ...(p.mtu ? { mtu: Number(p.mtu) } : {}),
        ...(p.reserved ? { reserved: p.reserved as number[] } : {}),
        ...(p['pre-shared-key'] || peers?.[0]?.['pre-shared-key']
          ? { pre_shared_key: (p['pre-shared-key'] ?? peers?.[0]?.['pre-shared-key']) as string }
          : {}),
      }
    }

    // ── SOCKS5 ────────────────────────────────────────────────────────────
    case 'socks5': {
      return {
        tag, type: 'socks', server, server_port,
        version: '5',
        ...(p.username ? { username: p.username as string } : {}),
        ...(p.password ? { password: p.password as string } : {}),
      }
    }

    // ── HTTP ──────────────────────────────────────────────────────────────
    case 'http': {
      const tls = buildTls(p)
      return {
        tag, type: 'http', server, server_port,
        ...(p.username ? { username: p.username as string } : {}),
        ...(p.password ? { password: p.password as string } : {}),
        ...(tls ? { tls } : {}),
      }
    }

    default:
      return null
  }
}

export function parseClashYaml(text: string): ParsedNode[] {
  try {
    const doc = yaml.load(text) as Record<string, unknown>
    // Clash config can have proxies at top level or nested
    const proxies = (doc?.proxies ?? doc?.['proxy-providers']) as ClashProxy[] | undefined
    if (!proxies || !Array.isArray(proxies)) return []
    return proxies
      .map((p) => {
        const outbound = convertProxy(p)
        return outbound ? { name: p.name, outbound } : null
      })
      .filter((n): n is ParsedNode => n !== null)
  } catch {
    return []
  }
}
