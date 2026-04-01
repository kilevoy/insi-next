import { useMemo, useState } from 'react'
import { buildBuildingPreviewModel } from '@/features/frame-graphics/model/build-building-preview-model'
import { buildFrameAxonometricGraphicsModel } from '@/features/frame-graphics/model/build-frame-axonometric-graphics-model'
import { buildFramePlanGraphicsModel } from '@/features/frame-graphics/model/build-frame-plan-graphics-model'
import { buildFrameSectionGraphicsModel } from '@/features/frame-graphics/model/build-frame-section-graphics-model'
import type { FrameGraphicsModel, FrameGraphicsSummary } from '@/features/frame-graphics/model/graphics-types'
import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import { BuildingPreviewSvg } from './building-preview-svg'
import { FrameAxonometricSvg } from './frame-axonometric-svg'
import { FramePlanSvg } from './frame-plan-svg'
import { FrameSectionSvg } from './frame-section-svg'

type RootMode = 'preview' | 'scheme'
type SchemeView = 'section' | 'plan' | 'frame'

const ROOT_MODES: ReadonlyArray<{ mode: RootMode; label: string }> = [
  { mode: 'preview', label: 'Превью' },
  { mode: 'scheme', label: 'Схема' },
]

const SCHEME_VIEWS: ReadonlyArray<{ mode: SchemeView; label: string }> = [
  { mode: 'section', label: 'Разрез' },
  { mode: 'plan', label: 'План' },
  { mode: 'frame', label: 'Каркас' },
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

function ModeButtons<T extends string>({
  values,
  active,
  onChange,
}: {
  values: ReadonlyArray<{ mode: T; label: string }>
  active: T
  onChange: (next: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      {values.map((item) => (
        <button
          key={item.mode}
          type="button"
          onClick={() => onChange(item.mode)}
          style={{
            border: active === item.mode ? '1px solid #334155' : '1px solid #cbd5e1',
            background: active === item.mode ? '#e2e8f0' : '#f8fafc',
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
  )
}

export function FrameGraphicsPanel({ input }: FrameGraphicsPanelProps) {
  const [rootMode, setRootMode] = useState<RootMode>('preview')
  const [schemeView, setSchemeView] = useState<SchemeView>('section')

  const previewModel = useMemo(() => buildBuildingPreviewModel(input), [input])
  const sectionModel = useMemo(() => buildFrameSectionGraphicsModel(input), [input])
  const planModel = useMemo(() => buildFramePlanGraphicsModel(input), [input])
  const frameModel = useMemo(() => buildFrameAxonometricGraphicsModel(input), [input])

  const schemeModel = schemeView === 'section' ? sectionModel : schemeView === 'plan' ? planModel : frameModel
  const currentModel: FrameGraphicsModel = rootMode === 'preview' ? previewModel : schemeModel

  return (
    <div className="results-section">
      <h3 className="results-section-title">Графика здания</h3>
      <ModeButtons values={ROOT_MODES} active={rootMode} onChange={setRootMode} />

      {rootMode === 'scheme' && (
        <ModeButtons values={SCHEME_VIEWS} active={schemeView} onChange={setSchemeView} />
      )}

      {rootMode === 'preview' ? (
        <BuildingPreviewSvg model={previewModel} />
      ) : schemeView === 'section' ? (
        <FrameSectionSvg model={sectionModel} />
      ) : schemeView === 'plan' ? (
        <FramePlanSvg model={planModel} />
      ) : (
        <FrameAxonometricSvg model={frameModel} />
      )}

      <SummaryBlock summary={currentModel.summary} />
    </div>
  )
}
