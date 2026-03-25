import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Section, SectionHeader, Badge } from './ui'
import { RuleSetModal } from './modals/RuleSetModal'
import { isIpRuleSet } from '@/utils/ruleSet'
import type { RuleSetEntry } from '@/types'

export function RuleSetPanel({
  onToast,
}: {
  onToast: (msg: string, t: 'success' | 'error' | 'info') => void
}) {
  const customRuleSets      = useStore((s) => s.customRuleSets)
  const naturalGroups       = useStore((s) => s.naturalGroups)
  const logicGroups         = useStore((s) => s.logicGroups)
  const addCustomRuleSet    = useStore((s) => s.addCustomRuleSet)
  const removeCustomRuleSet = useStore((s) => s.removeCustomRuleSet)

  const [showModal, setShowModal] = useState(false)

  const availableOutbounds = [
    'proxy', 'direct',
    ...logicGroups.map((g) => g.name),
    ...naturalGroups.map((g) => g.name),
  ]

  // Group by outbound for display
  const grouped = customRuleSets.reduce<Record<string, RuleSetEntry[]>>((acc, rs) => {
    if (!acc[rs.outbound]) acc[rs.outbound] = []
    acc[rs.outbound].push(rs)
    return acc
  }, {})

  function handleConfirm(entries: RuleSetEntry[]) {
    entries.forEach((rs) => addCustomRuleSet(rs))
    setShowModal(false)
    onToast(
      entries.length > 1
        ? `已添加 ${entries.length} 个规则集 → ${entries[0].outbound}`
        : `规则集「${entries[0].tag}」已添加 → ${entries[0].outbound}`,
      'success',
    )
  }

  return (
    <>
      <div className="space-y-4">
        <Section>
          <SectionHeader title="自定义规则集" accent="amber">
            <Badge variant="gray">{customRuleSets.length}</Badge>
          </SectionHeader>
          <div className="p-3.5 space-y-3">
            {customRuleSets.length === 0 ? (
              <p className="text-center py-5 text-[12px] text-text-3">暂无自定义规则集</p>
            ) : (
              Object.entries(grouped).map(([outboundName, entries]) => (
                <div key={outboundName}>
                  {/* Outbound group header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-text-3">→</span>
                    <span className="text-[12px] font-semibold text-text-2">{outboundName}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Rule sets under this outbound */}
                  <div className="space-y-1 pl-3">
                    {entries.map((rs) => {
                      const index = customRuleSets.indexOf(rs)
                      const isIp  = isIpRuleSet(rs.tag)
                      return (
                        <div
                          key={rs.tag}
                          className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg"
                        >
                          <span className="flex-1 text-[11px] font-mono text-text-2 truncate">
                            {rs.tag}
                          </span>
                          {/* IP badge — tells user this rule fires after resolve */}
                          {isIp && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded
                                         bg-amber-400/10 text-amber-400 border border-amber-400/20
                                         flex-shrink-0"
                              title="IP 类规则集，将在 resolve 之后匹配"
                            >
                              IP
                            </span>
                          )}
                          <button
                            onClick={() => {
                              removeCustomRuleSet(index)
                              onToast(`已移除「${rs.tag}」`, 'info')
                            }}
                            className="text-text-3 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            <Button variant="secondary" full onClick={() => setShowModal(true)}>
              <Plus size={13} /> 添加规则集
            </Button>
          </div>
        </Section>

        {/* Built-in GEO rule sets */}
        <Section>
          <SectionHeader title="内置 GEO 规则集" accent="blue" />
          <div className="p-3.5 space-y-1.5">
            {[
              { tag: 'geosite-category-ads-all', ip: false },
              { tag: 'geosite-cn',               ip: false },
              { tag: 'geosite-geolocation-!cn',  ip: false },
              { tag: 'geoip-cn',                 ip: true  },
            ].map(({ tag, ip }) => (
              <div
                key={tag}
                className="flex items-center gap-2 px-3 py-1.5 bg-bg border border-border rounded-md"
              >
                <span className="flex-1 text-[11px] font-mono text-text-2">{tag}</span>
                {ip && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded
                               bg-amber-400/10 text-amber-400 border border-amber-400/20"
                    title="IP 类规则集，在 resolve 之后匹配"
                  >
                    IP
                  </span>
                )}
                <Badge variant="gray">内置</Badge>
              </div>
            ))}
          </div>
        </Section>

        {/* Explain resolve ordering */}
        <Section>
          <SectionHeader title="匹配顺序说明" accent="blue" />
          <div className="p-3.5 space-y-2 text-[11px] text-text-3 leading-relaxed">
            <div className="flex gap-2">
              <span className="text-text-2 font-mono flex-shrink-0">1.</span>
              <span>域名规则（geosite-*）在 DNS 解析前匹配，命中后直接路由，不再解析</span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-2 font-mono flex-shrink-0">2.</span>
              <span>未命中的流量执行 DNS resolve，将域名解析为 IP</span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-2 font-mono flex-shrink-0">3.</span>
              <span>
                IP 规则（geoip-*，标记为
                <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded
                                 bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">
                  IP
                </span>
                ）在 resolve 后匹配
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-2 font-mono flex-shrink-0">4.</span>
              <span>仍未命中的流量走 final（proxy）</span>
            </div>
          </div>
        </Section>
      </div>

      {showModal && (
        <RuleSetModal
          availableOutbounds={availableOutbounds}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
