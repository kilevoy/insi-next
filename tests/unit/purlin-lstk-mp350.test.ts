import { calculatePurlin } from '@/domain/purlin/model/calculate-purlin'
import { buildPurlinDerivedContext } from '@/domain/purlin/model/purlin-derived-context'
import { defaultPurlinInput } from '@/domain/purlin/model/purlin-input'
import {
  calculateMp3502TpsTopCandidate,
  calculateMp350FamilyCandidates,
} from '@/domain/purlin/model/purlin-lstk-mp350'

describe('purlin MP350 2TPS selection', () => {
  it('matches the default workbook recommendation', () => {
    const derivedContext = buildPurlinDerivedContext(defaultPurlinInput)
    const candidate = calculateMp3502TpsTopCandidate(defaultPurlinInput, derivedContext)

    expect(candidate).not.toBeNull()
    expect(candidate?.profile).toBe('2ТПС 245х65х2')
    expect(candidate?.stepMm).toBe(2085)
    expect(candidate?.unitMassKg).toBeCloseTo(11.4286, 10)
    expect(candidate?.totalMassKg).toBeCloseTo(8914.308, 10)
    expect(candidate?.utilization).toBeCloseTo(0.9986161654, 10)
  })

  it('surfaces the transferred candidate through the aggregate purlin calculation', () => {
    const result = calculatePurlin(defaultPurlinInput)

    expect(result.lstkMp350Top).toHaveLength(3)
    expect(result.lstkMp350Top[0]?.family).toBe('MP350 / 2TPS')
    expect(result.lstkMp350Top[0]?.profile).toBe('2ТПС 245х65х2')
    expect(result.lstkMp350Top[0]?.stepMm).toBe(2085)
  })

  it('honors a manual max-step clamp from the input model', () => {
    const scenario = {
      ...defaultPurlinInput,
      manualMaxStepMm: 1800,
    }
    const derivedContext = buildPurlinDerivedContext(scenario)
    const candidate = calculateMp3502TpsTopCandidate(scenario, derivedContext)

    expect(candidate).not.toBeNull()
    expect(candidate?.stepMm).toBeLessThanOrEqual(1800)
  })

  it('matches the default workbook recommendations for all MP350 families', () => {
    const derivedContext = buildPurlinDerivedContext(defaultPurlinInput)
    const candidates = calculateMp350FamilyCandidates(defaultPurlinInput, derivedContext)

    expect(candidates).toHaveLength(3)
    expect(candidates[0]).toMatchObject({
      family: 'MP350 / 2TPS',
      profile: '2ТПС 245х65х2',
      stepMm: 2085,
    })
    expect(candidates[0]?.totalMassKg).toBeCloseTo(8914.308, 10)

    expect(candidates[1]).toMatchObject({
      family: 'MP350 / 2PS',
      profile: '2ПС 245х65х2',
      stepMm: 2370,
    })
    expect(candidates[1]?.unitMassKg).toBeCloseTo(12.18, 10)
    expect(candidates[1]?.totalMassKg).toBeCloseTo(8038.8, 10)

    expect(candidates[2]).toMatchObject({
      family: 'MP350 / Z',
      profile: 'Z 350х2',
      stepMm: 2300,
    })
    expect(candidates[2]?.unitMassKg).toBeCloseTo(8.9, 10)
    expect(candidates[2]?.totalMassKg).toBeCloseTo(6614.4, 10)
  })

  it('treats whitespace-padded no-value toggles as semantic no-value for MP350 objectives', () => {
    const baseContext = buildPurlinDerivedContext(defaultPurlinInput)
    const baselineCandidates = calculateMp350FamilyCandidates(defaultPurlinInput, baseContext)

    const scenario = {
      ...defaultPurlinInput,
      snowRetentionPurlin: `  ${defaultPurlinInput.snowRetentionPurlin}  `,
      barrierPurlin: `  ${defaultPurlinInput.barrierPurlin}  `,
    }
    const derivedContext = buildPurlinDerivedContext(scenario)
    const candidates = calculateMp350FamilyCandidates(scenario, derivedContext)

    expect(candidates).toHaveLength(baselineCandidates.length)
    expect(candidates[0]?.stepMm).toBe(baselineCandidates[0]?.stepMm)
    expect(candidates[0]?.totalMassKg).toBeCloseTo(baselineCandidates[0]?.totalMassKg ?? 0, 10)
    expect(candidates[1]?.stepMm).toBe(baselineCandidates[1]?.stepMm)
    expect(candidates[2]?.stepMm).toBe(baselineCandidates[2]?.stepMm)
  })

  it('treats поперек and поперёк snow bag labels as equivalent for MP350', () => {
    const baseScenario = {
      ...defaultPurlinInput,
      spanM: 18,
      frameStepM: 5,
      fakhverkSpacingM: 5,
      snowBagMode: 'поперек здания',
      heightDifferenceM: 2,
      adjacentBuildingSizeM: 4,
    }
    const variantScenario = {
      ...baseScenario,
      snowBagMode: 'поперёк здания',
    }

    const baseContext = buildPurlinDerivedContext(baseScenario)
    const variantContext = buildPurlinDerivedContext(variantScenario)
    const baseCandidates = calculateMp350FamilyCandidates(baseScenario, baseContext)
    const variantCandidates = calculateMp350FamilyCandidates(variantScenario, variantContext)

    expect(baseCandidates.length).toBeGreaterThan(0)
    expect(variantCandidates).toHaveLength(baseCandidates.length)
    expect(variantCandidates[0]?.profile).toBe(baseCandidates[0]?.profile)
    expect(variantCandidates[0]?.stepMm).toBe(baseCandidates[0]?.stepMm)
    expect(variantCandidates[0]?.totalMassKg).toBeCloseTo(baseCandidates[0]?.totalMassKg ?? 0, 10)
  })
})
