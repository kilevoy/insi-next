import { useState, type ChangeEvent } from 'react'
import insiLogo from '@/assets/insi-logo.png'
import { purlinCityLoads } from '@/domain/purlin/model/purlin-reference.generated'
import { calculateWindowRigel } from '@/domain/window-rigel/model/calculate-window-rigel'
import { defaultWindowRigelInput, type WindowRigelInput } from '@/domain/window-rigel/model/window-rigel-input'
import { windowRigelWindowConstructionLoads } from '@/domain/window-rigel/model/window-rigel-reference.generated'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'

const compactFieldLabelStyle = {
  display: 'grid',
  gap: 6,
  lineHeight: 1.15,
} as const

const compactFieldControlStyle = {
  minHeight: 44,
  padding: '10px 12px',
  lineHeight: 1.2,
  borderRadius: 14,
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(255,255,255,0.96)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
  color: '#0f172a',
} as const

const text = {
  title: '\u041F\u043E\u0434\u0431\u043E\u0440 \u043E\u043A\u043E\u043D\u043D\u044B\u0445 \u0440\u0438\u0433\u0435\u043B\u0435\u0439',
  backToCalculator: '\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440',
  city: '\u0413\u043E\u0440\u043E\u0434',
  windowHeight: '\u0412\u044B\u0441\u043E\u0442\u0430 \u043E\u043A\u043D\u0430, \u043C',
  frameStep: '\u0428\u0430\u0433 \u0440\u0430\u043C, \u043C',
  windowType: '\u0422\u0438\u043F \u043E\u043A\u043D\u0430',
  buildingHeight: '\u0412\u044B\u0441\u043E\u0442\u0430 \u0437\u0434\u0430\u043D\u0438\u044F, \u043C',
  buildingSpan: '\u041F\u0440\u043E\u043B\u0435\u0442 \u0437\u0434\u0430\u043D\u0438\u044F, \u043C',
  buildingLength: '\u0414\u043B\u0438\u043D\u0430 \u0437\u0434\u0430\u043D\u0438\u044F, \u043C',
  windowCount: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u043A\u043E\u043D',
  construction: '\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u043E\u043A\u043D\u0430',
  maxUtilization: '\u041C\u0430\u043A\u0441. \u043A-\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F',
  tubeS245: '\u0422\u0440\u0443\u0431\u0430 \u0421245, \u0440\u0443\u0431/\u043A\u0433',
  tubeS345: '\u0422\u0440\u0443\u0431\u0430 \u0421345, \u0440\u0443\u0431/\u043A\u0433',
  loads: '\u041D\u0430\u0433\u0440\u0443\u0437\u043A\u0438',
  wind: '\u0412\u0435\u0442\u0435\u0440',
  vertical: '\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u0430\u044F',
  horizontalCase1: '\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u0430\u044F I \u0441\u043B.',
  horizontalCase2: '\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u0430\u044F II \u0441\u043B.',
  result: '\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0434\u0431\u043E\u0440\u0430',
  bestBottom: '\u041B\u0443\u0447\u0448\u0438\u0439 \u043D\u0438\u0436\u043D\u0438\u0439 \u0440\u0438\u0433\u0435\u043B\u044C',
  bestTop: '\u041B\u0443\u0447\u0448\u0438\u0439 \u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u0440\u0438\u0433\u0435\u043B\u044C',
  bottomRigel: '\u041D\u0438\u0436\u043D\u0438\u0439 \u0440\u0438\u0433\u0435\u043B\u044C',
  topRigel: '\u0412\u0435\u0440\u0445\u043D\u0438\u0439 \u0440\u0438\u0433\u0435\u043B\u044C',
  noBottom: '\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u043D\u0438\u0436\u043D\u0438\u0445 \u0440\u0438\u0433\u0435\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.',
  noTop: '\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0432\u0435\u0440\u0445\u043D\u0438\u0445 \u0440\u0438\u0433\u0435\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.',
  noCandidate: '\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.',
  steel: '\u0421\u0442\u0430\u043B\u044C',
  mass: '\u041C\u0430\u0441\u0441\u0430',
  coefficients: '\u041A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442\u044B',
  flexibility: '\u0433\u0438\u0431\u043A\u043E\u0441\u0442\u044C',
  strength: '\u043F\u0440\u043E\u0447\u043D\u043E\u0441\u0442\u044C',
  deflection: '\u043F\u0440\u043E\u0433\u0438\u0431',
  profile: '\u041F\u0440\u043E\u0444\u0438\u043B\u044C',
  singleMass: '\u041C\u0430\u0441\u0441\u0430 \u043E\u0434\u043D\u043E\u0433\u043E \u0440\u0438\u0433\u0435\u043B\u044F',
  totalMass: '\u041E\u0431\u0449\u0430\u044F \u043C\u0430\u0441\u0441\u0430',
  cost: '\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C',
  rub: '\u0440\u0443\u0431.',
  rubPerTon: '\u0440\u0443\u0431/\u0442',
  kg: '\u043A\u0433',
  kPa: '\u043A\u041F\u0430',
} as const

function parseNumberInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value: number, fractionDigits = 4): string {
  return value.toFixed(fractionDigits).replace('.', ',')
}

function formatRub(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function resolveTubePriceRubPerKg(
  steelGrade: string,
  prices: { tubeS245PriceRubPerKg: number; tubeS345PriceRubPerKg: number },
): number {
  return steelGrade.trim() === '\u0421245' ? prices.tubeS245PriceRubPerKg : prices.tubeS345PriceRubPerKg
}

function resolveMainCalculatorHref(pathname: string): string {
  return pathname.startsWith('/insi-next/') ? '/insi-next/' : '/'
}

function WindowTypeGlyph({ windowType }: { windowType: number }) {
  const stroke = '#0f766e'
  const fill = '#7dd3c7'
  const mullionsByType: Record<number, number[]> = {
    1: [],
    2: [0.08, 0.92],
    3: [0.34, 0.66],
    4: [0.5],
    5: [0.74, 0.9],
  }

  const mullions = mullionsByType[windowType] ?? []

  return (
    <svg viewBox="0 0 140 72" width="100%" height="60" aria-hidden="true">
      <line x1="10" y1="18" x2="130" y2="18" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="10" y1="54" x2="130" y2="54" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="10" y1="18" x2="130" y2="18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="54" x2="130" y2="54" stroke={fill} strokeWidth="2" strokeLinecap="round" />
      {mullions.map((ratio, index) => {
        const x = 10 + 120 * ratio

        return (
          <g key={ratio} data-testid={`glyph-mullion-${windowType}-${index + 1}`}>
            <line x1={x} y1="18" x2={x} y2="54" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
            <line x1={x} y1="18" x2={x} y2="54" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </g>
        )
      })}
    </svg>
  )
}

function WindowTypePicker({
  selectedWindowType,
  onSelect,
}: {
  selectedWindowType: number
  onSelect: (windowType: number) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        padding: 18,
        borderRadius: 22,
        border: '1px solid rgba(148, 163, 184, 0.16)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
      }}
    >
      <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>{text.windowType}</span>
      <div
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'repeat(5, minmax(72px, 1fr))',
        }}
      >
        {[1, 2, 3, 4, 5].map((windowType) => {
          const isActive = selectedWindowType === windowType

          return (
            <button
              key={windowType}
              type="button"
              aria-label={`${text.windowType} ${windowType}`}
              onClick={() => onSelect(windowType)}
              style={{
                display: 'grid',
                gap: 6,
                padding: 10,
                borderRadius: 16,
                border: isActive ? '1px solid rgba(15, 118, 110, 0.45)' : '1px solid rgba(148, 163, 184, 0.18)',
                background: isActive
                  ? 'linear-gradient(180deg, rgba(204, 251, 241, 0.92) 0%, rgba(240, 253, 250, 0.98) 100%)'
                  : 'rgba(255, 255, 255, 0.92)',
                boxShadow: isActive
                  ? '0 12px 26px rgba(15, 118, 110, 0.12)'
                  : '0 10px 22px rgba(15, 23, 42, 0.04)',
                cursor: 'pointer',
              }}
            >
              <WindowTypeGlyph windowType={windowType} />
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{`${'\u0422\u0438\u043F'} ${windowType}`}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CandidateCard({
  rank,
  candidate,
}: {
  rank: number
  candidate: ReturnType<typeof calculateWindowRigel>['bottomCandidates'][number]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        padding: 16,
        borderRadius: 18,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.05)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 16 }}>
          {rank}. {candidate.profile}
        </strong>
        <span style={{ color: '#475569' }}>
          {text.steel}: {candidate.steelGrade}
        </span>
        <span style={{ color: '#475569' }}>
          {text.mass}: {formatNumber(candidate.massKg)} {text.kg}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
        {`${text.coefficients}: ${text.flexibility} ${formatNumber(candidate.utilization.flexibility, 2)} · ${text.strength} ${formatNumber(candidate.utilization.strength, 2)} · ${text.deflection} ${formatNumber(candidate.utilization.deflection, 2)}`}
      </div>
    </div>
  )
}

function SpecificationCard({
  title,
  candidate,
  windowCount,
  prices,
}: {
  title: string
  candidate: ReturnType<typeof calculateWindowRigel>['bottomCandidates'][number] | undefined
  windowCount: number
  prices: { tubeS245PriceRubPerKg: number; tubeS345PriceRubPerKg: number }
}) {
  if (!candidate) {
    return (
      <article
        style={{
          display: 'grid',
          gap: 12,
          padding: 22,
          borderRadius: 24,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.95) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          boxShadow: '0 22px 56px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div>{text.noCandidate}</div>
      </article>
    )
  }

  const totalMassKg = candidate.massKg * windowCount
  const priceRubPerKg = resolveTubePriceRubPerKg(candidate.steelGrade, prices)
  const priceRubPerTon = priceRubPerKg * 1000
  const totalCostRub = totalMassKg * priceRubPerKg

  return (
    <article
      style={{
        display: 'grid',
        gap: 12,
        padding: 22,
        borderRadius: 24,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.95) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        boxShadow: '0 22px 56px rgba(15, 23, 42, 0.08)',
      }}
    >
      <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8, color: '#334155', lineHeight: 1.45 }}>
        <div>
          {text.profile}: {candidate.profile}
        </div>
        <div>
          {text.steel}: {candidate.steelGrade}
        </div>
        <div>
          {text.singleMass}: {formatNumber(candidate.massKg)} {text.kg}
        </div>
        <div>
          {text.windowCount}: {windowCount}
        </div>
        <div>
          {text.totalMass}: {formatNumber(totalMassKg, 0)} {text.kg}
        </div>
        <div>
          {text.cost}: {formatRub(totalCostRub)} {text.rub} ({formatRub(priceRubPerTon)} {text.rubPerTon})
        </div>
      </div>
    </article>
  )
}

