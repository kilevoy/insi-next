import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import { isMonopitchRoof, PURLIN_STEP_FALLBACK_M, resolveSummary } from './frame-graphics-common'
import type { FrameGraphicsModel } from './graphics-types'

const CANVAS_WIDTH = 980
const CANVAS_HEIGHT = 620
const PAD_X = 80
const PAD_Y = 60

function roofTopZ(
  roofType: UnifiedInputState['roofType'],
  yM: number,
  spanM: number,
  eaveSupportHeightM: number,
  roofRiseM: number,
): number {
  if (isMonopitchRoof(roofType)) {
    return eaveSupportHeightM + (roofRiseM * yM) / Math.max(spanM, 1e-6)
  }

  const halfSpanM = spanM / 2
  const normalizedDistance = Math.abs(yM - halfSpanM) / Math.max(halfSpanM, 1e-6)
  return eaveSupportHeightM + roofRiseM * (1 - normalizedDistance)
}

function resolvePurlinYPositions(spanM: number, roofType: UnifiedInputState['roofType'], purlinStepM: number): number[] {
  const halfSpanM = spanM / 2
  const positions = new Set<number>()
  positions.add(0)
  positions.add(spanM)

  if (isMonopitchRoof(roofType)) {
    for (let y = purlinStepM; y < spanM - 1e-6; y += purlinStepM) {
      positions.add(y)
    }
    return Array.from(positions).sort((a, b) => a - b)
  }

  positions.add(halfSpanM)
  for (let y = purlinStepM; y < halfSpanM - 1e-6; y += purlinStepM) {
    positions.add(y)
    positions.add(spanM - y)
  }

  return Array.from(positions).sort((a, b) => a - b)
}

export function buildFrameSectionGraphicsModel(input: UnifiedInputState): FrameGraphicsModel {
  const { heights, summary } = resolveSummary(input)
  const spanM = summary.spanM
  const maxZ = Math.max(heights.maxBuildingHeightM, summary.clearHeightToBottomChordM, 1)
  const scaleX = (CANVAS_WIDTH - PAD_X * 2) / spanM
  const scaleY = (CANVAS_HEIGHT - PAD_Y * 2) / maxZ
  const scale = Math.min(scaleX, scaleY)

  const mapX = (yM: number) => PAD_X + yM * scale
  const mapY = (zM: number) => CANVAS_HEIGHT - PAD_Y - zM * scale
  const halfSpanM = spanM / 2
  const monoRoof = isMonopitchRoof(input.roofType)

  const purlinStepM = input.manualMaxStepMm > 0 ? input.manualMaxStepMm / 1000 : PURLIN_STEP_FALLBACK_M
  const purlinYPositions = resolvePurlinYPositions(spanM, input.roofType, purlinStepM)

  const model: FrameGraphicsModel = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    lines: [],
    polylines: [],
    polygons: [],
    rects: [],
    texts: [],
    summary,
  }

  model.lines.push({
    kind: 'line',
    from: { x: mapX(-0.8), y: mapY(0) },
    to: { x: mapX(spanM + 0.8), y: mapY(0) },
    className: 'floor',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(-0.6), y: mapY(0) - 6 },
    text: '0.000',
    className: 'axis-text',
  })

  model.lines.push({
    kind: 'line',
    from: { x: mapX(0), y: mapY(0) },
    to: { x: mapX(0), y: mapY(heights.eaveSupportHeightM) },
    className: 'column',
  })
  model.lines.push({
    kind: 'line',
    from: { x: mapX(spanM), y: mapY(0) },
    to: { x: mapX(spanM), y: mapY(heights.eaveSupportHeightM) },
    className: 'column',
  })

  model.lines.push({
    kind: 'line',
    from: { x: mapX(0), y: mapY(summary.clearHeightToBottomChordM) },
    to: { x: mapX(spanM), y: mapY(summary.clearHeightToBottomChordM) },
    className: 'truss-bottom',
  })
  model.lines.push({
    kind: 'line',
    from: { x: mapX(0), y: mapY(summary.clearHeightToBottomChordM) },
    to: { x: mapX(0), y: mapY(heights.eaveSupportHeightM) },
    className: 'truss-web',
  })
  model.lines.push({
    kind: 'line',
    from: { x: mapX(spanM), y: mapY(summary.clearHeightToBottomChordM) },
    to: { x: mapX(spanM), y: mapY(heights.eaveSupportHeightM) },
    className: 'truss-web',
  })

  if (monoRoof) {
    model.polylines.push({
      kind: 'polyline',
      points: [
        { x: mapX(0), y: mapY(heights.eaveSupportHeightM) },
        { x: mapX(spanM), y: mapY(heights.maxBuildingHeightM) },
      ],
      className: 'truss-top',
    })
  } else {
    model.polylines.push({
      kind: 'polyline',
      points: [
        { x: mapX(0), y: mapY(heights.eaveSupportHeightM) },
        { x: mapX(halfSpanM), y: mapY(heights.maxBuildingHeightM) },
        { x: mapX(spanM), y: mapY(heights.eaveSupportHeightM) },
      ],
      className: 'truss-top',
    })
  }

  for (const yM of purlinYPositions) {
    model.rects.push({
      kind: 'rect',
      at: {
        x: mapX(yM) - 3,
        y: mapY(roofTopZ(input.roofType, yM, spanM, heights.eaveSupportHeightM, heights.roofRiseM)) - 3,
      },
      width: 6,
      height: 6,
      className: 'purlin-node',
    })
  }

  model.lines.push({
    kind: 'line',
    from: { x: mapX(0), y: mapY(-0.9) },
    to: { x: mapX(spanM), y: mapY(-0.9) },
    className: 'dimension',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(spanM / 2) - 40, y: mapY(-0.9) - 6 },
    text: `Пролет ${summary.spanM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.lines.push({
    kind: 'line',
    from: { x: mapX(-0.7), y: mapY(0) },
    to: { x: mapX(-0.7), y: mapY(summary.clearHeightToBottomChordM) },
    className: 'dimension',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(-1.9), y: mapY(summary.clearHeightToBottomChordM / 2) },
    text: `До низа ${summary.clearHeightToBottomChordM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.lines.push({
    kind: 'line',
    from: { x: mapX(spanM + 0.7), y: mapY(summary.clearHeightToBottomChordM) },
    to: { x: mapX(spanM + 0.7), y: mapY(heights.eaveSupportHeightM) },
    className: 'dimension',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(spanM + 0.9), y: mapY(summary.clearHeightToBottomChordM + heights.eaveTrussDepthM / 2) },
    text: `Карниз ${summary.eaveTrussDepthM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.lines.push({
    kind: 'line',
    from: { x: mapX(spanM + 1.4), y: mapY(0) },
    to: { x: mapX(spanM + 1.4), y: mapY(summary.maxBuildingHeightM) },
    className: 'dimension',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(spanM + 1.6), y: mapY(summary.maxBuildingHeightM / 2) },
    text: `Конек ${summary.maxBuildingHeightM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.texts.push({
    kind: 'text',
    at: { x: mapX(halfSpanM) - 40, y: mapY(heights.maxBuildingHeightM) - 14 },
    text: `Уклон ${input.roofSlopeDeg.toFixed(1)}°`,
    className: 'dimension-text',
  })

  return model
}
