import { useState, type ChangeEvent } from 'react'
import insiLogo from '@/assets/insi-logo.png'
import { calculateCraneBeam } from '@/domain/crane-beam/model/calculate-crane-beam'
import {
  craneBeamBrakeStructures,
  craneBeamCountsInSpan,
  craneBeamDutyGroups,
  craneBeamLoadCapacities,
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

const sectionCardStyle = {
  display: 'grid',
  gap: 14,
  padding: 18,
  borderRadius: 16,
  background: '#ffffff',
  border: '1px solid rgba(148, 163, 184, 0.18)',
} as const

const helpBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: '999px',
  border: '1px solid rgba(100, 116, 139, 0.35)',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
} as const

const helpPopoverStyle = {
  marginTop: 8,
  padding: '10px 12px',
  borderRadius: 10,
  background: '#fff7ed',
  border: '1px solid rgba(249, 115, 22, 0.22)',
  color: '#7c2d12',
  fontSize: 13,
  lineHeight: 1.4,
} as const

const resultSectionStyle = {
  display: 'grid',
  gap: 8,
  padding: 12,
  borderRadius: 12,
  background: '#ffffff',
  border: '1px solid rgba(148, 163, 184, 0.16)',
} as const

const resultRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  padding: '4px 0',
  borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
} as const

const craneBeamDemoPriceTonRub = 155_880