export function WindowRigelDemoPage() {
  const [input, setInput] = useState<WindowRigelInput>(defaultWindowRigelInput)
  const [windowCount, setWindowCount] = useState(() =>
    Math.max(1, Math.round(defaultWindowRigelInput.buildingLengthM / defaultWindowRigelInput.frameStepM)),
  )
  const [tubeS245PriceRubPerKg, setTubeS245PriceRubPerKg] = useState(defaultUnifiedInput.tubeS245PriceRubPerKg)
  const [tubeS345PriceRubPerKg, setTubeS345PriceRubPerKg] = useState(defaultUnifiedInput.tubeS345PriceRubPerKg)
  const result = calculateWindowRigel(input)
  const mainCalculatorHref =
    typeof window === 'undefined' ? '/' : resolveMainCalculatorHref(window.location.pathname)
  const cityOptions = purlinCityLoads.map((item) => item.city)
  const windowConstructionOptions = windowRigelWindowConstructionLoads.map((item) => item.name)
  const bestBottomCandidate = result.bottomCandidates[0]
  const bestTopCandidate = result.workbookEffectiveTopCandidates[0]

  const handleNumberField =
    <K extends keyof Pick<
      WindowRigelInput,
      'windowHeightM' | 'frameStepM' | 'windowType' | 'buildingHeightM' | 'buildingSpanM' | 'buildingLengthM' | 'maxUtilization'
    >>(key: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = parseNumberInput(event.target.value)
      if (parsed === null) {
        return
      }

      setInput((prev) => ({
        ...prev,
        [key]: key === 'windowType' ? Math.trunc(parsed) : parsed,
      }))
    }

  return (
    <main
      data-testid="window-rigel-demo-page"
      style={{
        padding: 24,
        display: 'grid',
        gap: 20,
        maxWidth: 1240,
        margin: '0 auto',
        background:
          'radial-gradient(circle at top left, rgba(204, 251, 241, 0.85) 0%, rgba(248,250,252,0) 28%), radial-gradient(circle at top right, rgba(191, 219, 254, 0.55) 0%, rgba(248,250,252,0) 24%), #f8fafc',
      }}
    >
      <section
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          padding: '22px 24px',
          borderRadius: 30,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(240,253,250,0.92) 52%, rgba(239,246,255,0.94) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <img src={insiLogo} alt="INSI" style={{ width: 120, height: 120, objectFit: 'contain' }} />
          <div style={{ display: 'grid', gap: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                minHeight: 28,
                padding: '0 10px',
                borderRadius: 999,
                background: 'rgba(15, 118, 110, 0.10)',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              INSI Demo
            </span>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.05, color: '#0f172a' }}>{text.title}</h1>
            <div style={{ color: '#475569', maxWidth: 620, lineHeight: 1.45 }}>
              Быстрый подбор с визуально чистой формой, явным результатом и удобным переходом в основной калькулятор.
            </div>
          </div>
        </div>
        <a
          href={mainCalculatorHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            padding: '0 20px',
            borderRadius: 14,
            background: 'linear-gradient(180deg, #0f766e 0%, #0b5f59 100%)',
            color: '#f8fafc',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 16px 30px rgba(15, 118, 110, 0.24)',
          }}
        >
          {text.backToCalculator}
        </a>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 22,
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 0.95fr)',
          padding: 24,
          borderRadius: 30,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.95) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.07)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            alignItems: 'start',
          }}
        >
          <label style={compactFieldLabelStyle}>
            <span>{text.city}</span>
            <select
              aria-label={text.city}
              style={compactFieldControlStyle}
              value={input.city}
              onChange={(event) => setInput((prev) => ({ ...prev, city: event.target.value }))}
            >
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.windowHeight}</span>
            <input
              aria-label={text.windowHeight}
              style={compactFieldControlStyle}
              value={String(input.windowHeightM).replace('.', ',')}
              onChange={handleNumberField('windowHeightM')}
            />
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.frameStep}</span>
            <input
              aria-label={text.frameStep}
              style={compactFieldControlStyle}
              value={String(input.frameStepM).replace('.', ',')}
              onChange={handleNumberField('frameStepM')}
            />
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.windowType}</span>
            <input
              aria-label={text.windowType}
              style={compactFieldControlStyle}
              value={String(input.windowType)}
              onChange={handleNumberField('windowType')}
            />
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.buildingHeight}</span>
            <input
              aria-label={text.buildingHeight}
              style={compactFieldControlStyle}
              value={String(input.buildingHeightM).replace('.', ',')}
              onChange={handleNumberField('buildingHeightM')}
            />
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.buildingSpan}</span>
            <input
              aria-label={text.buildingSpan}
              style={compactFieldControlStyle}
              value={String(input.buildingSpanM).replace('.', ',')}
              onChange={handleNumberField('buildingSpanM')}
            />
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.buildingLength}</span>
            <input
              aria-label={text.buildingLength}
              style={compactFieldControlStyle}
              value={String(input.buildingLengthM).replace('.', ',')}
              onChange={handleNumberField('buildingLengthM')}
            />
          </label>
          <label style={compactFieldLabelStyle}>
            <span>{text.windowCount}</span>
            <input
              aria-label={text.windowCount}
              style={compactFieldControlStyle}
              value={String(windowCount)}
              onChange={(event) => {
                const parsed = parseNumberInput(event.target.value)
                if (parsed === null) {
                  return
                }

                setWindowCount(Math.max(0, Math.trunc(parsed)))
              }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label style={compactFieldLabelStyle}>
              <span>{text.construction}</span>
              <select
                aria-label={text.construction}
                style={compactFieldControlStyle}
                value={input.windowConstruction}
                onChange={(event) => setInput((prev) => ({ ...prev, windowConstruction: event.target.value }))}
              >
                {windowConstructionOptions.map((construction) => (
                  <option key={construction} value={construction}>
                    {construction}
                  </option>
                ))}
              </select>
            </label>
            <label style={compactFieldLabelStyle}>
              <span>{text.maxUtilization}</span>
              <input
                aria-label={text.maxUtilization}
                style={compactFieldControlStyle}
                value={String(input.maxUtilization).replace('.', ',')}
                onChange={handleNumberField('maxUtilization')}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label style={compactFieldLabelStyle}>
              <span>{text.tubeS245}</span>
              <input
                aria-label={text.tubeS245}
                style={compactFieldControlStyle}
                value={String(tubeS245PriceRubPerKg).replace('.', ',')}
                onChange={(event) => {
                  const parsed = parseNumberInput(event.target.value)
                  if (parsed === null) {
                    return
                  }

                  setTubeS245PriceRubPerKg(parsed)
                }}
              />
            </label>
            <label style={compactFieldLabelStyle}>
              <span>{text.tubeS345}</span>
              <input
                aria-label={text.tubeS345}
                style={compactFieldControlStyle}
                value={String(tubeS345PriceRubPerKg).replace('.', ',')}
                onChange={(event) => {
                  const parsed = parseNumberInput(event.target.value)
                  if (parsed === null) {
                    return
                  }

                  setTubeS345PriceRubPerKg(parsed)
                }}
              />
            </label>
          </div>
          <WindowTypePicker
            selectedWindowType={input.windowType}
            onSelect={(windowType) => setInput((prev) => ({ ...prev, windowType }))}
          />
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 10,
          padding: '18px 20px',
          borderRadius: 24,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.93) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          boxShadow: '0 18px 44px rgba(15, 23, 42, 0.05)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{text.loads}</h2>
        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            color: '#334155',
            fontSize: 14,
          }}
        >
          <div>
            {text.wind}: {formatNumber(result.loads.windLoadKpa, 3)} {text.kPa}
          </div>
          <div>
            {text.vertical}: {formatNumber(result.loads.verticalLoadKpa, 3)} {text.kPa}
          </div>
          <div>
            {text.horizontalCase1}: {formatNumber(result.loads.horizontalLoadCase1Kpa, 6)} {text.kPa}
          </div>
          <div>
            {text.horizontalCase2}: {formatNumber(result.loads.horizontalLoadCase2Kpa, 6)} {text.kPa}
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        <article
          style={{
            display: 'grid',
            gap: 18,
            padding: 24,
            borderRadius: 28,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,250,0.86) 100%)',
            border: '1px solid rgba(15, 118, 110, 0.14)',
            boxShadow: '0 24px 56px rgba(15, 118, 110, 0.10)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>{text.result}</h2>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <SpecificationCard
              title={text.bestBottom}
              candidate={bestBottomCandidate}
              windowCount={windowCount}
              prices={{ tubeS245PriceRubPerKg, tubeS345PriceRubPerKg }}
            />
            <SpecificationCard
              title={text.bestTop}
              candidate={bestTopCandidate}
              windowCount={windowCount}
              prices={{ tubeS245PriceRubPerKg, tubeS345PriceRubPerKg }}
            />
          </div>
        </article>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        <article
          style={{
            display: 'grid',
            gap: 16,
            padding: 22,
            borderRadius: 26,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.06)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>{text.bottomRigel}</h2>
          {result.bottomCandidates.length > 0 ? (
            result.bottomCandidates.map((candidate, index) => (
              <CandidateCard key={`${candidate.ordinal}-${candidate.steelGrade}`} rank={index + 1} candidate={candidate} />
            ))
          ) : (
            <div>{text.noBottom}</div>
          )}
        </article>

        <article
          style={{
            display: 'grid',
            gap: 16,
            padding: 22,
            borderRadius: 26,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.06)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>{text.topRigel}</h2>
          {result.workbookEffectiveTopCandidates.length > 0 ? (
            result.workbookEffectiveTopCandidates.map((candidate, index) => (
              <CandidateCard key={`${candidate.ordinal}-${candidate.steelGrade}`} rank={index + 1} candidate={candidate} />
            ))
          ) : (
            <div>{text.noTop}</div>
          )}
        </article>
      </section>
    </main>
  )
}
