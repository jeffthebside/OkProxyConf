import { useState } from 'react'
import { X, Search } from 'lucide-react'
import type { LogicGroup } from '@/types'
import { Button, Input, Label, FormGroup } from '../ui'
import { cn } from '@/utils/cn'

// Static outbounds that are always available alongside natural groups
const STATIC_OPTIONS = [
  { tag: 'direct', label: 'direct', description: '直连' },
  { tag: 'proxy',  label: 'proxy',  description: '跟随 proxy 选择器' },
]

interface Props {
  naturalGroupNames: string[]
  onConfirm: (group: LogicGroup) => void
  onClose: () => void
}

export function LogicGroupModal({ naturalGroupNames, onConfirm, onClose }: Props) {
  const [name, setName]         = useState('')
  const [type, setType]         = useState<'selector' | 'urltest'>('selector')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState('')
  const [errors, setErrors]     = useState<Record<string, string>>({})

  // All selectable options: statics first, then natural groups
  const allOptions    = [...STATIC_OPTIONS.map((o) => o.tag), ...naturalGroupNames]
  const filteredNatural = search.trim()
    ? naturalGroupNames.filter((n) => n.toLowerCase().includes(search.trim().toLowerCase()))
    : naturalGroupNames

  const hiddenSelected = search.trim()
    ? naturalGroupNames.filter((n) => selected.has(n) && !filteredNatural.includes(n))
    : []

  const toggle = (n: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })

  const allFilteredSelected =
    filteredNatural.length > 0 && filteredNatural.every((n) => selected.has(n))

  const selectAllFiltered = () =>
    setSelected((prev) => { const s = new Set(prev); filteredNatural.forEach((n) => s.add(n)); return s })

  const clearAllFiltered = () =>
    setSelected((prev) => { const s = new Set(prev); filteredNatural.forEach((n) => s.delete(n)); return s })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = '请填写分组名称'
    if (selected.size === 0) errs.selected = '请至少选择一个出口'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleConfirm = () => {
    if (!validate()) return
    // Preserve insertion order: statics first, then natural groups in original order
    const ordered = allOptions.filter((o) => selected.has(o))
    onConfirm({ name: name.trim(), type, naturalGroupNames: ordered })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-2 border border-border-2 rounded-2xl w-[520px] max-w-[95vw] max-h-[85vh] flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-bold">创建逻辑分组</h2>
          <Button size="sm" variant="ghost" onClick={onClose}><X size={14} /></Button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          <FormGroup>
            <Label>分组名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：流媒体、Gaming、OpenAI…"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </FormGroup>

          <FormGroup>
            <Label>选择器类型</Label>
            <div className="flex gap-2 mt-1">
              {(['selector', 'urltest'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg border text-[12px] font-semibold transition-all',
                    type === t
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-bg text-text-2 hover:border-border-2',
                  )}
                >
                  {t}
                  {t === 'urltest' && (
                    <span className="text-text-3 font-normal ml-1">（自动测速）</span>
                  )}
                </button>
              ))}
            </div>
          </FormGroup>

          <FormGroup>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="mb-0">出口选项</Label>
              {filteredNatural.length > 0 && (
                <button
                  onClick={allFilteredSelected ? clearAllFiltered : selectAllFiltered}
                  className="text-[11px] text-accent hover:text-blue-300 transition-colors"
                >
                  {allFilteredSelected ? '取消全选' : '全选'}{search.trim() ? '筛选结果' : '自然分组'}
                </button>
              )}
            </div>

            {errors.selected && (
              <p className="text-[11px] text-red-400 mb-1.5">{errors.selected}</p>
            )}

            {/* Static options: direct + proxy */}
            <div className="flex gap-1.5 mb-2">
              {STATIC_OPTIONS.map((o) => (
                <button
                  key={o.tag}
                  onClick={() => toggle(o.tag)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] text-left transition-all flex-1',
                    selected.has(o.tag)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-bg text-text-2 hover:border-border-2',
                  )}
                >
                  <span className={cn(
                    'w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center text-[9px]',
                    selected.has(o.tag) ? 'bg-accent border-accent text-white' : 'border-border-2',
                  )}>
                    {selected.has(o.tag) && '✓'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono">{o.label}</div>
                    <div className="text-[10px] text-text-3 font-normal">{o.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-text-3">自然分组</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Search */}
            {naturalGroupNames.length >= 6 && (
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索分组…"
                  className="w-full bg-bg border border-border rounded-md text-text font-mono text-[12px]
                             pl-7 pr-7 py-2 outline-none focus:border-accent transition-colors placeholder:text-text-3"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            )}

            {/* Hidden selected (filtered out) */}
            {hiddenSelected.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2 px-2 py-1.5 bg-accent/5 border border-accent/20 rounded-lg">
                <span className="text-[10px] text-text-3 w-full mb-0.5">已选（搜索中隐藏）</span>
                {hiddenSelected.map((n) => (
                  <span key={n} className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10
                                           border border-accent/30 rounded text-[11px] text-accent font-mono">
                    {n}
                    <button onClick={() => toggle(n)} className="hover:text-red-400 transition-colors">
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Natural group grid */}
            {filteredNatural.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {filteredNatural.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggle(n)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] text-left transition-all',
                      selected.has(n)
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-bg text-text-2 hover:border-border-2',
                    )}
                  >
                    <span className={cn(
                      'w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center text-[9px]',
                      selected.has(n) ? 'bg-accent border-accent text-white' : 'border-border-2',
                    )}>
                      {selected.has(n) && '✓'}
                    </span>
                    <span className="truncate">{n}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-[12px] text-text-3">无匹配分组</p>
            )}

            {selected.size > 0 && (
              <p className="text-[11px] text-text-3 mt-1.5">
                已选 <span className="text-accent font-semibold">{selected.size}</span> 个出口
              </p>
            )}
          </FormGroup>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-border">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleConfirm}>确认创建</Button>
        </div>
      </div>
    </div>
  )
}