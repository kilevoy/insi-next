import { useState, type ChangeEvent } from 'react'
import insiLogo from '@/assets/insi-logo.png'

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
  title: '\u041F\u043E\u0434\u0431\u043E\u0440 \u043F\u0440\u043E\u043A\u0430\u0442\u043D\u043E\u0439 \u043F\u043E\u0434\u043A\u0440\u0430\u043D\u043E\u0432\u043E\u0439 \u0431\u0430\u043B\u043A\u0438',
  backToCalculator: '\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440',
  result: '\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0434\u0431\u043E\u0440\u0430',
  progress: '\u0421\u0442\u0430\u0442\u0443\u0441 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430',
  roadmap: '\u0427\u0442\u043E \u0434\u0430\u043B\u044C\u0448\u0435',
  note:
    '\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0443\u0436\u0435 \u0433\u043E\u0442\u043E\u0432\u0430 \u043A \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0443 \u043B\u043E\u0433\u0438\u043A\u0438 \u0438\u0437 Excel. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u043C \u0448\u0430\u0433\u043E\u043C \u043F\u0440\u0438\u0432\u044F\u0436\u0435\u043C \u0444\u043E\u0440\u043C\u0443\u043B\u044B \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043A \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u043C \u043A\u0430\u043A \u0432 workbook.',
  loadCapacityT: '\u0413\u0440\u0443\u0437\u043E\u043F\u043E\u0434\u044A\u0435\u043C\u043D\u043E\u0441\u0442\u044C, \u0442',
  craneSpanM: '\u041F\u0440\u043E\u043B\u0435\u0442 \u043A\u0440\u0430\u043D\u0430, \u043C',
  wheelLoadKn: '\u041D\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0430 \u043A\u043E\u043B\u0435\u0441\u043E, \u043A\u041D',
  wheelCount: '\u0427\u0438\u0441\u043B\u043E \u043A\u043E\u043B\u0435\u0441',
  trolleyMassT: '\u041C\u0430\u0441\u0441\u0430 \u0442\u0435\u043B\u0435\u0436\u043A\u0438 \u043A\u0440\u0430\u043D\u0430, \u0442',
  craneBaseMm: '\u0411\u0430\u0437\u0430 \u043A\u0440\u0430\u043D\u0430, \u043C\u043C',
  craneGaugeMm: '\u0413\u0430\u0431\u0430\u0440\u0438\u0442 \u043A\u0440\u0430\u043D\u0430, \u043C\u043C',
  suspensionType: '\u0422\u0438\u043F \u043F\u043E\u0434\u0432\u0435\u0441\u0430',
  dutyGroup: '\u0413\u0440\u0443\u043F\u043F\u0430 \u0440\u0435\u0436\u0438\u043C\u0430 \u0440\u0430\u0431\u043E\u0442\u044B',
  craneCountInSpan: '\u041A\u043E\u043B-\u0432\u043E \u043A\u0440\u0430\u043D\u043E\u0432 \u0432 \u043F\u0440\u043E\u043B\u0435\u0442\u0435',
  craneRail: '\u041F\u043E\u0434\u043A\u0440\u0430\u043D\u043E\u0432\u044B\u0439 \u0440\u0435\u043B\u044C\u0441',
  railFootWidthM: '\u0428\u0438\u0440\u0438\u043D\u0430 \u043F\u043E\u0434\u043E\u0448\u0432\u044B \u0440\u0435\u043B\u044C\u0441\u0430, \u043C',
  railHeightM: '\u0412\u044B\u0441\u043E\u0442\u0430 \u043A\u0440\u0430\u043D\u043E\u0432\u043E\u0433\u043E \u0440\u0435\u043B\u044C\u0441\u0430, \u043C',
  beamSpanM: '\u041F\u0440\u043E\u043B\u0435\u0442 \u041F\u0411, \u043C',
  brakeStructure: '\u0422\u043E\u0440\u043C\u043E\u0437\u043D\u0430\u044F \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F',
  stiffenerStepM: '\u0428\u0430\u0433 \u0440\u0435\u0431\u0435\u0440, \u043C',
  tbnKn: 'Tb\u043D, \u043A\u041D',
  qbnKn: 'Qb\u043D, \u043A\u041D',
  flexible: '\u0433\u0438\u0431\u043A\u0438\u0439',
  rigid: '\u0436\u0435\u0441\u0442\u043A\u0438\u0439',
  oneCrane: '\u043E\u0434\u0438\u043D',
  twoCranes: '\u0434\u0432\u0430',
  no: '\u043D\u0435\u0442',
  yes: '\u0435\u0441\u0442\u044C',
} as const

type CraneBeamInput = {
  loadCapacityT: number
  craneSpanM: number
  wheelLoadKn: number
  wheelCount: number
  trolleyMassT: number
  craneBaseMm: number
  craneGaugeMm: number
  suspensionType: string
  dutyGroup: string
  craneCountInSpan: string
  craneRail: string
  railFootWidthM: number
  railHeightM: number
  beamSpanM: number
  brakeStructure: string
  stiffenerStepM: number
  tbnKn: number
  qbnKn: number
}

const defaultInput: CraneBeamInput = {
  loadCapacityT: 5,
  craneSpanM: 24,
  wheelLoadKn: 60,
  wheelCount: 4,
  trolleyMassT: 2,
  craneBaseMm: 3700,
  craneGaugeMm: 4700,
  suspensionType: text.flexible,
  dutyGroup: '3\u041A',
  craneCountInSpan: text.oneCrane,
  craneRail: 'P50',
  railFootWidthM: 0.132,
  railHeightM: 0.152,
  beamSpanM: 6,
  brakeStructure: text.no,
  stiffenerStepM: 0,
  tbnKn: 6,
  qbnKn: 2,
}

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
  const [input, setInput] = useState<CraneBeamInput>(defaultInput)
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
                <option value={text.flexible}>{text.flexible}</option>
                <option value={text.rigid}>{text.rigid}</option>
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
                <option value="1\u041A">1\u041A</option>
                <option value="2\u041A">2\u041A</option>
                <option value="3\u041A">3\u041A</option>
                <option value="4\u041A">4\u041A</option>
                <option value="5\u041A">5\u041A</option>
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
                <option value={text.oneCrane}>{text.oneCrane}</option>
                <option value={text.twoCranes}>{text.twoCranes}</option>
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
                <option value="P50">P50</option>
                <option value="KP70">KP70</option>
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
                <option value={text.no}>{text.no}</option>
                <option value={text.yes}>{text.yes}</option>
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
                  {text.progress}: <strong>{'\u043A\u0430\u0440\u043A\u0430\u0441 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0433\u043E\u0442\u043E\u0432'}</strong>
                </div>
                <div>
                  {text.loadCapacityT}: {formatNumber(input.loadCapacityT, 0)}
                </div>
                <div>
                  {text.craneSpanM}: {formatNumber(input.craneSpanM, 0)}
                </div>
                <div>
                  {text.beamSpanM}: {formatNumber(input.beamSpanM, 0)}
                </div>
                <div>
                  {text.wheelLoadKn}: {formatNumber(input.wheelLoadKn, 0)}
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
