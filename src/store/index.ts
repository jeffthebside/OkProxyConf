import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LogicGroup, NaturalGroup, RuleSetEntry, CustomTemplate } from '@/types'
import { groupNodesByGeo } from '@/utils/geoGroup'
import { parseSubscriptionContent } from '@/utils/parsers'
import { buildConfig } from '@/utils/buildConfig'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DnsMode = 'redir-host' | 'fakeip'

interface AppState {
  // ── Persisted data ────────────────────────────────────────────────────────
  naturalGroups: NaturalGroup[]
  logicGroups: LogicGroup[]
  customRuleSets: RuleSetEntry[]
  customTemplate: CustomTemplate
  dnsMode: DnsMode

  // ── UI state (not persisted) ──────────────────────────────────────────────
  isLoading: boolean
  statusMessage: string
  statusType: 'idle' | 'ok' | 'loading' | 'error'
  isManualMode: boolean
  manualConfigText: string
  configJson: string

  // ── Actions ───────────────────────────────────────────────────────────────
  parseContent: (text: string, mode?: 'replace' | 'merge') => void
  clearNodes: () => void
  toggleNaturalGroupUrltest: (groupName: string) => void
  removeNaturalGroup: (groupName: string) => void
  removeNode: (groupName: string, nodeName: string) => void
  addLogicGroup: (group: LogicGroup) => void
  removeLogicGroup: (name: string) => void
  addCustomRuleSet: (rs: RuleSetEntry) => void
  removeCustomRuleSet: (index: number) => void
  setCustomTemplate: (tpl: CustomTemplate) => void
  clearCustomTemplate: () => void
  setDnsMode: (mode: DnsMode) => void
  enterManualMode: () => void
  commitManualEdit: (text: string) => { ok: true } | { ok: false; error: string }
  exitManualMode: () => void
  setStatus: (msg: string, type: AppState['statusType']) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type ToJsonState = Pick<
  AppState,
  'naturalGroups' | 'logicGroups' | 'customRuleSets' | 'customTemplate' | 'dnsMode'
>

function toJson(state: ToJsonState): string {
  return JSON.stringify(
    buildConfig(
      state.naturalGroups,
      state.logicGroups,
      state.customRuleSets,
      state.customTemplate,
      state.dnsMode,
    ),
    null,
    2,
  )
}

/**
 * Rebuild configJson only when NOT in manual mode.
 * Structural changes still update the underlying data, but won't overwrite
 * what the user has written in the editor.
 */
function maybeRebuild(get: () => AppState, extra: Partial<AppState>): Partial<AppState> {
  const next = { ...get(), ...extra }
  if (next.isManualMode) return extra
  return { ...extra, configJson: toJson(next) }
}

const EMPTY: ToJsonState = {
  naturalGroups: [],
  logicGroups: [],
  customRuleSets: [],
  customTemplate: {},
  dnsMode: 'redir-host',
}

const INITIAL_JSON = toJson(EMPTY)

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────────────────────────────────
      naturalGroups: [],
      logicGroups: [],
      customRuleSets: [],
      customTemplate: {},
      dnsMode: 'redir-host' as DnsMode,
      isLoading: false,
      statusMessage: '就绪 — 请输入订阅链接或粘贴内容',
      statusType: 'idle' as const,
      isManualMode: false,
      manualConfigText: INITIAL_JSON,
      configJson: INITIAL_JSON,

      // ── Subscription parsing ────────────────────────────────────────────
      parseContent(text, mode = 'replace') {
        set({ isLoading: true, statusMessage: '解析中…', statusType: 'loading' })
        setTimeout(() => {
          try {
            const newNodes = parseSubscriptionContent(text)
            if (newNodes.length === 0) {
              set({
                isLoading: false,
                statusMessage: '未能解析出节点，请检查内容格式',
                statusType: 'error',
              })
              return
            }

            let mergedNodes = newNodes
            if (mode === 'merge') {
              const existing = get().naturalGroups.flatMap((g) => g.nodes)
              const seen = new Set(existing.map((n) => n.name))
              mergedNodes = [...existing, ...newNodes.filter((n) => !seen.has(n.name))]
            }

            const naturalGroups = groupNodesByGeo(mergedNodes)
            const configJson = toJson({ ...get(), naturalGroups })
            set({
              naturalGroups,
              isManualMode: false,
              manualConfigText: configJson,
              configJson,
              isLoading: false,
              statusMessage: mode === 'merge'
                ? `已合并，共 ${mergedNodes.length} 个节点，${naturalGroups.length} 个分组`
                : `已加载 ${mergedNodes.length} 个节点，${naturalGroups.length} 个分组`,
              statusType: 'ok',
            })
          } catch (e) {
            set({
              isLoading: false,
              statusMessage: `解析出错: ${e instanceof Error ? e.message : String(e)}`,
              statusType: 'error',
            })
          }
        }, 0)
      },

