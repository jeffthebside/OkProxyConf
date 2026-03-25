import { useState } from 'react'
import { Hexagon } from 'lucide-react'
import { ConfigPreview } from './components/ConfigPreview'
import { SubscriptionPanel } from './components/SubscriptionPanel'
import { LogicGroupPanel } from './components/LogicGroupPanel'
import { RuleSetPanel } from './components/RuleSetPanel'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import { cn } from './utils/cn'
import { TemplatePanel } from './components/TemplatePanel'

type Tab = 'subscription' | 'groups' | 'rules' | 'template'

const TABS: { id: Tab; label: string }[] = [
  { id: 'subscription', label: '订阅' },
  { id: 'groups', label: '分组' },
  { id: 'rules', label: '规则' },
  { id: 'template', label: '模板' },
]

function App() {
  const [tab, setTab] = useState<Tab>('subscription')
  const { toasts, show } = useToast()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text font-sans">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border flex-shrink-0 bg-bg z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
            <Hexagon size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-widest uppercase">
            OkProxyConf <span className="text-text-3 font-normal">Sing-Box Generator</span>
          </span>
        </div>
        <span className="text-[11px] text-text-3 font-mono">Sing-Box v1.12</span>
      </header>

      {/* ── Main split layout ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: config preview */}
        <div className="flex-1 overflow-hidden">
          <ConfigPreview />
        </div>

        {/* Right: control panel */}
        <div className="w-[420px] flex-shrink-0 flex flex-col bg-bg-2 overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-1 p-2 bg-bg border-b border-border flex-shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all',
                  tab === t.id
                    ? 'bg-bg-3 text-text'
                    : 'text-text-3 hover:text-text-2',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'subscription' && <SubscriptionPanel onToast={show} />}
            {tab === 'groups' && <LogicGroupPanel onToast={show} />}
            {tab === 'rules' && <RuleSetPanel onToast={show} />}
            {tab === 'template' && <TemplatePanel onToast={show} />}
          </div>

          {/* Status bar */}
          <StatusBar />
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

export default App
