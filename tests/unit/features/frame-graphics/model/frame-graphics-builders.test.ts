import { describe, expect, it } from 'vitest'
import { buildFrameAxonometricGraphicsModel } from '@/features/frame-graphics/model/build-frame-axonometric-graphics-model'
import { buildFramePlanGraphicsModel } from '@/features/frame-graphics/model/build-frame-plan-graphics-model'
import { buildFrameSectionGraphicsModel } from '@/features/frame-graphics/model/build-frame-section-graphics-model'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'
import { PRESENCE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/pages/calculator/model/unified-input-options'

function maxY(model: ReturnType<typeof buildFrameSectionGraphicsModel>): number {
  return Math.max(...model.polylines.flatMap((polyline) => polyline.points.map((point) => point.y)))
}

describe('frame section graphics builder', () => {
  it('changes section vertical geometry when clearHeightToBottomChordM changes', () => {
    const lower = buildFrameSectionGraphicsModel({
      ...defaultUnifiedInput,
      clearHeightToBottomChordM: 7,
      manualTrussEaveDepthM: 1.2,
    })
    const higher = buildFrameSectionGraphicsModel({
      ...defaultUnifiedInput,
      clearHeightToBottomChordM: 9,
      manualTrussEaveDepthM: 1.2,
    })

    expect(higher.summary.eaveSupportHeightM).toBeGreaterThan(lower.summary.eaveSupportHeightM)
    expect(maxY(higher)).toBeLessThan(maxY(lower))
  })

  it('changes eave support and roof contour when manualTrussEaveDepthM changes', () => {
    const auto = buildFrameSectionGraphicsModel({
      ...defaultUnifiedInput,
      roofType: ROOF_TYPE_OPTIONS[0],
      spanM: 24,
      manualTrussEaveDepthM: null,
    })
    const manual = buildFrameSectionGraphicsModel({
      ...defaultUnifiedInput,
      roofType: ROOF_TYPE_OPTIONS[0],
      spanM: 24,
      manualTrussEaveDepthM: 1.4,
    })

    expect(manual.summary.eaveSupportHeightM).toBeGreaterThan(auto.summary.eaveSupportHeightM)
    expect(maxY(manual)).toBeLessThan(maxY(auto))
  })

  it('builds centered ridge for gable roof', () => {
    const model = buildFrameSectionGraphicsModel({
      ...defaultUnifiedInput,
      roofType: ROOF_TYPE_OPTIONS[0],
      spanM: 24,
    })

    const trussTop = model.polylines.find((polyline) => polyline.className === 'truss-top')
    expect(trussTop?.points.length).toBe(3)
    const ridgeX = trussTop?.points[1]?.x ?? 0
    const leftX = trussTop?.points[0]?.x ?? 0
    const rightX = trussTop?.points[2]?.x ?? 0
    expect(ridgeX).toBeCloseTo((leftX + rightX) / 2, 3)
  })
})

describe('frame plan graphics builder', () => {
  it('resolves 8 frames for length 42 and step 6', () => {
    const model = buildFramePlanGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 42,
      frameStepM: 6,
    })

    expect(model.summary.framesCount).toBe(8)
  })

  it('changes fachwerk primitive count when step changes', () => {
    const dense = buildFramePlanGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 42,
      fakhverkStepM: 6,
    })
    const sparse = buildFramePlanGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 42,
      fakhverkStepM: 10,
    })

    const denseCount = dense.lines.filter((line) => line.className === 'fachwerk').length
    const sparseCount = sparse.lines.filter((line) => line.className === 'fachwerk').length
    expect(denseCount).toBeGreaterThan(sparseCount)
  })

  it('renders bracing only when ties are enabled', () => {
    const disabled = buildFramePlanGraphicsModel({
      ...defaultUnifiedInput,
      perimeterBracing: PRESENCE_OPTIONS[0],
      tiesSetting: PRESENCE_OPTIONS[0],
    })
    const enabled = buildFramePlanGraphicsModel({
      ...defaultUnifiedInput,
      perimeterBracing: PRESENCE_OPTIONS[1],
      tiesSetting: PRESENCE_OPTIONS[0],
    })

    expect(disabled.lines.some((line) => line.className === 'bracing')).toBe(false)
    expect(enabled.lines.some((line) => line.className === 'bracing')).toBe(true)
  })
})

describe('frame axonometric graphics builder', () => {
  it('rebuilds from length and height changes', () => {
    const base = buildFrameAxonometricGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 24,
      clearHeightToBottomChordM: 7,
      manualTrussEaveDepthM: 1.2,
    })
    const changed = buildFrameAxonometricGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 42,
      clearHeightToBottomChordM: 9,
      manualTrussEaveDepthM: 1.4,
    })

    expect(changed.summary.lengthM).toBeGreaterThan(base.summary.lengthM)
    expect(changed.summary.maxBuildingHeightM).toBeGreaterThan(base.summary.maxBuildingHeightM)
    expect(changed.lines.length).not.toBe(base.lines.length)
  })
})
