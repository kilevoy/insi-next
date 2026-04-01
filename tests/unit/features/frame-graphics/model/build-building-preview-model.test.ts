import { describe, expect, it } from 'vitest'
import {
  buildBuildingPreviewModel,
  type PreviewOpening,
} from '@/features/frame-graphics/model/build-building-preview-model'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'

function spanOfPolygon(model: ReturnType<typeof buildBuildingPreviewModel>, className: string): number {
  const polygon = model.polygons.find((item) => item.className === className)
  if (!polygon) {
    throw new Error(`Polygon ${className} not found`)
  }
  const xs = polygon.points.map((point) => point.x)
  return Math.max(...xs) - Math.min(...xs)
}

function heightOfPolygon(model: ReturnType<typeof buildBuildingPreviewModel>, className: string): number {
  const polygon = model.polygons.find((item) => item.className === className)
  if (!polygon) {
    throw new Error(`Polygon ${className} not found`)
  }
  const ys = polygon.points.map((point) => point.y)
  return Math.max(...ys) - Math.min(...ys)
}

describe('buildBuildingPreviewModel', () => {
  it('changes body length when buildingLengthM changes', () => {
    const shortModel = buildBuildingPreviewModel({ ...defaultUnifiedInput, buildingLengthM: 24 })
    const longModel = buildBuildingPreviewModel({ ...defaultUnifiedInput, buildingLengthM: 42 })

    const shortFront = spanOfPolygon(shortModel, 'preview-wall-front')
    const longFront = spanOfPolygon(longModel, 'preview-wall-front')
    expect(longFront).toBeGreaterThan(shortFront)
  })

  it('changes side width when spanM changes', () => {
    const narrow = buildBuildingPreviewModel({ ...defaultUnifiedInput, spanM: 18 })
    const wide = buildBuildingPreviewModel({ ...defaultUnifiedInput, spanM: 30 })

    const narrowSide = spanOfPolygon(narrow, 'preview-wall-side')
    const wideSide = spanOfPolygon(wide, 'preview-wall-side')
    expect(wideSide).toBeGreaterThan(narrowSide)
  })

  it('changes wall height when clearHeightToBottomChordM changes', () => {
    const lower = buildBuildingPreviewModel({
      ...defaultUnifiedInput,
      clearHeightToBottomChordM: 7,
      manualTrussEaveDepthM: 1.2,
    })
    const higher = buildBuildingPreviewModel({
      ...defaultUnifiedInput,
      clearHeightToBottomChordM: 9,
      manualTrussEaveDepthM: 1.2,
    })

    const lowerWall = heightOfPolygon(lower, 'preview-wall-front')
    const higherWall = heightOfPolygon(higher, 'preview-wall-front')
    expect(higherWall).toBeGreaterThan(lowerWall)
  })

  it('changes roof geometry when roof slope changes', () => {
    const lowSlope = buildBuildingPreviewModel({ ...defaultUnifiedInput, roofSlopeDeg: 4 })
    const highSlope = buildBuildingPreviewModel({ ...defaultUnifiedInput, roofSlopeDeg: 12 })

    const lowRoof = lowSlope.polygons.find((item) => item.className === 'preview-roof-left')
    const highRoof = highSlope.polygons.find((item) => item.className === 'preview-roof-left')
    expect(highSlope.summary.maxBuildingHeightM).toBeGreaterThan(lowSlope.summary.maxBuildingHeightM)
    expect(JSON.stringify(highRoof?.points)).not.toBe(JSON.stringify(lowRoof?.points))
  })

  it('reflects provided openings and does not stay static', () => {
    const customOpenings: PreviewOpening[] = [
      { wall: 'front', kind: 'gate', centerM: 8, widthM: 4, heightM: 4.2, bottomM: 0 },
      { wall: 'front', kind: 'window', centerM: 17, widthM: 2.2, heightM: 1.4, bottomM: 2.3 },
      { wall: 'side', kind: 'window', centerM: 8, widthM: 2.0, heightM: 1.2, bottomM: 2.1 },
    ]

    const model = buildBuildingPreviewModel(defaultUnifiedInput, { openings: customOpenings })
    const gateCount = model.polygons.filter((item) => item.className === 'preview-gate').length
    const windowCount = model.polygons.filter((item) => item.className === 'preview-window').length

    expect(gateCount).toBe(1)
    expect(windowCount).toBe(2)
  })

  it('returns filled building planes, not only line geometry', () => {
    const model = buildBuildingPreviewModel(defaultUnifiedInput)
    const wallPlanes = model.polygons.filter((item) =>
      ['preview-wall-front', 'preview-wall-side'].includes(item.className ?? ''),
    ).length
    const roofPlanes = model.polygons.filter((item) =>
      ['preview-roof-left', 'preview-roof-right'].includes(item.className ?? ''),
    ).length

    expect(model.polygons.length).toBeGreaterThan(0)
    expect(wallPlanes).toBeGreaterThanOrEqual(2)
    expect(roofPlanes).toBeGreaterThanOrEqual(1)
  })
})
