import type { DomainTab } from '@/app/App'
import type { CandidateResult } from '@/domain/common/model/candidate-result'
import type { ColumnCalculationResult } from '@/domain/column/model/calculate-column'
import type { ColumnGroupKey } from '@/domain/column/model/column-output'
import type { PurlinCalculationResult } from '@/domain/purlin/model/calculate-purlin'
import type { UnifiedInputState } from '../model/unified-input'

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
  columnSelectionMode: UnifiedInputState['columnSelectionMode']
  onColumnSelectionModeChange: (mode: UnifiedInputState['columnSelectionMode']) => void
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource']
  onPurlinSpecificationSourceChange: (source: UnifiedInputState['purlinSpecificationSource']) => void
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode']
  onPurlinSelectionModeChange: (mode: UnifiedInputState['purlinSelectionMode']) => void
  selectedSortPurlinIndex: number
  selectedLstkPurlinIndex: number
  onSortPurlinSelect: (selectedIndex: number) => void
  onLstkPurlinSelect: (selectedIndex: number) => void
}

const COLUMN_GROUPS: ReadonlyArray<{ key: ColumnGroupKey; title: string }> = [
  { key: 'extreme', title: 'Крайняя колонна — Подбор профилей' },
  { key: 'fachwerk', title: 'Фахверковая колонна — Подбор профилей' },
  { key: 'middle', title: 'Средняя колонна — Подбор профилей' },
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

function formatThousandsRub(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatStepLimitMm(value: number, zeroLabel = 'авто'): string {
  return value > 0 ? formatNumber(value, 0) : zeroLabel
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
        <span>Options: {displayList.length}</span>
      </div>

      {displayList.length === 0 ? (
        <div className="results-empty">No matching options found.</div>
      ) : isSortSteel ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Section</th>
                <th>Steel</th>
                <th>Step, mm</th>
                <th>Weight, kg</th>
                <th>Cost, kRUB</th>
                <th>Util.</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((candidate, index) => (
                <tr key={`${candidate.profile}-${candidate.steelGrade}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{candidate.profile}</td>
                  <td>{candidate.steelGrade}</td>
                  <td>{candidate.stepMm ? formatNumber(candidate.stepMm, 0) : '-'}</td>
                  <td>{formatNumber(candidate.totalMassKg, 0)}</td>
                  <td>
                    {candidate.excelMetrics?.displayCostThousandsRub === undefined
                      ? '-'
                      : formatThousandsRub(candidate.excelMetrics.displayCostThousandsRub)}
                  </td>
                  <td>{formatNumber(candidate.utilization, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Line</th>
                <th>Section</th>
                <th>Step, mm</th>
                <th>Mass 1 p.m.</th>
                <th>Mass / step</th>
                <th>Mass / building</th>
                <th>With braces</th>
                <th>Black, kg</th>
                <th>Galv, kg</th>
                <th>Length, m</th>
                <th>Mass 1m</th>
                <th>Util.</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((candidate, index) => (
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
                </tr>
              ))}
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
                <td>{selectedCandidate.family ?? '-'}</td>
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
                  <th>№</th>
                  <th>Ранг</th>
                  <th>Профиль</th>
                  <th>Сталь</th>
                  <th>Тип профиля</th>
                  <th>К-т исп</th>
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
  columnSelectionMode: UnifiedInputState['columnSelectionMode'],
  isColumnManualMode: boolean,
) {
  const { selectedCandidate, selectedCostRub } = resolvePurlinSpecificationState(
    purlinResult,
    purlinSpecificationSource,
    purlinSelectionMode,
    selectedSortPurlinIndex,
    selectedLstkPurlinIndex,
  )

  const combinedMassKg =
    (columnResult?.specification.totalMassKg ?? 0) + (selectedCandidate?.totalMassKg ?? 0)
  const combinedCostRub =
    (columnResult?.specification.totalCostRub ?? 0) + (selectedCostRub ?? 0)
  const combinedColumnsCount =
    columnResult?.specification.groups.reduce((sum, group) => sum + group.columnsCount, 0) ?? 0
  const selectedPurlinLabel = selectedCandidate
    ? `${selectedCandidate.family ?? '-'} / ${selectedCandidate.profile}`
    : 'Не выбран'

  return (
    <div className="results-section results-section--summary-sheet">
      <div className="results-table-head results-table-head--summary">
        <div>
          <h3 className="results-section-title">Общие сведения о расчете</h3>
          <p className="results-inline-note" style={{ marginTop: 6 }}>
            Сводная спецификация здания по текущим выбранным режимам расчета колонн и прогонов.
          </p>
        </div>
        <button className="results-print-action" onClick={() => window.print()}>
          Печать / PDF
        </button>
      </div>

      <div className="summary-hero">
        <div className="summary-metric-card summary-metric-card--accent">
          <span>Общая масса здания</span>
          <strong>{formatNumber(combinedMassKg, 0)} кг</strong>
        </div>
        <div className="summary-metric-card">
          <span>Ориентировочная стоимость</span>
          <strong>{formatRub(combinedCostRub)} руб.</strong>
        </div>
        <div className="summary-metric-card">
          <span>Колонн / прогонов</span>
          <strong>{`${combinedColumnsCount} шт. / ${selectedCandidate ? '1 тип' : '—'}`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>Выбранный прогон</span>
          <strong>{selectedPurlinLabel}</strong>
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
          <span>Пролет x длина</span>
          <strong>{`${formatNumber(input.spanM, 2)} x ${formatNumber(input.buildingLengthM, 2)} м`}</strong>
        </div>
        <div className="load-tile">
          <span>Высота x уклон</span>
          <strong>{`${formatNumber(input.buildingHeightM, 2)} м / ${formatNumber(input.roofSlopeDeg, 1)}°`}</strong>
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
          <span>Профлист</span>
          <strong>{input.profileSheet}</strong>
        </div>
        <div className="load-tile">
          <span>Снеговой мешок</span>
          <strong>{input.snowBagMode}</strong>
        </div>
        <div className="load-tile">
          <span>Подбор колонн</span>
          <strong>{columnSelectionMode === 'engineering' ? 'Инженерный (H_max)' : 'Excel (без H_max)'}</strong>
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
          <strong>{columnResult ? formatNumber(columnResult.specification.totalMassKg, 0) : '-'}</strong>
        </div>
        <div className="load-tile">
          <span>Сумма прогонов, кг</span>
          <strong>{selectedCandidate ? formatNumber(selectedCandidate.totalMassKg, 0) : '-'}</strong>
        </div>
        <div className="load-tile load-tile--total">
          <span>Общая масса / стоимость</span>
          <strong>
            {columnResult || selectedCandidate
              ? `${formatNumber(combinedMassKg, 0)} кг / ${formatRub(combinedCostRub)} руб.`
              : '-'}
          </strong>
        </div>
      </div>
    </div>
  )
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
  columnSelectionMode,
  onColumnSelectionModeChange,
  purlinSpecificationSource,
  onPurlinSpecificationSourceChange,
  purlinSelectionMode,
  onPurlinSelectionModeChange,
  selectedSortPurlinIndex,
  selectedLstkPurlinIndex,
  onSortPurlinSelect,
  onLstkPurlinSelect,
}: ResultsPanelProps) {
  const activeErrors =
    activeTab === 'summary'
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
            columnSelectionMode,
            isColumnManualMode,
          )}
          {renderColumnSpecification(columnResult)}
          {renderPurlinSpecification(
            purlinResult,
            purlinSpecificationSource,
            purlinSelectionMode,
            selectedSortPurlinIndex,
            selectedLstkPurlinIndex,
          )}
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
                          {`${index + 1}. ${candidate.family ?? '-'} / ${candidate.profile} / ${candidate.steelGrade}`}
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
                  className={`mode-button ${columnSelectionMode === 'engineering' ? 'active' : ''}`}
                  onClick={() => onColumnSelectionModeChange('engineering')}
                >
                  Инженерный (H_max)
                </button>
                <button
                  className={`mode-button ${columnSelectionMode === 'excel' ? 'active' : ''}`}
                  onClick={() => onColumnSelectionModeChange('excel')}
                >
                  Excel (без H_max)
                </button>
              </div>
              <p className="results-inline-note">
                {columnSelectionMode === 'engineering'
                  ? 'Используется максимальная расчетная длина в группе.'
                  : 'Подбор ведется как в исходном Excel: без правила H_max.'}
              </p>
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
