import { useState, type ChangeEvent } from 'react'
import insiLogo from '@/assets/insi-logo.png'
import { calculateCraneBeam } from '@/domain/crane-beam/model/calculate-crane-beam'
import {
  craneBeamBrakeStructures,
  craneBeamCountsInSpan,
  craneBeamDutyGroups,
  craneBeamRails,
  craneBeamSuspensionTypes,
  defaultCraneBeamInput,
  type CraneBeamInput,
} from '@/domain/crane-beam/model/crane-beam-input'
import { craneBeamWorkbookMap } from '@/domain/crane-beam/model/crane-beam-workbook-map'

const fieldLabelStyle = {
  display: 'grid',
  gap: 4,
  lineHeight: 1.1,
} as const

const fieldControlStyle = {
  minHeight: 42,
  padding: '9px 11px',
  lineHeight: 1.15,
  borderRadius: 10,
  border: '1px solid rgba(100, 116, 139, 0.28)',
  background: '#ffffff',
  color: '#0f172a',
} as const

const text = {
  title: '\u041f\u043e\u0434\u0431\u043e\u0440 \u043f\u0440\u043e\u043a\u0430\u0442\u043d\u043e\u0439 \u043f\u043e\u0434\u043a\u0440\u0430\u043d\u043e\u0432\u043e\u0439 \u0431\u0430\u043b\u043a\u0438',
  backToCalculator: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u043a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440',
  result: '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u043e\u0434\u0431\u043e\u0440\u0430',
  progress: '\u0421\u0442\u0430\u0442\u0443\u0441 \u043f\u0435\u0440\u0435\u043d\u043e\u0441\u0430',
  roadmap: '\u0427\u0442\u043e \u0434\u0430\u043b\u044c\u0448\u0435',
  note:
    '\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0443\u0436\u0435 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u043f\u0435\u0440\u0432\u044b\u0439 \u0441\u0432\u0435\u0440\u0435\u043d\u043d\u044b\u0439 baseline \u0438\u0437 Excel. \u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u043c \u0448\u0430\u0433\u043e\u043c \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0451\u043c \u043f\u043e\u043b\u043d\u044b\u0439 \u043f\u043e\u0434\u0431\u043e\u0440 \u0441\u043e\u0440\u0442\u0430\u043c\u0435\u043d\u0442\u0430 \u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u043f\u043e \u0432\u0441\u0435\u043c \u0440\u0435\u0436\u0438\u043c\u0430\u043c.',
  loadCapacityT: '\u0413\u0440\u0443\u0437\u043e\u043f\u043e\u0434\u044a\u0435\u043c\u043d\u043e\u0441\u0442\u044c, \u0442',
  craneSpanM: '\u041f\u0440\u043e\u043b\u0435\u0442 \u043a\u0440\u0430\u043d\u0430, \u043c',
  wheelLoadKn: '\u041d\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043d\u0430 \u043a\u043e\u043b\u0435\u0441\u043e, \u043a\u041d',
  wheelCount: '\u0427\u0438\u0441\u043b\u043e \u043a\u043e\u043b\u0435\u0441',
  trolleyMassT: '\u041c\u0430\u0441\u0441\u0430 \u0442\u0435\u043b\u0435\u0436\u043a\u0438 \u043a\u0440\u0430\u043d\u0430, \u0442',
  craneBaseMm: '\u0411\u0430\u0437\u0430 \u043a\u0440\u0430\u043d\u0430, \u043c\u043c',
  craneGaugeMm: '\u0413\u0430\u0431\u0430\u0440\u0438\u0442 \u043a\u0440\u0430\u043d\u0430, \u043c\u043c',
  suspensionType: '\u0422\u0438\u043f \u043f\u043e\u0434\u0432\u0435\u0441\u0430',
  dutyGroup: '\u0413\u0440\u0443\u043f\u043f\u0430 \u0440\u0435\u0436\u0438\u043c\u0430 \u0440\u0430\u0431\u043e\u0442\u044b',
  craneCountInSpan: '\u041a\u043e\u043b-\u0432\u043e \u043a\u0440\u0430\u043d\u043e\u0432 \u0432 \u043f\u0440\u043e\u043b\u0435\u0442\u0435',
  craneRail: '\u041f\u043e\u0434\u043a\u0440\u0430\u043d\u043e\u0432\u044b\u0439 \u0440\u0435\u043b\u044c\u0441',
  railFootWidthM: '\u0428\u0438\u0440\u0438\u043d\u0430 \u043f\u043e\u0434\u043e\u0448\u0432\u044b \u0440\u0435\u043b\u044c\u0441\u0430, \u043c',
  railHeightM: '\u0412\u044b\u0441\u043e\u0442\u0430 \u043a\u0440\u0430\u043d\u043e\u0432\u043e\u0433\u043e \u0440\u0435\u043b\u044c\u0441\u0430, \u043c',
  beamSpanM: '\u041f\u0440\u043e\u043b\u0435\u0442 \u041f\u0411, \u043c',
  brakeStructure: '\u0422\u043e\u0440\u043c\u043e\u0437\u043d\u0430\u044f \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044f',
  stiffenerStepM: '\u0428\u0430\u0433 \u0440\u0435\u0431\u0435\u0440, \u043c',
  tbnKn: 'Tb\u043d, \u043a\u041d',
  qbnKn: 'Qb\u043d, \u043a\u041d',
} as const

function parseNumberInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveMainCalculatorHref(pathname: string): string {
  return pathname.startsWith('/insi-next/') ? '/insi-next/' : '/'
}

function formatNumber(value: number, digits = 3): string {
  return value.toFixed(digits).replace('.', ',')
}

export function CraneBeamDemoPage() {
  const [input, setInput] = useState<CraneBeamInput>(defaultCraneBeamInput)
  const result = calculateCraneBeam(input)
  const mainCalculatorHref =
    typeof window === 'undefined' ? '/' : resolveMainCalculatorHref(window.location.pathname)

  const handleNumberField =
    <K extends keyof Pick<
      CraneBeamInput,
      | 'loadCapacityT'
      | 'craneSpanM'
      | 'wheelLoadKn'
      | 'wheelCount'
      | 'trolleyMassT'
      | 'craneBaseMm'
      | 'craneGaugeMm'
      | 'railFootWidthM'
      | 'railHeightM'
      | 'beamSpanM'
      | 'stiffenerStepM'
      | 'tbnKn'
      | 'qbnKn'
    >>(key: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = parseNumberInput(event.target.value)
      if (parsed === null) {
        return
      }

      setInput((prev) => ({
        ...prev,
        [key]: key === 'wheelCount' ? Math.max(1, Math.trunc(parsed)) : parsed,
      }))
    }

  return (
    <div className="app-shell">
      <main
        data-testid="crane-beam-demo-page"
        className="page"
        style={{ display: 'grid', gap: 16, maxWidth: 'none', padding: '28px 0 64px' }}
      >
        <section
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: '12px 18px',
            borderRadius: 16,
            background: '#ffffff',
            border: '1px solid rgba(148, 163, 184, 0.18)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <img src={insiLogo} alt="INSI" style={{ width: 100, height: 100, objectFit: 'contain' }} />
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.05, color: '#0f172a' }}>{text.title}</h1>
          </div>
          <a
            href={mainCalculatorHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              padding: '0 18px',
              borderRadius: 10,
              background: '#eef2f6',
              color: '#334155',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {text.backToCalculator}
          </a>
        </section>

        <section
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.9fr)',
            padding: 20,
            borderRadius: 16,
            background: '#ffffff',
            border: '1px solid rgba(148, 163, 184, 0.18)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              alignItems: 'start',
            }}
          >
            <label style={fieldLabelStyle}>
              <span>{text.loadCapacityT}</span>
              <input aria-label={text.loadCapacityT} style={fieldControlStyle} value={String(input.loadCapacityT).replace('.', ',')} onChange={handleNumberField('loadCapacityT')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.craneSpanM}</span>
              <input aria-label={text.craneSpanM} style={fieldControlStyle} value={String(input.craneSpanM).replace('.', ',')} onChange={handleNumberField('craneSpanM')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.wheelLoadKn}</span>
              <input aria-label={text.wheelLoadKn} style={fieldControlStyle} value={String(input.wheelLoadKn).replace('.', ',')} onChange={handleNumberField('wheelLoadKn')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.wheelCount}</span>
              <input aria-label={text.wheelCount} style={fieldControlStyle} value={String(input.wheelCount)} onChange={handleNumberField('wheelCount')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.trolleyMassT}</span>
              <input aria-label={text.trolleyMassT} style={fieldControlStyle} value={String(input.trolleyMassT).replace('.', ',')} onChange={handleNumberField('trolleyMassT')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.craneBaseMm}</span>
              <input aria-label={text.craneBaseMm} style={fieldControlStyle} value={String(input.craneBaseMm)} onChange={handleNumberField('craneBaseMm')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.craneGaugeMm}</span>
              <input aria-label={text.craneGaugeMm} style={fieldControlStyle} value={String(input.craneGaugeMm)} onChange={handleNumberField('craneGaugeMm')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.suspensionType}</span>
              <select
                aria-label={text.suspensionType}
                style={fieldControlStyle}
                value={input.suspensionType}
                onChange={(event) => setInput((prev) => ({ ...prev, suspensionType: event.target.value }))}
              >
                {craneBeamSuspensionTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.dutyGroup}</span>
              <select
                aria-label={text.dutyGroup}
                style={fieldControlStyle}
                value={input.dutyGroup}
                onChange={(event) => setInput((prev) => ({ ...prev, dutyGroup: event.target.value }))}
              >
                {craneBeamDutyGroups.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.craneCountInSpan}</span>
              <select
                aria-label={text.craneCountInSpan}
                style={fieldControlStyle}
                value={input.craneCountInSpan}
                onChange={(event) => setInput((prev) => ({ ...prev, craneCountInSpan: event.target.value }))}
              >
                {craneBeamCountsInSpan.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.craneRail}</span>
              <select
                aria-label={text.craneRail}
                style={fieldControlStyle}
                value={input.craneRail}
                onChange={(event) => setInput((prev) => ({ ...prev, craneRail: event.target.value }))}
              >
                {craneBeamRails.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.railFootWidthM}</span>
              <input aria-label={text.railFootWidthM} style={fieldControlStyle} value={String(input.railFootWidthM).replace('.', ',')} onChange={handleNumberField('railFootWidthM')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.railHeightM}</span>
              <input aria-label={text.railHeightM} style={fieldControlStyle} value={String(input.railHeightM).replace('.', ',')} onChange={handleNumberField('railHeightM')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.beamSpanM}</span>
              <input aria-label={text.beamSpanM} style={fieldControlStyle} value={String(input.beamSpanM).replace('.', ',')} onChange={handleNumberField('beamSpanM')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.brakeStructure}</span>
              <select
                aria-label={text.brakeStructure}
                style={fieldControlStyle}
                value={input.brakeStructure}
                onChange={(event) => setInput((prev) => ({ ...prev, brakeStructure: event.target.value }))}
              >
                {craneBeamBrakeStructures.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.stiffenerStepM}</span>
              <input aria-label={text.stiffenerStepM} style={fieldControlStyle} value={String(input.stiffenerStepM).replace('.', ',')} onChange={handleNumberField('stiffenerStepM')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.tbnKn}</span>
              <input aria-label={text.tbnKn} style={fieldControlStyle} value={String(input.tbnKn).replace('.', ',')} onChange={handleNumberField('tbnKn')} />
            </label>
            <label style={fieldLabelStyle}>
              <span>{text.qbnKn}</span>
              <input aria-label={text.qbnKn} style={fieldControlStyle} value={String(input.qbnKn).replace('.', ',')} onChange={handleNumberField('qbnKn')} />
            </label>
          </div>

          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <article
              style={{
                display: 'grid',
                gap: 12,
                padding: 18,
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid rgba(148, 163, 184, 0.18)',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>{text.result}</h2>
              <div style={{ display: 'grid', gap: 8, color: '#334155', lineHeight: 1.45 }}>
                <div>
                  {text.progress}:{' '}
                  <strong>
                    {result.selection.profile
                      ? 'первый Excel-baseline подключен'
                      : 'идёт поэтапный перенос workbook'}
                  </strong>
                </div>
                <div>
                  Workbook `Сводка`: {craneBeamWorkbookMap.summaryDerived.selectedProfile}
                </div>
                <div>
                  Профиль: <strong>{result.selection.profile || 'ещё не подобран'}</strong>
                </div>
                <div>
                  Вес: <strong>{formatNumber(result.selection.weightKg, 3)}</strong> кг
                </div>
                <div>
                  К-т использования:{' '}
                  <strong>{formatNumber(result.selection.utilization, 3)}</strong>
                </div>
                <div>
                  Mx: <strong>{formatNumber(result.loads.designMxGeneralKnM, 3)}</strong> кН·м
                </div>
                <div>
                  My: <strong>{formatNumber(result.loads.designMyGeneralKnM, 3)}</strong> кН·м
                </div>
                <div>
                  Q: <strong>{formatNumber(result.loads.designQGeneralKn, 3)}</strong> кН
                </div>
                <div>
                  Qоп: <strong>{formatNumber(result.loads.designQAdditionalKn, 3)}</strong> кН
                </div>
              </div>
            </article>

            <article
              style={{
                display: 'grid',
                gap: 10,
                padding: 18,
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid rgba(148, 163, 184, 0.18)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>{text.roadmap}</h3>
              <div style={{ color: '#475569', lineHeight: 1.5 }}>{text.note}</div>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
