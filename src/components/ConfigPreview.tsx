import { useRef, useState, useCallback } from 'react'
import { Copy, Download, Pencil, Check, X, RotateCcw } from 'lucide-react'
import { useStore, selectOutputText } from '@/store'
import { Button } from './ui'
import { cn } from '@/utils/cn'

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match))
          return /:$/.test(match)
            ? `<span class="json-key">${match}</span>`
            : `<span class="json-str">${match}</span>`
        if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`
        if (/null/.test(match))       return `<span class="json-null">${match}</span>`
        return `<span class="json-num">${match}</span>`
      },
    )
}

export function ConfigPreview() {
  const isManualMode     = useStore((s) => s.isManualMode)
  const manualConfigText = useStore((s) => s.manualConfigText)
  const configJson       = useStore((s) => s.configJson)
  const enterManualMode  = useStore((s) => s.enterManualMode)
  const commitManualEdit = useStore((s) => s.commitManualEdit)
  const exitManualMode   = useStore((s) => s.exitManualMode)
  const dnsMode          = useStore((s) => s.dnsMode)
  const setDnsMode       = useStore((s) => s.setDnsMode)
  const outputText       = useStore(selectOutputText)

  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [copied, setCopied]       = useState(false)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  // ── Edit lifecycle ────────────────────────────────────────────────────────

  const handleEnterEdit = () => {
    enterManualMode()
    setIsEditing(true)
    setEditError('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleSaveEdit = () => {
    const text = textareaRef.current?.value ?? ''
    const result = commitManualEdit(text)
    if (result.ok) {
      setIsEditing(false)
      setEditError('')
    } else {
      setEditError(result.error)
    }
  }

  const handleDiscardEdit = () => {
    exitManualMode()
    setIsEditing(false)
    setEditError('')
  }

  // ── Copy / Download ───────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [outputText])

  const handleDownload = useCallback(() => {
    const now = new Date()
    const ts  = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    // → "20240315T123456Z"

    const blob = new Blob([outputText], { type: 'application/json' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `config-${ts}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [outputText])

  const displayText = isManualMode ? manualConfigText : configJson

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full border-r border-border overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0 bg-bg gap-3">

        {/* Left: title + dns mode toggle */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-2 flex-shrink-0">
            📄 Sing-Box v1.12
          </span>

          {/* DNS mode toggle */}
          <div className="flex gap-1 p-0.5 bg-bg-3 rounded-md border border-border flex-shrink-0">
            {(['redir-host', 'fakeip'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setDnsMode(m)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-semibold transition-all',
                  dnsMode === m
                    ? 'bg-bg text-text'
                    : 'text-text-3 hover:text-text-2',
                )}
              >
                {m === 'redir-host' ? 'Redir-host' : 'FakeIP'}
              </button>
            ))}
          </div>

          {/* Manual mode badge */}
          {isManualMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]
                             font-bold bg-amber-400/15 text-amber-400 border border-amber-400/20
                             flex-shrink-0">
              <Pencil size={9} /> 手动编辑
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex gap-1.5 flex-shrink-0">
          {isEditing ? (
            <>
              <Button size="sm" variant="success" onClick={handleSaveEdit}>
                <Check size={12} /> 保存
              </Button>
              <Button size="sm" variant="danger" onClick={handleDiscardEdit}>
                <X size={12} /> 放弃
              </Button>
            </>
          ) : (
            <>
              {isManualMode && (
                <Button size="sm" variant="ghost" onClick={handleDiscardEdit} title="恢复自动生成">
                  <RotateCcw size={12} /> 重置
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleEnterEdit}>
                <Pencil size={12} /> 编辑
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? '已复制' : '复制'}
          </Button>
          <Button size="sm" variant="success" onClick={handleDownload}>
            <Download size={12} /> 保存
          </Button>
        </div>
      </div>

      {/* ── Manual mode notice bar ── */}
      {isManualMode && !isEditing && (
        <div className="px-4 py-1.5 bg-amber-400/8 border-b border-amber-400/20
                        text-[11px] text-amber-400/80 flex items-center gap-2">
          <Pencil size={11} className="flex-shrink-0" />
          <span>手动编辑模式，右侧面板操作不会覆盖此配置。点击「重置」恢复自动生成。</span>
        </div>
      )}

      {/* ── JSON error bar ── */}
      {editError && (
        <div className="px-4 py-1.5 bg-red-500/10 border-b border-red-500/30 text-[11px] text-red-400">
          {editError}
        </div>
      )}

      {/* ── Code area ── */}
      <div className="flex-1 overflow-auto bg-bg p-5 font-mono text-[12px] leading-relaxed">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            defaultValue={manualConfigText}
            className="w-full h-full min-h-[400px] bg-transparent text-text outline-none resize-none"
            spellCheck={false}
          />
        ) : (
          <div
            className={cn('whitespace-pre text-text', isManualMode && 'opacity-90')}
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(displayText) }}
          />
        )}
      </div>
    </div>
  )
}