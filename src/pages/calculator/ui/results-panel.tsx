import { useState } from 'react'
import type { DomainTab } from '@/app/App'
import type { CandidateResult } from '@/domain/common/model/candidate-result'
import type { ColumnCalculationResult } from '@/domain/column/model/calculate-column'
import type { ColumnGroupKey } from '@/domain/column/model/column-output'
import type { EnclosingClassKey } from '@/domain/enclosing/model/enclosing-reference.generated'
import type { EnclosingSectionSpecification } from '@/domain/enclosing/model/enclosing-output'
import type { PurlinCalculationResult } from '@/domain/purlin/model/calculate-purlin'
import { calculateEnclosing } from '@/domain/enclosing/model/calculate-enclosing'
import { mapUnifiedInputToEnclosingInput } from '@/domain/enclosing/model/enclosing-mapper'
import type { UnifiedInputState } from '../model/unified-input'
import { MethodologyPanel } from './methodology-panel'

interface PriceImportStatus {
  isLoading: boolean
  message: string | null
  error: string | null
  sourceFileName: string | null
  importedAtIso: string | null
}

interface ResultsPanelProps {
  input: UnifiedInputState
  activeTab: DomainTab
  purlinResult: PurlinCalculationResult | null
  columnResult: ColumnCalculationResult | null
  isPending: boolean
  purlinError?: string | null
  columnError?: string | null
  isColumnManualMode: boolean
  onColumnManualModeChange: (isManualMode: boolean) => void
  onColumnProfileSelect: (group: ColumnGroupKey, selectedIndex: number) => void
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource']
  onPurlinSpecificationSourceChange: (source: UnifiedInputState['purlinSpecificationSource']) => void
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode']
  onPurlinSelectionModeChange: (mode: UnifiedInputState['purlinSelectionMode']) => void
  selectedSortPurlinIndex: number
  selectedLstkPurlinIndex: number
  onSortPurlinSelect: (selectedIndex: number) => void
  onLstkPurlinSelect: (selectedIndex: number) => void
  onImportPricePdf: (file: File) => Promise<void>
  onResetPriceOverrides: () => void
  priceImportStatus: PriceImportStatus
}

const ENCLOSING_PRICE_PDF_INPUT_ID = 'enclosing-price-pdf-input'

const COLUMN_GROUPS: ReadonlyArray<{ key: ColumnGroupKey; title: string }> = [
  { key: 'extreme', title: 'Крайняя колонна — Подбор профилей' },
  { key: 'fachwerk', title: 'Фахверковая колонна — Подбор профилей' },
  { key: 'middle', title: 'Средняя колонна — Подбор профилей' },
]

const WIND_REGION_BY_KPA = new Map<number, string>([
  [0.23, 'I'],
  [0.3, 'II'],
  [0.38, 'III'],
  [0.48, 'IV'],
  [0.6, 'V'],
  [0.73, 'VI'],
  [0.85, 'VII'],
])

const SNOW_REGION_LIMITS: ReadonlyArray<{ maxKpa: number; label: string }> = [
  { maxKpa: 0.5, label: 'I' },
  { maxKpa: 1.0, label: 'II' },
  { maxKpa: 1.5, label: 'III' },
  { maxKpa: 2.0, label: 'IV' },
  { maxKpa: 2.5, label: 'V' },
  { maxKpa: 3.0, label: 'VI' },
  { maxKpa: 3.5, label: 'VII' },
  { maxKpa: 4.0, label: 'VIII' },
]

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}

function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')}`
}

function isSandwichPanelCovering(covering: string): boolean {
  const normalized = covering.trim().toLowerCase()
  return (
    normalized.includes('с-п') ||
    normalized.includes('с п') ||
    normalized.includes('сэндвич') ||
    normalized.includes('sandwich')
  )
}

function formatStepLimitMm(value: number, zeroLabel = 'авто'): string {
  return value > 0 ? formatNumber(value, 0) : zeroLabel
}

function resolveWindRegionLabel(windLoadKpa: number | undefined): string {
  if (windLoadKpa === undefined) {
    return '-'
  }

  const exactMatch = [...WIND_REGION_BY_KPA.entries()].find(
    ([kpa]) => Math.abs(kpa - windLoadKpa) < 0.001,
  )

  return exactMatch?.[1] ?? 'по таблице города'
}

function resolveSnowRegionLabel(snowLoadKpa: number | undefined): string {
  if (snowLoadKpa === undefined) {
    return '-'
  }

  const band = SNOW_REGION_LIMITS.find((item) => snowLoadKpa <= item.maxKpa + 0.001)
  return band?.label ?? 'по таблице города'
}

function resolveCandidateCostRub(candidate: CandidateResult): number | null {
  if (candidate.estimatedCostRub !== undefined) {
    return candidate.estimatedCostRub
  }

  if (candidate.priceTonRub !== undefined) {
    return (candidate.totalMassKg / 1000) * candidate.priceTonRub
  }

  return null
}

function resolveColumnProfileType(candidate: CandidateResult): string {
  const familyNormalized = (candidate.family ?? '').toLowerCase()
  if (familyNormalized.includes('mp350') || familyNormalized.includes('mp390')) {
    return 'ЛСТК'
  }

  const profileNormalized = candidate.profile.trim().toLowerCase()
  if (profileNormalized.startsWith('кв.') || profileNormalized.startsWith('пр.')) {
    return 'Труба'
  }

  if (/^\d+\s*б\d*/i.test(candidate.profile.trim()) || /^\d+\s*ш\d*/i.test(candidate.profile.trim())) {
    return 'Двутавр'
  }

  if (/^\d+\s*[а-я]*п$/i.test(candidate.profile.trim())) {
    return 'Швеллер'
  }

  return 'Сортовой'
}

function filterAvailableCandidates(candidates: CandidateResult[]): CandidateResult[] {
  return candidates
}

function formatPurlinFamilyLabel(family: string | undefined): string {
  if (!family) {
    return '-'
  }

  if (family.toLowerCase() === 'sort steel') {
    return 'Сортовой прокат'
  }

  return family
}

function estimatePurlinCount(candidate: CandidateResult, frameStepM: number): number {
  if (frameStepM <= 0 || candidate.unitMassKg <= 0 || candidate.totalMassKg <= 0) {
    return 0
  }

  const estimate = candidate.totalMassKg / (candidate.unitMassKg * frameStepM)
  return Math.max(1, Math.round(estimate))
}

