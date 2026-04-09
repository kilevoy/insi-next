import { useState, type ChangeEvent } from 'react'
import insiLogo from '@/assets/insi-logo.png'
import { purlinCityLoads } from '@/domain/purlin/model/purlin-reference.generated'
import { calculateWindowRigel } from '@/domain/window-rigel/model/calculate-window-rigel'
import { defaultWindowRigelInput, type WindowRigelInput } from '@/domain/window-rigel/model/window-rigel-input'
import { windowRigelWindowConstructionLoads } from '@/domain/window-rigel/model/window-rigel-reference.generated'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'

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

function resolveTubePriceRubPerKg(steelGrade: string): number {
  return steelGrade.trim() === 'С245'
    ? defaultUnifiedInput.tubeS245PriceRubPerKg
    : defaultUnifiedInput.tubeS345PriceRubPerKg
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
    <div style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#475569' }}>Тип окна</span>
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
              aria-label={`Тип окна ${windowType}`}
              onClick={() => onSelect(windowType)}
              style={{
                display: 'grid',
                gap: 6,
                padding: 8,
                borderRadius: 12,
                border: isActive ? '2px solid #0f766e' : '1px solid rgba(148, 163, 184, 0.30)',
                background: isActive ? 'rgba(153, 246, 228, 0.25)' : 'rgba(248, 250, 252, 0.95)',
                cursor: 'pointer',
              }}
            >
              <WindowTypeGlyph windowType={windowType} />
              <span style={{ fontSize: 12, color: '#475569' }}>Тип {windowType}</span>
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
        gap: 6,
        padding: 12,
        borderRadius: 14,
        background: 'rgba(148, 163, 184, 0.10)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 16 }}>
          {rank}. {candidate.profile}
        </strong>
        <span style={{ color: '#475569' }}>Сталь: {candidate.steelGrade}</span>
        <span style={{ color: '#475569' }}>Масса: {formatNumber(candidate.massKg)} кг</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{`Коэффициенты: гибкость ${formatNumber(candidate.utilization.flexibility, 2)} · прочность ${formatNumber(candidate.utilization.strength, 2)} · прогиб ${formatNumber(candidate.utilization.deflection, 2)}`}</div>
    </div>
  )
}