      // ── Node management ─────────────────────────────────────────────────
      clearNodes() {
        const configJson = toJson({ ...get(), naturalGroups: [] })
        set({
          naturalGroups: [],
          isManualMode: false,
          manualConfigText: configJson,
          configJson,
          statusMessage: '已清空节点',
          statusType: 'idle',
        })
      },

      toggleNaturalGroupUrltest(groupName) {
        const naturalGroups = get().naturalGroups.map((g) =>
          g.name !== groupName ? g : { ...g, urltest: !g.urltest }
        )
        set(maybeRebuild(get, { naturalGroups }))
      },

      removeNaturalGroup(groupName) {
        const naturalGroups = get().naturalGroups.filter((g) => g.name !== groupName)
        set(maybeRebuild(get, { naturalGroups }))
      },

      removeNode(groupName, nodeName) {
        const naturalGroups = get().naturalGroups
          .map((g) =>
            g.name !== groupName
              ? g
              : { ...g, nodes: g.nodes.filter((n) => n.name !== nodeName) },
          )
          .filter((g) => g.nodes.length > 0)
        set(maybeRebuild(get, { naturalGroups }))
      },

      // ── Logic groups ────────────────────────────────────────────────────
      addLogicGroup(group) {
        const logicGroups = [
          ...get().logicGroups.filter((g) => g.name !== group.name),
          group,
        ]
        set(maybeRebuild(get, { logicGroups }))
      },

      removeLogicGroup(name) {
        const logicGroups = get().logicGroups.filter((g) => g.name !== name)
        set(maybeRebuild(get, { logicGroups }))
      },

      // ── Rule sets ───────────────────────────────────────────────────────
      addCustomRuleSet(rs) {
        const customRuleSets = [...get().customRuleSets, rs]
        set(maybeRebuild(get, { customRuleSets }))
      },

      removeCustomRuleSet(index) {
        const customRuleSets = get().customRuleSets.filter((_, i) => i !== index)
        set(maybeRebuild(get, { customRuleSets }))
      },

      // ── Custom template ─────────────────────────────────────────────────
      setCustomTemplate(tpl) {
        set(maybeRebuild(get, { customTemplate: tpl }))
      },

      clearCustomTemplate() {
        set(maybeRebuild(get, { customTemplate: {} }))
      },

      // ── DNS mode ────────────────────────────────────────────────────────
      setDnsMode(dnsMode) {
        set(maybeRebuild(get, { dnsMode }))
      },

      // ── Manual edit mode ────────────────────────────────────────────────
      enterManualMode() {
        set({ isManualMode: true, manualConfigText: get().configJson })
      },

      commitManualEdit(text) {
        try {
          JSON.parse(text)
          set({ manualConfigText: text })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e instanceof SyntaxError ? e.message : '无效 JSON' }
        }
      },

      exitManualMode() {
        set({ isManualMode: false, manualConfigText: get().configJson })
      },

      // ── Misc ────────────────────────────────────────────────────────────
      setStatus(statusMessage, statusType) {
        set({ statusMessage, statusType })
      },
    }),

    {
      name: 'singbox-generator-v1',
      storage: createJSONStorage(() => ({
        getItem(key) {
          try { return localStorage.getItem(key) } catch { return null }
        },
        setItem(key, value) {
          try {
            localStorage.setItem(key, value)
          } catch {
            console.warn('[OkProxyConf] localStorage quota exceeded, state will not be persisted')
          }
        },
        removeItem(key) {
          try { localStorage.removeItem(key) } catch { /* ignore */ }
        },
      })),
      partialize: (state) => ({
        naturalGroups: state.naturalGroups,
        logicGroups: state.logicGroups,
        customRuleSets: state.customRuleSets,
        customTemplate: state.customTemplate,
        dnsMode: state.dnsMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        try {
          const json = toJson({
            naturalGroups: state.naturalGroups,
            logicGroups: state.logicGroups,
            customRuleSets: state.customRuleSets,
            customTemplate: state.customTemplate,
            dnsMode: state.dnsMode,
          })
          state.configJson = json
          state.manualConfigText = json
          state.isManualMode = false
          state.statusMessage = state.naturalGroups.length > 0
            ? `已恢复 ${state.naturalGroups.flatMap((g) => g.nodes).length} 个节点，${state.naturalGroups.length} 个分组`
            : '就绪 — 请输入订阅链接或粘贴内容'
          state.statusType = state.naturalGroups.length > 0 ? 'ok' : 'idle'
        } catch {
          state.naturalGroups = []
          state.logicGroups = []
          state.customRuleSets = []
          state.customTemplate = {}
          state.dnsMode = 'redir-host'
          state.configJson = INITIAL_JSON
          state.manualConfigText = INITIAL_JSON
          state.statusMessage = '就绪 — 请输入订阅链接或粘贴内容'
          state.statusType = 'idle'
        }
      },
    },
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export function selectOutputText(state: AppState): string {
  return state.isManualMode ? state.manualConfigText : state.configJson
}