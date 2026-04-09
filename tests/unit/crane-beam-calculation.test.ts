import { describe, expect, it } from 'vitest'
import { calculateCraneBeam } from '../../src/domain/crane-beam/model/calculate-crane-beam'
import { defaultCraneBeamInput } from '../../src/domain/crane-beam/model/crane-beam-input'

describe('crane beam calculation', () => {
  it('matches the workbook default case on the first lookup and summary outputs', () => {
    const result = calculateCraneBeam(defaultCraneBeamInput)

    expect(result.lookup.wheelLoadKn).toBeCloseTo(60, 10)
    expect(result.lookup.trolleyMassT).toBeCloseTo(2, 10)
    expect(result.lookup.craneBaseMm).toBeCloseTo(3700, 10)
    expect(result.lookup.craneGaugeMm).toBeCloseTo(4700, 10)
    expect(result.lookup.railFootWidthM).toBeCloseTo(0.132, 10)
    expect(result.lookup.railHeightM).toBeCloseTo(0.152, 10)

    expect(result.derived.tbnKn).toBeCloseTo(6, 10)
    expect(result.derived.qbnKn).toBeCloseTo(2, 10)
    expect(result.derived.gammaLocal).toBeCloseTo(1.2, 10)
    expect(result.derived.fatigueNvyn).toBeCloseTo(0.4, 10)
    expect(result.derived.alpha).toBeCloseTo(1.1, 10)
    expect(result.derived.caseForTwoCranes).toBe(3)

    expect(result.loads.designMxGeneralKnM).toBeCloseTo(137.376, 10)
    expect(result.loads.designMyGeneralKnM).toBeCloseTo(3.6, 10)
    expect(result.loads.designQGeneralKn).toBeCloseTo(1.2, 10)
    expect(result.loads.designMtLocalKnM).toBeCloseTo(2.55456, 10)
    expect(result.loads.designQAdditionalKn).toBeCloseTo(119.52, 10)

    expect(result.selection.profile).toBe('\u0033\u0035\u0428\u0031')
    expect(result.selection.weightKg).toBeCloseTo(391.80071, 10)
    expect(result.selection.stiffenerStepM).toBeCloseTo(6, 10)
    expect(result.selection.utilization).toBeCloseTo(0.5464725962825525, 12)
    expect(result.selection.maxUtilizationPercent).toBeCloseTo(85, 10)
  })
})