function SpecificationCard({
  title,
  candidate,
  windowCount,
}: {
  title: string
  candidate: ReturnType<typeof calculateWindowRigel>['bottomCandidates'][number] | undefined
  windowCount: number
}) {
  if (!candidate) {
    return (
      <article
        style={{
          display: 'grid',
          gap: 10,
          padding: 20,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.88)',
          boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div>Подходящий вариант не найден.</div>
      </article>
    )
  }

  const totalMassKg = candidate.massKg * windowCount
  const priceRubPerKg = resolveTubePriceRubPerKg(candidate.steelGrade)
  const priceRubPerTon = priceRubPerKg * 1000
  const totalCostRub = totalMassKg * priceRubPerKg

  return (
    <article
      style={{
        display: 'grid',
        gap: 10,
        padding: 20,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.88)',
        boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
      }}
    >
      <h3 style={{ margin: 0 }}>{title}</h3>
      <div style={{ display: 'grid', gap: 6, color: '#334155' }}>
        <div>Профиль: {candidate.profile}</div>
        <div>Сталь: {candidate.steelGrade}</div>
        <div>Масса одного ригеля: {formatNumber(candidate.massKg)} кг</div>
        <div>Количество окон: {windowCount}</div>
        <div>Общая масса: {formatNumber(totalMassKg, 0)} кг</div>
        <div>
          Стоимость: {formatRub(totalCostRub)} руб. ({formatRub(priceRubPerTon)} руб/т)
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
  const result = calculateWindowRigel(input)
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
      style={{ padding: 24, display: 'grid', gap: 24, maxWidth: 1200, margin: '0 auto' }}
    >
      <section style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <img src={insiLogo} alt="INSI" style={{ width: 92, height: 92, objectFit: 'contain' }} />
        <div style={{ display: 'grid', gap: 4 }}>
          <h1 style={{ margin: 0 }}>Подбор оконных ригелей</h1>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 0.95fr)',
          padding: 20,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.82)',
          boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            alignItems: 'start',
          }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Город</span>
            <select
              aria-label="Город"
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
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Высота окна, м</span>
            <input
              aria-label="Высота окна, м"
              value={String(input.windowHeightM).replace('.', ',')}
              onChange={handleNumberField('windowHeightM')}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Шаг рам, м</span>
            <input
              aria-label="Шаг рам, м"
              value={String(input.frameStepM).replace('.', ',')}
              onChange={handleNumberField('frameStepM')}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Тип окна</span>
            <input aria-label="Тип окна" value={String(input.windowType)} onChange={handleNumberField('windowType')} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Высота здания, м</span>
            <input
              aria-label="Высота здания, м"
              value={String(input.buildingHeightM).replace('.', ',')}
              onChange={handleNumberField('buildingHeightM')}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Пролет здания, м</span>
            <input
              aria-label="Пролет здания, м"
              value={String(input.buildingSpanM).replace('.', ',')}
              onChange={handleNumberField('buildingSpanM')}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Длина здания, м</span>
            <input
              aria-label="Длина здания, м"
              value={String(input.buildingLengthM).replace('.', ',')}
              onChange={handleNumberField('buildingLengthM')}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Количество окон</span>
            <input
              aria-label="Количество окон"
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

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Конструкция окна</span>
              <select
                aria-label="Конструкция окна"
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
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Макс. к-т использования</span>
              <input
                aria-label="Макс. к-т использования"
                value={String(input.maxUtilization).replace('.', ',')}
                onChange={handleNumberField('maxUtilization')}
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
          gap: 8,
          padding: '14px 16px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.72)',
          boxShadow: '0 18px 50px rgba(15, 23, 42, 0.05)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748b' }}>Нагрузки</h2>
        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            color: '#334155',
            fontSize: 14,
          }}
        >
          <div>Ветер: {formatNumber(result.loads.windLoadKpa, 3)} кПа</div>
          <div>Вертикальная: {formatNumber(result.loads.verticalLoadKpa, 3)} кПа</div>
          <div>Горизонтальная I сл.: {formatNumber(result.loads.horizontalLoadCase1Kpa, 6)} кПа</div>
          <div>Горизонтальная II сл.: {formatNumber(result.loads.horizontalLoadCase2Kpa, 6)} кПа</div>
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
            gap: 16,
            padding: 20,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.88)',
            boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h2 style={{ margin: 0 }}>Спецификация</h2>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <SpecificationCard title="Лучший нижний ригель" candidate={bestBottomCandidate} windowCount={windowCount} />
            <SpecificationCard title="Лучший верхний ригель" candidate={bestTopCandidate} windowCount={windowCount} />
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
            padding: 20,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.88)',
            boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h2 style={{ margin: 0 }}>Нижний ригель</h2>
          {result.bottomCandidates.length > 0 ? (
            result.bottomCandidates.map((candidate, index) => (
              <CandidateCard key={`${candidate.ordinal}-${candidate.steelGrade}`} rank={index + 1} candidate={candidate} />
            ))
          ) : (
            <div>Подходящих нижних ригелей не найдено.</div>
          )}
        </article>

        <article
          style={{
            display: 'grid',
            gap: 16,
            padding: 20,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.88)',
            boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h2 style={{ margin: 0 }}>Верхний ригель</h2>
          {result.workbookEffectiveTopCandidates.length > 0 ? (
            result.workbookEffectiveTopCandidates.map((candidate, index) => (
              <CandidateCard key={`${candidate.ordinal}-${candidate.steelGrade}`} rank={index + 1} candidate={candidate} />
            ))
          ) : (
            <div>Подходящих верхних ригелей не найдено.</div>
          )}
        </article>
      </section>
    </main>
  )
}
