import { describe, expect, it } from 'vitest'
import { buildFrameGraphicsModel } from '@/features/frame-graphics/model/build-frame-graphics-model'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'
import { PRESENCE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/pages/calculator/model/unified-input-options'

function firstColumnTopY(model: ReturnType<typeof buildFrameGraphicsModel>): number {
  const firstColumn = model.lines.find((line) => line.className === 'column')
  if (!firstColumn) {
    throw new Error('No column line in graphics model')
  }

  return Math.min(firstColumn.from.y, firstColumn.to.y)
}

describe('buildFrameGraphicsModel', () => {
  it('for 24x42 with frame step 6 resolves 8 frames', () => {
    const model = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      spanM: 24,
      buildingLengthM: 42,
      frameStepM: 6,
    })

    expect(model.summary.framesCount).toBe(8)
  })

  it('for gable roof builds truss top contour with ridge point', () => {
    const model = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      roofType: ROOF_TYPE_OPTIONS[0],
    })

    const trussTop = model.polylines.find((polyline) => polyline.className === 'truss-top')
    expect(trussTop?.points.length).toBe(3)
  })

  it('changing clear height changes projected column top level', () => {
    const lowModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      clearHeightToBottomChordM: 7,
      manualTrussEaveDepthM: 1.2,
    })
    const highModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      clearHeightToBottomChordM: 9,
      manualTrussEaveDepthM: 1.2,
    })

    expect(highModel.summary.eaveSupportHeightM).toBeGreaterThan(lowModel.summary.eaveSupportHeightM)
    expect(highModel.summary.maxBuildingHeightM).toBeGreaterThan(lowModel.summary.maxBuildingHeightM)
    expect(firstColumnTopY(highModel)).toBeLessThan(firstColumnTopY(lowModel))
  })

  it('manual truss eave depth changes eave support geometry', () => {
    const autoModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      spanM: 24,
      roofType: ROOF_TYPE_OPTIONS[0],
      manualTrussEaveDepthM: null,
    })
    const manualModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      spanM: 24,
      roofType: ROOF_TYPE_OPTIONS[0],
      manualTrussEaveDepthM: 1.4,
    })

    expect(manualModel.summary.eaveTrussDepthM).toBe(1.4)
    expect(manualModel.summary.eaveSupportHeightM).toBeGreaterThan(autoModel.summary.eaveSupportHeightM)
    expect(firstColumnTopY(manualModel)).toBeLessThan(firstColumnTopY(autoModel))
  })

  it('does not render bracing when perimeter ties are disabled', () => {
    const model = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      perimeterBracing: PRESENCE_OPTIONS[0],
      tiesSetting: PRESENCE_OPTIONS[0],
    })

    expect(model.lines.some((line) => line.className === 'bracing')).toBe(false)
  })

  it('renders bracing when perimeter ties are enabled', () => {
    const model = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      perimeterBracing: PRESENCE_OPTIONS[1],
      tiesSetting: PRESENCE_OPTIONS[0],
    })

    expect(model.lines.some((line) => line.className === 'bracing')).toBe(true)
  })
})
