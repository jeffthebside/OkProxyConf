// src/utils/geoGroup.ts
import type { NaturalGroup, ParsedNode } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Geo table
// Pattern rules:
//  - Chinese keywords: plain string match (fast, unambiguous)
//  - Latin abbreviations: MUST use \b word boundary to avoid partial matches
//  - Emoji flags: matched literally in pattern, appears first in label
// ─────────────────────────────────────────────────────────────────────────────

interface GeoEntry {
  pattern: RegExp
  label: string
}

const GEO_TABLE: GeoEntry[] = [
  // ── East Asia ──────────────────────────────────────────────────────────────
  {
    label: '🇭🇰 香港',
    pattern: /🇭🇰|香港|港(?!口|湾|币)|HongKong|Hong[\s_-]?Kong|\bHKG?\b/i,
  },
  {
    label: '🇹🇼 台湾',
    pattern: /🇹🇼|台湾|台灣|台北|臺灣|\bTWN?\b|Taiwan/i,
  },
  {
    label: '🇯🇵 日本',
    pattern: /🇯🇵|日本|东京|東京|大阪|名古屋|Tokyo|Osaka|Nagoya|\bJPN?\b/i,
  },
  {
    label: '🇰🇷 韩国',
    pattern: /🇰🇷|韩国|韓國|首尔|首爾|Seoul|Busan|\bKOR?\b/i,
  },
  {
    label: '🇲🇴 澳门',
    pattern: /🇲🇴|澳门|澳門|Macao|Macau|\bMO\b/i,
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────
  {
    label: '🇸🇬 新加坡',
    pattern: /🇸🇬|新加坡|狮城|Singapore|\bSGP?\b/i,
  },
  {
    label: '🇲🇾 马来西亚',
    pattern: /🇲🇾|马来西亚|馬來西亞|吉隆坡|Malaysia|Kuala[\s_-]?Lumpur|\bMYS?\b/i,
  },
  {
    label: '🇹🇭 泰国',
    pattern: /🇹🇭|泰国|泰國|曼谷|Bangkok|Thailand|\bTHA?\b/i,
  },
  {
    label: '🇻🇳 越南',
    pattern: /🇻🇳|越南|胡志明|河内|Vietnam|Hanoi|Ho[\s_-]?Chi[\s_-]?Minh|\bVNM?\b/i,
  },
  {
    label: '🇵🇭 菲律宾',
    pattern: /🇵🇭|菲律宾|菲律賓|马尼拉|Manila|Philippines|\bPHL?\b/i,
  },
  {
    label: '🇮🇩 印尼',
    pattern: /🇮🇩|印尼|印度尼西亚|雅加达|Jakarta|Indonesia|\bIDN?\b/i,
  },

  // ── Americas ──────────────────────────────────────────────────────────────
  {
    label: '🇺🇸 美国',
    // \bUS\b alone is risky — require it to not be preceded by letters (e.g. "PLUS")
    // Use explicit city/state names and the unambiguous \bUSA\b
    pattern: /🇺🇸|美国|美國|洛杉矶|洛杉磯|纽约|紐約|西雅图|旧金山|硅谷|芝加哥|达拉斯|迈阿密|费城|波士顿|亚特兰大|Houston|Los[\s_-]?Angeles|New[\s_-]?York|Seattle|San[\s_-]?Francisco|Chicago|Dallas|Miami|\bUSA\b|United[\s_-]?States|(?<![A-Za-z])\bUS\b(?![A-Za-z])/i,
  },
  {
    label: '🇨🇦 加拿大',
    pattern: /🇨🇦|加拿大|多伦多|多倫多|温哥华|溫哥華|Toronto|Vancouver|Montreal|Canada|\bCAN?\b/i,
  },
  {
    label: '🇧🇷 巴西',
    pattern: /🇧🇷|巴西|圣保罗|聖保羅|Brazil|São[\s_-]?Paulo|\bBRA?\b/i,
  },
  {
    label: '🇦🇷 阿根廷',
    pattern: /🇦🇷|阿根廷|布宜诺斯艾利斯|Argentina|Buenos[\s_-]?Aires|\bARG?\b/i,
  },
  {
    label: '🇲🇽 墨西哥',
    pattern: /🇲🇽|墨西哥|Mexico|\bMEX?\b/i,
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  {
    label: '🇬🇧 英国',
    pattern: /🇬🇧|英国|英國|伦敦|倫敦|London|United[\s_-]?Kingdom|\bGBR?\b|\bUK\b/i,
  },
  {
    label: '🇩🇪 德国',
    pattern: /🇩🇪|德国|德國|法兰克福|法蘭克福|Frankfurt|Berlin|Germany|\bDEU?\b/i,
  },
  {
    label: '🇫🇷 法国',
    pattern: /🇫🇷|法国|法國|巴黎|Paris|France|\bFRA?\b/i,
  },
  {
    label: '🇳🇱 荷兰',
    pattern: /🇳🇱|荷兰|荷蘭|阿姆斯特丹|Amsterdam|Netherlands|\bNLD?\b/i,
  },
  {
    label: '🇨🇭 瑞士',
    pattern: /🇨🇭|瑞士|苏黎世|蘇黎世|Zurich|Geneva|Switzerland|\bCHE?\b/i,
  },
  {
    label: '🇸🇪 瑞典',
    pattern: /🇸🇪|瑞典|斯德哥尔摩|Stockholm|Sweden|\bSWE?\b/i,
  },
  {
    label: '🇳🇴 挪威',
    pattern: /🇳🇴|挪威|奥斯陆|Oslo|Norway|\bNOR?\b/i,
  },
  {
    label: '🇫🇮 芬兰',
    pattern: /🇫🇮|芬兰|赫尔辛基|Helsinki|Finland|\bFIN?\b/i,
  },
  {
    label: '🇩🇰 丹麦',
    pattern: /🇩🇰|丹麦|哥本哈根|Copenhagen|Denmark|\bDNK?\b/i,
  },
  {
    label: '🇵🇱 波兰',
    pattern: /🇵🇱|波兰|华沙|Warsaw|Poland|\bPOL?\b/i,
  },
  {
    label: '🇷🇴 罗马尼亚',
    pattern: /🇷🇴|罗马尼亚|布加勒斯特|Bucharest|Romania|\bROU?\b/i,
  },
  {
    label: '🇱🇹 立陶宛',
    pattern: /🇱🇹|立陶宛|维尔纽斯|Vilnius|Lithuania|\bLTU?\b/i,
  },
  {
    label: '🇱🇻 拉脱维亚',
    pattern: /🇱🇻|拉脱维亚|里加|Riga|Latvia|\bLVA?\b/i,
  },
  {
    label: '🇪🇪 爱沙尼亚',
    pattern: /🇪🇪|爱沙尼亚|塔林|Tallinn|Estonia|\bEST?\b/i,
  },
  {
    label: '🇷🇸 塞尔维亚',
    pattern: /🇷🇸|塞尔维亚|贝尔格莱德|Belgrade|Serbia|\bSRB?\b/i,
  },
  {
    label: '🇧🇬 保加利亚',
    pattern: /🇧🇬|保加利亚|索非亚|Sofia|Bulgaria|\bBGR?\b/i,
  },
  {
    label: '🇭🇷 克罗地亚',
    pattern: /🇭🇷|克罗地亚|萨格勒布|Zagreb|Croatia|\bHRV?\b/i,
  },
  {
    label: '🇸🇰 斯洛伐克',
    pattern: /🇸🇰|斯洛伐克|布拉迪斯拉发|Bratislava|Slovakia|\bSVK?\b/i,
  },
  {
    label: '🇸🇮 斯洛文尼亚',
    pattern: /🇸🇮|斯洛文尼亚|卢布尔雅那|Ljubljana|Slovenia|\bSVN?\b/i,
  },
  {
    label: '🇦🇹 奥地利',
    pattern: /🇦🇹|奥地利|维也纳|Vienna|Austria|\bAUT?\b/i,
  },
  {
    label: '🇧🇪 比利时',
    pattern: /🇧🇪|比利时|布鲁塞尔|Brussels|Belgium|\bBEL?\b/i,
  },
  {
    label: '🇪🇸 西班牙',
    pattern: /🇪🇸|西班牙|马德里|Madrid|Spain|\bESP?\b/i,
  },
  {
    label: '🇮🇹 意大利',
    pattern: /🇮🇹|意大利|米兰|罗马|Milan|Rome|Italy|\bITA?\b/i,
  },
  {
    label: '🇵🇹 葡萄牙',
    pattern: /🇵🇹|葡萄牙|里斯本|Lisbon|Portugal|\bPRT?\b/i,
  },
  {
    label: '🇨🇿 捷克',
    pattern: /🇨🇿|捷克|布拉格|Prague|Czech|\bCZE?\b/i,
  },
  {
    label: '🇭🇺 匈牙利',
    pattern: /🇭🇺|匈牙利|布达佩斯|Budapest|Hungary|\bHUN?\b/i,
  },
  {
    label: '🇺🇦 乌克兰',
    pattern: /🇺🇦|乌克兰|基辅|Kyiv|Kiev|Ukraine|\bUKR?\b/i,
  },
  {
    label: '🇷🇺 俄罗斯',
    pattern: /🇷🇺|俄罗斯|俄國|莫斯科|Moscow|Russia|\bRUS?\b/i,
  },
  {
    label: '🇹🇷 土耳其',
    pattern: /🇹🇷|土耳其|伊斯坦布尔|Istanbul|Turkey|Türkiye|\bTUR?\b/i,
  },

  // ── Middle East ───────────────────────────────────────────────────────────
  {
    label: '🇦🇪 阿联酋',
    pattern: /🇦🇪|阿联酋|迪拜|Dubai|Abu[\s_-]?Dhabi|Emirates|\bARE?\b|\bUAE\b/i,
  },
  {
    label: '🇸🇦 沙特',
    pattern: /🇸🇦|沙特|利雅得|Riyadh|Saudi|\bSAU?\b/i,
  },
  {
    label: '🇮🇱 以色列',
    pattern: /🇮🇱|以色列|特拉维夫|Tel[\s_-]?Aviv|Israel|\bISR?\b/i,
  },


  // ── Asia Pacific ──────────────────────────────────────────────────────────
  {
    label: '🇮🇳 印度',
    pattern: /🇮🇳|印度|孟买|孟買|Mumbai|Delhi|Bangalore|India|\bIND?\b/i,
  },
  {
    label: '🇦🇺 澳大利亚',
    pattern: /🇦🇺|澳大利亚|澳洲|悉尼|墨尔本|Sydney|Melbourne|Australia|\bAUS?\b/i,
  },
  {
    label: '🇳🇿 新西兰',
    pattern: /🇳🇿|新西兰|新西蘭|奥克兰|Auckland|New[\s_-]?Zealand|\bNZL?\b/i,
  },
  {
    label: '🇰🇿 哈萨克斯坦',
    pattern: /🇰🇿|哈萨克斯坦|阿斯塔纳|Astana|Kazakhstan|\bKAZ?\b/i,
  },
  {
    label: '🇵🇰 巴基斯坦',
    pattern: /🇵🇰|巴基斯坦|伊斯兰堡|Islamabad|Pakistan|\bPAK?\b/i,
  },

  // ── Africa ────────────────────────────────────────────────────────────────
  {
    label: '🇿🇦 南非',
    pattern: /🇿🇦|南非|约翰内斯堡|Johannesburg|South[\s_-]?Africa|\bZAF?\b/i,
  },
  {
    label: '🇪🇬 埃及',
    pattern: /🇪🇬|埃及|开罗|Cairo|Egypt|\bEGY?\b/i,
  },

  {
    label: '🇳🇬 尼日利亚',
    pattern: /🇳🇬|尼日利亚|阿布贾|Abuja|Nigeria|\bNGA?\b/i,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Core label function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Noise prefixes that commonly appear before the actual geo identifier
 * in airport node names, e.g. "IPLC | 香港 01" or "CN2-GIA-US-01".
 * We strip these before matching so they don't interfere.
 */
const NOISE_PREFIX_RE = /^[\s\-_|]*(IPLC|IEPL|BGP|CN2|GIA|PRTG|MPLS|ISP|GAME|Gaming|Premium|VIP|Pro|Basic|Standard|Speed|Ultra|Max|Low|High|x\d+|\d+x)\s*[\|\-_]?\s*/gi

export function getGeoLabel(name: string): string {
  // Strip leading noise words for matching (keep original name for display)
  const normalized = name.replace(NOISE_PREFIX_RE, '').trim()

  for (const { pattern, label } of GEO_TABLE) {
    if (pattern.test(normalized) || pattern.test(name)) return label
  }

  return '其他'
}

function longestCommonPrefix(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return a.slice(0, i)
}

function trimToWordBoundary(s: string): string {
  // Cut at last natural delimiter
  const m = s.match(/^(.*[\s\-_|.@#,()（）])/)
  return m ? m[1].replace(/[\s\-_|.@#,()（）]+$/, '').trim() : s.trim()
}

/**
 * Cluster nodes by LCP:
 * - Sort by name so nodes with common prefixes are adjacent
 * - Merge adjacent nodes whose LCP (trimmed to boundary) is non-empty
 * - Groups with only 1 node go to 其他
 */
function clusterByPrefix(nodes: ParsedNode[]): Map<string, ParsedNode[]> {
  const result = new Map<string, ParsedNode[]>()
  if (nodes.length === 0) return result

  // Sort alphabetically so common-prefix nodes are adjacent
  const sorted = [...nodes].sort((a, b) => a.name.localeCompare(b.name))

  // Greedy merge: extend current group as long as LCP with first node is meaningful
  let groupStart = 0

  const flush = (end: number) => {
    const group = sorted.slice(groupStart, end)
    if (group.length === 1) {
      // Single node — will go to 其他
      const cur = result.get('__leftovers__') ?? []
      cur.push(group[0])
      result.set('__leftovers__', cur)
      return
    }
    // Compute LCP of the whole group
    let lcp = group[0].name
    for (let i = 1; i < group.length; i++) {
      lcp = longestCommonPrefix(lcp, group[i].name)
      if (!lcp) break
    }
    const name = trimToWordBoundary(lcp) || group[0].name
    result.set(name, group)
  }

  for (let i = 1; i < sorted.length; i++) {
    const lcp = longestCommonPrefix(sorted[groupStart].name, sorted[i].name)
    const trimmed = trimToWordBoundary(lcp)
    if (!trimmed) {
      // No common prefix with group anchor — flush current group, start new
      flush(i)
      groupStart = i
    }
  }
  flush(sorted.length)

  return result
}

export function groupNodesByGeo(nodes: ParsedNode[]): NaturalGroup[] {
  const map = new Map<string, ParsedNode[]>()
  const unmatched: ParsedNode[] = []

  // ── Pass 1: geo table matching ────────────────────────────────────────────
  for (const node of nodes) {
    const label = getGeoLabel(node.name)
    if (label === '其他') {
      unmatched.push(node)
    } else {
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(node)
    }
  }

  // ── Pass 2: prefix clustering ─────────────────────────────────────────────
  const clustered = clusterByPrefix(unmatched)
  for (const [name, group] of clustered.entries()) {
    if (name === '__leftovers__') {
      map.set('其他', group)
    } else {
      map.set(name, group)
    }
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const labelOrder = new Map(GEO_TABLE.map((e, i) => [e.label, i]))
  const GEO_COUNT = GEO_TABLE.length

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const ai = labelOrder.get(a) ?? (a === '其他' ? Infinity : GEO_COUNT)
      const bi = labelOrder.get(b) ?? (b === '其他' ? Infinity : GEO_COUNT)
      return ai - bi
    })
    .map(([name, nodes]) => ({ name, nodes, urltest: false }))
}