function resolvePurlinSpecificationState(
  purlinResult: PurlinCalculationResult | null,
  source: UnifiedInputState['purlinSpecificationSource'],
  selectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
) {
  const sortCandidates = filterAvailableCandidates(purlinResult?.sortSteelTop10 ?? [])
  const autoSortCandidate = sortCandidates[0]
  const manualSortCandidate = sortCandidates[selectedSortPurlinIndex]

  const lstkCandidates = filterAvailableCandidates([...(purlinResult?.lstkMp350Top ?? []), ...(purlinResult?.lstkMp390Top ?? [])])
  const autoLstkCandidate = lstkCandidates
    .map((candidate) => ({ candidate, costRub: resolveCandidateCostRub(candidate) ?? Number.POSITIVE_INFINITY }))
    .sort((left, right) => left.costRub - right.costRub)[0]?.candidate
  const manualLstkCandidate = lstkCandidates[selectedLstkPurlinIndex]

  const selectedCandidate =
    source === 'sort'
      ? selectionMode === 'manual'
        ? manualSortCandidate ?? autoSortCandidate
        : autoSortCandidate
      : selectionMode === 'manual'
        ? manualLstkCandidate ?? autoLstkCandidate
        : autoLstkCandidate

  return {
    sortCandidates,
    lstkCandidates,
    selectedCandidate,
    selectedCostRub: selectedCandidate ? resolveCandidateCostRub(selectedCandidate) : null,
    totalPurlinCount:
      selectedCandidate && purlinResult
        ? estimatePurlinCount(selectedCandidate, purlinResult.loadSummary.frameStepM)
        : 0,
    sourceLabel: source === 'sort' ? 'Сортовой прокат' : 'ЛСТК',
  }
}

