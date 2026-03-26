import { useState } from 'react'
import type { DomainTab } from '@/app/App'
import type { CandidateResult } from '@/domain/common/model/candidate-result'
import type { ColumnCalculationResult } from '@/domain/column/model/calculate-column'
import type { ColumnGroupKey } from '@/domain/column/model/column-output'
import type { EnclosingClassKey } from '@/domain/enclosing/model/enclosing-reference.generated'
import type { PurlinCalculationResult } from '@/domain/purlin/model/calculate-purlin'
import { calculateEnclosing } from '@/domain/enclosing/model/calculate-enclosing'
import { mapUnifiedInputToEnclosingInput } from '@/domain/enclosing/model/enclosing-mapper'
import type { UnifiedInputState } from '../model/unified-input'
import { MethodologyPanel } from './methodology-panel'

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
}

const COLUMN_GROUPS: ReadonlyArray<{ key: ColumnGroupKey; title: string }> = [
  { key: 'extreme', title: 'РљСЂР°Р№РЅСЏСЏ РєРѕР»РѕРЅРЅР° вЂ” РџРѕРґР±РѕСЂ РїСЂРѕС„РёР»РµР№' },
  { key: 'fachwerk', title: 'Р¤Р°С…РІРµСЂРєРѕРІР°СЏ РєРѕР»РѕРЅРЅР° вЂ” РџРѕРґР±РѕСЂ РїСЂРѕС„РёР»РµР№' },
  { key: 'middle', title: 'РЎСЂРµРґРЅСЏСЏ РєРѕР»РѕРЅРЅР° вЂ” РџРѕРґР±РѕСЂ РїСЂРѕС„РёР»РµР№' },
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
                  <th>в„–</th>
                  <th>Р Р°РЅРі</th>
                  <th>РџСЂРѕС„РёР»СЊ</th>
                  <th>РЎС‚Р°Р»СЊ</th>
                  <th>РўРёРї РїСЂРѕС„РёР»СЏ</th>
                  <th>Рљ-С‚ РёСЃРї</th>
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

function renderGeneralSpecificationOverview(
  input: UnifiedInputState,
  purlinResult: PurlinCalculationResult | null,
  columnResult: ColumnCalculationResult | null,
  purlinSpecificationSource: UnifiedInputState['purlinSpecificationSource'],
  purlinSelectionMode: UnifiedInputState['purlinSelectionMode'],
  selectedSortPurlinIndex: number,
  selectedLstkPurlinIndex: number,
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
    ? `${formatPurlinFamilyLabel(selectedCandidate.family)} / ${selectedCandidate.profile}`
    : 'РќРµ РІС‹Р±СЂР°РЅ'
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
            РЎРІРѕРґРЅР°СЏ СЃРїРµС†РёС„РёРєР°С†РёСЏ Р·РґР°РЅРёСЏ РїРѕ С‚РµРєСѓС‰РёРј РІС‹Р±СЂР°РЅРЅС‹Рј СЂРµР¶РёРјР°Рј СЂР°СЃС‡РµС‚Р° РєРѕР»РѕРЅРЅ Рё РїСЂРѕРіРѕРЅРѕРІ.
          </p>
        </div>
        <button className="results-print-action" onClick={() => window.print()}>
          РџРµС‡Р°С‚СЊ / PDF
        </button>
      </div>

      <div className="summary-hero">
        <div className="summary-metric-card summary-metric-card--accent">
          <span>РћР±С‰Р°СЏ РјР°СЃСЃР° Р·РґР°РЅРёСЏ</span>
          <strong>{formatNumber(combinedMassKg, 0)} РєРі</strong>
        </div>
        <div className="summary-metric-card">
          <span>РћСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РЅР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ</span>
          <strong>{formatRub(combinedCostRub)} СЂСѓР±.</strong>
        </div>
        <div className="summary-metric-card">
          <span>РљРѕР»РѕРЅРЅ / РїСЂРѕРіРѕРЅРѕРІ</span>
          <strong>{`${combinedColumnsCount} С€С‚. / ${selectedCandidate ? '1 С‚РёРї' : 'вЂ”'}`}</strong>
        </div>
        <div className="summary-metric-card">
          <span>Р’С‹Р±СЂР°РЅРЅС‹Р№ РїСЂРѕРіРѕРЅ</span>
          <strong>{selectedPurlinLabel}</strong>
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
            {`${formatNumber(input.spanM, 2)} x ${formatNumber(input.buildingLengthM, 2)} x ${formatNumber(input.buildingHeightM, 2)}`}
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
          <strong>РРЅР¶РµРЅРµСЂРЅС‹Р№ (H_max)</strong>
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
          <strong>{columnResult ? formatNumber(columnResult.specification.totalMassKg, 0) : '-'}</strong>
        </div>
        <div className="load-tile">
          <span>РЎСѓРјРјР° РїСЂРѕРіРѕРЅРѕРІ, РєРі</span>
          <strong>{selectedCandidate ? formatNumber(selectedCandidate.totalMassKg, 0) : '-'}</strong>
        </div>
        <div className="load-tile load-tile--total">
          <span>РћР±С‰Р°СЏ РјР°СЃСЃР° / СЃС‚РѕРёРјРѕСЃС‚СЊ</span>
          <strong>
            {columnResult || selectedCandidate
              ? `${formatNumber(combinedMassKg, 0)} РєРі / ${formatRub(combinedCostRub)} СЂСѓР±.`
              : '-'}
          </strong>
        </div>
      </div>
    </div>
  )
}

