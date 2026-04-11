import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateCraneBeam } from '../../src/domain/crane-beam/model/calculate-crane-beam'
import { defaultCraneBeamInput, type CraneBeamLoadCapacity } from '../../src/domain/crane-beam/model/crane-beam-input'

type ExpandedParityReportRow = {
  scenario: {
    loadCapacityT: CraneBeamLoadCapacity
    craneSpanM: number
    suspensionType: string
    dutyGroup: string
    craneCountInSpan: string
    craneRail: string
    beamSpanM: number
    brakeStructure: string
  }
  excel: {
    profile: string
    weightKg: number
    utilization: number
    maxUtilizationPercent: number
    mx: number
    my: number
    q: number
    qop: number
    lookup: {
      wheelLoadKn: number
      trolleyMassT: number
      craneBaseMm: number
      craneGaugeMm: number
      railFootWidthM: number
      railHeightM: number
    }
    derived: {
      tbnKn: number
      qbnKn: number
      gammaLocal: number
      fatigueNvyn: number
      alpha: number
      caseForTwoCranes: number
    }
  }
}

type ExpandedParityPayload = {
  report: ExpandedParityReportRow[]
}

const expandedParityPath = resolve(process.cwd(), 'docs', 'crane_beam_expanded_scenarios_comparison.json')
const expandedParityPayload = JSON.parse(
  readFileSync(expandedParityPath, 'utf8'),
) as ExpandedParityPayload

describe('crane beam expanded workbook reference', () => {
  it('matches the checked-in workbook snapshot for the expanded scenario matrix', () => {
    for (const row of expandedParityPayload.report) {
      const result = calculateCraneBeam({
        ...defaultCraneBeamInput,
        ...row.scenario,
      })

      expect(result.selection.profile).toBe(row.excel.profile)
      expect(result.selection.weightKg).toBeCloseTo(row.excel.weightKg, 10)
      expect(result.selection.utilization).toBeCloseTo(row.excel.utilization, 10)
      expect(result.selection.maxUtilizationPercent).toBeCloseTo(row.excel.maxUtilizationPercent, 10)

      expect(result.loads.designMxGeneralKnM).toBeCloseTo(row.excel.mx, 10)
      expect(result.loads.designMyGeneralKnM).toBeCloseTo(row.excel.my, 10)
      expect(result.loads.designQGeneralKn).toBeCloseTo(row.excel.q, 10)
      expect(result.loads.designQAdditionalKn).toBeCloseTo(row.excel.qop, 10)

      expect(result.lookup.wheelLoadKn).toBeCloseTo(row.excel.lookup.wheelLoadKn, 10)
      expect(result.lookup.trolleyMassT).toBeCloseTo(row.excel.lookup.trolleyMassT, 10)
      expect(result.lookup.craneBaseMm).toBeCloseTo(row.excel.lookup.craneBaseMm, 10)
      expect(result.lookup.craneGaugeMm).toBeCloseTo(row.excel.lookup.craneGaugeMm, 10)
      expect(result.lookup.railFootWidthM).toBeCloseTo(row.excel.lookup.railFootWidthM, 10)
      expect(result.lookup.railHeightM).toBeCloseTo(row.excel.lookup.railHeightM, 10)

      expect(result.derived.tbnKn).toBeCloseTo(row.excel.derived.tbnKn, 10)
      expect(result.derived.qbnKn).toBeCloseTo(row.excel.derived.qbnKn, 10)
      expect(result.derived.gammaLocal).toBeCloseTo(row.excel.derived.gammaLocal, 10)
      expect(result.derived.fatigueNvyn).toBeCloseTo(row.excel.derived.fatigueNvyn, 10)
      expect(result.derived.alpha).toBeCloseTo(row.excel.derived.alpha, 10)
      expect(result.derived.caseForTwoCranes).toBe(row.excel.derived.caseForTwoCranes)
    }
  })
})
