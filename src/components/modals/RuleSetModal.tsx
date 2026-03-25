import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { RuleSetEntry } from '@/types'
import { Button, Input, Label, FormGroup } from '../ui'
import { cn } from '@/utils/cn'
import { useStore } from '@/store'

interface RuleSetDraft {
  id: number
  tag: string
  url: string
  tagError?: string
  urlError?: string
}

let draftId = 0

interface Props {
  availableOutbounds: string[]
  onConfirm: (entries: RuleSetEntry[]) => void
  onClose: () => void
}

export function RuleSetModal({ availableOutbounds, onConfirm, onClose }: Props) {
  const [outbound, setOutbound] = useState(availableOutbounds[0] ?? 'proxy')
  const [drafts, setDrafts] = useState<RuleSetDraft[]>([
    { id: ++draftId, tag: '', url: '' },
  ])
  const [outboundError, setOutboundError] = useState('')
  const dnsMode = useStore((s) => s.dnsMode)

  // ── Draft management ──────────────────────────────────────────────────────

  function addDraft() {
    setDrafts((prev) => [...prev, { id: ++draftId, tag: '', url: '' }])
  }

  function removeDraft(id: number) {
    setDrafts((prev) => prev.length > 1 ? prev.filter((d) => d.id !== id) : prev)
  }

  function updateDraft(id: number, field: 'tag' | 'url', value: string) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, [field]: value, [`${field}Error`]: undefined }
          : d,
      ),
    )
  }

  // ── Validation & confirm ──────────────────────────────────────────────────

  function handleConfirm() {
    let valid = true

    if (!outbound) {
      setOutboundError('请选择目标分组')
      valid = false
    } else {
      setOutboundError('')
    }

    const validated = drafts.map((d) => {
      const tagError = !d.tag.trim() ? '请填写 tag' : undefined
      const urlError = !d.url.trim() || !d.url.startsWith('http')
        ? '请输入有效 URL'
        : undefined
      if (tagError || urlError) valid = false
      return { ...d, tagError, urlError }
    })

    setDrafts(validated)
    if (!valid) return

    onConfirm(
      drafts.map((d) => ({
        tag: d.tag.trim(),
        url: d.url.trim(),
        outbound,
      })),
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-2 border border-border-2 rounded-2xl w-[540px] max-w-[95vw] max-h-[85vh] flex flex-col animate-slide-up">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-bold">添加规则集</h2>
          <Button size="sm" variant="ghost" onClick={onClose}><X size={14} /></Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          {/* Outbound — shared by all drafts */}
          <FormGroup>
            <Label>路由到（所有规则集共用）</Label>
            <select
              value={outbound}
              onChange={(e) => { setOutbound(e.target.value); setOutboundError('') }}
              className={cn(
                'w-full bg-bg border rounded-md text-text font-mono text-[12px] px-3 py-2.5',
                'outline-none focus:border-accent transition-colors',
                outboundError ? 'border-red-500' : 'border-border',
              )}
            >
              {availableOutbounds.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {outboundError && (
              <p className="text-[11px] text-red-400 mt-1">{outboundError}</p>
            )}
          </FormGroup>

          {/* Rule set list */}
          <FormGroup>
            <Label>规则集列表</Label>
            {dnsMode === 'fakeip' && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-400/70 px-0.5 pb-2">
                <span>当前是 FakeIP 模式，该模式下 IP 规则集仅对硬编码 IP 的直连流量生效，命中率极低，请谨慎添加需走代理的 geoip 规则。</span>
              </div>
            )}
            <div className="space-y-2">
              {drafts.map((draft, i) => (
                <div
                  key={draft.id}
                  className="p-3 bg-bg border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-text-3 font-mono">#{i + 1}</span>
                    <button
                      onClick={() => removeDraft(draft.id)}
                      className={cn(
                        'text-text-3 transition-colors',
                        drafts.length > 1
                          ? 'hover:text-red-400 cursor-pointer'
                          : 'opacity-30 cursor-not-allowed',
                      )}
                      disabled={drafts.length <= 1}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <Input
                        value={draft.tag}
                        onChange={(e) => updateDraft(draft.id, 'tag', e.target.value)}
                        placeholder="tag，如：geosite-netflix"
                        className={draft.tagError ? 'border-red-500' : ''}
                      />
                      {draft.tagError && (
                        <p className="text-[11px] text-red-400 mt-0.5">{draft.tagError}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        value={draft.url}
                        onChange={(e) => updateDraft(draft.id, 'url', e.target.value)}
                        placeholder="https://example.com/netflix.srs"
                        className={draft.urlError ? 'border-red-500' : ''}
                      />
                      {draft.urlError && (
                        <p className="text-[11px] text-red-400 mt-0.5">{draft.urlError}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addDraft}
                className="flex items-center gap-1.5 text-[11px] text-text-3
                           hover:text-text-2 transition-colors w-full py-1"
              >
                <Plus size={12} /> 再添加一个规则集
              </button>
            </div>
          </FormGroup>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-border">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleConfirm}>
            添加 {drafts.length > 1 ? `${drafts.length} 个规则集` : '规则集'}
          </Button>
        </div>
      </div>
    </div>
  )
}