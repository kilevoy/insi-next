import { useState, type ChangeEvent } from 'react'
import insiLogo from '@/assets/insi-logo.png'
import { calculateCraneBeam } from '@/domain/crane-beam/model/calculate-crane-beam'
import {
  craneBeamBrakeStructures,
  craneBeamCountsInSpan,
  craneBeamDutyGroups,
  craneBeamLookupModes,
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

const readOnlyControlStyle = {
  ...fieldControlStyle,
  background: '#f8fafc',
  color: '#475569',
} as const

const text = {
  title: 'Подбор прокатной подкрановой балки',
  backToCalculator: 'Открыть основной калькулятор',
  result: 'Результат подбора',
  progress: 'Статус переноса',
  roadmap: 'Что дальше',
  note:
    'Страница уже показывает первый сверенный baseline из Excel. Следующим шагом перенесем полный подбор сортамента и проверки по всем режимам.',
  lookupMode: 'Источник паспортных данных',
  lookupModeCatalog: 'Из каталога',
  lookupModeManual: 'Ручной ввод',
  inputSection: 'Основные параметры',
  passportSection: 'Паспорт крана и рельса',
  derivedSection: 'Производные коэффициенты',
  loadCapacityT: 'Грузоподъемность, т',
  craneSpanM: 'Пролет крана, м',
  wheelLoadKn: 'Нагрузка на колесо, кН',
  wheelCount: 'Число колес',
  trolleyMassT: 'Масса тележки крана, т',
  craneBaseMm: 'База крана, мм',
  craneGaugeMm: 'Габарит крана, мм',
  suspensionType: 'Тип подвеса',
  dutyGroup: 'Группа режима работы',
  craneCountInSpan: 'Кол-во кранов в пролете',
  craneRail: 'Подкрановый рельс',
  railFootWidthM: 'Ширина подошвы рельса, м',
  railHeightM: 'Высота кранового рельса, м',
  beamSpanM: 'Пролет ПБ, м',
  brakeStructure: 'Тормозная конструкция',
  stiffenerStepM: 'Шаг ребер, м',
  tbnKn: 'Tbн, кН',
  qbnKn: 'Qbн, кН',
  gammaLocal: 'gamma local',
  fatigueNvyn: 'nvyn',
  alpha: 'alpha',
  caseForTwoCranes: 'Случай 2 кранов',
  catalogHint: 'Для стандартных сочетаний паспортные данные подтягиваются автоматически из каталога.',
  manualHint: 'Ручной режим нужен для нестандартных паспортных данных крана и рельса.',
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

function resolveLookupModeLabel(lookupMode: string): string {
  return lookupMode === 'manual' ? text.lookupModeManual : text.lookupModeCatalog
}

export function CraneBeamDemoPage() {
  const [input, setInput] = useState<CraneBeamInput>(defaultCraneBeamInput)
  const result = calculateCraneBeam(input)
  const isCatalogLookup = input.lookupMode === 'catalog'
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
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div
              style={{
                display: 'grid',
                gap: 14,
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                alignItems: 'start',
              }}
            >
              <label style={fieldLabelStyle}>
                <span>{text.lookupMode}</span>
                <select
                  aria-label={text.lookupMode}
                  style={fieldControlStyle}
                  value={input.lookupMode}
                  onChange={(event) => setInput((prev) => ({ ...prev, lookupMode: event.target.value }))}
                >
                  {craneBeamLookupModes.map((option) => (
                    <option key={option} value={option}>
                      {resolveLookupModeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  display: 'grid',
                  alignSelf: 'end',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isCatalogLookup ? '#eff6ff' : '#f8fafc',
                  color: '#334155',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  fontSize: 13,
                  lineHeight: 1.35,
                }}
              >
                {isCatalogLookup ? text.catalogHint : text.manualHint}
              </div>
            </div>

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
                <input
                  aria-label={text.loadCapacityT}
                  style={fieldControlStyle}
                  value={String(input.loadCapacityT).replace('.', ',')}
                  onChange={handleNumberField('loadCapacityT')}
                />
              </label>
              <label style={fieldLabelStyle}>
                <span>{text.craneSpanM}</span>
                <input
                  aria-label={text.craneSpanM}
                  style={fieldControlStyle}
                  value={String(input.craneSpanM).replace('.', ',')}
                  onChange={handleNumberField('craneSpanM')}
                />
              </label>
              <label style={fieldLabelStyle}>
                <span>{text.wheelCount}</span>
                <input
                  aria-label={text.wheelCount}
                  style={fieldControlStyle}
                  value={String(input.wheelCount)}
                  onChange={handleNumberField('wheelCount')}
                />
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
                <span>{text.beamSpanM}</span>
                <input
                  aria-label={text.beamSpanM}
                  style={fieldControlStyle}
                  value={String(input.beamSpanM).replace('.', ',')}
                  onChange={handleNumberField('beamSpanM')}
                />
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
                <input
                  aria-label={text.stiffenerStepM}
                  style={fieldControlStyle}
                  value={String(input.stiffenerStepM).replace('.', ',')}
                  onChange={handleNumberField('stiffenerStepM')}
                />
              </label>
            </div>

            <section style={{ display: 'grid', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{text.passportSection}</h2>
              <div
                style={{
                  display: 'grid',
                  gap: 14,
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  alignItems: 'start',
                }}
              >
                <label style={fieldLabelStyle}>
                  <span>{text.wheelLoadKn}</span>
                  <input
                    aria-label={text.wheelLoadKn}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.wheelLoadKn : input.wheelLoadKn, 3)}
                    onChange={handleNumberField('wheelLoadKn')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  <span>{text.trolleyMassT}</span>
                  <input
                    aria-label={text.trolleyMassT}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.trolleyMassT : input.trolleyMassT, 3)}
                    onChange={handleNumberField('trolleyMassT')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  <span>{text.craneBaseMm}</span>
                  <input
                    aria-label={text.craneBaseMm}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.craneBaseMm : input.craneBaseMm, 0)}
                    onChange={handleNumberField('craneBaseMm')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  <span>{text.craneGaugeMm}</span>
                  <input
                    aria-label={text.craneGaugeMm}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.craneGaugeMm : input.craneGaugeMm, 0)}
                    onChange={handleNumberField('craneGaugeMm')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  <span>{text.railFootWidthM}</span>
                  <input
                    aria-label={text.railFootWidthM}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.railFootWidthM : input.railFootWidthM, 3)}
                    onChange={handleNumberField('railFootWidthM')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  <span>{text.railHeightM}</span>
                  <input
                    aria-label={text.railHeightM}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.railHeightM : input.railHeightM, 3)}
                    onChange={handleNumberField('railHeightM')}
                  />
                </label>
              </div>
            </section>
          </div>

          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <article
              style={{
                display: 'grid',
                gap: 16,
                padding: 18,
                borderRadius: 14,
                background: 'linear-gradient(180deg, #f8fafc 0%, #f2f6fa 100%)',
                border: '1px solid rgba(148, 163, 184, 0.22)',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>{text.result}</h2>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  padding: 14,
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                  Профиль
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: '#0f172a' }}>
                  {result.selection.profile || '—'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#334155' }}>
                  <span>Вес: <strong>{formatNumber(result.selection.weightKg, 3)}</strong> кг</span>
                  <span>К-т использования: <strong>{formatNumber(result.selection.utilization, 3)}</strong></span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                }}
              >
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Mx</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.loads.designMxGeneralKnM, 3)}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН·м</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>My</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.loads.designMyGeneralKnM, 3)}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН·м</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Q</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.loads.designQGeneralKn, 3)}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Qдоп</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.loads.designQAdditionalKn, 3)}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН</div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                }}
              >
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{text.tbnKn}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.derived.tbnKn, 3)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{text.qbnKn}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.derived.qbnKn, 3)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{text.gammaLocal}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.derived.gammaLocal, 3)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{text.fatigueNvyn}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.derived.fatigueNvyn, 3)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{text.alpha}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {formatNumber(result.derived.alpha, 3)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{text.caseForTwoCranes}</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {result.derived.caseForTwoCranes}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 4,
                  paddingTop: 2,
                  color: '#64748b',
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                <div>
                  {text.progress}:{' '}
                  <strong style={{ color: '#334155' }}>
                    {result.selection.profile
                      ? 'первый Excel-baseline подключен'
                      : 'идет поэтапный перенос workbook'}
                  </strong>
                </div>
                <div>
                  Workbook `Сводка`: {craneBeamWorkbookMap.summaryDerived.selectedProfile}
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
