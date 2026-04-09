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

  it('matches the workbook load distribution for the two-crane case', () => {
    const result = calculateCraneBeam({
      ...defaultCraneBeamInput,
      craneCountInSpan: '\u0434\u0432\u0430',
    })

    expect(result.loads.designMxGeneralKnM).toBeCloseTo(194.61599999999999, 10)
    expect(result.loads.designMyGeneralKnM).toBeCloseTo(5.1, 10)
    expect(result.loads.designQGeneralKn).toBeCloseTo(2.04, 10)
    expect(result.loads.designQAdditionalKn).toBeCloseTo(150.552, 10)
  })

  it('matches the workbook brake-enabled long-span one-crane case', () => {
    const result = calculateCraneBeam({
      ...defaultCraneBeamInput,
      beamSpanM: 12,
      brakeStructure: '\u0435\u0441\u0442\u044c',
    })

    expect(result.loads.designMxGeneralKnM).toBeCloseTo(380.0736, 10)
    expect(result.loads.designMyGeneralKnM).toBeCloseTo(9.96, 10)
    expect(result.loads.designQGeneralKn).toBeCloseTo(2.4, 10)
    expect(result.loads.designQAdditionalKn).toBeCloseTo(146.16, 10)
  })

  it('matches the workbook on ten baseline selection scenarios', () => {
    const scenarios = [
      {
        input: {},
        profile: '35\u04281',
        weightKg: 391.80071,
        utilization: 0.5464725962825525,
      },
      {
        input: { loadCapacityT: 5, craneSpanM: 12 },
        profile: '40\u04111',
        weightKg: 339.60025,
        utilization: 0.7433378901094819,
      },
      {
        input: { loadCapacityT: 5, craneSpanM: 30 },
        profile: '25\u041a1',
        weightKg: 375.60137,
        utilization: 0.8061917861860983,
      },
      {
        input: { loadCapacityT: 8, craneSpanM: 24 },
        profile: '35\u04281',
        weightKg: 391.80071,
        utilization: 0.7705498308205987,
      },
      {
        input: { loadCapacityT: 10, craneSpanM: 36 },
        profile: '35\u04282',
        weightKg: 478.20072,
        utilization: 0.820171462051368,
      },
      {
        input: { suspensionType: '\u0436\u0435\u0441\u0442\u043a\u0438\u0439' },
        profile: '35\u04281',
        weightKg: 391.80071,
        utilization: 0.5921948772890895,
      },
      {
        input: { dutyGroup: '7\u041a' },
        profile: '70\u04111',
        weightKg: 775.80046,
        utilization: 0.6714700232560525,
      },
      {
        input: { craneCountInSpan: '\u0434\u0432\u0430' },
        profile: '35\u04281',
        weightKg: 391.80071,
        utilization: 0.7741695114002829,
      },
      {
        input: { craneRail: '\u041a\u042070' },
        profile: '30\u041a2',
        weightKg: 564.00148,
        utilization: 0.4174952167833495,
      },
      {
        input: { beamSpanM: 12, brakeStructure: '\u0435\u0441\u0442\u044c' },
        profile: '60\u04112',
        weightKg: 1266.00043,
        utilization: 0.7922040456675139,
      },
    ] as const

    for (const scenario of scenarios) {
      const result = calculateCraneBeam({
        ...defaultCraneBeamInput,
        ...scenario.input,
      })

      expect(result.selection.profile).toBe(scenario.profile)
      expect(result.selection.weightKg).toBeCloseTo(scenario.weightKg, 10)
      expect(result.selection.utilization).toBeCloseTo(scenario.utilization, 10)
      expect(result.selection.maxUtilizationPercent).toBeCloseTo(85, 10)
    }
  })
})
