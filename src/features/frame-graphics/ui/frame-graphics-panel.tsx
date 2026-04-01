import { useMemo, useState } from 'react'
import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import { buildFrameAxonometricGraphicsModel } from '@/features/frame-graphics/model/build-frame-axonometric-graphics-model'
import { buildFramePlanGraphicsModel } from '@/features/frame-graphics/model/build-frame-plan-graphics-model'
import { buildFrameSectionGraphicsModel } from '@/features/frame-graphics/model/build-frame-section-graphics-model'
import type { FrameGraphicsSummary } from '@/features/frame-graphics/model/graphics-types'
import { FrameAxonometricSvg } from './frame-axonometric-svg'
import { FramePlanSvg } from './frame-plan-svg'
import { FrameSectionSvg } from './frame-section-svg'

type ViewMode = 'section' | 'plan' | 'axonometric'

const VIEW_LABELS: ReadonlyArray<{ mode: ViewMode; label: string }> = [
  { mode: 'section', label: 'Разрез' },
  { mode: 'plan', label: 'План' },
  { mode: 'axonometric', label: 'Общий вид' },
]

interface FrameGraphicsPanelProps {
  input: UnifiedInputState
}

function formatValue(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function SummaryBlock({ summary }: { summary: FrameGraphicsSummary }) {
  return (
    <div className="results-table-wrap" style={{ marginTop: 12 }}>
      <table className="results-table">
        <tbody>
          <tr>
            <th>Пролет</th>
            <td>{formatValue(summary.spanM)} м</td>
            <th>Длина</th>
            <td>{formatValue(summary.lengthM)} м</td>
          </tr>
          <tr>
            <th>Высота до низа несущих</th>
            <td>{formatValue(summary.clearHeightToBottomChordM)} м</td>
            <th>Высота фермы в карнизе</th>
            <td>{formatValue(summary.eaveTrussDepthM)} м</td>
          </tr>
          <tr>
            <th>Высота до опоры</th>
            <td>{formatValue(summary.eaveSupportHeightM)} м</td>
            <th>Максимальная высота</th>
            <td>{formatValue(summary.maxBuildingHeightM)} м</td>
          </tr>
          <tr>
            <th>Количество рам</th>
            <td colSpan={3}>{summary.framesCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function FrameGraphicsPanel({ input }: FrameGraphicsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('section')

  const sectionModel = useMemo(() => buildFrameSectionGraphicsModel(input), [input])
  const planModel = useMemo(() => buildFramePlanGraphicsModel(input), [input])
  const axonometricModel = useMemo(() => buildFrameAxonometricGraphicsModel(input), [input])

  const currentModel =
    viewMode === 'section' ? sectionModel : viewMode === 'plan' ? planModel : axonometricModel

  return (
    <div className="results-section">
      <h3 className="results-section-title">Схема каркаса</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {VIEW_LABELS.map((item) => (
          <button
            key={item.mode}
            type="button"
            onClick={() => setViewMode(item.mode)}
            style={{
              border: viewMode === item.mode ? '1px solid #334155' : '1px solid #cbd5e1',
              background: viewMode === item.mode ? '#e2e8f0' : '#f8fafc',
              color: '#0f172a',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {viewMode === 'section' ? (
        <FrameSectionSvg model={sectionModel} />
      ) : viewMode === 'plan' ? (
        <FramePlanSvg model={planModel} />
      ) : (
        <FrameAxonometricSvg model={axonometricModel} />
      )}

      <SummaryBlock summary={currentModel.summary} />
    </div>
  )
}
