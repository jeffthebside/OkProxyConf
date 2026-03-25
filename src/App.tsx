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
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/jeffthebside/OkProxyConf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-3 hover:text-text-2"
            aria-label="Open repository on GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              className="inline-block"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.262.82-.582 0-.287-.01-1.044-.016-2.05-3.338.727-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.527.117-3.176 0 0 1.008-.322 3.3 1.23A11.52 11.52 0 0112 5.8c1.02.004 2.045.138 3.003.404 2.29-1.552 3.296-1.23 3.296-1.23.656 1.65.244 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.803 5.62-5.475 5.92.43.37.815 1.102.815 2.222 0 1.606-.015 2.902-.015 3.296 0 .322.216.699.825.58C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0z" />
            </svg>
          </a>
        </div>
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