const text = {
  title: 'Подбор прокатной подкрановой балки',
  backToCalculator: 'Открыть основной калькулятор',
  methodology: 'Методика расчета и подбора профиля',
  result: 'Результат подбора',
  profileInfo: 'Расшифровка профиля',
  sectionType: 'Тип сечения',
  profileSeries: 'Серия',
  actualHeight: 'Фактическая высота профиля',
  nominalHeight: 'Условная высота серии',
  assortmentStandard: 'Сортамент',
  materialNote: 'Материал',
  steelStandard: 'Норматив по стали',
  designResistanceRy: 'Принятое расчетное сопротивление стали',
  progress: 'Статус сверки',
  roadmap: 'Что дальше',
  note:
    'Страница показывает модуль, сверенный с Excel по покрытой матрице сценариев. Дальше можно расширять покрытие workbook и доводить оставшиеся частные случаи.',
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

const fieldHelpText: Partial<Record<keyof typeof text, string>> = {
  lookupMode:
    'Показывает, откуда брать паспортные данные крана и рельса. В режиме "Из каталога" они подставляются по Excel-таблице, в ручном режиме задаются пользователем.',
  loadCapacityT:
    'Грузоподъемность крана. В списке оставлены только те значения, которые есть в Excel для этого модуля.',
  craneSpanM: 'Пролет мостового крана. По нему вместе с грузоподъемностью подбираются паспортные данные из каталога.',
  wheelCount: 'Общее число колес крана, через которое распределяется колесная нагрузка.',
  suspensionType:
    'Как подвешен груз у крана: гибко или жестко. Этот параметр влияет на коэффициенты и итоговые усилия.',
  dutyGroup:
    'Класс интенсивности работы крана. Чем тяжелее режим, тем выше расчетные воздействия и требовательнее подбор балки.',
  craneCountInSpan:
    'Сколько кранов одновременно работает в пролете. Для двух кранов расчет учитывает более неблагоприятный случай.',
  craneRail: 'Тип подкранового рельса, который опирается на балку.',
  beamSpanM: 'Пролет самой подкрановой балки между опорами.',
  brakeStructure:
    'Есть ли тормозная конструкция. Она влияет на подбор сечения и расчетные усилия.',
  stiffenerStepM: 'Шаг ребер жесткости подкрановой балки.',
  wheelLoadKn:
    'Вертикальная нагрузка на одно колесо крана. В каталожном режиме берется из Excel, в ручном вводится пользователем.',
  trolleyMassT:
    'Масса тележки крана. Нужна для определения расчетных воздействий.',
  craneBaseMm: 'База крана: расстояние между осями колес вдоль пути.',
  craneGaugeMm: 'Габарит крана поперек пути, используемый в расчетной схеме.',
  railFootWidthM: 'Ширина подошвы подкранового рельса.',
  railHeightM: 'Высота подкранового рельса.',
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

function resolveMethodologyHref(pathname: string): string {
  return pathname.startsWith('/insi-next/')
    ? '/insi-next/?route=crane-beam-methodology'
    : '/?route=crane-beam-methodology'
}

function formatNumber(value: number, digits = 3): string {
  return value.toFixed(digits).replace('.', ',')
}

function formatRub(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function resolveLookupModeLabel(lookupMode: string): string {
  return lookupMode === 'manual' ? text.lookupModeManual : text.lookupModeCatalog
}

export function CraneBeamDemoPage() {
  const [input, setInput] = useState<CraneBeamInput>(defaultCraneBeamInput)
  const [openHelpField, setOpenHelpField] = useState<string | null>(null)
  const result = calculateCraneBeam(input)
  const isCatalogLookup = input.lookupMode === 'catalog'
  const mainCalculatorHref =
    typeof window === 'undefined' ? '/' : resolveMainCalculatorHref(window.location.pathname)
  const methodologyHref =
    typeof window === 'undefined' ? '/?route=crane-beam-methodology' : resolveMethodologyHref(window.location.pathname)
  const beamQuantity = 1
  const unitMassKgPerM =
    result.selection.profileDetails.unitMassKgPerM ??
    (input.beamSpanM > 0 ? result.selection.weightKg / input.beamSpanM : null)
  const totalLengthM = input.beamSpanM * beamQuantity
  const totalMassKg = result.selection.weightKg * beamQuantity
  const priceTonRub = result.selection.profile ? craneBeamDemoPriceTonRub : null
  const estimatedCostRub = priceTonRub === null ? null : (totalMassKg / 1000) * priceTonRub
  const designationLabel = result.selection.profile
    ? `Двутавр ${result.selection.profile}-${result.selection.profileDetails.assortmentStandard}`
    : '—'

  const handleNumberField =
    <K extends keyof Pick<
      CraneBeamInput,
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

  const renderFieldLabel = (key: keyof typeof text, label: string, help?: string) => {
    const helpId = `field-help-${String(key)}`
    const isOpen = openHelpField === String(key)

    return (
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ flex: '1 1 auto', minWidth: 0 }}>{label}</span>
          {help ? (
            <button
              type="button"
              aria-label={`${label}: подсказка`}
              aria-expanded={isOpen}
              aria-controls={helpId}
              title={help}
              style={{ ...helpBadgeStyle, flex: '0 0 auto', marginTop: 1 }}
              onClick={(event) => {
                event.preventDefault()
                setOpenHelpField((prev) => (prev === String(key) ? null : String(key)))
              }}
            >
              ?
            </button>
          ) : null}
        </div>
        {help && isOpen ? (
          <div id={helpId} role="note" style={helpPopoverStyle}>
            {help}
          </div>
        ) : null}
      </div>
    )
  }

  const renderResultRow = (label: string, value: string, options?: { highlight?: boolean; accent?: boolean }) => (
    <div
      style={{
        ...resultRowStyle,
        borderBottom: options?.accent ? '0' : resultRowStyle.borderBottom,
      }}
    >
      <span style={{ color: '#64748b' }}>{label}</span>
      <span
        style={{
          color: options?.accent ? '#9a3412' : '#0f172a',
          fontWeight: options?.highlight || options?.accent ? 700 : 600,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div className="app-shell">
      <main
        data-testid="crane-beam-demo-page"
        className="page"
        style={{ display: 'grid', gap: 12, maxWidth: 'none', padding: '22px 0 48px' }}
      >
        <section
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: '12px 16px',
            borderRadius: 16,
            background: '#ffffff',
            border: '1px solid rgba(148, 163, 184, 0.18)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <img src={insiLogo} alt="INSI" style={{ width: 100, height: 100, objectFit: 'contain' }} />
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.05, color: '#0f172a' }}>{text.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={methodologyHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                padding: '0 18px',
                borderRadius: 10,
                background: '#fff7ed',
                color: '#9a3412',
                border: '1px solid rgba(249, 115, 22, 0.28)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {text.methodology}
            </a>
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
          </div>
        </section>

        <section
          style={{
            ...sectionCardStyle,
            gap: 16,
          }}
        >
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div className="crane-beam-lookup-grid">
              <label style={fieldLabelStyle}>
                {renderFieldLabel('lookupMode', text.lookupMode, fieldHelpText.lookupMode)}
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
                  padding: '9px 11px',
                  borderRadius: 10,
                  background: isCatalogLookup ? '#eff6ff' : '#f8fafc',
                  color: '#334155',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  fontSize: 12,
                  lineHeight: 1.3,
                }}
              >
                {isCatalogLookup ? text.catalogHint : text.manualHint}
              </div>
            </div>

            <div className="crane-beam-form-grid">
              <label style={fieldLabelStyle}>
                {renderFieldLabel('loadCapacityT', text.loadCapacityT, fieldHelpText.loadCapacityT)}
                <select
                  aria-label={text.loadCapacityT}
                  style={fieldControlStyle}
                  value={String(input.loadCapacityT)}
                  onChange={(event) =>
                    setInput((prev) => ({
                      ...prev,
                      loadCapacityT:
                        craneBeamLoadCapacities.find((option) => String(option) === event.target.value) ??
                        prev.loadCapacityT,
                    }))
                  }
                >
                  {craneBeamLoadCapacities.map((option) => (
                    <option key={String(option)} value={String(option)}>
                      {String(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldLabelStyle}>
                {renderFieldLabel('craneSpanM', text.craneSpanM, fieldHelpText.craneSpanM)}
                <input
                  aria-label={text.craneSpanM}
                  style={fieldControlStyle}
                  value={String(input.craneSpanM).replace('.', ',')}
                  onChange={handleNumberField('craneSpanM')}
                />
              </label>
              <label style={fieldLabelStyle}>
                {renderFieldLabel('wheelCount', text.wheelCount, fieldHelpText.wheelCount)}
                <input
                  aria-label={text.wheelCount}
                  style={fieldControlStyle}
                  value={String(input.wheelCount)}
                  onChange={handleNumberField('wheelCount')}
                />
              </label>
              <label style={fieldLabelStyle}>
                {renderFieldLabel('suspensionType', text.suspensionType, fieldHelpText.suspensionType)}
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
                {renderFieldLabel('dutyGroup', text.dutyGroup, fieldHelpText.dutyGroup)}
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
                {renderFieldLabel('craneCountInSpan', text.craneCountInSpan, fieldHelpText.craneCountInSpan)}
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
                {renderFieldLabel('craneRail', text.craneRail, fieldHelpText.craneRail)}
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
                {renderFieldLabel('beamSpanM', text.beamSpanM, fieldHelpText.beamSpanM)}
                <input
                  aria-label={text.beamSpanM}
                  style={fieldControlStyle}
                  value={String(input.beamSpanM).replace('.', ',')}
                  onChange={handleNumberField('beamSpanM')}
                />
              </label>
              <label style={fieldLabelStyle}>
                {renderFieldLabel('brakeStructure', text.brakeStructure, fieldHelpText.brakeStructure)}
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
                {renderFieldLabel('stiffenerStepM', text.stiffenerStepM, fieldHelpText.stiffenerStepM)}
                <input
                  aria-label={text.stiffenerStepM}
                  style={fieldControlStyle}
                  value={String(input.stiffenerStepM).replace('.', ',')}
                  onChange={handleNumberField('stiffenerStepM')}
                />
              </label>
            </div>

            <section style={{ display: 'grid', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{text.passportSection}</h2>
              <div className="crane-beam-form-grid">
                <label style={fieldLabelStyle}>
                  {renderFieldLabel('wheelLoadKn', text.wheelLoadKn, fieldHelpText.wheelLoadKn)}
                  <input
                    aria-label={text.wheelLoadKn}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.wheelLoadKn : input.wheelLoadKn, 3)}
                    onChange={handleNumberField('wheelLoadKn')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  {renderFieldLabel('trolleyMassT', text.trolleyMassT, fieldHelpText.trolleyMassT)}
                  <input
                    aria-label={text.trolleyMassT}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.trolleyMassT : input.trolleyMassT, 3)}
                    onChange={handleNumberField('trolleyMassT')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  {renderFieldLabel('craneBaseMm', text.craneBaseMm, fieldHelpText.craneBaseMm)}
                  <input
                    aria-label={text.craneBaseMm}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.craneBaseMm : input.craneBaseMm, 0)}
                    onChange={handleNumberField('craneBaseMm')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  {renderFieldLabel('craneGaugeMm', text.craneGaugeMm, fieldHelpText.craneGaugeMm)}
                  <input
                    aria-label={text.craneGaugeMm}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.craneGaugeMm : input.craneGaugeMm, 0)}
                    onChange={handleNumberField('craneGaugeMm')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  {renderFieldLabel('railFootWidthM', text.railFootWidthM, fieldHelpText.railFootWidthM)}
                  <input
                    aria-label={text.railFootWidthM}
                    disabled={isCatalogLookup}
                    style={isCatalogLookup ? readOnlyControlStyle : fieldControlStyle}
                    value={formatNumber(isCatalogLookup ? result.lookup.railFootWidthM : input.railFootWidthM, 3)}
                    onChange={handleNumberField('railFootWidthM')}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  {renderFieldLabel('railHeightM', text.railHeightM, fieldHelpText.railHeightM)}
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
        </section>

        <section
          style={{
            ...sectionCardStyle,
            gap: 12,
          }}
        >
          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <article
              style={{
                display: 'grid',
                gap: 14,
                padding: 16,
                borderRadius: 14,
                background: 'linear-gradient(180deg, #f8fafc 0%, #f2f6fa 100%)',
                border: '1px solid rgba(148, 163, 184, 0.22)',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>{text.result}</h2>

              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  padding: 12,
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#334155' }}>
                  <span>Вес: <strong>{formatNumber(result.selection.weightKg, 3)}</strong> кг</span>
                  <span>К-т использования: <strong>{formatNumber(result.selection.utilization, 3)}</strong></span>
                </div>
              </div>

              {result.selection.profile ? (
                <>
                  <div className="crane-beam-profile-grid">
                    <section style={resultSectionStyle}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                        Параметры профиля
                      </div>
                      {renderResultRow('Тип', result.selection.profileDetails.sectionType || '—')}
                      {renderResultRow('Размер', result.selection.profile, { highlight: true })}
                      {renderResultRow('Принятая расчетная модель стали', result.selection.profileDetails.materialNote || '—')}
                      {renderResultRow('Стандарт сортамента', result.selection.profileDetails.assortmentStandard || '—')}
                      {renderResultRow('Норматив по стали', result.selection.profileDetails.steelStandard || '—')}
                      {renderResultRow('Масса 1 м', unitMassKgPerM === null ? '—' : `${formatNumber(unitMassKgPerM, 2)} кг`)}
                      {renderResultRow(
                        'Принятое расчетное сопротивление Ry',
                        result.selection.profileDetails.designResistanceRyMpa === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.designResistanceRyMpa, 1)} МПа`,
                        { accent: true },
                      )}
                    </section>

                    <section style={resultSectionStyle}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                        Геометрия профиля
                      </div>
                      {renderResultRow(
                        'Высота h',
                        result.selection.profileDetails.actualHeightMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.actualHeightMm, 0)} мм`,
                      )}
                      {renderResultRow(
                        'Ширина полки b',
                        result.selection.profileDetails.flangeWidthMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.flangeWidthMm, 0)} мм`,
                      )}
                      {renderResultRow(
                        'Толщина стенки tw',
                        result.selection.profileDetails.webThicknessMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.webThicknessMm, 1)} мм`,
                      )}
                      {renderResultRow(
                        'Толщина полки tf',
                        result.selection.profileDetails.flangeThicknessMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.flangeThicknessMm, 1)} мм`,
                      )}
                      {renderResultRow('Серия', result.selection.profileDetails.profileSeries || '—')}
                      {renderResultRow(
                        'Условная высота серии',
                        result.selection.profileDetails.nominalSeriesHeightMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.nominalSeriesHeightMm, 0)} мм`,
                      )}
                    </section>

                    <section style={resultSectionStyle}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                        Объем поставки
                      </div>
                      {renderResultRow('Длина балки', `${formatNumber(input.beamSpanM, 1)} м`)}
                      {renderResultRow('Количество', `${formatNumber(beamQuantity, 0)} шт.`)}
                      {renderResultRow('Общая длина', `${formatNumber(totalLengthM, 1)} м.п.`)}
                      {renderResultRow('Общая масса', `${formatNumber(totalMassKg, 1)} кг`, { highlight: true })}
                    </section>

                    <section style={resultSectionStyle}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                        Стоимость
                      </div>
                      {renderResultRow(
                        'Ориентировочная цена за тонну',
                        priceTonRub === null ? '—' : `${formatRub(priceTonRub)} ₽/т`,
                      )}
                      {renderResultRow(
                        'Ориентировочная стоимость',
                        estimatedCostRub === null ? '—' : `${formatRub(estimatedCostRub)} ₽`,
                        { accent: true },
                      )}
                    </section>

                    <section style={{ ...resultSectionStyle, gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                        Условное обозначение
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: '#f8fafc',
                          border: '1px solid rgba(148, 163, 184, 0.18)',
                          color: '#0f172a',
                          fontWeight: 700,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {designationLabel}
                      </div>
                    </section>

                    <section style={{ ...resultSectionStyle, gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                        Принятые нормативы и допущения
                      </div>
                      {renderResultRow('Расчетный сортамент', result.selection.profileDetails.assortmentStandard || '—')}
                      {renderResultRow('Норматив по стали', result.selection.profileDetails.steelStandard || '—')}
                      {renderResultRow('Режим расчета поставки', 'Показан для одной подкрановой балки')}
                      {renderResultRow(
                        'Стоимостная оценка',
                        priceTonRub === null ? '—' : `Ориентировочно по ${formatRub(priceTonRub)} ₽/т`,
                      )}
                      {renderResultRow(
                        'Источник паспортных данных',
                        isCatalogLookup ? 'Каталожные значения модуля' : 'Ручной ввод пользователя',
                        { accent: true },
                      )}
                    </section>
                  </div>

                  <section style={resultSectionStyle}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                      Расчетные усилия
                    </div>
                    <div className="crane-beam-loads-grid">
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Mx</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.loads.designMxGeneralKnM, 3)}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН·м</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>My</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.loads.designMyGeneralKnM, 3)}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН·м</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Q</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.loads.designQGeneralKn, 3)}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Qдоп</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.loads.designQAdditionalKn, 3)}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>кН</div>
                      </div>
                    </div>
                  </section>

                  <section style={resultSectionStyle}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                      Производные коэффициенты
                    </div>
                    <div className="crane-beam-metric-grid">
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{text.tbnKn}</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.derived.tbnKn, 3)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{text.qbnKn}</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.derived.qbnKn, 3)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{text.gammaLocal}</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.derived.gammaLocal, 3)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{text.fatigueNvyn}</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.derived.fatigueNvyn, 3)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{text.alpha}</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{formatNumber(result.derived.alpha, 3)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{text.caseForTwoCranes}</div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{result.derived.caseForTwoCranes}</div>
                      </div>
                    </div>
                  </section>

                </>
              ) : null}

              <div style={{ display: 'none' }}>
                {result.selection.profile ? (
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                    {text.profileInfo}
                  </div>
                  <div className="crane-beam-profile-grid" style={{ color: '#334155', lineHeight: 1.35 }}>
                    <div>{text.sectionType}: <strong>{result.selection.profileDetails.sectionType}</strong></div>
                    <div>{text.profileSeries}: <strong>{result.selection.profileDetails.profileSeries}</strong></div>
                    <div>
                      {text.actualHeight}: <strong>
                        {result.selection.profileDetails.actualHeightMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.actualHeightMm, 0)} мм`}
                      </strong>
                    </div>
                    <div>
                      {text.nominalHeight}: <strong>
                        {result.selection.profileDetails.nominalSeriesHeightMm === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.nominalSeriesHeightMm, 0)} мм`}
                      </strong>
                    </div>
                    <div>{text.assortmentStandard}: <strong>{result.selection.profileDetails.assortmentStandard}</strong></div>
                    <div>{text.materialNote}: <strong>{result.selection.profileDetails.materialNote}</strong></div>
                    <div>{text.steelStandard}: <strong>{result.selection.profileDetails.steelStandard}</strong></div>
                    <div>
                      {text.designResistanceRy}: <strong>
                        {result.selection.profileDetails.designResistanceRyMpa === null
                          ? '—'
                          : `${formatNumber(result.selection.profileDetails.designResistanceRyMpa, 1)} МПа`}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="crane-beam-metric-grid">
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

              <div className="crane-beam-metric-grid">
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
                      ? 'сверено с Excel по покрытому набору сценариев'
                      : 'идет поэтапный перенос workbook'}
                  </strong>
                </div>
                <div>
                  Workbook `Сводка`: {craneBeamWorkbookMap.summaryDerived.selectedProfile}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          style={{
            ...sectionCardStyle,
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>{text.roadmap}</h3>
          <div style={{ color: '#475569', lineHeight: 1.5 }}>{text.note}</div>
        </section>
      </main>
    </div>
  )
}
