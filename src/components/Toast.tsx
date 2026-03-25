import { CheckCircle, XCircle, Info } from 'lucide-react'
import type { ToastType } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const icons = {
  success: <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />,
  error:   <XCircle    size={14} className="text-red-400 flex-shrink-0" />,
  info:    <Info       size={14} className="text-blue-400 flex-shrink-0" />,
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[13px] max-w-xs',
            'bg-bg-2 border-border-2 shadow-xl animate-slide-up',
          )}
        >
          {icons[t.type]}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
