// src/components/SubscriptionPanel.tsx
import { useState } from 'react'
import {
  RefreshCw, ChevronRight, Loader2,
  Link, ClipboardPaste, Plus, X, Trash2,
} from 'lucide-react'
import { useStore } from '@/store'
import { Button, Section, SectionHeader, Textarea, Input, Badge } from './ui'
import { cn } from '@/utils/cn'

type InputMode = 'url' | 'paste'

interface UrlEntry {
  id: number
  url: string
  status: 'idle' | 'loading' | 'ok' | 'error'
  error?: string
}

let idCounter = 0

export function SubscriptionPanel({
  onToast,
}: {
  onToast: (msg: string, t: 'success' | 'error' | 'info') => void
}) {
  const [mode, setMode]                 = useState<InputMode>('url')
  const [urls, setUrls]                 = useState<UrlEntry[]>([{ id: ++idCounter, url: '', status: 'idle' }])
  const [pasteContent, setPasteContent] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const parseContent       = useStore((s) => s.parseContent)
  const clearNodes         = useStore((s) => s.clearNodes)
  const removeNaturalGroup = useStore((s) => s.removeNaturalGroup)
  const removeNode         = useStore((s) => s.removeNode)
  const isLoading          = useStore((s) => s.isLoading)
  const naturalGroups      = useStore((s) => s.naturalGroups)
  const toggleNaturalGroupUrltest = useStore((s) => s.toggleNaturalGroupUrltest)

  const totalNodes = naturalGroups.reduce((sum, g) => sum + g.nodes.length, 0)
  const hasNodes   = naturalGroups.length > 0

  // ── URL mode ──────────────────────────────────────────────────────────────

  function addUrl() {
    setUrls((prev) => [...prev, { id: ++idCounter, url: '', status: 'idle' }])
  }

  function removeUrl(id: number) {
    setUrls((prev) => prev.length > 1 ? prev.filter((u) => u.id !== id) : prev)
  }

  function updateUrl(id: number, url: string) {
    setUrls((prev) =>
      prev.map((u) => u.id === id ? { ...u, url, status: 'idle', error: undefined } : u),
    )
  }

  function setUrlStatus(id: number, status: UrlEntry['status'], error?: string) {
    setUrls((prev) =>
      prev.map((u) => u.id === id ? { ...u, status, error } : u),
    )
  }

  async function fetchUrl(entry: UrlEntry): Promise<string | null> {
    const url = entry.url.trim()
    if (!url) return null
    setUrlStatus(entry.id, 'loading')
    try {
      const res = await fetch(url, {
        signal:  AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'ClashForAndroid/2.5.12' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      setUrlStatus(entry.id, 'ok')
      return text
    } catch (e) {
      const isCors = e instanceof TypeError
      const msg    = isCors ? 'CORS 限制' : (e instanceof Error ? e.message : String(e))
      setUrlStatus(entry.id, 'error', msg)
      return null
    }
  }

  async function handleFetchAll() {
    const validUrls = urls.filter((u) => u.url.trim())
    if (validUrls.length === 0) {
      onToast('请输入至少一个订阅链接', 'error')
      return
    }
    const results  = await Promise.all(validUrls.map(fetchUrl))
    const combined = results.filter((t): t is string => t !== null).join('\n')
    if (!combined) {
      onToast('所有链接拉取失败，请尝试切换至粘贴模式', 'error')
      return
    }
    const corsFailures = urls.filter((u) => u.status === 'error' && u.error === 'CORS 限制')
    if (corsFailures.length > 0) {
      onToast(`${corsFailures.length} 个链接有跨域限制，可切换粘贴模式补充`, 'info')
    }
    parseContent(combined, hasNodes ? 'merge' : 'replace')
  }

  // ── Paste mode ────────────────────────────────────────────────────────────

  function handlePaste() {
    if (!pasteContent.trim()) {
      onToast('请粘贴订阅内容', 'error')
      return
    }
    parseContent(pasteContent.trim(), hasNodes ? 'merge' : 'replace')
  }

  // ── Clear all ─────────────────────────────────────────────────────────────

  function handleClear() {
    clearNodes()
    setConfirmClear(false)
    onToast('已清空所有节点', 'info')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Section>
        {/* Mode toggle */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg border-b border-border">
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-2">订阅来源</span>
          <div className="flex gap-1 p-0.5 bg-bg-3 rounded-md border border-border">
            <ModeTab active={mode === 'url'}   onClick={() => setMode('url')}>
              <Link size={11} /> URL
            </ModeTab>
            <ModeTab active={mode === 'paste'} onClick={() => setMode('paste')}>
              <ClipboardPaste size={11} /> 粘贴
            </ModeTab>
          </div>
        </div>

        <div className="p-3.5 space-y-3">
          {mode === 'url' ? (
            <>
              <p className="text-[11px] text-text-3 leading-relaxed">
                直接输入订阅链接自动拉取。若遇跨域限制会提示切换至粘贴模式。
              </p>
              <div className="space-y-2">
                {urls.map((entry) => (
                  <div key={entry.id} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Input
                          value={entry.url}
                          onChange={(e) => updateUrl(entry.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                          placeholder="https://example.com/sub?token=xxx"
                          className={cn(
                            'pr-7',
                            entry.status === 'error' && 'border-red-500/60',
                            entry.status === 'ok'    && 'border-emerald-500/60',
                          )}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">
                          {entry.status === 'loading' && <Loader2 size={12} className="animate-spin text-text-3" />}
                          {entry.status === 'ok'      && <span className="text-emerald-400">✓</span>}
                          {entry.status === 'error'   && <span className="text-red-400">✕</span>}
                        </span>
                      </div>
                      <button
                        onClick={() => removeUrl(entry.id)}
                        className="text-text-3 hover:text-red-400 transition-colors flex-shrink-0"
                        tabIndex={-1}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {entry.status === 'error' && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] text-red-400">{entry.error}</span>
                        {entry.error === 'CORS 限制' && (
                          <button
                            className="text-[11px] text-accent underline underline-offset-2"
                            onClick={() => setMode('paste')}
                          >
                            切换粘贴
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addUrl}
                className="flex items-center gap-1.5 text-[11px] text-text-3 hover:text-text-2 transition-colors"
              >
                <Plus size={12} /> 添加链接
              </button>
              <Button variant="primary" full onClick={handleFetchAll} disabled={isLoading}>
                {isLoading
                  ? <><Loader2 size={13} className="animate-spin" /> 拉取中…</>
                  : <><RefreshCw size={13} /> {hasNodes ? '追加拉取' : '拉取并解析'}</>
                }
              </Button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-text-3 leading-relaxed">
                在浏览器打开订阅链接，复制响应内容粘贴至此。支持 Clash YAML、V2Ray Base64、SingBox JSON、URI 列表。
              </p>
              <Textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={8}
                placeholder="粘贴订阅内容…"
              />
              <Button variant="primary" full onClick={handlePaste} disabled={isLoading}>
                {isLoading
                  ? <><Loader2 size={13} className="animate-spin" /> 解析中…</>
                  : <><RefreshCw size={13} /> {hasNodes ? '追加解析' : '解析节点'}</>
                }
              </Button>
            </>
          )}
        </div>
      </Section>

      {/* Node groups */}
      {hasNodes && (
        <Section>
          <SectionHeader title="自然分组（地区）" accent="green">
            <div className="flex items-center gap-2">
              <Badge variant="green">{totalNodes} 个节点</Badge>
              {confirmClear ? (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <span className="text-[11px] text-red-400">确认清空？</span>
                  <button
                    onClick={handleClear}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors"
                  >
                    是
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-[11px] text-text-3 hover:text-text-2 transition-colors"
                  >
                    否
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-text-3 hover:text-red-400 transition-colors"
                  title="清空所有节点"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </SectionHeader>

          <div className="p-3.5 space-y-2">
            {naturalGroups.map((group) => (
              <GroupItem
                key={group.name}
                name={group.name}
                count={group.nodes.length}
                urltest={group.urltest}
                onToggleUrltest={() => toggleNaturalGroupUrltest(group.name)}
                onRemoveGroup={() => {
                  removeNaturalGroup(group.name)
                  onToast(`已删除分组「${group.name}」`, 'info')
                }}
              >
                {group.nodes.map((n) => (
                  <div
                    key={n.name}
                    className="group/node relative flex items-center gap-2 py-1.5 text-[11px] text-text-3 font-mono"
                  >
                    <span className="w-1 h-1 rounded-full bg-accent-3 flex-shrink-0" />
                    <span className="flex-1 truncate min-w-0">{n.name}</span>
                    <span className="opacity-50 group-hover/node:opacity-0 transition-opacity flex-shrink-0">
                      {n.outbound.type}
                    </span>
                    <button
                      onClick={() => {
                        removeNode(group.name, n.name)
                        onToast(`已删除节点「${n.name}」`, 'info')
                      }}
                      className="opacity-0 group-hover/node:opacity-100 transition-opacity
                                 absolute right-0 text-text-3 hover:text-red-400 flex-shrink-0"
                      title="删除此节点"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </GroupItem>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeTab({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all',
        active ? 'bg-bg text-text' : 'text-text-3 hover:text-text-2',
      )}
    >
      {children}
    </button>
  )
}

function GroupItem({
  name, count, urltest, onToggleUrltest, onRemoveGroup, children,
}: {
  name: string
  count: number
  urltest: boolean
  onToggleUrltest: () => void
  onRemoveGroup: () => void
  children: React.ReactNode
}) {
  const [open, setOpen]             = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div className="bg-bg border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-bg-2 transition-colors">

        {/* Expand toggle */}
        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          onClick={() => { setOpen(!open); setConfirmDel(false) }}
        >
          <ChevronRight
            size={12}
            className={cn('text-text-3 transition-transform flex-shrink-0', open && 'rotate-90')}
          />
          <span className="flex-1 text-[13px] font-semibold text-text truncate">{name}</span>
          <span className="text-[11px] text-text-3 font-mono flex-shrink-0">{count}</span>
        </button>

        {/* urltest toggle */}
        <label
          className="flex items-center gap-1 cursor-pointer flex-shrink-0 px-1"
          title={urltest ? '已启用 Auto 测速，点击关闭' : '点击启用 Auto 测速'}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={urltest}
            onChange={onToggleUrltest}
            className="w-3 h-3 accent-accent"
          />
          <span className="text-[10px] text-text-3">Auto</span>
        </label>

        {/* Delete group with inline confirm */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pl-2 border-l border-border">
          {confirmDel ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <span className="text-[11px] text-red-400">删除？</span>
              <button
                onClick={onRemoveGroup}
                className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors"
              >
                是
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-[11px] text-text-3 hover:text-text-2 transition-colors"
              >
                否
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDel(true) }}
              className="text-text-3 hover:text-red-400 transition-colors p-0.5"
              title="删除整个分组"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border max-h-52 overflow-y-auto animate-fade-in">
          <div className="px-3 py-1.5 space-y-0.5">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}