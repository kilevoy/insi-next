import { calculateEnclosing } from '@/domain/enclosing/model/calculate-enclosing'
import { mapUnifiedInputToEnclosingInput } from '@/domain/enclosing/model/enclosing-mapper'

describe('enclosing calculation', () => {
  it('builds class-based wall and roof specifications with pieces, length, mass and price', () => {
    const result = calculateEnclosing({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      frameStepM: 6,
      roofSlopeDeg: 6,
      wallPanelThicknessMm: 100,
      roofPanelThicknessMm: 150,
      openingsAreaM2: 189,
    })

    expect(result.geometry.wallAreaGrossM2).toBeCloseTo(1710.27, 2)
    expect(result.geometry.wallAreaNetM2).toBeCloseTo(1521.27, 2)
    expect(result.geometry.roofAreaM2).toBeCloseTo(1447.93, 2)

    const class1 = result.classes['class-1-gost']
    expect(class1.walls.panelSpecification[0]?.mark).toBe('МП ТСП-Z')
    expect(class1.walls.panelSpecification[0]?.panelLengthM).toBeCloseTo(6, 2)
    expect(class1.walls.panelSpecification[0]?.panelsCount).toBe(254)
    expect(class1.walls.panelSpecification[0]?.workingWidthMm).toBe('1000')
    expect(class1.walls.panelSpecification[0]?.unitMassKgPerM2).toBeCloseTo(18.35, 2)
    expect(class1.walls.panelSpecification[0]?.unitPriceRubPerM2).toBe(3905)
    expect(class1.roof.panelSpecification[0]?.mark).toBe('МП ТСП-К')
    expect(class1.roof.panelSpecification[0]?.unitPriceRubPerM2).toBe(4705)

    expect(class1.totals.panelsRub).toBe(12753079)
    expect(class1.walls.fasteners[0]?.lengthMm).toBe(140)
    expect(class1.walls.fasteners[0]?.unitPriceRub).toBeCloseTo(51.9, 1)
    expect(class1.roof.fasteners[0]?.lengthMm).toBe(240)
    expect(class1.roof.fasteners[0]?.unitPriceRub).toBeCloseTo(145.7, 1)
    expect(class1.walls.fasteners[1]?.unitPriceRub).toBe(4)
    expect(class1.walls.accessories.length).toBeGreaterThan(0)
    expect(class1.roof.accessories.length).toBeGreaterThan(0)
  })

  it('keeps only metal fastener logic and does not expose concrete fasteners', () => {
    const result = calculateEnclosing({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      frameStepM: 6,
      roofSlopeDeg: 6,
      wallPanelThicknessMm: 100,
      roofPanelThicknessMm: 150,
      openingsAreaM2: 0,
    })

    const serialized = JSON.stringify(result)
    expect(serialized.includes('concrete')).toBe(false)
    expect(result.classes['class-1-gost'].walls.fasteners[0]?.item).toContain('стеновых панелей')
    expect(result.notes.some((note) => note.toLowerCase().includes('оценоч'))).toBe(false)
    expect(result.notes.some((note) => note.includes('12.4'))).toBe(true)
  })

  it('maps unified input to enclosing input and resolves openings area', () => {
    const mapped = mapUnifiedInputToEnclosingInput({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      frameStepM: 6,
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
    expect(mapped.frameStepM).toBe(6)
    expect(mapped.openingsAreaM2).toBe(189)
  })

  it('falls back to nearest available class-2 roof thickness when exact value is not priced', () => {
    const result = calculateEnclosing({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      frameStepM: 6,
      roofSlopeDeg: 6,
      wallPanelThicknessMm: 100,
      roofPanelThicknessMm: 60,
      openingsAreaM2: 0,
    })

    const class2RoofRow = result.classes['class-2-tu'].roof.panelSpecification[0]
    expect(class2RoofRow?.thicknessMm).toBe(80)
    expect(result.notes.some((note) => note.includes('80'))).toBe(true)
  })

  it('supports unified input versions without opening fields', () => {
    const mapped = mapUnifiedInputToEnclosingInput({
      roofType: 'двускатная',
      spanM: 24,
      buildingLengthM: 60,
      buildingHeightM: 10,
      roofSlopeDeg: 6,
      wallCoveringType: 'С-П 100 мм',
      roofCoveringType: 'С-П 150 мм',
    })

    expect(mapped.openingsAreaM2).toBe(0)
    expect(mapped.wallPanelThicknessMm).toBe(100)
    expect(mapped.roofPanelThicknessMm).toBe(150)
    expect(mapped.frameStepM).toBe(6)
  })
})