function renderEnclosingOverview(
  input: UnifiedInputState,
  selectedClassKey: EnclosingClassKey,
  onClassChange: (value: EnclosingClassKey) => void,
) {
  try {
    const enclosingInput = mapUnifiedInputToEnclosingInput(input)
    const enclosingResult = calculateEnclosing(enclosingInput)
    const activeClass = enclosingResult.classes[selectedClassKey]
    const walls = activeClass.walls
    const roof = activeClass.roof
    const wallStandards = [...new Set(walls.panelSpecification.map((row) => row.standard))]

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
                    <th>Тип</th>
                    <th>Марка</th>
                    <th>Ширина, мм</th>
                    <th>Ед. изм.</th>
                    <th>Толщина, мм</th>
                    <th>Длина, м</th>
                    <th>Штук</th>
                    <th>Вес, кг/м2</th>
                    <th>Вес общий, кг</th>
                    <th>Цена, руб/м2</th>
                    <th>Сумма, руб.</th>
                  </tr>
                </thead>
                <tbody>
                  {walls.panelSpecification.map((row) => (
                    <tr key={row.key}>
                      <td>{row.panelType}</td>
                      <td>{row.mark}</td>
                      <td>{row.workingWidthMm}</td>
                      <td>{row.unit}</td>
                      <td>{row.thicknessMm}</td>
                      <td>{formatNumber(row.panelLengthM, 2)}</td>
                      <td>{formatNumber(row.panelsCount, 0)}</td>
                      <td>{formatNumber(row.unitMassKgPerM2, 2)}</td>
                      <td>{formatNumber(row.totalMassKg, 2)}</td>
                      <td>{formatRub(row.unitPriceRubPerM2)}</td>
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
                    <th>Длина изделия, м</th>
                    <th>Кол-во, шт</th>
                    <th>Развертка, м</th>
                    <th>Цена, руб/шт</th>
                    <th>Сумма, руб.</th>
                  </tr>
                </thead>
                <tbody>
                  {walls.accessories.map((row) => (
                    <tr key={row.key}>
                      <td>{row.item}</td>
                      <td>{formatNumber(row.requiredLengthM, 2)}</td>
                      <td>{formatNumber(row.stockLengthM, 2)}</td>
                      <td>{formatNumber(row.quantity, 0)}</td>
                      <td>{formatNumber(row.developedWidthM, 2)}</td>
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
            </div>
          </div>

          <div className="results-section">
            <h3 className="results-section-title">Спецификация кровельных панелей</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Марка</th>
                    <th>Ширина, мм</th>
                    <th>Ед. изм.</th>
                    <th>Толщина, мм</th>
                    <th>Длина, м</th>
                    <th>Штук</th>
                    <th>Норматив</th>
                    <th>Плотность, кг/м3</th>
                    <th>Объем, м2</th>
                    <th>Вес, кг/м2</th>
                    <th>Вес общий, кг</th>
                    <th>Цена, руб/м2</th>
                    <th>Сумма, руб.</th>
                  </tr>
                </thead>
                <tbody>
                  {roof.panelSpecification.map((row) => (
                    <tr key={row.key}>
                      <td>{row.panelType}</td>
                      <td>{row.mark}</td>
                      <td>{row.workingWidthMm}</td>
                      <td>{row.unit}</td>
                      <td>{row.thicknessMm}</td>
                      <td>{formatNumber(row.panelLengthM, 2)}</td>
                      <td>{formatNumber(row.panelsCount, 0)}</td>
                      <td>{row.standard}</td>
                      <td>{formatNumber(row.densityKgPerM3, 0)}</td>
                      <td>{formatNumber(row.areaM2, 2)}</td>
                      <td>{formatNumber(row.unitMassKgPerM2, 2)}</td>
                      <td>{formatNumber(row.totalMassKg, 2)}</td>
                      <td>{formatRub(row.unitPriceRubPerM2)}</td>
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
                    <th>Длина изделия, м</th>
                    <th>Кол-во, шт</th>
                    <th>Развертка, м</th>
                    <th>Цена, руб/шт</th>
                    <th>Сумма, руб.</th>
                  </tr>
                </thead>
                <tbody>
                  {roof.accessories.map((row) => (
                    <tr key={row.key}>
                      <td>{row.item}</td>
                      <td>{formatNumber(row.requiredLengthM, 2)}</td>
                      <td>{formatNumber(row.stockLengthM, 2)}</td>
                      <td>{formatNumber(row.quantity, 0)}</td>
                      <td>{formatNumber(row.developedWidthM, 2)}</td>
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

          <div className="results-section">
            <h3 className="results-section-title">Итого ограждающие конструкции</h3>
            <div className="summary-hero">
              <div className="summary-metric-card summary-metric-card--accent">
                <span>{`${activeClass.label}: стоимость`}</span>
                <strong>{`${formatRub(activeClass.totals.classRub)} руб.`}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Вес панелей, кг</span>
                <strong>{formatNumber(activeClass.totals.panelMassKg, 2)}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Панели, руб.</span>
                <strong>{formatRub(activeClass.totals.panelsRub)}</strong>
              </div>
              <div className="summary-metric-card">
                <span>Комплектующие + крепеж, руб.</span>
                <strong>{formatRub(activeClass.totals.accessoriesRub + activeClass.totals.fastenersRub)}</strong>
              </div>
            </div>
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
}: ResultsPanelProps) {
  const activeErrors =
    activeTab === 'summary' || activeTab === 'enclosing' || activeTab === 'methodology'
      ? [
          { scope: 'РџСЂРѕРіРѕРЅС‹', message: purlinError },
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
      ) : activeTab === 'enclosing' ? (
        renderEnclosingOverview(input, enclosingClassKey, setEnclosingClassKey)
      ) : activeTab === 'methodology' ? (
        <MethodologyPanel input={input} purlinResult={purlinResult} columnResult={columnResult} />
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
            </div>
          </div>

          <div className="results-section-row">
            <div className="results-section">
              <h3 className="results-section-title">Р РµР¶РёРј РїРѕРґР±РѕСЂР° РєРѕР»РѕРЅРЅ</h3>
              <div className="mode-toggle">
                <button
                  className="mode-button active"
                  disabled
                >
                  РРЅР¶РµРЅРµСЂРЅС‹Р№ (H_max)
                </button>
              </div>
              <p className="results-inline-note">РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РјР°РєСЃРёРјР°Р»СЊРЅР°СЏ СЂР°СЃС‡РµС‚РЅР°СЏ РґР»РёРЅР° РІ РіСЂСѓРїРїРµ.</p>
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

