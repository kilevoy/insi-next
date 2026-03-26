import { calculateEnclosing } from '@/domain/enclosing/model/calculate-enclosing'
import { mapUnifiedInputToEnclosingInput } from '@/domain/enclosing/model/enclosing-mapper'

describe('enclosing calculation', () => {
  it('calculates geometry and panel totals for both classes', () => {
    const result = calculateEnclosing({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      roofSlopeDeg: 6,
      wallPanelThicknessMm: 100,
      roofPanelThicknessMm: 150,
      openingsAreaM2: 189,
    })

    expect(result.geometry.wallAreaGrossM2).toBeCloseTo(1710.27, 2)
    expect(result.geometry.wallAreaNetM2).toBeCloseTo(1521.27, 2)
    expect(result.geometry.roofAreaM2).toBeCloseTo(1447.93, 2)

    expect(result.scenarios).toHaveLength(2)
    expect(result.scenarios[0]?.wall.unitPriceRubPerM2).toBe(3905)
    expect(result.scenarios[0]?.roof.unitPriceRubPerM2).toBe(4705)
    expect(result.scenarios[0]?.panelsTotalRub).toBe(12753079)

    expect(result.scenarios[1]?.wall.unitPriceRubPerM2).toBe(3425)
    expect(result.scenarios[1]?.roof.unitPriceRubPerM2).toBe(4080)
    expect(result.scenarios[1]?.panelsTotalRub).toBe(11117912)

    expect(result.fasteners.metal.wallZLock.lengthMm).toBe(140)
    expect(result.fasteners.metal.roofK.lengthMm).toBe(240)
    expect(result.fasteners.concrete.wallZLock.diameterAndLength).toBe('6.3x155')
    expect(result.fasteners.concrete.roofK.diameterAndLength).toBe('6.3x255')
  })

  it('maps unified input to enclosing input and resolves openings area', () => {
    const mapped = mapUnifiedInputToEnclosingInput({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      roofSlopeDeg: 6,
      wallCoveringType: 'С-П 120 мм',
      roofCoveringType: 'С-П 170 мм',
      doubleDoorAreaM2: 12,
      singleDoorCount: 4,
      entranceBlockAreaM2: 8,
      tambourDoorAreaM2: 6,
      windowsAreaM2: 120,
      gatesAreaM2: 35,
    })

    expect(mapped.wallPanelThicknessMm).toBe(120)
    expect(mapped.roofPanelThicknessMm).toBe(170)
    expect(mapped.openingsAreaM2).toBe(189)
  })

  it('falls back to nearest available class-2 roof thickness when exact value is not priced', () => {
    const result = calculateEnclosing({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      roofSlopeDeg: 6,
      wallPanelThicknessMm: 100,
      roofPanelThicknessMm: 60,
      openingsAreaM2: 0,
    })

    const class2 = result.scenarios.find((scenario) => scenario.key === 'class-2-tu')
    expect(class2?.roof.resolvedThicknessMm).toBe(80)
    expect(class2?.notes.some((note) => note.includes('80'))).toBe(true)
  })
})
