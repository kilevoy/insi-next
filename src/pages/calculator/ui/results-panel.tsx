import { useMemo, useState } from 'react'
import type { DomainTab } from '@/app/App'
import type { CandidateResult } from '@/domain/common/model/candidate-result'
import type { ColumnCalculationResult } from '@/domain/column/model/calculate-column'
import { buildColumnDerivedContext } from '@/domain/column/model/column-derived-context'
import type { ColumnType } from '@/domain/column/model/column-input'
import type { ColumnGroupKey } from '@/domain/column/model/column-output'
import type { EnclosingClassKey } from '@/domain/enclosing/model/enclosing-reference.generated'
import type { EnclosingSectionSpecification } from '@/domain/enclosing/model/enclosing-output'
import type { PurlinCalculationResult } from '@/domain/purlin/model/calculate-purlin'
import type { TrussCalculationResult } from '@/domain/truss/model/calculate-truss'
import { resolveTrussGeometryTemplate } from '@/domain/truss/model/truss-geometry'
import { calculateEnclosing } from '@/domain/enclosing/model/calculate-enclosing'
import { mapUnifiedInputToEnclosingInput } from '@/domain/enclosing/model/enclosing-mapper'
import { FrameGraphicsPanel } from '@/features/frame-graphics/ui/frame-graphics-panel'
import { deriveHeights } from '../model/height-derivations'
import { mapToColumnInput } from '../model/input-mapper'
import type { UnifiedInputState } from '../model/unified-input'
import { MethodologyPanel } from './methodology-panel'
import { SelectionSummaryPage } from './selection-summary-page'

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
  trussResult: TrussCalculationResult | null
  columnResult: ColumnCalculationResult | null
  isPending: boolean
  purlinError?: string | null
  trussError?: string | null
  columnError?: string | null
  isColumnManualMode: boolean
  onColumnManualModeChange: (isManualMode: boolean) => void
  columnSelectionMode: UnifiedInputState['columnSelectionMode']
  onColumnSelectionModeChange: (mode: UnifiedInputState['columnSelectionMode']) => void
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
  { key: 'extreme', title: 'РљСЂР°Р№РЅСЏСЏ РєРѕР»РѕРЅРЅР° вЂ” РџРѕРґР±РѕСЂ РїСЂРѕС„РёР»РµР№' },
  { key: 'fachwerk', title: 'Р¤Р°С…РІРµСЂРєРѕРІР°СЏ РєРѕР»РѕРЅРЅР° вЂ” РџРѕРґР±РѕСЂ РїСЂРѕС„РёР»РµР№' },
  { key: 'middle', title: 'РЎСЂРµРґРЅСЏСЏ РєРѕР»РѕРЅРЅР° вЂ” РџРѕРґР±РѕСЂ РїСЂРѕС„РёР»РµР№' },
]

const COLUMN_EFFORT_GROUPS: ReadonlyArray<{
  key: ColumnGroupKey
  label: string
  columnType: ColumnType
}> = [
  { key: 'extreme', label: 'Крайняя', columnType: 'крайняя' },
  { key: 'middle', label: 'Средняя', columnType: 'средняя' },
  { key: 'fachwerk', label: 'Фахверковая', columnType: 'фахверковая' },
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

function formatCriterionLabel(criterion: string | null | undefined): string {
  if (!criterion) {
    return '-'
  }

  const normalized = criterion.toLowerCase()

  if (normalized.includes('РјРµСЃС‚РЅ')) {
    return 'РјРµСЃС‚РЅР°СЏ СѓСЃС‚РѕР№С‡РёРІРѕСЃС‚СЊ'
  }

  if (normalized.includes('СЌРєРІРёРІ')) {
    return 'СЌРєРІРёРІР°Р»РµРЅС‚РЅС‹Рµ РЅР°РїСЂСЏР¶РµРЅРёСЏ'
  }

  if (normalized.includes('РїСЂРѕРіРёР±')) {
    return 'РїСЂРѕРіРёР±'
  }

  if (normalized.includes('РіРёР±Рє')) {
    return 'РіРёР±РєРѕСЃС‚СЊ'
  }

  if (normalized.includes('СѓСЃС‚РѕР№С‡РёРІ')) {
    return 'СѓСЃС‚РѕР№С‡РёРІРѕСЃС‚СЊ'
  }

  if (normalized.includes('РїСЂРѕС‡РЅРѕСЃС‚')) {
    return 'РїСЂРѕС‡РЅРѕСЃС‚СЊ'
  }

  return criterion
}

function normalizeMultiplierSymbol(value: string): string {
  return value.replace(/[xС…*]/gi, 'Г—')
}

function formatProfileDimensionToken(token: string, forceSingleFractionDigit: boolean): string {
  const normalized = token.trim().replace(',', '.')
  const value = Number(normalized)

  if (!Number.isFinite(value)) {
    return token.trim()
  }

  const hasFraction = Math.abs(value - Math.trunc(value)) > 0.0001
  const minimumFractionDigits = forceSingleFractionDigit ? 1 : hasFraction ? 1 : 0

  return value.toLocaleString('ru-RU', {
    minimumFractionDigits,
    maximumFractionDigits: 1,
  })
}

function resolveTrussTubeSize(profile: string): string {
  const cleaned = profile.replace(/^С‚СЂ\.\s*/i, '').trim()
  const normalized = normalizeMultiplierSymbol(cleaned)
  const parts = normalized.split('Г—').map((part) => part.trim()).filter(Boolean)

  if (parts.length === 2) {
    const sideToken = formatProfileDimensionToken(parts[0], false)
    const thicknessToken = formatProfileDimensionToken(parts[1], true)
    return `${sideToken}Г—${sideToken}Г—${thicknessToken}`
  }

  if (parts.length >= 3) {
    const heightToken = formatProfileDimensionToken(parts[0], false)
    const widthToken = formatProfileDimensionToken(parts[1], false)
    const thicknessToken = formatProfileDimensionToken(parts[2], true)
    return `${heightToken}Г—${widthToken}Г—${thicknessToken}`
  }

  return profile
}

function resolveTrussTubeType(profile: string): 'РџРљ' | 'РџРџ' {
  const cleaned = profile.replace(/^С‚СЂ\.\s*/i, '').trim()
  const normalized = normalizeMultiplierSymbol(cleaned)
  const parts = normalized.split('Г—').map((part) => part.trim()).filter(Boolean)

  if (parts.length === 2) {
    return 'РџРљ'
  }

  if (parts.length >= 3 && parts[0] === parts[1]) {
    return 'РџРљ'
  }

  return 'РџРџ'
}

function resolveTrussGroupLongLabel(key: string): string {
  if (key === 'vp') {
    return 'Р’РµСЂС…РЅРёР№ РїРѕСЏСЃ'
  }

  if (key === 'np') {
    return 'РќРёР¶РЅРёР№ РїРѕСЏСЃ'
  }

  if (key === 'orb') {
    return 'РћРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ Р±РѕР»СЊС€РѕР№'
  }

  if (key === 'or') {
    return 'РћРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ'
  }

  return 'Р СЏРґРѕРІРѕР№ СЂР°СЃРєРѕСЃ'
}

function resolveTrussTubeDescription(profile: string | null): string {
  if (!profile) {
    return 'вЂ”'
  }

  const typeLabel = resolveTrussTubeType(profile) === 'РџРљ' ? 'РўСЂСѓР±Р° РєРІР°РґСЂР°С‚РЅР°СЏ' : 'РўСЂСѓР±Р° РїСЂСЏРјРѕСѓРіРѕР»СЊРЅР°СЏ'
  return `${typeLabel} ${resolveTrussTubeSize(profile)}`
}

function resolveTrussCount(
  columnResult: ColumnCalculationResult | null,
  buildingLengthM: number,
  frameStepM: number,
): number {
  const extremeGroup = columnResult?.specification.groups.find((group) => group.key === 'extreme')
  if (extremeGroup && extremeGroup.columnsCount > 0) {
    return Math.max(1, Math.round(extremeGroup.columnsCount / 2))
  }

  if (frameStepM <= 0 || buildingLengthM <= 0) {
    return 0
  }

  return Math.max(1, Math.floor(buildingLengthM / frameStepM))
}

function isSandwichPanelCovering(covering: string): boolean {
  const normalized = covering.trim().toLowerCase()
  return (
    normalized.includes('СЃ-Рї') ||
    normalized.includes('СЃ Рї') ||
    normalized.includes('СЃСЌРЅРґРІРёС‡') ||
    normalized.includes('sandwich')
  )
}

function formatStepLimitMm(value: number, zeroLabel = 'Р°РІС‚Рѕ'): string {
  return value > 0 ? formatNumber(value, 0) : zeroLabel
}

function resolveWindRegionLabel(windLoadKpa: number | undefined): string {
  if (windLoadKpa === undefined) {
    return '-'
  }

  const exactMatch = [...WIND_REGION_BY_KPA.entries()].find(
    ([kpa]) => Math.abs(kpa - windLoadKpa) < 0.001,
  )

  return exactMatch?.[1] ?? 'РїРѕ С‚Р°Р±Р»РёС†Рµ РіРѕСЂРѕРґР°'
}

function resolveSnowRegionLabel(snowLoadKpa: number | undefined): string {
  if (snowLoadKpa === undefined) {
    return '-'
  }

  const band = SNOW_REGION_LIMITS.find((item) => snowLoadKpa <= item.maxKpa + 0.001)
  return band?.label ?? 'РїРѕ С‚Р°Р±Р»РёС†Рµ РіРѕСЂРѕРґР°'
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
    return 'Р›РЎРўРљ'
  }

  const profileNormalized = candidate.profile.trim().toLowerCase()
  if (profileNormalized.startsWith('РєРІ.') || profileNormalized.startsWith('РїСЂ.')) {
    return 'РўСЂСѓР±Р°'
  }

  if (/^\d+\s*Р±\d*/i.test(candidate.profile.trim()) || /^\d+\s*С€\d*/i.test(candidate.profile.trim())) {
    return 'Р”РІСѓС‚Р°РІСЂ'
  }

  if (/^\d+\s*[Р°-СЏ]*Рї$/i.test(candidate.profile.trim())) {
    return 'РЁРІРµР»Р»РµСЂ'
  }

  return 'РЎРѕСЂС‚РѕРІРѕР№'
}

