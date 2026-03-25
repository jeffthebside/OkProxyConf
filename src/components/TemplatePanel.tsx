import { useRef, useState } from 'react'
import { Upload, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useStore } from '@/store'
import { hasFakeip } from '@/utils/buildConfig'
import { Button, Section, SectionHeader, Textarea, FormGroup, Badge } from './ui'
import { cn } from '@/utils/cn'
import type { CustomTemplate } from '@/types'

const OVERRIDE_KEYS: (keyof CustomTemplate)[] = ['log', 'dns', 'inbounds', 'experimental']

export function TemplatePanel({
  onToast,
}: {
  onToast: (msg: string, t: 'success' | 'error' | 'info') => void
}) {
  const customTemplate      = useStore((s) => s.customTemplate)
  const setCustomTemplate   = useStore((s) => s.setCustomTemplate)
  const clearCustomTemplate = useStore((s) => s.clearCustomTemplate)
  const dnsMode             = useStore((s) => s.dnsMode)

  const [text, setText]             = useState('')
  const [parseError, setParseError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasTemplate = Object.keys(customTemplate).length > 0
  const activeKeys  = OVERRIDE_KEYS.filter((k) => customTemplate[k] !== undefined)

  // If custom template has fakeip dns, it overrides the store dnsMode
  const customDnsIsFakeip = customTemplate.dns
    ? hasFakeip(customTemplate.dns as Record<string, unknown>)
    : false
  const effectiveMode = customDnsIsFakeip ? 'fakeip' : dnsMode

  // ── Parse & apply ─────────────────────────────────────────────────────────

  function applyText(raw: string) {
    setParseError('')
    try {
      const json = JSON.parse(raw)
      const tpl: CustomTemplate = {}
      let found = 0

      for (const key of OVERRIDE_KEYS) {
        if (json[key] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(tpl as any)[key] = json[key]
          found++
        }
      }

      if (found === 0) {
        setParseError('未找到可覆盖的字段（log / dns / inbounds / experimental）')
        return
      }

      setCustomTemplate(tpl)
      setText('')
      onToast(`已应用自定义模板，覆盖 ${found} 个字段`, 'success')
    } catch (e) {
      setParseError(e instanceof SyntaxError ? `JSON 解析失败：${e.message}` : '无效 JSON')
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => applyText(ev.target?.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function handleClear() {
    clearCustomTemplate()
    setConfirmClear(false)
    setText('')
    setParseError('')
    onToast('已恢复内置模板', 'info')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Current template status ── */}
      <Section>
        <SectionHeader title="当前模板" accent="blue">
          {hasTemplate
            ? <Badge variant="purple">自定义</Badge>
            : <Badge variant="gray">内置</Badge>
          }
        </SectionHeader>
        <div className="p-3.5 space-y-3">

          {/* DNS mode — read-only display */}
          <div className={cn(
            'flex items-start gap-3 px-3 py-2.5 rounded-lg border',
            effectiveMode === 'fakeip'
              ? 'bg-violet-500/8 border-violet-500/20'
              : 'bg-bg border-border',
          )}>
            <Info size={13} className={cn(
              'flex-shrink-0 mt-0.5',
              effectiveMode === 'fakeip' ? 'text-violet-400' : 'text-text-3',
            )} />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-text">
                  DNS Mode: {effectiveMode === 'fakeip' ? 'FakeIP' : 'Redir-host'}
                </span>
                {customDnsIsFakeip && (
                  <span className="text-[10px] text-violet-400/70">由自定义模板决定</span>
                )}
              </div>
              <p className="text-[11px] text-text-3 leading-relaxed">
                {effectiveMode === 'fakeip'
                  ? 'DNS 查询直接返回假 IP，路由无需 resolve 步骤，延迟更低。'
                  : '域名先匹配规则，未命中再 resolve 为真实 IP 后匹配 IP 规则，兼容性更好。'
                }
              </p>
              {!customDnsIsFakeip && (
                <p className="text-[11px] text-text-3/60">
                  可在配置预览顶部切换模式。
                </p>
              )}
            </div>
          </div>

          {/* Template field status */}
          {hasTemplate ? (
            <>
              <p className="text-[11px] text-text-2 leading-relaxed">
                以下字段已被自定义模板覆盖，其余字段使用内置默认值。
                <br />
                <span className="text-text-3">
                  outbounds 和 route 始终由生成器管理，不受模板影响。
                </span>
              </p>

              <div className="flex flex-wrap gap-1.5">
                {OVERRIDE_KEYS.map((k) => {
                  const active = activeKeys.includes(k)
                  return (
                    <span
                      key={k}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border',
                        active
                          ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                          : 'bg-bg border-border text-text-3',
                      )}
                    >
                      {active && <CheckCircle size={10} />}
                      {k}
                    </span>
                  )
                })}
              </div>

              {/* Clear */}
              <div className="pt-1">
                {confirmClear ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-[11px] text-red-400">确认恢复内置模板？</span>
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
                    className="flex items-center gap-1.5 text-[11px] text-text-3
                               hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} /> 恢复内置模板
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-text-3 leading-relaxed">
              当前使用内置模板。上传或粘贴一个 SingBox 配置文件，生成器将提取其中的{' '}
              {OVERRIDE_KEYS.map((k, i) => (
                <span key={k}>
                  <span className="font-mono text-text-2">{k}</span>
                  {i < OVERRIDE_KEYS.length - 1 ? '、' : ''}
                </span>
              ))}{' '}
              字段作为自定义模板。
            </p>
          )}
        </div>
      </Section>

      {/* ── Upload / paste ── */}
      <Section>
        <SectionHeader title="上传配置文件" accent="green" />
        <div className="p-3.5 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFile}
          />

          <Button variant="secondary" full onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} /> 选择 JSON 文件
          </Button>

          <div className="flex items-center gap-3 text-text-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px]">或</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <FormGroup>
            <Textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setParseError('') }}
              rows={6}
              placeholder="粘贴 SingBox 配置 JSON…"
            />
          </FormGroup>

          {parseError && (
            <div className="flex items-start gap-2 text-[11px] text-red-400">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          <Button
            variant="primary"
            full
            disabled={!text.trim()}
            onClick={() => applyText(text)}
          >
            应用模板
          </Button>
        </div>
      </Section>

      {/* ── Info ── */}
      <Section>
        <SectionHeader title="说明" accent="blue" />
        <div className="p-3.5 space-y-2 text-[11px] text-text-3 leading-relaxed">
          <p>
            <span className="text-text-2 font-semibold">覆盖逻辑：</span>
            自定义模板按字段整体替换，不做深度合并。提供了 dns 字段则内置 dns 配置完全被替换。
          </p>
          <p>
            <span className="text-text-2 font-semibold">不受影响的字段：</span>
            outbounds 和 route 始终由生成器根据分组和规则集生成，模板中这两个字段会被忽略。
          </p>
          <p>
            <span className="text-text-2 font-semibold">部分覆盖：</span>
            可以只提供想修改的字段，其余字段继续使用内置值。
          </p>
          <p>
            <span className="text-text-2 font-semibold">FakeIP 自动检测：</span>
            若自定义模板的 dns 包含 fakeip server，生成器自动切换到 FakeIP 路由规则，无需手动操作。
          </p>
        </div>
      </Section>
    </div>
  )
}