function renderPurlinCandidatesTable(title: string, candidates: CandidateResult[], limit?: number) {
  const displayList = limit ? candidates.slice(0, limit) : candidates
  const isSortSteel = displayList.every((candidate) => (candidate.family ?? '') === 'Sort steel')

  return (
    <div className="results-section" key={title}>
      <div className="results-table-head">
        <h3 className="results-section-title" style={{ marginBottom: 0 }}>
          {title}
        </h3>
        <span>Опции: {displayList.length}</span>
      </div>

      {displayList.length === 0 ? (
        <div className="results-empty">Подходящие варианты не найдены.</div>
      ) : isSortSteel ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Профиль</th>
                <th>Сталь</th>
                <th>Шаг, мм</th>
                <th>Масса, кг</th>
                <th>К-т исп.</th>
                <th>Стоимость, руб.</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((candidate, index) => {
                const candidateCostRub = resolveCandidateCostRub(candidate)

                return (
                  <tr key={`${candidate.profile}-${candidate.steelGrade}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{candidate.profile}</td>
                    <td>{candidate.steelGrade}</td>
                    <td>{candidate.stepMm ? formatNumber(candidate.stepMm, 0) : '-'}</td>
                    <td>{formatNumber(candidate.totalMassKg, 0)}</td>
                    <td>{formatNumber(candidate.utilization, 3)}</td>
                    <td>{candidateCostRub === null ? '-' : formatRub(candidateCostRub)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Линия</th>
                <th>Профиль</th>
                <th>Шаг, мм</th>
                <th>Масса 1 п.м., кг</th>
                <th>Масса / шаг, кг</th>
                <th>Масса / здание, кг</th>
                <th>С раскосами, кг</th>
                <th>Черный, кг</th>
                <th>Оцинк., кг</th>
                <th>Длина, м</th>
                <th>Масса 1 м, кг</th>
                <th>К-т исп.</th>
                <th>Стоимость, руб.</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((candidate, index) => {
                const candidateCostRub = resolveCandidateCostRub(candidate)

                return (
                  <tr key={`${candidate.family}-${candidate.profile}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{candidate.excelMetrics?.lineLabel ?? '-'}</td>
                    <td>{candidate.profile}</td>
                    <td>{candidate.stepMm ? formatNumber(candidate.stepMm, 0) : '-'}</td>
                    <td>
                      {candidate.excelMetrics?.unitMassPerMeterKg === undefined
                        ? '-'
                        : formatNumber(candidate.excelMetrics.unitMassPerMeterKg, 2)}
                    </td>
                    <td>{candidate.excelMetrics?.massPerStepKg === undefined ? '-' : formatNumber(candidate.excelMetrics.massPerStepKg, 4)}</td>
                    <td>{formatNumber(candidate.totalMassKg, 3)}</td>
                    <td>{candidate.excelMetrics?.massWithBracesKg === undefined ? '-' : formatNumber(candidate.excelMetrics.massWithBracesKg, 4)}</td>
                    <td>{candidate.excelMetrics?.blackMassKg == null ? '-' : formatNumber(candidate.excelMetrics.blackMassKg, 3)}</td>
                    <td>{candidate.excelMetrics?.galvanizedMassKg == null ? '-' : formatNumber(candidate.excelMetrics.galvanizedMassKg, 3)}</td>
                    <td>{candidate.excelMetrics?.developedLengthM === undefined ? '-' : formatNumber(candidate.excelMetrics.developedLengthM, 3)}</td>
                    <td>{candidate.excelMetrics?.massPerMeterKg === undefined ? '-' : formatNumber(candidate.excelMetrics.massPerMeterKg, 4)}</td>
                    <td>{formatNumber(candidate.utilization, 4)}</td>
                    <td>{candidateCostRub === null ? '-' : formatRub(candidateCostRub)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function renderPurlinSpecification(
  purlinResult: PurlinCalculationResult | null,
  source: UnifiedInputState['purlinSpecificationSource'],
  selectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
) {
  if (!purlinResult) {
    return null
  }

  const { selectedCandidate, sourceLabel, selectedCostRub, totalPurlinCount } = resolvePurlinSpecificationState(
    purlinResult,
    source,
    selectionMode,
    selectedSortPurlinIndex,
    selectedLstkPurlinIndex,
  )

  return (
    <div className="results-section">
      <h3 className="results-section-title">СПЕЦИФИКАЦИЯ ПРОГОНОВ</h3>

      {!selectedCandidate ? (
        <div className="results-empty">Подходящие варианты для спецификации не найдены.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th>Семейство</th>
                <th>Профиль</th>
                <th>Сталь</th>
                <th>Шаг, мм</th>
                <th>Масса 1 п.м., кг</th>
                <th>Масса всего, кг</th>
                <th>Стоимость, руб</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{sourceLabel}</td>
                <td>{formatPurlinFamilyLabel(selectedCandidate.family)}</td>
                <td>{selectedCandidate.profile}</td>
                <td>{selectedCandidate.steelGrade}</td>
                <td>{selectedCandidate.stepMm ? formatNumber(selectedCandidate.stepMm, 0) : '-'}</td>
                <td>{formatNumber(selectedCandidate.unitMassKg, 2)}</td>
                <td>{formatNumber(selectedCandidate.totalMassKg, 0)}</td>
                <td>{selectedCostRub === null ? '-' : formatRub(selectedCostRub)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {selectedCandidate && (
        <div className="footer-note">
          <strong>Итого по всем прогонам: </strong>
          <span>
            {`${formatNumber(totalPurlinCount, 0)} шт., `}
            {`${formatNumber(selectedCandidate.totalMassKg, 0)} кг, `}
            {`${selectedCostRub === null ? '-' : `${formatRub(selectedCostRub)} руб.`}`}
          </span>
        </div>
      )}
    </div>
  )
}

function renderColumnCandidatesBlock(
  columnResult: ColumnCalculationResult | null,
  isColumnManualMode: boolean,
  onColumnProfileSelect: (group: ColumnGroupKey, selectedIndex: number) => void,
) {
  return COLUMN_GROUPS.map((group) => {
    const candidates = columnResult?.topCandidatesByType[group.key] ?? []
    const selectedIndex = columnResult?.selectedProfileByType[group.key] ?? 0
    const specGroup = columnResult?.specification.groups.find((item) => item.key === group.key)

    if (!specGroup || specGroup.columnsCount === 0) {
      return null
    }

    const criticalHeightM = specGroup.criticalHeightM

    return (
      <div className="results-section" key={group.key}>
        <div className="results-table-head">
          <h3 className="results-section-title" style={{ marginBottom: 0 }}>
            {group.title}
          </h3>
          <span>Опции: {candidates.length}</span>
        </div>

        <div className="selection-row">
          <label className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Выбранный профиль</span>
            <select
              className="field-select"
              value={selectedIndex}
              disabled={!isColumnManualMode || candidates.length === 0}
              onChange={(event) => onColumnProfileSelect(group.key, Number(event.target.value))}
            >
              {candidates.map((candidate, index) => (
                <option key={`${candidate.profile}-${candidate.steelGrade}-${index}`} value={index}>
                  {`${index + 1}. ${candidate.profile} / ${candidate.steelGrade}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-container">
          {candidates.length === 0 ? (
            <div className="results-empty">Подходящие варианты не найдены для текущих параметров.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>в"–</th>
                  <th>Ранг</th>
                  <th>Профиль</th>
                  <th>Сталь</th>
                  <th>Тип профиля</th>
                  <th>К-т исп.</th>
                  <th className="criterion-col">Проверка</th>
                  <th>Масса 1 п.м., кг</th>
                  <th>Масса всего, кг</th>
                  <th>Распорки</th>
                  <th>С распоркой, кг</th>
                  <th>Стоимость, руб</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => {
                  const massWithoutBraces = candidate.unitMassKg * criticalHeightM * 1.15
                  const massWithBraces = candidate.totalMassKg

                  return (
                    <tr key={`${candidate.profile}-${candidate.steelGrade}-${index}`}>
                      <td>{index === selectedIndex ? '●' : '○'}</td>
                      <td>{index + 1}</td>
                      <td>{candidate.profile}</td>
                      <td>{candidate.steelGrade}</td>
                      <td>{resolveColumnProfileType(candidate)}</td>
                      <td>{formatNumber(candidate.utilization, 2)}</td>
                      <td className="criterion-col">{candidate.criterion ?? '-'}</td>
                      <td>{formatNumber(candidate.unitMassKg, 1)}</td>
                      <td>{formatNumber(massWithoutBraces, 2)}</td>
                      <td>{candidate.braceCount ?? 0}</td>
                      <td>{formatNumber(massWithBraces, 2)}</td>
                      <td>{candidate.estimatedCostRub === undefined ? '-' : formatRub(candidate.estimatedCostRub)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  })
}

function renderColumnSpecification(columnResult: ColumnCalculationResult | null) {
  if (!columnResult?.specification) {
    return null
  }

  const nonEmptyGroups = columnResult.specification.groups.filter(
    (group) => group.columnsCount > 0 && group.selectedCandidate !== null,
  )

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="results-section">
        <h3 className="results-section-title">СПЕЦИФИКАЦИЯ КОЛОНН</h3>
        <div className="results-empty">Невозможно сформировать спецификацию: подходящие профили не найдены.</div>
      </div>
    )
  }

  return (
    <div className="results-section">
      <h3 className="results-section-title">СПЕЦИФИКАЦИЯ КОЛОНН</h3>

      {nonEmptyGroups.map((group) => (
        <div key={group.key} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '8px 0 8px' }}>{group.label}</h4>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>X, м</th>
                  <th>Длина, м</th>
                  <th>Профиль</th>
                  <th>Сталь</th>
                  <th>Масса ед., кг</th>
                  <th>Распорок</th>
                  <th>Ветка, шт</th>
                  <th>Масса итого, кг</th>
                  <th>Стоимость, руб</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, index) => (
                  <tr key={`${group.key}-${index}`}>
                    <td>{formatNumber(row.xM, 2)}</td>
                    <td>{formatNumber(row.lengthM, 2)}</td>
                    <td>{row.profile}</td>
                    <td>{row.steelGrade}</td>
                    <td>{formatNumber(row.unitMassKg, 1)}</td>
                    <td>{row.braceCount}</td>
                    <td>{row.branchesCount}</td>
                    <td>{formatNumber(row.totalMassKg, 0)}</td>
                    <td>{formatRub(row.totalCostRub)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5}>Итого по колоннам</td>
                  <td>{group.bracesTotalCount}</td>
                  <td>{`${group.columnsCount} шт.`}</td>
                  <td>{`${formatNumber(group.columnsMassKg, 0)} кг`}</td>
                  <td>{`${formatRub(group.totalCostRub)} руб.`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="footer-note">
        <strong>Итого по всем колоннам: </strong>
        <span>
          {`${nonEmptyGroups.reduce((sum, group) => sum + group.columnsCount, 0)} шт., `}
          {`${formatNumber(columnResult.specification.totalMassKg, 0)} кг, `}
          {`${formatRub(columnResult.specification.totalCostRub)} руб.`}
        </span>
      </div>
    </div>
  )
}

function renderGeneralSpecificationOverview(
  input: UnifiedInputState,
  purlinResult: PurlinCalculationResult | null,
  columnResult: ColumnCalculationResult | null,
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource'],
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
  isColumnManualMode: boolean,
  selectedEnclosingClassKey: EnclosingClassKey,
) {
  const { selectedCandidate, selectedCostRub } = resolvePurlinSpecificationState(
    purlinResult,
    purlinSpecificationSource,
    purlinSelectionMode,
    selectedSortPurlinIndex,
    selectedLstkPurlinIndex,
  )
  const roofPurlinStepM =
    selectedCandidate?.stepMm && selectedCandidate.stepMm > 0 ? selectedCandidate.stepMm / 1000 : 1.5
  const enclosingInput = {
    ...mapUnifiedInputToEnclosingInput(input),
    roofPurlinStepM,
  }
  const enclosingResult = calculateEnclosing(enclosingInput)
  const enclosingClass = enclosingResult.classes[selectedEnclosingClassKey]
  const includeWalls = isSandwichPanelCovering(input.wallCoveringType)
  const includeRoof = isSandwichPanelCovering(input.roofCoveringType)
  const enclosingCostRub =
    (includeWalls ? enclosingClass.walls.totals.sectionRub : 0) +
    (includeRoof ? enclosingClass.roof.totals.sectionRub : 0)
  const enclosingMassKg =
    (includeWalls ? enclosingClass.walls.totals.panelMassKg : 0) +
    (includeRoof ? enclosingClass.roof.totals.panelMassKg : 0)
  const columnMassKg = columnResult?.specification.totalMassKg ?? 0
  const columnCostRub = columnResult?.specification.totalCostRub ?? 0
  const purlinMassKg = selectedCandidate?.totalMassKg ?? 0
  const purlinCostRub = selectedCostRub ?? 0

  const combinedMassKg =
    columnMassKg + purlinMassKg + enclosingMassKg
  const combinedCostRub =
    columnCostRub + purlinCostRub + enclosingCostRub
  const snowRegionKpa = purlinResult?.loadSummary.snowRegionKpa
  const windRegionKpa = purlinResult?.loadSummary.windRegionKpa
  const roofCoveringNormalized = input.roofCoveringType.toLowerCase()
  const showRoofProfileSheet =
    roofCoveringNormalized.includes('профлист') || roofCoveringNormalized.includes('наше')

  return (
    <div className="results-section results-section--summary-sheet">
      <div className="results-table-head results-table-head--summary">
        <div>
          <h3 className="results-section-title">Общие сведения о расчете</h3>
          <p className="results-inline-note" style={{ marginTop: 6 }}>
            Сводная спецификация здания: массы и стоимости по колоннам, прогонам и ограждающим конструкциям.
          </p>
        </div>
        <button className="results-print-action" onClick={() => window.print()}>
          Печать / PDF
        </button>
      </div>

      <div className="summary-hero">
        <div className="summary-metric-card summary-metric-card--accent">
          <span>Колонны</span>
          <strong>{`${formatNumber(columnMassKg, 0)} кг / ${formatRub(columnCostRub)} руб.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>Прогоны</span>
          <strong>{`${formatNumber(purlinMassKg, 0)} кг / ${formatRub(purlinCostRub)} руб.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>Ограждающие ({enclosingClass.label})</span>
          <strong>{`${formatNumber(enclosingMassKg, 0)} кг / ${formatRub(enclosingCostRub)} руб.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>Итого</span>
          <strong>{`${formatNumber(combinedMassKg, 0)} кг / ${formatRub(combinedCostRub)} руб.`}</strong>
        </div>
      </div>

      <div className="load-grid load-grid--summary">
        <div className="load-tile">
          <span>Город</span>
          <strong>{input.city}</strong>
        </div>
        <div className="load-tile">
          <span>Кровля</span>
          <strong>{input.roofType}</strong>
        </div>
        <div className="load-tile">
          <span>Тип местности</span>
          <strong>{input.terrainType}</strong>
        </div>
        <div className="load-tile">
          <span>Ширина, м x Длина, м x Высота, м</span>
          <strong>
            {`${formatNumber(input.spanM, 2)} x ${formatNumber(input.buildingLengthM, 2)} x ${formatNumber(input.buildingHeightM, 2)}`}
          </strong>
        </div>
        <div className="load-tile">
          <span>Уклон кровли</span>
          <strong>{`${formatNumber(input.roofSlopeDeg, 1)}°`}</strong>
        </div>
        <div className="load-tile">
          <span>Шаг рам x фахверк</span>
          <strong>{`${formatNumber(input.frameStepM, 2)} м / ${formatNumber(input.fakhverkStepM, 2)} м`}</strong>
        </div>
        <div className="load-tile">
          <span>Покрытие</span>
          <strong>{input.roofCoveringType}</strong>
        </div>
        <div className="load-tile">
          <span>Ограждение стен</span>
          <strong>{input.wallCoveringType}</strong>
        </div>
        {showRoofProfileSheet && (
          <div className="load-tile">
            <span>Профлист кровли</span>
            <strong>{input.profileSheet}</strong>
          </div>
        )}
        <div className="load-tile">
          <span>Снеговой мешок</span>
          <strong>{input.snowBagMode}</strong>
        </div>
        <div className="load-tile">
          <span>Снеговой район</span>
          <strong>{resolveSnowRegionLabel(snowRegionKpa)}</strong>
        </div>
        <div className="load-tile">
          <span>Ветровой район</span>
          <strong>{resolveWindRegionLabel(windRegionKpa)}</strong>
        </div>
        <div className="load-tile">
          <span>Снеговая нагрузка</span>
          <strong>{snowRegionKpa !== undefined ? `${formatNumber(snowRegionKpa, 2)} кПа` : '-'}</strong>
        </div>
        <div className="load-tile">
          <span>Ветровая нагрузка</span>
          <strong>{windRegionKpa !== undefined ? `${formatNumber(windRegionKpa, 2)} кПа` : '-'}</strong>
        </div>
        <div className="load-tile">
          <span>Подбор колонн</span>
          <strong>Инженерный (H_max)</strong>
        </div>
        <div className="load-tile">
          <span>Выбор колонн</span>
          <strong>{isColumnManualMode ? 'Ручной' : 'Авто'}</strong>
        </div>
        <div className="load-tile">
          <span>Источник прогонов</span>
          <strong>{purlinSpecificationSource === 'sort' ? 'Сортовой' : 'ЛСТК'}</strong>
        </div>
        <div className="load-tile">
          <span>Выбор прогонов</span>
          <strong>{purlinSelectionMode === 'manual' ? 'Ручной' : 'Авто'}</strong>
        </div>
        <div className="load-tile">
          <span>Сумма колонн, кг</span>
          <strong>{formatNumber(columnMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>Стоимость колонн, руб.</span>
          <strong>{formatRub(columnCostRub)}</strong>
        </div>
        <div className="load-tile">
          <span>Сумма прогонов, кг</span>
          <strong>{formatNumber(purlinMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>Стоимость прогонов, руб.</span>
          <strong>{formatRub(purlinCostRub)}</strong>
        </div>
        <div className="load-tile">
          <span>Сумма ограждающих, кг</span>
          <strong>{formatNumber(enclosingMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>Стоимость ограждающих, руб.</span>
          <strong>{formatRub(enclosingCostRub)}</strong>
        </div>
        <div className="load-tile load-tile--total">
          <span>Общая масса / стоимость</span>
          <strong>
            {columnResult || selectedCandidate || enclosingCostRub > 0 || enclosingMassKg > 0
              ? `${formatNumber(combinedMassKg, 0)} кг / ${formatRub(combinedCostRub)} руб.`
              : '-'}
          </strong>
        </div>
      </div>
    </div>
  )
}

interface SummaryEnclosingSpecRow {
  key: string
  category: string
  item: string
  parameter: string
  unit: string
  quantity: number
  quantityFractionDigits: number
  massKg: number | null
  unitPriceRub: number
  totalRub: number
}

function buildSummaryEnclosingRows(section: EnclosingSectionSpecification): SummaryEnclosingSpecRow[] {
  const panelRows: SummaryEnclosingSpecRow[] = section.panelSpecification.map((row) => ({
    key: row.key,
    category: 'Панели',
    item: row.mark,
    parameter: `Ширина ${row.workingWidthMm} мм; толщина ${row.thicknessMm} мм; длина ${formatNumber(row.panelLengthM, 2)} м; ${formatNumber(row.panelsCount, 0)} шт.`,
    unit: row.unit,
    quantity: row.areaM2,
    quantityFractionDigits: 2,
    massKg: row.totalMassKg,
    unitPriceRub: row.unitPriceRubPerM2,
    totalRub: row.totalRub,
  }))

  const accessoryRows: SummaryEnclosingSpecRow[] = section.accessories.map((row) => ({
    key: row.key,
    category: 'Комплектующие',
    item: row.item,
    parameter: `Требуемая длина ${formatNumber(row.requiredLengthM, 2)} м.п.; развертка ${formatNumber(row.developedWidthM, 2)} м`,
    unit: row.unit,
    quantity: row.quantity,
    quantityFractionDigits: 2,
    massKg: null,
    unitPriceRub: row.unitPriceRub,
    totalRub: row.totalRub,
  }))

  const sealantRows: SummaryEnclosingSpecRow[] = section.sealants.map((row) => ({
    key: row.key,
    category: 'Уплотнители',
    item: row.item,
    parameter: row.note ?? 'По нормам ТСП',
    unit: row.unit,
    quantity: row.quantity,
    quantityFractionDigits: row.unit.trim().toLowerCase() === 'шт' ? 0 : 2,
    massKg: null,
    unitPriceRub: row.unitPriceRub,
    totalRub: row.totalRub,
  }))

  const fastenerRows: SummaryEnclosingSpecRow[] = section.fasteners.map((row) => ({
    key: row.key,
    category: 'Крепеж',
    item: row.item,
    parameter: `Длина ${formatNumber(row.lengthMm, 0)} мм${row.note ? `; ${row.note}` : ''}`,
    unit: row.unit,
    quantity: row.quantity,
    quantityFractionDigits: 0,
    massKg: null,
    unitPriceRub: row.unitPriceRub,
    totalRub: row.totalRub,
  }))

  return [...panelRows, ...accessoryRows, ...sealantRows, ...fastenerRows]
}

function renderSummaryEnclosingSectionTable(title: string, section: EnclosingSectionSpecification) {
  const rows = buildSummaryEnclosingRows(section)

  return (
    <div className="results-section">
      <h3 className="results-section-title">{title}</h3>
      {rows.length === 0 ? (
        <div className="results-empty">Нет позиций для отображения.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Категория</th>
                <th>Наименование / марка</th>
                <th>Параметры</th>
                <th>Ед. изм.</th>
                <th>Кол-во</th>
                <th>Вес, кг</th>
                <th>Цена, руб/ед.</th>
                <th>Сумма, руб.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.category}</td>
                  <td>{row.item}</td>
                  <td>{row.parameter}</td>
                  <td>{row.unit}</td>
                  <td>{formatNumber(row.quantity, row.quantityFractionDigits)}</td>
                  <td>{row.massKg === null ? '-' : formatNumber(row.massKg, 2)}</td>
                  <td>{formatRub(row.unitPriceRub)}</td>
                  <td>{formatRub(row.totalRub)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5}>Итого по разделу</td>
                <td>{formatNumber(section.totals.panelMassKg, 2)}</td>
                <td>-</td>
                <td>{formatRub(section.totals.sectionRub)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function renderEnclosingSummarySpecification(
  input: UnifiedInputState,
  selectedClassKey: EnclosingClassKey,
  purlinResult: PurlinCalculationResult | null,
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource'],
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
) {
  try {
    const selectedPurlin = resolvePurlinSpecificationState(
      purlinResult,
      purlinSpecificationSource,
      purlinSelectionMode,
      selectedSortPurlinIndex,
      selectedLstkPurlinIndex,
    ).selectedCandidate
    const roofPurlinStepM =
      selectedPurlin?.stepMm && selectedPurlin.stepMm > 0 ? selectedPurlin.stepMm / 1000 : 1.5
    const enclosingInput = {
      ...mapUnifiedInputToEnclosingInput(input),
      roofPurlinStepM,
    }
    const enclosingResult = calculateEnclosing(enclosingInput)
    const activeClass = enclosingResult.classes[selectedClassKey]
    const includeWalls = isSandwichPanelCovering(input.wallCoveringType)
    const includeRoof = isSandwichPanelCovering(input.roofCoveringType)

    return (
      <>
        {includeWalls ? (
          renderSummaryEnclosingSectionTable('Спецификация стеновых ограждающих конструкций', activeClass.walls)
        ) : (
          <div className="results-section">
            <h3 className="results-section-title">Спецификация стеновых ограждающих конструкций</h3>
            <p className="results-inline-note">
              Расчет не выполняется: для стен выбрано покрытие не С-П ({input.wallCoveringType}).
            </p>
          </div>
        )}

        {includeRoof ? (
          renderSummaryEnclosingSectionTable('Спецификация кровельных ограждающих конструкций', activeClass.roof)
        ) : (
          <div className="results-section">
            <h3 className="results-section-title">Спецификация кровельных ограждающих конструкций</h3>
            <p className="results-inline-note">
              Расчет не выполняется: для кровли выбрано покрытие не С-П ({input.roofCoveringType}).
            </p>
          </div>
        )}
      </>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось подготовить сводную спецификацию ограждающих.'
    return (
      <div className="results-section">
        <h3 className="results-section-title">Сводная спецификация ограждающих конструкций</h3>
        <div className="results-error">
          <strong>Ошибка расчета: </strong>
          {message}
        </div>
      </div>
    )
  }
}

function renderEnclosingOverview(
  input: UnifiedInputState,
  selectedClassKey: EnclosingClassKey,
  onClassChange: (value: EnclosingClassKey) => void,
  purlinResult: PurlinCalculationResult | null,
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource'],
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
  onImportPricePdf: (file: File) => Promise<void>,
  onResetPriceOverrides: () => void,
  priceImportStatus: PriceImportStatus,
) {
  try {
    const selectedPurlin = resolvePurlinSpecificationState(
      purlinResult,
      purlinSpecificationSource,
      purlinSelectionMode,
      selectedSortPurlinIndex,
      selectedLstkPurlinIndex,
    ).selectedCandidate
    const roofPurlinStepM =
      selectedPurlin?.stepMm && selectedPurlin.stepMm > 0 ? selectedPurlin.stepMm / 1000 : 1.5

    const enclosingInput = {
      ...mapUnifiedInputToEnclosingInput(input),
      roofPurlinStepM,
    }
    const enclosingResult = calculateEnclosing(enclosingInput)
    const activeClass = enclosingResult.classes[selectedClassKey]
    const walls = activeClass.walls
    const roof = activeClass.roof
    const includeWalls = isSandwichPanelCovering(input.wallCoveringType)
    const includeRoof = isSandwichPanelCovering(input.roofCoveringType)
    const wallStandards = [...new Set(walls.panelSpecification.map((row) => row.standard))]
    const wallsSectionRub = includeWalls ? walls.totals.sectionRub : 0
    const roofSectionRub = includeRoof ? roof.totals.sectionRub : 0
    const totalSectionRub = wallsSectionRub + roofSectionRub
    const totalPanelMassKg =
      (includeWalls ? walls.totals.panelMassKg : 0) + (includeRoof ? roof.totals.panelMassKg : 0)
    const totalPanelsRub =
      (includeWalls ? walls.totals.panelsRub : 0) + (includeRoof ? roof.totals.panelsRub : 0)
    const totalSupportRub =
      (includeWalls ? walls.totals.accessoriesRub + walls.totals.sealantsRub + walls.totals.fastenersRub : 0) +
      (includeRoof ? roof.totals.accessoriesRub + roof.totals.sealantsRub + roof.totals.fastenersRub : 0)

    return (
      <div className="tab-pane animate-in" data-testid="enclosing-panel">
        <div className="results-section results-section--summary-sheet">
          <div className="results-table-head results-table-head--summary">
            <div>
              <h3 className="results-section-title">Ограждающие конструкции</h3>
              <p className="results-inline-note" style={{ marginTop: 6 }}>
                Детальная спецификация по стенам и кровле для металлических прямостенных ангаров.
              </p>
            </div>
            <button className="results-print-action" onClick={() => window.print()}>
              Печать / PDF
            </button>
          </div>

          <div className="results-section" style={{ marginBottom: 12 }}>
            <h3 className="results-section-title">Класс панелей</h3>
            <div className="mode-toggle">
              <button
                className={`mode-button ${selectedClassKey === 'class-1-gost' ? 'active' : ''}`}
                onClick={() => onClassChange('class-1-gost')}
              >
                Класс 1
              </button>
              <button
                className={`mode-button ${selectedClassKey === 'class-2-tu' ? 'active' : ''}`}
                onClick={() => onClassChange('class-2-tu')}
              >
                Класс 2
              </button>
            </div>
          </div>

          <div className="results-section" style={{ marginBottom: 12 }}>
            <h3 className="results-section-title">Прайс PDF</h3>
            <div className="field-row">
              <label
                className="mode-button"
                htmlFor={ENCLOSING_PRICE_PDF_INPUT_ID}
                style={{
                  cursor: priceImportStatus.isLoading ? 'not-allowed' : 'pointer',
                  opacity: priceImportStatus.isLoading ? 0.65 : 1,
                }}
                onClick={(event) => {
                  if (priceImportStatus.isLoading) {
                    event.preventDefault()
                  }
                }}
              >
                {priceImportStatus.isLoading ? 'Импорт...' : 'Загрузить прайс (PDF)'}
              </label>
              <button
                type="button"
                className="mode-button"
                onClick={() => onResetPriceOverrides()}
                disabled={priceImportStatus.isLoading}
              >
                Сбросить импорт
              </button>
              <input
                id={ENCLOSING_PRICE_PDF_INPUT_ID}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                disabled={priceImportStatus.isLoading}
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    await onImportPricePdf(file)
                  }
                  event.currentTarget.value = ''
                }}
              />
            </div>
            {priceImportStatus.sourceFileName && (
              <p className="results-inline-note">
                Последний импорт: {priceImportStatus.sourceFileName}
                {priceImportStatus.importedAtIso
                  ? ` (${new Date(priceImportStatus.importedAtIso).toLocaleString('ru-RU')})`
                  : ''}
              </p>
            )}
            {priceImportStatus.message && <p className="results-inline-note">{priceImportStatus.message}</p>}
            {priceImportStatus.error && (
              <p className="results-inline-note" style={{ color: '#b00020' }}>
                {priceImportStatus.error}
              </p>
            )}
          </div>

          {includeWalls ? (
            <>
              <div className="results-section">
                <h3 className="results-section-title">Стены</h3>
                <div className="load-grid load-grid--summary">
                  <div className="load-tile">
                    <span>Общая площадь, м2</span>
                    <strong>{formatNumber(enclosingResult.geometry.wallAreaGrossM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>Площадь проемов, м2</span>
                    <strong>{formatNumber(enclosingResult.geometry.openingsAreaM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>Площадь нетто, м2</span>
                    <strong>{formatNumber(enclosingResult.geometry.wallAreaNetM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>Вес, кг</span>
                    <strong>{formatNumber(walls.totals.panelMassKg, 2)}</strong>
                  </div>
                  <div className="load-tile load-tile--total">
                    <span>Стоимость, руб.</span>
                    <strong>{formatRub(wallsSectionRub)}</strong>
                  </div>
                </div>
                <p className="results-inline-note" style={{ marginTop: 8 }}>
                  Стеновые панели приняты в горизонтальном монтаже; рабочая ширина фиксирована 1000 мм.
                </p>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация стеновых панелей</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Марка</th>
                        <th>Ширина, мм</th>
                        <th>Толщина, мм</th>
                        <th>Длина, м</th>
                        <th>Штук</th>
                        <th>Вес, кг/м2</th>
                        <th>Вес общий, кг</th>
                        <th>Цена, руб/м2</th>
                        <th>Кол-во, м2</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walls.panelSpecification.map((row) => (
                        <tr key={row.key}>
                          <td>{row.mark}</td>
                          <td>{row.workingWidthMm}</td>
                          <td>{row.thicknessMm}</td>
                          <td>{formatNumber(row.panelLengthM, 2)}</td>
                          <td>{formatNumber(row.panelsCount, 0)}</td>
                          <td>{formatNumber(row.unitMassKgPerM2, 2)}</td>
                          <td>{formatNumber(row.totalMassKg, 2)}</td>
                          <td>{formatRub(row.unitPriceRubPerM2)}</td>
                          <td>{formatNumber(row.areaM2, 2)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="results-inline-note" style={{ marginTop: 8 }}>
                  Норматив: {wallStandards.join('; ')}
                </p>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация комплектующих (Стены)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Требуемая длина, м.п.</th>
                        <th>Развертка, м</th>
                        <th>Кол-во, м2</th>
                        <th>Цена, руб/м2</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walls.accessories.map((row) => (
                        <tr key={row.key}>
                          <td>{row.item}</td>
                          <td>{formatNumber(row.requiredLengthM, 2)}</td>
                          <td>{formatNumber(row.developedWidthM, 2)}</td>
                          <td>{formatNumber(row.quantity, 2)}</td>
                          <td>{formatRub(row.unitPriceRub)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация уплотнителей (Стены)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Ед. изм.</th>
                        <th>Кол-во</th>
                        <th>Цена, руб/ед.</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walls.sealants.map((row) => (
                        <tr key={row.key}>
                          <td>{row.item}</td>
                          <td>{row.unit}</td>
                          <td>{formatNumber(row.quantity, 2)}</td>
                          <td>{formatRub(row.unitPriceRub)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация крепежа (Стены)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Длина, мм</th>
                        <th>Кол-во, шт</th>
                        <th>Цена, руб/шт</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walls.fasteners.map((row) => (
                        <tr key={row.key}>
                          <td>{row.item}</td>
                          <td>{formatNumber(row.lengthMm, 0)}</td>
                          <td>{formatNumber(row.quantity, 0)}</td>
                          <td>{formatRub(row.unitPriceRub)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="results-section">
              <h3 className="results-section-title">Стены</h3>
              <p className="results-inline-note">
                Расчет стен не выполняется: выбранное покрытие не С-П ({input.wallCoveringType}).
              </p>
            </div>
          )}

          {includeRoof ? (
            <>
              <div className="results-section">
                <h3 className="results-section-title">Кровля</h3>
                <div className="load-grid load-grid--summary">
                  <div className="load-tile">
                    <span>Общая площадь, м2</span>
                    <strong>{formatNumber(enclosingResult.geometry.roofAreaM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>Вес, кг</span>
                    <strong>{formatNumber(roof.totals.panelMassKg, 2)}</strong>
                  </div>
                  <div className="load-tile load-tile--total">
                    <span>Стоимость, руб.</span>
                    <strong>{formatRub(roofSectionRub)}</strong>
                  </div>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация кровельных панелей</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Марка</th>
                        <th>Ширина, мм</th>
                        <th>Толщина, мм</th>
                        <th>Длина, м</th>
                        <th>Штук</th>
                        <th>Вес, кг/м2</th>
                        <th>Вес общий, кг</th>
                        <th>Цена, руб/м2</th>
                        <th>Кол-во, м2</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roof.panelSpecification.map((row) => (
                        <tr key={row.key}>
                          <td>{row.mark}</td>
                          <td>{row.workingWidthMm}</td>
                          <td>{row.thicknessMm}</td>
                          <td>{formatNumber(row.panelLengthM, 2)}</td>
                          <td>{formatNumber(row.panelsCount, 0)}</td>
                          <td>{formatNumber(row.unitMassKgPerM2, 2)}</td>
                          <td>{formatNumber(row.totalMassKg, 2)}</td>
                          <td>{formatRub(row.unitPriceRubPerM2)}</td>
                          <td>{formatNumber(row.areaM2, 2)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация комплектующих (Кровля)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Требуемая длина, м.п.</th>
                        <th>Развертка, м</th>
                        <th>Кол-во, м2</th>
                        <th>Цена, руб/м2</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roof.accessories.map((row) => (
                        <tr key={row.key}>
                          <td>{row.item}</td>
                          <td>{formatNumber(row.requiredLengthM, 2)}</td>
                          <td>{formatNumber(row.developedWidthM, 2)}</td>
                          <td>{formatNumber(row.quantity, 2)}</td>
                          <td>{formatRub(row.unitPriceRub)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация уплотнителей (Кровля)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Ед. изм.</th>
                        <th>Кол-во</th>
                        <th>Цена, руб/ед.</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roof.sealants.map((row) => (
                        <tr key={row.key}>
                          <td>{row.item}</td>
                          <td>{row.unit}</td>
                          <td>{formatNumber(row.quantity, 2)}</td>
                          <td>{formatRub(row.unitPriceRub)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">Спецификация крепежа (Кровля)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Длина, мм</th>
                        <th>Кол-во, шт</th>
                        <th>Цена, руб/шт</th>
                        <th>Сумма, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roof.fasteners.map((row) => (
                        <tr key={row.key}>
                          <td>{row.item}</td>
                          <td>{formatNumber(row.lengthMm, 0)}</td>
                          <td>{formatNumber(row.quantity, 0)}</td>
                          <td>{formatRub(row.unitPriceRub)}</td>
                          <td>{formatRub(row.totalRub)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="results-section">
              <h3 className="results-section-title">Кровля</h3>
              <p className="results-inline-note">
                Расчет кровли не выполняется: выбранное покрытие не С-П ({input.roofCoveringType}).
              </p>
            </div>
          )}

          <div className="results-section">
            <h3 className="results-section-title">Итого ограждающие конструкции</h3>
            <div className="summary-hero">
              <div className="summary-metric-card summary-metric-card--accent">
                <span>{`${activeClass.label}: стоимость`}</span>
                <strong>{`${formatRub(totalSectionRub)} руб.`}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Стены, руб.</span>
                <strong>{includeWalls ? formatRub(wallsSectionRub) : '—'}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Кровля, руб.</span>
                <strong>{includeRoof ? formatRub(roofSectionRub) : '—'}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Вес панелей, кг</span>
                <strong>{formatNumber(totalPanelMassKg, 2)}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Панели, руб.</span>
                <strong>{formatRub(totalPanelsRub)}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Комплектующие + уплотнители + крепеж, руб.</span>
                <strong>{formatRub(totalSupportRub)}</strong>
              </div>
            </div>
            {!includeWalls && !includeRoof && (
              <p className="results-inline-note" style={{ marginTop: 8 }}>
                Для расчета ограждающих выберите покрытие типа С-П для стен и/или кровли.
              </p>
            )}
          </div>

          {enclosingResult.notes.length > 0 && (
            <div className="footer-note">
              <strong>Примечания: </strong>
              <span>{enclosingResult.notes.join(' ')}</span>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось рассчитать ограждающие конструкции.'
    return (
      <div className="tab-pane animate-in">
        <div className="results-section">
          <h3 className="results-section-title">Ограждающие конструкции</h3>
          <div className="results-error">
            <strong>Ошибка расчета: </strong>
            {message}
          </div>
        </div>
      </div>
    )
  }
}
export function ResultsPanel({
  input,
  activeTab,
  purlinResult,
  columnResult,
  isPending,
  purlinError,
  columnError,
  isColumnManualMode,
  onColumnManualModeChange,
  onColumnProfileSelect,
  purlinSpecificationSource,
  onPurlinSpecificationSourceChange,
  purlinSelectionMode,
  onPurlinSelectionModeChange,
  selectedSortPurlinIndex,
  selectedLstkPurlinIndex,
  onSortPurlinSelect,
  onLstkPurlinSelect,
  onImportPricePdf,
  onResetPriceOverrides,
  priceImportStatus,
}: ResultsPanelProps) {
  const activeErrors =
    activeTab === 'truss'
      ? []
      : activeTab === 'summary' || activeTab === 'enclosing' || activeTab === 'methodology'
      ? [
          { scope: 'Прогоны', message: purlinError },
          { scope: 'Колонны', message: columnError },
        ].filter((item): item is { scope: string; message: string } => Boolean(item.message))
      : activeTab === 'purlin'
        ? purlinError
          ? [{ scope: 'Прогоны', message: purlinError }]
          : []
        : columnError
          ? [{ scope: 'Колонны', message: columnError }]
          : []
  const sortPurlinCandidates = filterAvailableCandidates(purlinResult?.sortSteelTop10 ?? [])
  const lstkPurlinCandidates = filterAvailableCandidates([
    ...(purlinResult?.lstkMp350Top ?? []),
    ...(purlinResult?.lstkMp390Top ?? []),
  ])
  const manualPurlinOptions =
    purlinSpecificationSource === 'sort' ? sortPurlinCandidates : lstkPurlinCandidates
  const manualPurlinSelectedIndex =
    purlinSpecificationSource === 'sort' ? selectedSortPurlinIndex : selectedLstkPurlinIndex
  const [enclosingClassKey, setEnclosingClassKey] = useState<EnclosingClassKey>('class-1-gost')

  return (
    <div className={`results-panel ${isPending ? 'pending' : ''}`}>
      {activeErrors.length > 0 && (
        <div className="results-error">
          <h4 style={{ margin: '0 0 8px' }}>Ошибка расчета</h4>
          {activeErrors.map((item) => (
            <p key={item.scope} style={{ margin: '0 0 6px' }}>
              <strong>{item.scope}: </strong>
              {item.message}
            </p>
          ))}
        </div>
      )}

      {activeTab === 'summary' ? (
        <div className="tab-pane animate-in">
          {renderGeneralSpecificationOverview(
            input,
            purlinResult,
            columnResult,
            purlinSpecificationSource,
            purlinSelectionMode,
            selectedSortPurlinIndex,
            selectedLstkPurlinIndex,
            isColumnManualMode,
            enclosingClassKey,
          )}
          {renderColumnSpecification(columnResult)}
          {renderPurlinSpecification(
            purlinResult,
            purlinSpecificationSource,
            purlinSelectionMode,
            selectedSortPurlinIndex,
            selectedLstkPurlinIndex,
          )}
          {renderEnclosingSummarySpecification(
            input,
            enclosingClassKey,
            purlinResult,
            purlinSpecificationSource,
            purlinSelectionMode,
            selectedSortPurlinIndex,
            selectedLstkPurlinIndex,
          )}
        </div>
      ) : activeTab === 'enclosing' ? (
        renderEnclosingOverview(
          input,
          enclosingClassKey,
          setEnclosingClassKey,
          purlinResult,
          purlinSpecificationSource,
          purlinSelectionMode,
          selectedSortPurlinIndex,
          selectedLstkPurlinIndex,
          onImportPricePdf,
          onResetPriceOverrides,
          priceImportStatus,
        )
      ) : activeTab === 'methodology' ? (
        <MethodologyPanel input={input} purlinResult={purlinResult} columnResult={columnResult} />
      ) : activeTab === 'truss' ? (
        <div className="tab-pane animate-in">
          <div className="results-section">
            <h3 className="results-section-title">Фермы</h3>
            <p className="results-inline-note">Раздел в разработке.</p>
          </div>
        </div>
      ) : activeTab === 'purlin' ? (
        <div className="tab-pane animate-in">
          <div className="results-section">
            <h3 className="results-section-title">Нагрузки и расчетные параметры</h3>
            <div className="load-grid load-grid--purlin">
              <div className="load-tile">
                <span>Снег район, кПа</span>
                <strong>{purlinResult?.loadSummary?.snowRegionKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Ветер район, кПа</span>
                <strong>{purlinResult?.loadSummary?.windRegionKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Покрытие, кПа</span>
                <strong>{purlinResult?.loadSummary?.coveringKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Коэф. снег. мешка</span>
                <strong>
                  {purlinResult?.loadSummary?.snowBagFactor !== undefined
                    ? purlinResult.loadSummary.snowBagFactor.toFixed(2)
                    : '-'}
                </strong>
              </div>
              <div className="load-tile">
                <span>Снег расчет, кПа</span>
                <strong>{purlinResult?.loadSummary?.designSnowKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Ветер кровля, кПа</span>
                <strong>{purlinResult?.loadSummary?.windRoofKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Ветер фасад, кПа</span>
                <strong>{purlinResult?.loadSummary?.windFacadeKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Экспл. нагрузка, кПа</span>
                <strong>{purlinResult?.loadSummary?.serviceKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile load-tile--total">
                <span>Суммарная расч., кПа</span>
                <strong>{purlinResult?.loadSummary?.designTotalKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Авто шаг, мм</span>
                <strong>
                  {purlinResult?.loadSummary?.autoMaxStepMm !== undefined
                    ? formatStepLimitMm(purlinResult.loadSummary.autoMaxStepMm)
                    : '-'}
                </strong>
              </div>
              <div className="load-tile">
                <span>Мин. шаг ручной, мм</span>
                <strong>
                  {purlinResult?.loadSummary?.manualMinStepMm !== undefined
                    ? formatStepLimitMm(purlinResult.loadSummary.manualMinStepMm, 'не задан')
                    : '-'}
                </strong>
              </div>
              <div className="load-tile">
                <span>Макс. шаг ручной, мм</span>
                <strong>
                  {purlinResult?.loadSummary?.manualMaxStepMm !== undefined
                    ? formatStepLimitMm(purlinResult.loadSummary.manualMaxStepMm, 'не задан')
                    : '-'}
                </strong>
              </div>
            </div>
          </div>

          <div className="results-section-row">
            <div className="results-section">
              <h3 className="results-section-title">Источник спецификации прогонов</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${purlinSpecificationSource === 'sort' ? 'active' : ''}`}
                  onClick={() => onPurlinSpecificationSourceChange('sort')}
                >
                  Сортовой
                </button>
                <button
                  className={`mode-button ${purlinSpecificationSource === 'lstk' ? 'active' : ''}`}
                  onClick={() => onPurlinSpecificationSourceChange('lstk')}
                >
                  ЛСТК
                </button>
              </div>
            </div>

            <div className="results-section">
              <h3 className="results-section-title">Режим выбора профиля прогона</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${purlinSelectionMode === 'auto' ? 'active' : ''}`}
                  onClick={() => onPurlinSelectionModeChange('auto')}
                >
                  Авто
                </button>
                <button
                  className={`mode-button ${purlinSelectionMode === 'manual' ? 'active' : ''}`}
                  onClick={() => onPurlinSelectionModeChange('manual')}
                >
                  Ручной выбор
                </button>
              </div>

              {purlinSelectionMode === 'manual' && (
                <div className="selection-row" style={{ marginTop: 10 }}>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span className="field-label">Профиль для спецификации</span>
                    <select
                      className="field-select"
                      value={manualPurlinSelectedIndex}
                      disabled={manualPurlinOptions.length === 0}
                      onChange={(event) => {
                        const selectedIndex = Number(event.target.value)
                        if (purlinSpecificationSource === 'sort') {
                          onSortPurlinSelect(selectedIndex)
                          return
                        }
                        onLstkPurlinSelect(selectedIndex)
                      }}
                    >
                      {manualPurlinOptions.map((candidate, index) => (
                        <option key={`${candidate.family}-${candidate.profile}-${candidate.steelGrade}-${index}`} value={index}>
                          {`${index + 1}. ${formatPurlinFamilyLabel(candidate.family)} / ${candidate.profile} / ${candidate.steelGrade}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          {renderPurlinCandidatesTable('Сортовой прокат — Топ 10', purlinResult?.sortSteelTop10 ?? [], 10)}
          {renderPurlinCandidatesTable('ЛСТК МП350', purlinResult?.lstkMp350Top ?? [], 5)}
          {renderPurlinCandidatesTable('ЛСТК МП390', purlinResult?.lstkMp390Top ?? [], 5)}
          {renderPurlinSpecification(
            purlinResult,
            purlinSpecificationSource,
            purlinSelectionMode,
            selectedSortPurlinIndex,
            selectedLstkPurlinIndex,
          )}
        </div>
      ) : (
        <div className="tab-pane animate-in">
          <div className="results-section">
            <h3 className="results-section-title">Расчетные усилия</h3>
            <div className="load-grid">
              <div className="load-tile">
                <span>Осевая N (кН)</span>
                <strong>{columnResult?.derivedContext?.axialLoadKn?.toFixed(1) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Момент M (кН·м)</span>
                <strong>{columnResult?.derivedContext?.bendingMomentKnM?.toFixed(1) ?? '-'}</strong>
              </div>
            </div>
          </div>

          <div className="results-section-row">
            <div className="results-section">
              <h3 className="results-section-title">Режим подбора колонн</h3>
              <div className="mode-toggle">
                <button
                  className="mode-button active"
                  disabled
                >
                  Инженерный (H_max)
                </button>
              </div>
              <p className="results-inline-note">Используется максимальная расчетная длина в группе.</p>
            </div>

            <div className="results-section">
              <h3 className="results-section-title">Режим выбора профиля</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${!isColumnManualMode ? 'active' : ''}`}
                  onClick={() => onColumnManualModeChange(false)}
                >
                  Авто
                </button>
                <button
                  className={`mode-button ${isColumnManualMode ? 'active' : ''}`}
                  onClick={() => onColumnManualModeChange(true)}
                >
                  Ручной выбор
                </button>
              </div>
            </div>
          </div>

          {renderColumnCandidatesBlock(columnResult, isColumnManualMode, onColumnProfileSelect)}
          {renderColumnSpecification(columnResult)}
        </div>
      )}
    </div>
  )
}
