import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Section, SectionHeader, Badge } from './ui'
import { LogicGroupModal } from './modals/LogicGroupModal'
import type { LogicGroup } from '@/types'

export function LogicGroupPanel({ onToast }: { onToast: (msg: string, t: 'success' | 'error' | 'info') => void }) {
  const naturalGroups = useStore((s) => s.naturalGroups)
  const logicGroups   = useStore((s) => s.logicGroups)
  const addLogicGroup = useStore((s) => s.addLogicGroup)
  const removeLogicGroup = useStore((s) => s.removeLogicGroup)

  const [showModal, setShowModal] = useState(false)

  const handleAdd = (group: LogicGroup) => {
    addLogicGroup(group)
    setShowModal(false)
    onToast(`逻辑分组「${group.name}」已创建`, 'success')
  }

  const handleOpen = () => {
    if (naturalGroups.length === 0) {
      onToast('请先在「订阅」标签解析节点', 'error')
      return
    }
    setShowModal(true)
  }

  return (
    <>
      <div className="space-y-4">
        <Section>
          <SectionHeader title="逻辑分组" accent="purple">
            <Badge variant="purple">{logicGroups.length}</Badge>
          </SectionHeader>
          <div className="p-3.5 space-y-2">
            {logicGroups.length === 0 ? (
              <p className="text-center py-5 text-[12px] text-text-3">暂无逻辑分组</p>
            ) : (
              logicGroups.map((lg) => (
                <div
                  key={lg.name}
                  className="flex items-center gap-3 px-3 py-2.5 bg-bg border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold">{lg.name}</p>
                    <p className="text-[11px] text-text-3 font-mono truncate mt-0.5">
                      {lg.naturalGroupNames.join(', ') || '—'}
                    </p>
                  </div>
                  <Badge variant={lg.type === 'urltest' ? 'blue' : 'purple'}>{lg.type}</Badge>
                  <button
                    onClick={() => { removeLogicGroup(lg.name); onToast(`已删除「${lg.name}」`, 'info') }}
                    className="text-text-3 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
            <Button variant="secondary" full onClick={handleOpen}>
              <Plus size={13} /> 创建逻辑分组
            </Button>
          </div>
        </Section>

        {/* Proxy order preview */}
        <Section>
          <SectionHeader title="Proxy 选择器顺序" accent="blue" />
          <div className="p-3.5 space-y-1.5">
            {[...logicGroups, ...naturalGroups].length === 0 ? (
              <p className="text-[12px] text-text-3 py-3 text-center">无分组</p>
            ) : (
              [...logicGroups.map((g) => ({ name: g.name, type: 'logic' as const })),
               ...naturalGroups.map((g) => ({ name: g.name, type: 'natural' as const }))].map((item, i) => (
                <div key={item.name} className="flex items-center gap-2.5 px-3 py-1.5 bg-bg border border-border rounded-md">
                  <span className="text-[10px] text-text-3 font-mono w-4">{i + 1}</span>
                  <span className="flex-1 text-[12px]">{item.name}</span>
                  <Badge variant={item.type === 'logic' ? 'purple' : 'green'}>
                    {item.type === 'logic' ? '逻辑' : '自然'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      {showModal && (
        <LogicGroupModal
          naturalGroupNames={naturalGroups.map((g) => g.name)}
          onConfirm={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
