import { purlinCityLoads } from '../../src/domain/purlin/model/purlin-reference.generated'
import { calculateWindowRigel } from '../../src/domain/window-rigel/model/calculate-window-rigel'
import { defaultWindowRigelInput } from '../../src/domain/window-rigel/model/window-rigel-input'
import {
  buildWindowRigelDerivedValues,
  evaluateWindowRigelCandidate,
} from '../../src/domain/window-rigel/model/window-rigel-engine'

describe('window rigel calculation', () => {
  it('matches the workbook default top selections for bottom and top rigels', () => {
    const result = calculateWindowRigel(defaultWindowRigelInput)

    expect(result.loads.windLoadKpa).toBeCloseTo(0.38, 10)
    expect(result.loads.verticalLoadKpa).toBeCloseTo(0.42, 10)
    expect(result.loads.horizontalLoadCase1Kpa).toBeCloseTo(0.8761163808768, 10)
    expect(result.loads.horizontalLoadCase2Kpa).toBeCloseTo(0.5214978457600001, 10)

    expect(result.lengths.outOfPlaneM).toBeCloseTo(6, 10)
    expect(result.lengths.inPlaneM).toBeCloseTo(6, 10)

    expect(result.bottomCandidates).toHaveLength(10)
    expect(result.topCandidates).toHaveLength(10)

    expect(result.bottomCandidates[0].profile).toBe('кв.120х3')
    expect(result.bottomCandidates[0].steelGrade).toBe('С245')
    expect(result.bottomCandidates[0].massKg).toBeCloseTo(66.0016, 10)
    expect(result.bottomCandidates[0].utilization.flexibility).toBeCloseTo(0.6302521008403361, 10)
    expect(result.bottomCandidates[0].utilization.strength).toBeCloseTo(0.5677600067730285, 10)
    expect(result.bottomCandidates[0].utilization.deflection).toBeCloseTo(0.8351440452984876, 10)

    expect(result.topCandidates[0].profile).toBe('кв.100х3')
    expect(result.topCandidates[0].steelGrade).toBe('С245')
    expect(result.topCandidates[0].massKg).toBeCloseTo(54.601099999999995, 10)
    expect(result.topCandidates[0].utilization.flexibility).toBeCloseTo(0.7614213197969544, 10)
    expect(result.topCandidates[0].utilization.strength).toBeCloseTo(0.8180875098773334, 10)
    expect(result.topCandidates[0].utilization.deflection).toBeCloseTo(0.8692520502138943, 10)
  })

  it('reuses the project city load source for wind pressure lookup', () => {
    const cityRecord = purlinCityLoads.find((item) => item.city === 'Новый Уренгой')

    expect(cityRecord).toBeDefined()
    expect(cityRecord?.windLoadKpa).toBeCloseTo(0.38, 10)

    const result = calculateWindowRigel(defaultWindowRigelInput)
    expect(result.loads.windLoadKpa).toBeCloseTo(cityRecord!.windLoadKpa, 10)
  })

  it('returns no passing candidates when max utilization is unrealistically strict', () => {
    const result = calculateWindowRigel({
      ...defaultWindowRigelInput,
      maxUtilization: 0.01,
    })

    expect(result.bottomCandidates).toEqual([])
    expect(result.topCandidates).toEqual([])
  })

  it('matches the workbook reference ordering for the Moscow type 3 case', () => {
    const referenceCity = purlinCityLoads.find((item) => item.city === 'Москва')?.city ?? purlinCityLoads.find((item) => item.windLoadKpa === 0.23)!.city
    const result = calculateWindowRigel({
      ...defaultWindowRigelInput,
      city: referenceCity,
      windowType: 3,
      buildingHeightM: 9,
      buildingSpanM: 18,
      buildingLengthM: 42,
    })

    expect(result.loads.windLoadKpa).toBeCloseTo(0.23, 10)
    expect(result.loads.verticalLoadKpa).toBeCloseTo(0.42, 10)
    expect(result.bottomCandidates.slice(0, 4).map((candidate) => `${candidate.profile}|${candidate.steelGrade}`)).toEqual([
      'пр.120х80х3 90°|С245',
      'пр.120х80х3 90°|С345',
      'кв.120х3|С245',
      'кв.120х3|С345',
    ])
  })

  it('matches the workbook screenshot ordering for the New Urengoy type 5 case in the primary workbook table', () => {
    const referenceCity = purlinCityLoads.find((item) => item.city === 'Новый Уренгой')?.city ?? purlinCityLoads.find((item) => item.windLoadKpa === 0.38)!.city
    const result = calculateWindowRigel({
      ...defaultWindowRigelInput,
      city: referenceCity,
      windowHeightM: 1,
      frameStepM: 6,
      windowType: 5,
      buildingHeightM: 20,
      buildingSpanM: 24,
      buildingLengthM: 60,
    })

    expect(result.workbookPrimaryCandidates.map((candidate) => `${candidate.profile}|${candidate.steelGrade}`)).toEqual([
      'кв.120х4|С245',
      'кв.120х4|С345',
      'пр.140х100х4 90°|С245',
      'пр.160х80х4 90°|С245',
      'пр.140х100х4 90°|С345',
      'пр.160х80х4 90°|С345',
      'кв.140х4|С245',
      'пр.160х120х4|С245',
      'кв.140х4|С345',
      'пр.160х120х4|С345',
    ])

    expect(result.workbookEffectiveTopCandidates.map((candidate) => `${candidate.profile}|${candidate.steelGrade}`)).toEqual([
      '\u043f\u0440.120\u044580\u04453 90\u00b0|\u0421245',
      '\u043f\u0440.120\u044580\u04453 90\u00b0|\u0421345',
      '\u043a\u0432.120\u04453|\u0421245',
      '\u043a\u0432.120\u04453|\u0421345',
      '\u043a\u0432.100\u04454|\u0421245',
      '\u043a\u0432.100\u04454|\u0421345',
      '\u043f\u0440.120\u044580\u04454 90\u00b0|\u0421245',
      '\u043f\u0440.120\u044580\u04454 90\u00b0|\u0421345',
      '\u043a\u0432.120\u04454|\u0421245',
      '\u043f\u0440.140\u0445100\u04454|\u0421245',
    ])
  })

  it('matches the workbook screenshot ordering for the Almetyevsk type 2 top table', () => {
    const referenceCity = purlinCityLoads.find((item) => item.city === 'Альметьевск')?.city ?? purlinCityLoads.find((item) => item.windLoadKpa === 0.3)!.city
    const result = calculateWindowRigel({
      ...defaultWindowRigelInput,
      city: referenceCity,
      windowHeightM: 1,
      frameStepM: 6,
      windowType: 2,
      buildingHeightM: 6,
      buildingSpanM: 18,
      buildingLengthM: 42,
    })

    expect(result.topCandidates.map((candidate) => `${candidate.profile}|${candidate.steelGrade}`)).toEqual([
      'кв.100х3|С245',
      'пр.120х80х3|С245',
      'кв.100х3|С345',
      'пр.120х80х3|С345',
      'пр.120х80х3 90°|С245',
      'пр.120х80х3 90°|С345',
      'кв.120х3|С245',
      'кв.120х3|С345',
      'кв.80х5|С245',
      'кв.80х5|С345',
    ])

    expect(result.workbookEffectiveTopCandidates.map((candidate) => `${candidate.profile}|${candidate.steelGrade}`)).toEqual([
      'кв.100х3|С245',
      'пр.120х80х3|С245',
      'кв.100х3|С345',
      'пр.120х80х3|С345',
      'пр.120х80х3 90°|С245',
      'пр.120х80х3 90°|С345',
      'кв.120х3|С245',
      'кв.120х3|С345',
      'кв.80х5|С245',
      'кв.80х5|С345',
    ])
  })

  it('keeps deterministic ordering when candidates differ only by ordinal tie-break', () => {
    const result = calculateWindowRigel(defaultWindowRigelInput)

    expect(result.bottomCandidates[0].profile).toBe(result.bottomCandidates[1].profile)
    expect(result.bottomCandidates[0].steelGrade).toBe('С245')
    expect(result.bottomCandidates[1].steelGrade).toBe('С345')
    expect(result.bottomCandidates[0].rankScore).toBeLessThan(result.bottomCandidates[1].rankScore)
  })

  it('rejects a candidate by flexibility when design lengths are too large', () => {
    const derived = buildWindowRigelDerivedValues({
      ...defaultWindowRigelInput,
      frameStepM: 18,
      windowType: 5,
    })

    const evaluated = evaluateWindowRigelCandidate(derived.reference.candidateCatalog[0], derived)
    expect(evaluated.passes).toBe(false)
    expect(evaluated.failures).toContain('flexibility')
  })

  it('rejects a candidate by strength when loads are too high', () => {
    const derived = buildWindowRigelDerivedValues({
      ...defaultWindowRigelInput,
      windowHeightM: 4,
      frameStepM: 12,
    })

    const evaluated = evaluateWindowRigelCandidate(derived.reference.candidateCatalog[0], derived)
    expect(evaluated.passes).toBe(false)
    expect(evaluated.failures).toContain('strength')
  })

  it('rejects a candidate by deflection when span-driven deformation is too high', () => {
    const derived = buildWindowRigelDerivedValues({
      ...defaultWindowRigelInput,
      frameStepM: 14,
      buildingLengthM: 120,
      buildingSpanM: 42,
      buildingHeightM: 20,
    })

    const evaluated = evaluateWindowRigelCandidate(derived.reference.candidateCatalog[0], derived)
    expect(evaluated.passes).toBe(false)
    expect(evaluated.failures).toContain('deflection')
  })
})
