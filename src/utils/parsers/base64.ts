/**
 * Decode a possibly URL-safe, possibly unpadded base64 string.
 * Handles: standard (+/), URL-safe (-_), with/without = padding.
 */
export function decodeBase64(input: string): string {
  // Normalize URL-safe chars and strip whitespace
  let b64 = input.trim().replace(/-/g, '+').replace(/_/g, '/')
  // Re-pad
  const rem = b64.length % 4
  if (rem === 2) b64 += '=='
  else if (rem === 3) b64 += '='

  try {
    // atob → bytes → utf-8 decode (handles multi-byte chars)
    const binary = atob(b64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

/**
 * Return true if the string looks like a pure base64 blob
 * (no yaml/json markers, no scheme://)
 */
export function looksLikeBase64(text: string): boolean {
  const t = text.trim()
  if (t.startsWith('{') || t.startsWith('[')) return false
  if (t.startsWith('proxies:') || t.includes('\nproxies:')) return false
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]+:\/\//.test(t)) return false
  // Must be mostly base64 chars
  const b64chars = t.replace(/[\r\n\s=]/g, '')
  const ratio = (b64chars.match(/[A-Za-z0-9+/\-_]/g) ?? []).length / b64chars.length
  return ratio > 0.95 && b64chars.length > 20
}
