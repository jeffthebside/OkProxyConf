import type { ParsedNode, SingboxOutbound } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(search).entries()) params[k] = v
  return params
}

/**
 * Build SingBox TLS block from URI query params.
 * Only emits a block when there is a concrete TLS signal.
 */
function buildTls(q: Record<string, string>): Record<string, unknown> | undefined {
  const sec = (q.security ?? '').toLowerCase()
  if (sec !== 'tls' && sec !== 'reality') return undefined

  const tls: Record<string, unknown> = { enabled: true }

  const sni = q.sni ?? q.servername ?? q.peer
  if (sni) tls.server_name = sni

  if (q.alpn) tls.alpn = q.alpn.split(',').map((s) => s.trim()).filter(Boolean)

  if (q.fp) tls.utls = { enabled: true, fingerprint: q.fp }

  if (sec === 'reality') {
    tls.reality = {
      enabled: true,
      public_key: q.pbk ?? '',
      short_id: q.sid ?? '',
    }
  }

  return tls
}

/**
 * Build SingBox transport block from URI query params.
 */
function buildTransport(q: Record<string, string>): Record<string, unknown> | undefined {
  const net = (q.type ?? q.net ?? '').toLowerCase()

  switch (net) {
    case 'ws':
      return {
        type: 'ws',
        path: q.path || '/',
        ...(q.host || q.sni ? { headers: { Host: q.host ?? q.sni } } : {}),
      }

    case 'grpc':
      return {
        type: 'grpc',
        service_name: q.serviceName ?? q['grpc-service-name'] ?? q.servicename ?? '',
      }

    case 'h2':
    case 'http': {
      const hosts = q.host ? q.host.split(',').map((s) => s.trim()) : []
      return { type: 'http', host: hosts, path: q.path || '/' }
    }

    case 'httpupgrade':
      return {
        type: 'httpupgrade',
        host: q.host ?? '',
        path: q.path || '/',
      }

    case 'quic':
      return { type: 'quic' }

    case 'splithttp':
      return {
        type: 'splithttp',
        host: q.host ?? '',
        path: q.path || '/',
      }

    default:
      return undefined
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SS
// ─────────────────────────────────────────────────────────────────────────────

function parseSS(uri: string): ParsedNode | null {
  try {
    let rest = uri.slice('ss://'.length)

    // Extract fragment (name)
    let name = 'ss-node'
    const hashIdx = rest.indexOf('#')
    if (hashIdx >= 0) {
      name = safeDecode(rest.slice(hashIdx + 1))
      rest = rest.slice(0, hashIdx)
    }

    // Extract query string (plugin, etc.)
    let queryStr = ''
    const qIdx = rest.indexOf('?')
    if (qIdx >= 0) {
      queryStr = rest.slice(qIdx + 1)
      rest = rest.slice(0, qIdx)
    }

    let method: string
    let password: string
    let server: string
    let port: number

    const atIdx = rest.lastIndexOf('@')
    if (atIdx >= 0) {
      // Modern format: <userinfo>@<host>:<port>
      // userinfo is either plain "method:pass" or base64("method:pass")
      const userinfo = rest.slice(0, atIdx)
      const hostport = rest.slice(atIdx + 1)

      // Try base64 decode; use result only if it contains a colon
      let resolved = userinfo
      try {
        const b64 = userinfo.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = atob(b64)
        if (decoded.includes(':')) resolved = decoded
      } catch { /* keep plain */ }

      const colonIdx = resolved.indexOf(':')
      method   = resolved.slice(0, colonIdx)
      password = resolved.slice(colonIdx + 1)

      const lastColon = hostport.lastIndexOf(':')
      server = hostport.slice(0, lastColon)
      port   = parseInt(hostport.slice(lastColon + 1), 10)
    } else {
      // Legacy: base64(<method>:<password>@<host>:<port>)
      const b64 = rest.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = atob(b64)
      const atIdx2   = decoded.lastIndexOf('@')
      const colonIdx = decoded.indexOf(':')
      method   = decoded.slice(0, colonIdx)
      password = decoded.slice(colonIdx + 1, atIdx2)
      const hostport = decoded.slice(atIdx2 + 1)
      const lastColon = hostport.lastIndexOf(':')
      server = hostport.slice(0, lastColon)
      port   = parseInt(hostport.slice(lastColon + 1), 10)
    }

    if (!server || !method || isNaN(port)) return null

    // plugin= param is silently ignored; SingBox maps obfs to a separate
    // outbound type that can't be inferred from URI alone.
    void queryStr

    const outbound: SingboxOutbound = {
      tag: name,
      type: 'shadowsocks',
      server,
      server_port: port,
      method,
      password,
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VMess
// ─────────────────────────────────────────────────────────────────────────────

function parseVmess(uri: string): ParsedNode | null {
  try {
    const b64  = uri.slice('vmess://'.length).trim()
    const json = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')))

    const name: string = json.ps ?? json.remarks ?? json.add ?? 'vmess-node'

    const q: Record<string, string> = {
      type:        json.net         ?? '',
      path:        json.path        ?? '',
      host:        json.host        ?? '',
      security:    json.tls === 'tls' ? 'tls' : '',
      sni:         json.sni         ?? json.servername ?? '',
      fp:          json.fp          ?? '',
      serviceName: json['grpc-service-name'] ?? json.serviceName ?? '',
    }

    const tls       = buildTls(q)
    const transport = buildTransport(q)

    const outbound: SingboxOutbound = {
      tag: name,
      type: 'vmess',
      server:      json.add,
      server_port: parseInt(String(json.port), 10),
      uuid:        json.id,
      security:    json.scy ?? json.cipher ?? 'auto',
      alter_id:    parseInt(String(json.aid ?? json.alterId ?? 0), 10),
      ...(tls       ? { tls }       : {}),
      ...(transport ? { transport } : {}),
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VLESS
// ─────────────────────────────────────────────────────────────────────────────

function parseVless(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^vless:\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    const q    = parseQuery(u.search)

    const tls       = buildTls(q)
    const transport = buildTransport(q)

    const outbound: SingboxOutbound = {
      tag:         name,
      type:        'vless',
      server:      u.hostname,
      server_port: parseInt(u.port, 10),
      uuid:        u.username,
      ...(q.flow    ? { flow: q.flow }   : {}),
      ...(tls       ? { tls }            : {}),
      ...(transport ? { transport }      : {}),
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trojan
// ─────────────────────────────────────────────────────────────────────────────

function parseTrojan(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^trojan:\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    const q    = parseQuery(u.search)

    // Trojan always uses TLS — inject 'tls' if security param is absent
    const tls       = buildTls({ ...q, security: q.security || 'tls' }) ?? { enabled: true }
    const transport = buildTransport(q)

    const outbound: SingboxOutbound = {
      tag:         name,
      type:        'trojan',
      server:      u.hostname,
      server_port: parseInt(u.port, 10),
      password:    safeDecode(u.username),
      tls,
      ...(transport ? { transport } : {}),
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hysteria 2
// ─────────────────────────────────────────────────────────────────────────────

function parseHysteria2(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^(hysteria2|hy2):\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    const q    = parseQuery(u.search)

    // Password precedence: username field > password field > ?auth param
    const password = u.username
      ? safeDecode(u.username)
      : u.password
        ? safeDecode(u.password)
        : (q.auth ?? '')

    const outbound: SingboxOutbound = {
      tag:         name,
      type:        'hysteria2',
      server:      u.hostname,
      server_port: parseInt(u.port, 10),
      password,
      ...(q.obfs
        ? { obfs: { type: 'salamander', password: q['obfs-password'] ?? '' } }
        : {}),
      tls: {
        enabled:     true,
        server_name: q.sni ?? q.servername ?? u.hostname,
        insecure:    q.insecure === '1',
        ...(q.alpn ? { alpn: q.alpn.split(',').map((s) => s.trim()) } : {}),
      },
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hysteria v1
// ─────────────────────────────────────────────────────────────────────────────

function parseHysteria1(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^hysteria:\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    const q    = parseQuery(u.search)

    const outbound: SingboxOutbound = {
      tag:         name,
      type:        'hysteria',
      server:      u.hostname,
      server_port: parseInt(u.port, 10),
      auth_str:    q.auth ?? q['auth-str'] ?? safeDecode(u.password) ?? '',
      ...(q.up   ? { up_mbps:   parseInt(q.up,   10) } : {}),
      ...(q.down ? { down_mbps: parseInt(q.down, 10) } : {}),
      ...(q.obfs ? { obfs: q.obfs } : {}),
      tls: {
        enabled:     true,
        server_name: q.sni ?? q.peer ?? u.hostname,
        insecure:    q.insecure === '1',
        ...(q.alpn ? { alpn: q.alpn.split(',').map((s) => s.trim()) } : {}),
      },
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TUIC v5
// ─────────────────────────────────────────────────────────────────────────────

function parseTuic(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^tuic:\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    const q    = parseQuery(u.search)

    const outbound: SingboxOutbound = {
      tag:                name,
      type:               'tuic',
      server:             u.hostname,
      server_port:        parseInt(u.port, 10),
      uuid:               safeDecode(u.username),
      password:           safeDecode(u.password),
      congestion_control: q.congestion_control ?? q.cc ?? 'bbr',
      tls: {
        enabled:     true,
        server_name: q.sni ?? u.hostname,
        alpn:        q.alpn ? q.alpn.split(',').map((s) => s.trim()) : ['h3'],
        insecure:    q.allow_insecure === '1' || q.insecure === '1',
      },
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WireGuard
// ─────────────────────────────────────────────────────────────────────────────

function parseWireguard(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^(wireguard|wg):\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    const q    = parseQuery(u.search)

    const outbound: SingboxOutbound = {
      tag:             name,
      type:            'wireguard',
      server:          u.hostname,
      server_port:     parseInt(u.port || '51820', 10),
      private_key:     safeDecode(u.username),
      peer_public_key: safeDecode(u.password),
      ...(q.ip  ? { local_address: q.ip.split(',').map((s) => s.trim()) } : {}),
      ...(q.dns ? { dns_server: q.dns }         : {}),
      ...(q.mtu ? { mtu: parseInt(q.mtu, 10) }  : {}),
    }
    return { name, outbound }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCKS5
// ─────────────────────────────────────────────────────────────────────────────

function parseSocks(uri: string): ParsedNode | null {
  try {
    const u    = new URL(uri.replace(/^socks5?:\/\//, 'https://'))
    const name = safeDecode(u.hash.slice(1)) || u.host
    return {
      name,
      outbound: {
        tag:         name,
        type:        'socks',
        server:      u.hostname,
        server_port: parseInt(u.port, 10),
        version:     '5',
        ...(u.username ? { username: safeDecode(u.username) } : {}),
        ...(u.password ? { password: safeDecode(u.password) } : {}),
      },
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

const SCHEME_PARSERS: Array<[string, (uri: string) => ParsedNode | null]> = [
  ['ss://',         parseSS],
  ['vmess://',      parseVmess],
  ['vless://',      parseVless],
  ['trojan://',     parseTrojan],
  ['hysteria2://',  parseHysteria2],
  ['hy2://',        parseHysteria2],
  ['hysteria://',   parseHysteria1],
  ['tuic://',       parseTuic],
  ['wireguard://',  parseWireguard],
  ['wg://',         parseWireguard],
  ['socks://',      parseSocks],
  ['socks5://',     parseSocks],
]

export function parseProxyUri(line: string): ParsedNode | null {
  const trimmed = line.trim()
  for (const [scheme, parser] of SCHEME_PARSERS) {
    if (trimmed.toLowerCase().startsWith(scheme)) return parser(trimmed)
  }
  return null
}

/** Parse a block of newline-separated proxy URIs */
export function parseUriList(text: string): ParsedNode[] {
  return text
    .split('\n')
    .map((l) => parseProxyUri(l.trim()))
    .filter((n): n is ParsedNode => n !== null)
}
