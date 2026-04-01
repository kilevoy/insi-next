import { describe, expect, it } from 'vitest'
import { buildFrameGraphicsModel } from '@/features/frame-graphics/model/build-frame-graphics-model'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'
import { PRESENCE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/pages/calculator/model/unified-input-options'

describe('buildFrameGraphicsModel', () => {
  it('builds core frame primitives for the default input', () => {
    const model = buildFrameGraphicsModel(defaultUnifiedInput)

    expect(model.width).toBeGreaterThan(0)
    expect(model.height).toBeGreaterThan(0)
    expect(model.lines.some((line) => line.className === 'column')).toBe(true)
    expect(model.polylines.some((polyline) => polyline.className === 'truss-top')).toBe(true)
    expect(model.lines.some((line) => line.className === 'purlin')).toBe(true)
    expect(model.lines.some((line) => line.className === 'axis')).toBe(true)
    expect(model.texts.some((text) => text.className === 'dimension-text')).toBe(true)
  })

  it('shows bracing primitives only when perimeter bracing is enabled', () => {
    const disabledModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      perimeterBracing: PRESENCE_OPTIONS[0],
      tiesSetting: PRESENCE_OPTIONS[0],
    })
    const enabledModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      perimeterBracing: PRESENCE_OPTIONS[1],
    })

    expect(disabledModel.lines.some((line) => line.className === 'bracing')).toBe(false)
    expect(enabledModel.lines.some((line) => line.className === 'bracing')).toBe(true)
  })

  it('changes frame axis count when building length changes', () => {
    const shortModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 24,
      frameStepM: 6,
    })
    const longModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      buildingLengthM: 42,
      frameStepM: 6,
    })

    const shortAxisLabels = shortModel.texts.filter((text) => text.className === 'axis-text').length
    const longAxisLabels = longModel.texts.filter((text) => text.className === 'axis-text').length

    expect(longAxisLabels).toBeGreaterThan(shortAxisLabels)
  })

  it('builds different truss contour for gable and monopitch roof', () => {
    const gableModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      roofType: ROOF_TYPE_OPTIONS[0],
    })
    const monoModel = buildFrameGraphicsModel({
      ...defaultUnifiedInput,
      roofType: ROOF_TYPE_OPTIONS[1],
    })

    const gableFirstTop = gableModel.polylines.find((polyline) => polyline.className === 'truss-top')
    const monoFirstTop = monoModel.polylines.find((polyline) => polyline.className === 'truss-top')

    expect(gableFirstTop?.points.length).toBe(3)
    expect(monoFirstTop?.points.length).toBe(2)
  })
})

