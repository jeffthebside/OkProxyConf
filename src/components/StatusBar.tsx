// src/components/StatusBar.tsx
import { Download, Pencil } from 'lucide-react'
import { useStore, selectOutputText } from '@/store'
import { Button } from './ui'
import { cn } from '@/utils/cn'

const dotClass: Record<string, string> = {
  idle:    'bg-text-3',
  ok:      'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]',
  loading: 'bg-amber-400 animate-pulse',
  error:   'bg-red-400',
}

export function StatusBar() {
  const statusMessage = useStore((s) => s.statusMessage)
  const statusType    = useStore((s) => s.statusType)
  const isManualMode  = useStore((s) => s.isManualMode)
  const outputText    = useStore(selectOutputText)

  const handleDownload = () => {
    const now = new Date()
    const ts  = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    // → "20240315T123456Z"

    const blob = new Blob([outputText], { type: 'application/json' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `config-${ts}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-border flex-shrink-0 bg-bg">
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotClass[statusType])} />
      <span className="text-[11px] text-text-3 flex-1 truncate">{statusMessage}</span>

      {/* Remind user that manual mode is active */}
      {isManualMode && (
        <span className="flex items-center gap-1 text-[10px] text-amber-400/70 flex-shrink-0">
          <Pencil size={10} /> 手动模式
        </span>
      )}

      <Button size="sm" variant="success" onClick={handleDownload}>
        <Download size={12} /> 保存配置
      </Button>
    </div>
  )
}