function filterAvailableCandidates(candidates: CandidateResult[]): CandidateResult[] {
  return candidates
}

function formatPurlinFamilyLabel(family: string | undefined): string {
  if (!family) {
    return '-'
  }

  if (family.toLowerCase() === 'sort steel') {
    return 'РЎРѕСЂС‚РѕРІРѕР№ РїСЂРѕРєР°С‚'
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
    sourceLabel: source === 'sort' ? 'РЎРѕСЂС‚РѕРІРѕР№ РїСЂРѕРєР°С‚' : 'Р›РЎРўРљ',
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
        <span>РћРїС†РёРё: {displayList.length}</span>
      </div>

      {displayList.length === 0 ? (
        <div className="results-empty">РџРѕРґС…РѕРґСЏС‰РёРµ РІР°СЂРёР°РЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹.</div>
      ) : isSortSteel ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>РџСЂРѕС„РёР»СЊ</th>
                <th>РЎС‚Р°Р»СЊ</th>
                <th>РЁР°Рі, РјРј</th>
                <th>РњР°СЃСЃР°, РєРі</th>
                <th>Рљ-С‚ РёСЃРї.</th>
                <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±.</th>
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
                <th>Р›РёРЅРёСЏ</th>
                <th>РџСЂРѕС„РёР»СЊ</th>
                <th>РЁР°Рі, РјРј</th>
                <th>РњР°СЃСЃР° 1 Рї.Рј., РєРі</th>
                <th>РњР°СЃСЃР° / С€Р°Рі, РєРі</th>
                <th>РњР°СЃСЃР° / Р·РґР°РЅРёРµ, РєРі</th>
                <th>РЎ СЂР°СЃРєРѕСЃР°РјРё, РєРі</th>
                <th>Р§РµСЂРЅС‹Р№, РєРі</th>
                <th>РћС†РёРЅРє., РєРі</th>
                <th>Р”Р»РёРЅР°, Рј</th>
                <th>РњР°СЃСЃР° 1 Рј, РєРі</th>
                <th>Рљ-С‚ РёСЃРї.</th>
                <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±.</th>
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
      <h3 className="results-section-title">РЎРџР•Р¦РР¤РРљРђР¦РРЇ РџР РћР“РћРќРћР’</h3>

      {!selectedCandidate ? (
        <div className="results-empty">РџРѕРґС…РѕРґСЏС‰РёРµ РІР°СЂРёР°РЅС‚С‹ РґР»СЏ СЃРїРµС†РёС„РёРєР°С†РёРё РЅРµ РЅР°Р№РґРµРЅС‹.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>РўРёРї</th>
                <th>РЎРµРјРµР№СЃС‚РІРѕ</th>
                <th>РџСЂРѕС„РёР»СЊ</th>
                <th>РЎС‚Р°Р»СЊ</th>
                <th>РЁР°Рі, РјРј</th>
                <th>РњР°СЃСЃР° 1 Рї.Рј., РєРі</th>
                <th>РњР°СЃСЃР° РІСЃРµРіРѕ, РєРі</th>
                <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±</th>
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
          <strong>РС‚РѕРіРѕ РїРѕ РІСЃРµРј РїСЂРѕРіРѕРЅР°Рј: </strong>
          <span>
            {`${formatNumber(totalPurlinCount, 0)} С€С‚., `}
            {`${formatNumber(selectedCandidate.totalMassKg, 0)} РєРі, `}
            {`${selectedCostRub === null ? '-' : `${formatRub(selectedCostRub)} СЂСѓР±.`}`}
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
          <span>РћРїС†РёРё: {candidates.length}</span>
        </div>

        <div className="selection-row">
          <label className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Р’С‹Р±СЂР°РЅРЅС‹Р№ РїСЂРѕС„РёР»СЊ</span>
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
            <div className="results-empty">РџРѕРґС…РѕРґСЏС‰РёРµ РІР°СЂРёР°РЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹ РґР»СЏ С‚РµРєСѓС‰РёС… РїР°СЂР°РјРµС‚СЂРѕРІ.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>РІ"вЂ“</th>
                  <th>Р Р°РЅРі</th>
                  <th>РџСЂРѕС„РёР»СЊ</th>
                  <th>РЎС‚Р°Р»СЊ</th>
                  <th>РўРёРї РїСЂРѕС„РёР»СЏ</th>
                  <th>Рљ-С‚ РёСЃРї.</th>
                  <th className="criterion-col">РџСЂРѕРІРµСЂРєР°</th>
                  <th>РњР°СЃСЃР° 1 Рї.Рј., РєРі</th>
                  <th>РњР°СЃСЃР° РІСЃРµРіРѕ, РєРі</th>
                  <th>Р Р°СЃРїРѕСЂРєРё</th>
                  <th>РЎ СЂР°СЃРїРѕСЂРєРѕР№, РєРі</th>
                  <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => {
                  const massWithoutBraces = candidate.unitMassKg * criticalHeightM * 1.15
                  const massWithBraces = candidate.totalMassKg

                  return (
                    <tr key={`${candidate.profile}-${candidate.steelGrade}-${index}`}>
                      <td>{index === selectedIndex ? 'в—Џ' : 'в—‹'}</td>
                      <td>{index + 1}</td>
                      <td>{candidate.profile}</td>
                      <td>{candidate.steelGrade}</td>
                      <td>{resolveColumnProfileType(candidate)}</td>
                      <td>{formatNumber(candidate.utilization, 2)}</td>
                      <td className="criterion-col">{formatCriterionLabel(candidate.criterion)}</td>
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
        <h3 className="results-section-title">РЎРџР•Р¦РР¤РРљРђР¦РРЇ РљРћР›РћРќРќ</h3>
        <div className="results-empty">РќРµРІРѕР·РјРѕР¶РЅРѕ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ СЃРїРµС†РёС„РёРєР°С†РёСЋ: РїРѕРґС…РѕРґСЏС‰РёРµ РїСЂРѕС„РёР»Рё РЅРµ РЅР°Р№РґРµРЅС‹.</div>
      </div>
    )
  }

  return (
    <div className="results-section">
      <h3 className="results-section-title">РЎРџР•Р¦РР¤РРљРђР¦РРЇ РљРћР›РћРќРќ</h3>

      {nonEmptyGroups.map((group) => (
        <div key={group.key} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '8px 0 8px' }}>{group.label}</h4>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>X, Рј</th>
                  <th>Р”Р»РёРЅР°, Рј</th>
                  <th>РџСЂРѕС„РёР»СЊ</th>
                  <th>РЎС‚Р°Р»СЊ</th>
                  <th>РњР°СЃСЃР° РµРґ., РєРі</th>
                  <th>Р Р°СЃРїРѕСЂРѕРє</th>
                  <th>Р’РµС‚РєР°, С€С‚</th>
                  <th>РњР°СЃСЃР° РёС‚РѕРіРѕ, РєРі</th>
                  <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±</th>
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
                  <td colSpan={5}>РС‚РѕРіРѕ РїРѕ РєРѕР»РѕРЅРЅР°Рј</td>
                  <td>{group.bracesTotalCount}</td>
                  <td>{`${group.columnsCount} С€С‚.`}</td>
                  <td>{`${formatNumber(group.columnsMassKg, 0)} РєРі`}</td>
                  <td>{`${formatRub(group.totalCostRub)} СЂСѓР±.`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="footer-note">
        <strong>РС‚РѕРіРѕ РїРѕ РІСЃРµРј РєРѕР»РѕРЅРЅР°Рј: </strong>
        <span>
          {`${nonEmptyGroups.reduce((sum, group) => sum + group.columnsCount, 0)} С€С‚., `}
          {`${formatNumber(columnResult.specification.totalMassKg, 0)} РєРі, `}
          {`${formatRub(columnResult.specification.totalCostRub)} СЂСѓР±.`}
        </span>
      </div>
    </div>
  )
}

function renderTrussOverview(
  trussResult: TrussCalculationResult | null,
  columnResult: ColumnCalculationResult | null,
  buildingLengthM: number,
  tubeS345PriceRubPerKg: number,
) {
  if (!trussResult) {
    return (
      <div className="tab-pane animate-in">
        <div className="results-section">
          <h3 className="results-section-title">Р¤РµСЂРјС‹</h3>
          <p className="results-inline-note">
            РћР±РѕР·РЅР°С‡РµРЅРёСЏ: Р’Рџ вЂ” РІРµСЂС…РЅРёР№ РїРѕСЏСЃ, РќРџ вЂ” РЅРёР¶РЅРёР№ РїРѕСЏСЃ, РћР Р± вЂ” РѕРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ Р±РѕР»СЊС€РѕР№,
            РћР  вЂ” РѕРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ, Р Р  вЂ” СЂСЏРґРѕРІРѕР№ СЂР°СЃРєРѕСЃ.
          </p>
          <div className="results-empty">Р Р°СЃС‡РµС‚ С„РµСЂРј РЅРµРґРѕСЃС‚СѓРїРµРЅ: С‚СЂРµР±СѓРµС‚СЃСЏ СѓСЃРїРµС€РЅС‹Р№ СЂР°СЃС‡РµС‚ РїСЂРѕРіРѕРЅРѕРІ.</div>
        </div>
      </div>
    )
  }

  const resolveBraceCountForGroup = (groupKey: string, spanM: number): number | null => {
    const template = resolveTrussGeometryTemplate(spanM)
    if (template && groupKey === 'vp') {
      return template.members.filter((member) => member.kind === 'top-chord').length
    }

    if (template && groupKey === 'np') {
      return template.members.filter((member) => member.kind === 'bottom-chord').length
    }

    if (groupKey === 'orb' || groupKey === 'or') {
      return 4
    }

    if (groupKey === 'rr') {
      if (Math.abs(spanM - 18) < 0.01) {
        return 4
      }
      if (Math.abs(spanM - 24) < 0.01) {
        return 8
      }
      return 12
    }

    return null
  }

  const groups = [trussResult.groups.vp, trussResult.groups.np, trussResult.groups.orb, trussResult.groups.or, trussResult.groups.rr]
  const hasMissingGroups = groups.some((group) => group.status !== 'ok')
  const trussCount = resolveTrussCount(columnResult, buildingLengthM, trussResult.loadSummary.frameStepM)
  const trussTotalMassKg = trussResult.totalMassKg === null ? null : trussResult.totalMassKg * trussCount
  const trussTotalCostRub = trussTotalMassKg === null ? null : trussTotalMassKg * tubeS345PriceRubPerKg
  const groupsTotalMassKg = groups.reduce((sum, group) => sum + (group.massKg ?? 0), 0)
  const groupsTotalCostRub = groups.reduce((sum, group) => sum + ((group.massKg ?? 0) * tubeS345PriceRubPerKg), 0)

  return (
    <div className="tab-pane animate-in" data-testid="truss-panel">
      <div className="results-section">
        <h3 className="results-section-title">Р¤РµСЂРјС‹</h3>
        <p className="results-inline-note">
          РћР±РѕР·РЅР°С‡РµРЅРёСЏ: Р’Рџ вЂ” РІРµСЂС…РЅРёР№ РїРѕСЏСЃ, РќРџ вЂ” РЅРёР¶РЅРёР№ РїРѕСЏСЃ, РћР Р± вЂ” РѕРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ Р±РѕР»СЊС€РѕР№,
          РћР  вЂ” РѕРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ, Р Р  вЂ” СЂСЏРґРѕРІРѕР№ СЂР°СЃРєРѕСЃ.
        </p>
      </div>

      <div className="results-section">
        <h3 className="results-section-title">Р РµР·СѓР»СЊС‚Р°С‚С‹ РїРѕ РіСЂСѓРїРїР°Рј</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Р­Р»РµРјРµРЅС‚</th>
                <th>РџСЂРѕС„РёР»СЊ</th>
                <th>РџСЂРѕРІРµСЂРєР°</th>
                <th>Рљ-С‚ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ</th>
                <th>РљРѕР»РёС‡РµСЃС‚РІРѕ</th>
                <th>РњР°СЃСЃР°, РєРі</th>
                <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±.</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const braceCount = resolveBraceCountForGroup(group.key, trussResult.loadSummary.spanM)
                const quantityLabel = braceCount === null ? 'вЂ”' : `${formatNumber(braceCount, 0)} С€С‚.`

                return (
                  <tr key={group.key}>
                    <td>{resolveTrussGroupLongLabel(group.key)}</td>
                    <td>{resolveTrussTubeDescription(group.profile)}</td>
                    <td>{formatCriterionLabel(group.criterion)}</td>
                    <td>{group.utilization === null ? 'вЂ”' : formatNumber(group.utilization, 2)}</td>
                    <td>{quantityLabel}</td>
                    <td>{group.massKg === null ? 'вЂ”' : formatNumber(group.massKg, 2)}</td>
                    <td>{group.massKg === null ? 'вЂ”' : formatRub(group.massKg * tubeS345PriceRubPerKg)}</td>
                  </tr>
                )
              })}
              <tr>
                <td colSpan={4}>РС‚РѕРіРѕ</td>
                <td>вЂ”</td>
                <td>{formatNumber(groupsTotalMassKg, 2)}</td>
                <td>{formatRub(groupsTotalCostRub)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="results-section">
        <h3 className="results-section-title">РС‚РѕРі РїРѕ С„РµСЂРјРµ</h3>
        <div className="summary-hero">
          <div className="summary-metric-card">
            <span>РљРѕР»РёС‡РµСЃС‚РІРѕ С„РµСЂРј</span>
            <strong>{`${formatNumber(trussCount, 0)} С€С‚.`}</strong>
          </div>
          <div className="summary-metric-card summary-metric-card--accent">
            <span>РњР°СЃСЃР° С„РµСЂРјС‹</span>
            <strong>{trussResult.totalMassKg === null ? 'вЂ”' : `${formatNumber(trussResult.totalMassKg, 2)} РєРі`}</strong>
          </div>
          <div className="summary-metric-card">
            <span>РЎС‚РѕРёРјРѕСЃС‚СЊ С„РµСЂРјС‹</span>
            <strong>
              {trussResult.totalMassKg === null ? 'вЂ”' : `${formatRub(trussResult.totalMassKg * tubeS345PriceRubPerKg)} СЂСѓР±.`}
            </strong>
          </div>
          <div className="summary-metric-card">
            <span>РЈРґРµР»СЊРЅР°СЏ РјР°СЃСЃР°</span>
            <strong>
              {trussResult.specificMassKgPerM2 === null
                ? 'вЂ”'
                : `${formatNumber(trussResult.specificMassKgPerM2, 6)} РєРі/РјВІ`}
            </strong>
          </div>
        </div>

        <div className="table-container" style={{ marginTop: 12 }}>
          <h4 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ С„РµСЂРј</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                <th>РљРѕР»РёС‡РµСЃС‚РІРѕ, С€С‚.</th>
                <th>РњР°СЃСЃР° 1 С€С‚., РєРі</th>
                <th>РњР°СЃСЃР° РёС‚РѕРіРѕ, РєРі</th>
                <th>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Р¤РµСЂРјС‹</td>
                <td>{formatNumber(trussCount, 0)}</td>
                <td>{trussResult.totalMassKg === null ? 'вЂ”' : formatNumber(trussResult.totalMassKg, 2)}</td>
                <td>{trussTotalMassKg === null ? 'вЂ”' : formatNumber(trussTotalMassKg, 2)}</td>
                <td>{trussTotalCostRub === null ? 'вЂ”' : formatRub(trussTotalCostRub)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {hasMissingGroups && (
          <p className="results-inline-note" style={{ marginTop: 8 }}>
            Р”Р»СЏ С‚РµРєСѓС‰РµРіРѕ РЅР°Р±РѕСЂР° РЅР°РіСЂСѓР·РѕРє РЅРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРѕР±СЂР°С‚СЊ РїСЂРѕС„РёР»СЊ С…РѕС‚СЏ Р±С‹ РґР»СЏ РѕРґРЅРѕР№ РіСЂСѓРїРїС‹.
          </p>
        )}
      </div>

      <div className="results-section">
        <details className="truss-methodology">
          <summary>РњРµС‚РѕРґРёРєР° СЂР°СЃС‡РµС‚Р° С„РµСЂРј</summary>
          <div className="truss-methodology-content">
            <p className="results-inline-note" style={{ marginTop: 0 }}>
              РџРѕРґР±РѕСЂ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРѕ РіСЂСѓРїРїР°Рј СЌР»РµРјРµРЅС‚РѕРІ С„РµСЂРјС‹ СЃ РїСЂРѕРІРµСЂРєРѕР№ РїСЂРѕС‡РЅРѕСЃС‚Рё Рё СѓСЃС‚РѕР№С‡РёРІРѕСЃС‚Рё РґР»СЏ РєР°Р¶РґРѕР№ РіСЂСѓРїРїС‹.
            </p>
            <ul className="truss-methodology-list">
              <li>РСЃС…РѕРґРЅС‹Рµ РЅР°РіСЂСѓР·РєРё Р±РµСЂСѓС‚СЃСЏ РёР· СЂР°СЃС‡РµС‚Р° РїСЂРѕРіРѕРЅРѕРІ: СЃРЅРµРі, РІРµС‚РµСЂ, РїРѕРєСЂС‹С‚РёРµ, РєРѕСЌС„С„РёС†РёРµРЅС‚ РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕСЃС‚Рё Рё РЅР°РґР±Р°РІРєР°.</li>
              <li>РЈСЃРёР»РёСЏ РІ СЃС‚РµСЂР¶РЅСЏС… РѕРїСЂРµРґРµР»СЏСЋС‚СЃСЏ РїРѕ РµРґРёРЅРёС‡РЅС‹Рј СЌРїСЋСЂР°Рј СЃ РёРЅС‚РµСЂРїРѕР»СЏС†РёРµР№ РїРѕ РїСЂРѕР»РµС‚Сѓ (РјРµР¶РґСѓ С‚Р°Р±Р»РёС‡РЅС‹РјРё Р·РЅР°С‡РµРЅРёСЏРјРё 18/24/30 Рј).</li>
              <li>
                Р”Р»СЏ РєР°Р¶РґРѕР№ РіСЂСѓРїРїС‹ (Р’Рџ, РќРџ, РћР Р±, РћР , Р Р ) РїРµСЂРµР±РёСЂР°СЋС‚СЃСЏ РїСЂРѕС„РёР»Рё Рё РІС‹С‡РёСЃР»СЏСЋС‚СЃСЏ РєРѕСЌС„С„РёС†РёРµРЅС‚С‹ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ РїРѕ РїСЂРѕРІРµСЂРєР°Рј РЎРџ.
              </li>
              <li>
                РџСЂРѕС„РёР»СЊ РїСЂРёРЅРёРјР°РµС‚СЃСЏ, РµСЃР»Рё РїСЂРѕС…РѕРґРёС‚ РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїРѕ С‚РѕР»С‰РёРЅРµ/С€РёСЂРёРЅРµ Рё РєРѕСЌС„С„РёС†РёРµРЅС‚ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ РЅРµ РїСЂРµРІС‹С€Р°РµС‚ РґРѕРїСѓСЃС‚РёРјС‹Р№.
              </li>
              <li>
                РњР°СЃСЃР° РіСЂСѓРїРїС‹ СЃС‡РёС‚Р°РµС‚СЃСЏ РїРѕ РґР»РёРЅРµ СЌР»РµРјРµРЅС‚Р°, СѓРґРµР»СЊРЅРѕР№ РјР°СЃСЃРµ РїСЂРѕС„РёР»СЏ Рё РєРѕСЌС„С„РёС†РёРµРЅС‚Сѓ 1.15; СЃСѓРјРјР°СЂРЅР°СЏ РјР°СЃСЃР° С„РµСЂРјС‹ - СЃСѓРјРјР° РіСЂСѓРїРї + РєРѕРЅСЃС‚СЂСѓРєС‚РёРІРЅР°СЏ РґРѕР±Р°РІРєР°.
              </li>
              <li>
                РљРѕР»РёС‡РµСЃС‚РІРѕ СЂР°СЃРєРѕСЃРѕРІ РґР»СЏ СЃРїРµС†РёС„РёРєР°С†РёРё: РћР Р± = 4, РћР  = 4, Р Р  = 4 (РїСЂРѕР»РµС‚ 18 Рј) / 8 (24 Рј) / 12 (РїСЂРѕС‡РёРµ).
              </li>
              <li>РЎС‚РѕРёРјРѕСЃС‚СЊ СЃС‡РёС‚Р°РµС‚СЃСЏ РїРѕ С†РµРЅРµ РёР· СЌРєРѕРЅРѕРјРёРєРё `РўСЂСѓР±Р° РЎ345`.</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  )
}

function renderGeneralSpecificationOverview(
  input: UnifiedInputState,
  purlinResult: PurlinCalculationResult | null,
  trussResult: TrussCalculationResult | null,
  columnResult: ColumnCalculationResult | null,
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource'],
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
  isColumnManualMode: boolean,
  selectedEnclosingClassKey: EnclosingClassKey,
) {
  const heights = deriveHeights(input)
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
    ...mapUnifiedInputToEnclosingInput({
      ...input,
      buildingHeightM: heights.eaveSupportHeightM,
    }),
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
  const trussCount = trussResult
    ? resolveTrussCount(columnResult, input.buildingLengthM, trussResult.loadSummary.frameStepM)
    : 0
  const trussUnitMassKg = trussResult?.totalMassKg ?? 0
  const trussMassKg = trussUnitMassKg * trussCount
  const trussCostRub = trussMassKg * input.tubeS345PriceRubPerKg

  const combinedMassKg =
    columnMassKg + purlinMassKg + trussMassKg + enclosingMassKg
  const combinedCostRub =
    columnCostRub + purlinCostRub + trussCostRub + enclosingCostRub
  const snowRegionKpa = purlinResult?.loadSummary.snowRegionKpa
  const windRegionKpa = purlinResult?.loadSummary.windRegionKpa
  const roofCoveringNormalized = input.roofCoveringType.toLowerCase()
  const showRoofProfileSheet =
    roofCoveringNormalized.includes('РїСЂРѕС„Р»РёСЃС‚') || roofCoveringNormalized.includes('РЅР°С€Рµ')

  return (
    <div className="results-section results-section--summary-sheet">
      <div className="results-table-head results-table-head--summary">
        <div>
          <h3 className="results-section-title">РћР±С‰РёРµ СЃРІРµРґРµРЅРёСЏ Рѕ СЂР°СЃС‡РµС‚Рµ</h3>
          <p className="results-inline-note" style={{ marginTop: 6 }}>
            РЎРІРѕРґРЅР°СЏ СЃРїРµС†РёС„РёРєР°С†РёСЏ Р·РґР°РЅРёСЏ: РјР°СЃСЃС‹ Рё СЃС‚РѕРёРјРѕСЃС‚Рё РїРѕ РєРѕР»РѕРЅРЅР°Рј, РїСЂРѕРіРѕРЅР°Рј Рё РѕРіСЂР°Р¶РґР°СЋС‰РёРј РєРѕРЅСЃС‚СЂСѓРєС†РёСЏРј.
          </p>
        </div>
        <button className="results-print-action" onClick={() => window.print()}>
          РџРµС‡Р°С‚СЊ / PDF
        </button>
      </div>

      <div className="summary-hero">
        <div className="summary-metric-card summary-metric-card--accent">
          <span>РљРѕР»РѕРЅРЅС‹</span>
          <strong>{`${formatNumber(columnMassKg, 0)} РєРі / ${formatRub(columnCostRub)} СЂСѓР±.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>РџСЂРѕРіРѕРЅС‹</span>
          <strong>{`${formatNumber(purlinMassKg, 0)} РєРі / ${formatRub(purlinCostRub)} СЂСѓР±.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>Р¤РµСЂРјС‹</span>
          <strong>{`${formatNumber(trussMassKg, 0)} РєРі / ${formatRub(trussCostRub)} СЂСѓР±.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>РћРіСЂР°Р¶РґР°СЋС‰РёРµ ({enclosingClass.label})</span>
          <strong>{`${formatNumber(enclosingMassKg, 0)} РєРі / ${formatRub(enclosingCostRub)} СЂСѓР±.`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>РС‚РѕРіРѕ</span>
          <strong>{`${formatNumber(combinedMassKg, 0)} РєРі / ${formatRub(combinedCostRub)} СЂСѓР±.`}</strong>
        </div>
      </div>

      <div className="load-grid load-grid--summary">
        <div className="load-tile">
          <span>Р“РѕСЂРѕРґ</span>
          <strong>{input.city}</strong>
        </div>
        <div className="load-tile">
          <span>РљСЂРѕРІР»СЏ</span>
          <strong>{input.roofType}</strong>
        </div>
        <div className="load-tile">
          <span>РўРёРї РјРµСЃС‚РЅРѕСЃС‚Рё</span>
          <strong>{input.terrainType}</strong>
        </div>
        <div className="load-tile">
          <span>РЁРёСЂРёРЅР°, Рј x Р”Р»РёРЅР°, Рј x Р’С‹СЃРѕС‚Р°, Рј</span>
          <strong>
            {`${formatNumber(input.spanM, 2)} x ${formatNumber(input.buildingLengthM, 2)} x ${formatNumber(input.clearHeightToBottomChordM, 2)}`}
          </strong>
        </div>
        <div className="load-tile">
          <span>РЈРєР»РѕРЅ РєСЂРѕРІР»Рё</span>
          <strong>{`${formatNumber(input.roofSlopeDeg, 1)}В°`}</strong>
        </div>
        <div className="load-tile">
          <span>РЁР°Рі СЂР°Рј x С„Р°С…РІРµСЂРє</span>
          <strong>{`${formatNumber(input.frameStepM, 2)} Рј / ${formatNumber(input.fakhverkStepM, 2)} Рј`}</strong>
        </div>
        <div className="load-tile">
          <span>РџРѕРєСЂС‹С‚РёРµ</span>
          <strong>{input.roofCoveringType}</strong>
        </div>
        <div className="load-tile">
          <span>РћРіСЂР°Р¶РґРµРЅРёРµ СЃС‚РµРЅ</span>
          <strong>{input.wallCoveringType}</strong>
        </div>
        {showRoofProfileSheet && (
          <div className="load-tile">
            <span>РџСЂРѕС„Р»РёСЃС‚ РєСЂРѕРІР»Рё</span>
            <strong>{input.profileSheet}</strong>
          </div>
        )}
        <div className="load-tile">
          <span>РЎРЅРµРіРѕРІРѕР№ РјРµС€РѕРє</span>
          <strong>{input.snowBagMode}</strong>
        </div>
        <div className="load-tile">
          <span>РЎРЅРµРіРѕРІРѕР№ СЂР°Р№РѕРЅ</span>
          <strong>{resolveSnowRegionLabel(snowRegionKpa)}</strong>
        </div>
        <div className="load-tile">
          <span>Р’РµС‚СЂРѕРІРѕР№ СЂР°Р№РѕРЅ</span>
          <strong>{resolveWindRegionLabel(windRegionKpa)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎРЅРµРіРѕРІР°СЏ РЅР°РіСЂСѓР·РєР°</span>
          <strong>{snowRegionKpa !== undefined ? `${formatNumber(snowRegionKpa, 2)} РєРџР°` : '-'}</strong>
        </div>
        <div className="load-tile">
          <span>Р’РµС‚СЂРѕРІР°СЏ РЅР°РіСЂСѓР·РєР°</span>
          <strong>{windRegionKpa !== undefined ? `${formatNumber(windRegionKpa, 2)} РєРџР°` : '-'}</strong>
        </div>
        <div className="load-tile">
          <span>РџРѕРґР±РѕСЂ РєРѕР»РѕРЅРЅ</span>
          <strong>{input.columnSelectionMode === 'engineering' ? 'РРЅР¶РµРЅРµСЂРЅС‹Р№ (H_max)' : 'Excel'}</strong>
        </div>
        <div className="load-tile">
          <span>Р’С‹Р±РѕСЂ РєРѕР»РѕРЅРЅ</span>
          <strong>{isColumnManualMode ? 'Р СѓС‡РЅРѕР№' : 'РђРІС‚Рѕ'}</strong>
        </div>
        <div className="load-tile">
          <span>РСЃС‚РѕС‡РЅРёРє РїСЂРѕРіРѕРЅРѕРІ</span>
          <strong>{purlinSpecificationSource === 'sort' ? 'РЎРѕСЂС‚РѕРІРѕР№' : 'Р›РЎРўРљ'}</strong>
        </div>
        <div className="load-tile">
          <span>Р’С‹Р±РѕСЂ РїСЂРѕРіРѕРЅРѕРІ</span>
          <strong>{purlinSelectionMode === 'manual' ? 'Р СѓС‡РЅРѕР№' : 'РђРІС‚Рѕ'}</strong>
        </div>
        <div className="load-tile">
          <span>РЎСѓРјРјР° РєРѕР»РѕРЅРЅ, РєРі</span>
          <strong>{formatNumber(columnMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎС‚РѕРёРјРѕСЃС‚СЊ РєРѕР»РѕРЅРЅ, СЂСѓР±.</span>
          <strong>{formatRub(columnCostRub)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎСѓРјРјР° РїСЂРѕРіРѕРЅРѕРІ, РєРі</span>
          <strong>{formatNumber(purlinMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎС‚РѕРёРјРѕСЃС‚СЊ РїСЂРѕРіРѕРЅРѕРІ, СЂСѓР±.</span>
          <strong>{formatRub(purlinCostRub)}</strong>
        </div>
        <div className="load-tile">
          <span>РљРѕР»РёС‡РµСЃС‚РІРѕ С„РµСЂРј, С€С‚.</span>
          <strong>{formatNumber(trussCount, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎСѓРјРјР° С„РµСЂРј, РєРі</span>
          <strong>{formatNumber(trussMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎС‚РѕРёРјРѕСЃС‚СЊ С„РµСЂРј, СЂСѓР±.</span>
          <strong>{formatRub(trussCostRub)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎСѓРјРјР° РѕРіСЂР°Р¶РґР°СЋС‰РёС…, РєРі</span>
          <strong>{formatNumber(enclosingMassKg, 0)}</strong>
        </div>
        <div className="load-tile">
          <span>РЎС‚РѕРёРјРѕСЃС‚СЊ РѕРіСЂР°Р¶РґР°СЋС‰РёС…, СЂСѓР±.</span>
          <strong>{formatRub(enclosingCostRub)}</strong>
        </div>
        <div className="load-tile load-tile--total">
          <span>РћР±С‰Р°СЏ РјР°СЃСЃР° / СЃС‚РѕРёРјРѕСЃС‚СЊ</span>
          <strong>
            {columnResult || selectedCandidate || trussMassKg > 0 || enclosingCostRub > 0 || enclosingMassKg > 0
              ? `${formatNumber(combinedMassKg, 0)} РєРі / ${formatRub(combinedCostRub)} СЂСѓР±.`
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
    category: 'РџР°РЅРµР»Рё',
    item: row.mark,
    parameter: `РЁРёСЂРёРЅР° ${row.workingWidthMm} РјРј; С‚РѕР»С‰РёРЅР° ${row.thicknessMm} РјРј; РґР»РёРЅР° ${formatNumber(row.panelLengthM, 2)} Рј; ${formatNumber(row.panelsCount, 0)} С€С‚.`,
    unit: row.unit,
    quantity: row.areaM2,
    quantityFractionDigits: 2,
    massKg: row.totalMassKg,
    unitPriceRub: row.unitPriceRubPerM2,
    totalRub: row.totalRub,
  }))

  const accessoryRows: SummaryEnclosingSpecRow[] = section.accessories.map((row) => ({
    key: row.key,
    category: 'РљРѕРјРїР»РµРєС‚СѓСЋС‰РёРµ',
    item: row.item,
    parameter: `РўСЂРµР±СѓРµРјР°СЏ РґР»РёРЅР° ${formatNumber(row.requiredLengthM, 2)} Рј.Рї.; СЂР°Р·РІРµСЂС‚РєР° ${formatNumber(row.developedWidthM, 2)} Рј`,
    unit: row.unit,
    quantity: row.quantity,
    quantityFractionDigits: 2,
    massKg: null,
    unitPriceRub: row.unitPriceRub,
    totalRub: row.totalRub,
  }))

  const sealantRows: SummaryEnclosingSpecRow[] = section.sealants.map((row) => ({
    key: row.key,
    category: 'РЈРїР»РѕС‚РЅРёС‚РµР»Рё',
    item: row.item,
    parameter: row.note ?? 'РџРѕ РЅРѕСЂРјР°Рј РўРЎРџ',
    unit: row.unit,
    quantity: row.quantity,
    quantityFractionDigits: row.unit.trim().toLowerCase() === 'С€С‚' ? 0 : 2,
    massKg: null,
    unitPriceRub: row.unitPriceRub,
    totalRub: row.totalRub,
  }))

  const fastenerRows: SummaryEnclosingSpecRow[] = section.fasteners.map((row) => ({
    key: row.key,
    category: 'РљСЂРµРїРµР¶',
    item: row.item,
    parameter: `Р”Р»РёРЅР° ${formatNumber(row.lengthMm, 0)} РјРј${row.note ? `; ${row.note}` : ''}`,
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
        <div className="results-empty">РќРµС‚ РїРѕР·РёС†РёР№ РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>РљР°С‚РµРіРѕСЂРёСЏ</th>
                <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ / РјР°СЂРєР°</th>
                <th>РџР°СЂР°РјРµС‚СЂС‹</th>
                <th>Р•Рґ. РёР·Рј.</th>
                <th>РљРѕР»-РІРѕ</th>
                <th>Р’РµСЃ, РєРі</th>
                <th>Р¦РµРЅР°, СЂСѓР±/РµРґ.</th>
                <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                <td colSpan={5}>РС‚РѕРіРѕ РїРѕ СЂР°Р·РґРµР»Сѓ</td>
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
      ...mapUnifiedInputToEnclosingInput({
        ...input,
        buildingHeightM: deriveHeights(input).eaveSupportHeightM,
      }),
      roofPurlinStepM,
    }
    const enclosingResult = calculateEnclosing(enclosingInput)
    const activeClass = enclosingResult.classes[selectedClassKey]
    const includeWalls = isSandwichPanelCovering(input.wallCoveringType)
    const includeRoof = isSandwichPanelCovering(input.roofCoveringType)

    return (
      <>
        {includeWalls ? (
          renderSummaryEnclosingSectionTable('РЎРїРµС†РёС„РёРєР°С†РёСЏ СЃС‚РµРЅРѕРІС‹С… РѕРіСЂР°Р¶РґР°СЋС‰РёС… РєРѕРЅСЃС‚СЂСѓРєС†РёР№', activeClass.walls)
        ) : (
          <div className="results-section">
            <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ СЃС‚РµРЅРѕРІС‹С… РѕРіСЂР°Р¶РґР°СЋС‰РёС… РєРѕРЅСЃС‚СЂСѓРєС†РёР№</h3>
            <p className="results-inline-note">
              Р Р°СЃС‡РµС‚ РЅРµ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ: РґР»СЏ СЃС‚РµРЅ РІС‹Р±СЂР°РЅРѕ РїРѕРєСЂС‹С‚РёРµ РЅРµ РЎ-Рџ ({input.wallCoveringType}).
            </p>
          </div>
        )}

        {includeRoof ? (
          renderSummaryEnclosingSectionTable('РЎРїРµС†РёС„РёРєР°С†РёСЏ РєСЂРѕРІРµР»СЊРЅС‹С… РѕРіСЂР°Р¶РґР°СЋС‰РёС… РєРѕРЅСЃС‚СЂСѓРєС†РёР№', activeClass.roof)
        ) : (
          <div className="results-section">
            <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ РєСЂРѕРІРµР»СЊРЅС‹С… РѕРіСЂР°Р¶РґР°СЋС‰РёС… РєРѕРЅСЃС‚СЂСѓРєС†РёР№</h3>
            <p className="results-inline-note">
              Р Р°СЃС‡РµС‚ РЅРµ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ: РґР»СЏ РєСЂРѕРІР»Рё РІС‹Р±СЂР°РЅРѕ РїРѕРєСЂС‹С‚РёРµ РЅРµ РЎ-Рџ ({input.roofCoveringType}).
            </p>
          </div>
        )}
      </>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРіРѕС‚РѕРІРёС‚СЊ СЃРІРѕРґРЅСѓСЋ СЃРїРµС†РёС„РёРєР°С†РёСЋ РѕРіСЂР°Р¶РґР°СЋС‰РёС….'
    return (
      <div className="results-section">
        <h3 className="results-section-title">РЎРІРѕРґРЅР°СЏ СЃРїРµС†РёС„РёРєР°С†РёСЏ РѕРіСЂР°Р¶РґР°СЋС‰РёС… РєРѕРЅСЃС‚СЂСѓРєС†РёР№</h3>
        <div className="results-error">
          <strong>РћС€РёР±РєР° СЂР°СЃС‡РµС‚Р°: </strong>
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
      ...mapUnifiedInputToEnclosingInput({
        ...input,
        buildingHeightM: deriveHeights(input).eaveSupportHeightM,
      }),
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
              <h3 className="results-section-title">РћРіСЂР°Р¶РґР°СЋС‰РёРµ РєРѕРЅСЃС‚СЂСѓРєС†РёРё</h3>
              <p className="results-inline-note" style={{ marginTop: 6 }}>
                Р”РµС‚Р°Р»СЊРЅР°СЏ СЃРїРµС†РёС„РёРєР°С†РёСЏ РїРѕ СЃС‚РµРЅР°Рј Рё РєСЂРѕРІР»Рµ РґР»СЏ РјРµС‚Р°Р»Р»РёС‡РµСЃРєРёС… РїСЂСЏРјРѕСЃС‚РµРЅРЅС‹С… Р°РЅРіР°СЂРѕРІ.
              </p>
            </div>
            <button className="results-print-action" onClick={() => window.print()}>
              РџРµС‡Р°С‚СЊ / PDF
            </button>
          </div>

          <div className="results-section" style={{ marginBottom: 12 }}>
            <h3 className="results-section-title">РљР»Р°СЃСЃ РїР°РЅРµР»РµР№</h3>
            <div className="mode-toggle">
              <button
                className={`mode-button ${selectedClassKey === 'class-1-gost' ? 'active' : ''}`}
                onClick={() => onClassChange('class-1-gost')}
              >
                РљР»Р°СЃСЃ 1
              </button>
              <button
                className={`mode-button ${selectedClassKey === 'class-2-tu' ? 'active' : ''}`}
                onClick={() => onClassChange('class-2-tu')}
              >
                РљР»Р°СЃСЃ 2
              </button>
            </div>
          </div>

          <div className="results-section" style={{ marginBottom: 12 }}>
            <h3 className="results-section-title">РџСЂР°Р№СЃ PDF</h3>
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
                {priceImportStatus.isLoading ? 'РРјРїРѕСЂС‚...' : 'Р—Р°РіСЂСѓР·РёС‚СЊ РїСЂР°Р№СЃ (PDF)'}
              </label>
              <button
                type="button"
                className="mode-button"
                onClick={() => onResetPriceOverrides()}
                disabled={priceImportStatus.isLoading}
              >
                РЎР±СЂРѕСЃРёС‚СЊ РёРјРїРѕСЂС‚
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
                РџРѕСЃР»РµРґРЅРёР№ РёРјРїРѕСЂС‚: {priceImportStatus.sourceFileName}
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
                <h3 className="results-section-title">РЎС‚РµРЅС‹</h3>
                <div className="load-grid load-grid--summary">
                  <div className="load-tile">
                    <span>РћР±С‰Р°СЏ РїР»РѕС‰Р°РґСЊ, Рј2</span>
                    <strong>{formatNumber(enclosingResult.geometry.wallAreaGrossM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>РџР»РѕС‰Р°РґСЊ РїСЂРѕРµРјРѕРІ, Рј2</span>
                    <strong>{formatNumber(enclosingResult.geometry.openingsAreaM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>РџР»РѕС‰Р°РґСЊ РЅРµС‚С‚Рѕ, Рј2</span>
                    <strong>{formatNumber(enclosingResult.geometry.wallAreaNetM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>Р’РµСЃ, РєРі</span>
                    <strong>{formatNumber(walls.totals.panelMassKg, 2)}</strong>
                  </div>
                  <div className="load-tile load-tile--total">
                    <span>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±.</span>
                    <strong>{formatRub(wallsSectionRub)}</strong>
                  </div>
                </div>
                <p className="results-inline-note" style={{ marginTop: 8 }}>
                  РЎС‚РµРЅРѕРІС‹Рµ РїР°РЅРµР»Рё РїСЂРёРЅСЏС‚С‹ РІ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРј РјРѕРЅС‚Р°Р¶Рµ; СЂР°Р±РѕС‡Р°СЏ С€РёСЂРёРЅР° С„РёРєСЃРёСЂРѕРІР°РЅР° 1000 РјРј.
                </p>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ СЃС‚РµРЅРѕРІС‹С… РїР°РЅРµР»РµР№</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РњР°СЂРєР°</th>
                        <th>РЁРёСЂРёРЅР°, РјРј</th>
                        <th>РўРѕР»С‰РёРЅР°, РјРј</th>
                        <th>Р”Р»РёРЅР°, Рј</th>
                        <th>РЁС‚СѓРє</th>
                        <th>Р’РµСЃ, РєРі/Рј2</th>
                        <th>Р’РµСЃ РѕР±С‰РёР№, РєРі</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/Рј2</th>
                        <th>РљРѕР»-РІРѕ, Рј2</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                  РќРѕСЂРјР°С‚РёРІ: {wallStandards.join('; ')}
                </p>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ РєРѕРјРїР»РµРєС‚СѓСЋС‰РёС… (РЎС‚РµРЅС‹)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                        <th>РўСЂРµР±СѓРµРјР°СЏ РґР»РёРЅР°, Рј.Рї.</th>
                        <th>Р Р°Р·РІРµСЂС‚РєР°, Рј</th>
                        <th>РљРѕР»-РІРѕ, Рј2</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/Рј2</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ СѓРїР»РѕС‚РЅРёС‚РµР»РµР№ (РЎС‚РµРЅС‹)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                        <th>Р•Рґ. РёР·Рј.</th>
                        <th>РљРѕР»-РІРѕ</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/РµРґ.</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ РєСЂРµРїРµР¶Р° (РЎС‚РµРЅС‹)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                        <th>Р”Р»РёРЅР°, РјРј</th>
                        <th>РљРѕР»-РІРѕ, С€С‚</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/С€С‚</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
              <h3 className="results-section-title">РЎС‚РµРЅС‹</h3>
              <p className="results-inline-note">
                Р Р°СЃС‡РµС‚ СЃС‚РµРЅ РЅРµ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ: РІС‹Р±СЂР°РЅРЅРѕРµ РїРѕРєСЂС‹С‚РёРµ РЅРµ РЎ-Рџ ({input.wallCoveringType}).
              </p>
            </div>
          )}

          {includeRoof ? (
            <>
              <div className="results-section">
                <h3 className="results-section-title">РљСЂРѕРІР»СЏ</h3>
                <div className="load-grid load-grid--summary">
                  <div className="load-tile">
                    <span>РћР±С‰Р°СЏ РїР»РѕС‰Р°РґСЊ, Рј2</span>
                    <strong>{formatNumber(enclosingResult.geometry.roofAreaM2, 2)}</strong>
                  </div>
                  <div className="load-tile">
                    <span>Р’РµСЃ, РєРі</span>
                    <strong>{formatNumber(roof.totals.panelMassKg, 2)}</strong>
                  </div>
                  <div className="load-tile load-tile--total">
                    <span>РЎС‚РѕРёРјРѕСЃС‚СЊ, СЂСѓР±.</span>
                    <strong>{formatRub(roofSectionRub)}</strong>
                  </div>
                </div>
              </div>

              <div className="results-section">
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ РєСЂРѕРІРµР»СЊРЅС‹С… РїР°РЅРµР»РµР№</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РњР°СЂРєР°</th>
                        <th>РЁРёСЂРёРЅР°, РјРј</th>
                        <th>РўРѕР»С‰РёРЅР°, РјРј</th>
                        <th>Р”Р»РёРЅР°, Рј</th>
                        <th>РЁС‚СѓРє</th>
                        <th>Р’РµСЃ, РєРі/Рј2</th>
                        <th>Р’РµСЃ РѕР±С‰РёР№, РєРі</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/Рј2</th>
                        <th>РљРѕР»-РІРѕ, Рј2</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ РєРѕРјРїР»РµРєС‚СѓСЋС‰РёС… (РљСЂРѕРІР»СЏ)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                        <th>РўСЂРµР±СѓРµРјР°СЏ РґР»РёРЅР°, Рј.Рї.</th>
                        <th>Р Р°Р·РІРµСЂС‚РєР°, Рј</th>
                        <th>РљРѕР»-РІРѕ, Рј2</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/Рј2</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ СѓРїР»РѕС‚РЅРёС‚РµР»РµР№ (РљСЂРѕРІР»СЏ)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                        <th>Р•Рґ. РёР·Рј.</th>
                        <th>РљРѕР»-РІРѕ</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/РµРґ.</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
                <h3 className="results-section-title">РЎРїРµС†РёС„РёРєР°С†РёСЏ РєСЂРµРїРµР¶Р° (РљСЂРѕРІР»СЏ)</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
                        <th>Р”Р»РёРЅР°, РјРј</th>
                        <th>РљРѕР»-РІРѕ, С€С‚</th>
                        <th>Р¦РµРЅР°, СЂСѓР±/С€С‚</th>
                        <th>РЎСѓРјРјР°, СЂСѓР±.</th>
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
              <h3 className="results-section-title">РљСЂРѕРІР»СЏ</h3>
              <p className="results-inline-note">
                Р Р°СЃС‡РµС‚ РєСЂРѕРІР»Рё РЅРµ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ: РІС‹Р±СЂР°РЅРЅРѕРµ РїРѕРєСЂС‹С‚РёРµ РЅРµ РЎ-Рџ ({input.roofCoveringType}).
              </p>
            </div>
          )}

          <div className="results-section">
            <h3 className="results-section-title">РС‚РѕРіРѕ РѕРіСЂР°Р¶РґР°СЋС‰РёРµ РєРѕРЅСЃС‚СЂСѓРєС†РёРё</h3>
            <div className="summary-hero">
              <div className="summary-metric-card summary-metric-card--accent">
                <span>{`${activeClass.label}: СЃС‚РѕРёРјРѕСЃС‚СЊ`}</span>
                <strong>{`${formatRub(totalSectionRub)} СЂСѓР±.`}</strong>
              </div>
              <div className="summary-metric-card">
                <span>РЎС‚РµРЅС‹, СЂСѓР±.</span>
                <strong>{includeWalls ? formatRub(wallsSectionRub) : 'вЂ”'}</strong>
              </div>
              <div className="summary-metric-card">
                <span>РљСЂРѕРІР»СЏ, СЂСѓР±.</span>
                <strong>{includeRoof ? formatRub(roofSectionRub) : 'вЂ”'}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Р’РµСЃ РїР°РЅРµР»РµР№, РєРі</span>
                <strong>{formatNumber(totalPanelMassKg, 2)}</strong>
              </div>
              <div className="summary-metric-card">
                <span>РџР°РЅРµР»Рё, СЂСѓР±.</span>
                <strong>{formatRub(totalPanelsRub)}</strong>
              </div>
              <div className="summary-metric-card">
                <span>РљРѕРјРїР»РµРєС‚СѓСЋС‰РёРµ + СѓРїР»РѕС‚РЅРёС‚РµР»Рё + РєСЂРµРїРµР¶, СЂСѓР±.</span>
                <strong>{formatRub(totalSupportRub)}</strong>
              </div>
            </div>
            {!includeWalls && !includeRoof && (
              <p className="results-inline-note" style={{ marginTop: 8 }}>
                Р”Р»СЏ СЂР°СЃС‡РµС‚Р° РѕРіСЂР°Р¶РґР°СЋС‰РёС… РІС‹Р±РµСЂРёС‚Рµ РїРѕРєСЂС‹С‚РёРµ С‚РёРїР° РЎ-Рџ РґР»СЏ СЃС‚РµРЅ Рё/РёР»Рё РєСЂРѕРІР»Рё.
              </p>
            )}
          </div>

          {enclosingResult.notes.length > 0 && (
            <div className="footer-note">
              <strong>РџСЂРёРјРµС‡Р°РЅРёСЏ: </strong>
              <span>{enclosingResult.notes.join(' ')}</span>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃСЃС‡РёС‚Р°С‚СЊ РѕРіСЂР°Р¶РґР°СЋС‰РёРµ РєРѕРЅСЃС‚СЂСѓРєС†РёРё.'
    return (
      <div className="tab-pane animate-in">
        <div className="results-section">
          <h3 className="results-section-title">РћРіСЂР°Р¶РґР°СЋС‰РёРµ РєРѕРЅСЃС‚СЂСѓРєС†РёРё</h3>
          <div className="results-error">
            <strong>РћС€РёР±РєР° СЂР°СЃС‡РµС‚Р°: </strong>
            {message}
          </div>
        </div>
      </div>
    )
  }
}

function resolveColumnEffortsByType(input: UnifiedInputState) {
  const baseInput = mapToColumnInput(input)

  return COLUMN_EFFORT_GROUPS.map((group) => {
    try {
      const derivedContext = buildColumnDerivedContext({
        ...baseInput,
        columnType: group.columnType,
      })

      return {
        key: group.key,
        label: group.label,
        axialLoadKn: derivedContext.axialLoadKn,
        bendingMomentKnM: derivedContext.bendingMomentKnM,
      }
    } catch {
      return {
        key: group.key,
        label: group.label,
        axialLoadKn: null,
        bendingMomentKnM: null,
      }
    }
  })
}

export function ResultsPanel({
  input,
  activeTab,
  purlinResult,
  trussResult,
  columnResult,
  isPending,
  purlinError,
  trussError,
  columnError,
  isColumnManualMode,
  onColumnManualModeChange,
  columnSelectionMode,
  onColumnSelectionModeChange,
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
      ? trussError
        ? [{ scope: 'Р¤РµСЂРјС‹', message: trussError }]
        : []
      : activeTab === 'summary' ||
          activeTab === 'selection-summary' ||
          activeTab === 'graphics' ||
          activeTab === 'enclosing' ||
          activeTab === 'methodology'
      ? [
          { scope: 'РџСЂРѕРіРѕРЅС‹', message: purlinError },
          { scope: 'Р¤РµСЂРјС‹', message: trussError },
          { scope: 'РљРѕР»РѕРЅРЅС‹', message: columnError },
        ].filter((item): item is { scope: string; message: string } => Boolean(item.message))
      : activeTab === 'purlin'
        ? purlinError
          ? [{ scope: 'РџСЂРѕРіРѕРЅС‹', message: purlinError }]
          : []
        : columnError
          ? [{ scope: 'РљРѕР»РѕРЅРЅС‹', message: columnError }]
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
  const columnEffortsByType = useMemo(() => resolveColumnEffortsByType(input), [input])

  return (
    <div className={`results-panel ${isPending ? 'pending' : ''}`}>
      {activeErrors.length > 0 && (
        <div className="results-error">
          <h4 style={{ margin: '0 0 8px' }}>РћС€РёР±РєР° СЂР°СЃС‡РµС‚Р°</h4>
          {activeErrors.map((item) => (
            <p key={item.scope} style={{ margin: '0 0 6px' }}>
              <strong>{item.scope}: </strong>
              {item.message}
            </p>
          ))}
        </div>
      )}

      {activeTab === 'selection-summary' ? (
        <SelectionSummaryPage
          input={input}
          purlinResult={purlinResult}
          trussResult={trussResult}
          columnResult={columnResult}
          selectedEnclosingClassKey={enclosingClassKey}
          purlinSpecificationSource={purlinSpecificationSource}
          purlinSelectionMode={purlinSelectionMode}
          selectedSortPurlinIndex={selectedSortPurlinIndex}
          selectedLstkPurlinIndex={selectedLstkPurlinIndex}
        />
      ) : activeTab === 'summary' ? (
        <div className="tab-pane animate-in">
          {renderGeneralSpecificationOverview(
            input,
            purlinResult,
            trussResult,
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
        renderTrussOverview(
          trussResult,
          columnResult,
          input.buildingLengthM,
          input.tubeS345PriceRubPerKg,
        )
      ) : activeTab === 'graphics' ? (
        <div className="tab-pane animate-in">
          <FrameGraphicsPanel input={input} />
        </div>
      ) : activeTab === 'purlin' ? (
        <div className="tab-pane animate-in">
          <div className="results-section">
            <h3 className="results-section-title">РќР°РіСЂСѓР·РєРё Рё СЂР°СЃС‡РµС‚РЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹</h3>
            <div className="load-grid load-grid--purlin">
              <div className="load-tile">
                <span>РЎРЅРµРі СЂР°Р№РѕРЅ, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.snowRegionKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Р’РµС‚РµСЂ СЂР°Р№РѕРЅ, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.windRegionKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>РџРѕРєСЂС‹С‚РёРµ, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.coveringKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>РљРѕСЌС„. СЃРЅРµРі. РјРµС€РєР°</span>
                <strong>
                  {purlinResult?.loadSummary?.snowBagFactor !== undefined
                    ? purlinResult.loadSummary.snowBagFactor.toFixed(2)
                    : '-'}
                </strong>
              </div>
              <div className="load-tile">
                <span>РЎРЅРµРі СЂР°СЃС‡РµС‚, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.designSnowKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Р’РµС‚РµСЂ РєСЂРѕРІР»СЏ, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.windRoofKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Р’РµС‚РµСЂ С„Р°СЃР°Рґ, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.windFacadeKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>Р­РєСЃРїР». РЅР°РіСЂСѓР·РєР°, РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.serviceKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile load-tile--total">
                <span>РЎСѓРјРјР°СЂРЅР°СЏ СЂР°СЃС‡., РєРџР°</span>
                <strong>{purlinResult?.loadSummary?.designTotalKpa.toFixed(2) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>РђРІС‚Рѕ С€Р°Рі, РјРј</span>
                <strong>
                  {purlinResult?.loadSummary?.autoMaxStepMm !== undefined
                    ? formatStepLimitMm(purlinResult.loadSummary.autoMaxStepMm)
                    : '-'}
                </strong>
              </div>
              <div className="load-tile">
                <span>РњРёРЅ. С€Р°Рі СЂСѓС‡РЅРѕР№, РјРј</span>
                <strong>
                  {purlinResult?.loadSummary?.manualMinStepMm !== undefined
                    ? formatStepLimitMm(purlinResult.loadSummary.manualMinStepMm, 'РЅРµ Р·Р°РґР°РЅ')
                    : '-'}
                </strong>
              </div>
              <div className="load-tile">
                <span>РњР°РєСЃ. С€Р°Рі СЂСѓС‡РЅРѕР№, РјРј</span>
                <strong>
                  {purlinResult?.loadSummary?.manualMaxStepMm !== undefined
                    ? formatStepLimitMm(purlinResult.loadSummary.manualMaxStepMm, 'РЅРµ Р·Р°РґР°РЅ')
                    : '-'}
                </strong>
              </div>
            </div>
          </div>

          <div className="results-section-row">
            <div className="results-section">
              <h3 className="results-section-title">РСЃС‚РѕС‡РЅРёРє СЃРїРµС†РёС„РёРєР°С†РёРё РїСЂРѕРіРѕРЅРѕРІ</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${purlinSpecificationSource === 'sort' ? 'active' : ''}`}
                  onClick={() => onPurlinSpecificationSourceChange('sort')}
                >
                  РЎРѕСЂС‚РѕРІРѕР№
                </button>
                <button
                  className={`mode-button ${purlinSpecificationSource === 'lstk' ? 'active' : ''}`}
                  onClick={() => onPurlinSpecificationSourceChange('lstk')}
                >
                  Р›РЎРўРљ
                </button>
              </div>
            </div>

            <div className="results-section">
              <h3 className="results-section-title">Р РµР¶РёРј РІС‹Р±РѕСЂР° РїСЂРѕС„РёР»СЏ РїСЂРѕРіРѕРЅР°</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${purlinSelectionMode === 'auto' ? 'active' : ''}`}
                  onClick={() => onPurlinSelectionModeChange('auto')}
                >
                  РђРІС‚Рѕ
                </button>
                <button
                  className={`mode-button ${purlinSelectionMode === 'manual' ? 'active' : ''}`}
                  onClick={() => onPurlinSelectionModeChange('manual')}
                >
                  Р СѓС‡РЅРѕР№ РІС‹Р±РѕСЂ
                </button>
              </div>

              {purlinSelectionMode === 'manual' && (
                <div className="selection-row" style={{ marginTop: 10 }}>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span className="field-label">РџСЂРѕС„РёР»СЊ РґР»СЏ СЃРїРµС†РёС„РёРєР°С†РёРё</span>
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

          {renderPurlinCandidatesTable('РЎРѕСЂС‚РѕРІРѕР№ РїСЂРѕРєР°С‚ вЂ” РўРѕРї 10', purlinResult?.sortSteelTop10 ?? [], 10)}
          {renderPurlinCandidatesTable('Р›РЎРўРљ РњРџ350', purlinResult?.lstkMp350Top ?? [], 5)}
          {renderPurlinCandidatesTable('Р›РЎРўРљ РњРџ390', purlinResult?.lstkMp390Top ?? [], 5)}
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
            <h3 className="results-section-title">Р Р°СЃС‡РµС‚РЅС‹Рµ СѓСЃРёР»РёСЏ</h3>
            <div className="load-grid">
              <div className="load-tile">
                <span>РћСЃРµРІР°СЏ N (РєРќ)</span>
                <strong>{columnResult?.derivedContext?.axialLoadKn?.toFixed(1) ?? '-'}</strong>
              </div>
              <div className="load-tile">
                <span>РњРѕРјРµРЅС‚ M (РєРќВ·Рј)</span>
                <strong>{columnResult?.derivedContext?.bendingMomentKnM?.toFixed(1) ?? '-'}</strong>
              </div>
              {columnEffortsByType.map((effort) => (
                <div key={effort.key} className="load-tile">
                  <span>{`${effort.label}: N / M`}</span>
                  <strong>
                    {effort.axialLoadKn === null || effort.bendingMomentKnM === null
                      ? '-'
                      : `${effort.axialLoadKn.toFixed(1)} / ${effort.bendingMomentKnM.toFixed(1)}`}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="results-section-row">
            <div className="results-section">
              <h3 className="results-section-title">Р РµР¶РёРј РїРѕРґР±РѕСЂР° РєРѕР»РѕРЅРЅ</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${columnSelectionMode === 'engineering' ? 'active' : ''}`}
                  onClick={() => onColumnSelectionModeChange('engineering')}
                >
                  РРЅР¶РµРЅРµСЂРЅС‹Р№ (H_max)
                </button>
                <button
                  className={`mode-button ${columnSelectionMode === 'excel' ? 'active' : ''}`}
                  onClick={() => onColumnSelectionModeChange('excel')}
                >
                  Excel
                </button>
              </div>
              <p className="results-inline-note">
                {columnSelectionMode === 'engineering'
                  ? 'РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РјР°РєСЃРёРјР°Р»СЊРЅР°СЏ СЂР°СЃС‡РµС‚РЅР°СЏ РґР»РёРЅР° РІ РіСЂСѓРїРїРµ.'
                  : 'РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ Р±Р°Р·РѕРІР°СЏ РІС‹СЃРѕС‚Р° Сѓ РєР°СЂРЅРёР·Р° (РєР°Рє РІ Excel).'}
              </p>
            </div>

            <div className="results-section">
              <h3 className="results-section-title">Р РµР¶РёРј РІС‹Р±РѕСЂР° РїСЂРѕС„РёР»СЏ</h3>
              <div className="mode-toggle">
                <button
                  className={`mode-button ${!isColumnManualMode ? 'active' : ''}`}
                  onClick={() => onColumnManualModeChange(false)}
                >
                  РђРІС‚Рѕ
                </button>
                <button
                  className={`mode-button ${isColumnManualMode ? 'active' : ''}`}
                  onClick={() => onColumnManualModeChange(true)}
                >
                  Р СѓС‡РЅРѕР№ РІС‹Р±РѕСЂ
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

