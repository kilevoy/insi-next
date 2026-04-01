import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import {
  isEnabledPresence,
  resolveFachwerkPositions,
  resolveFramePositions,
  resolveSummary,
} from './frame-graphics-common'
import type { FrameGraphicsModel } from './graphics-types'

const CANVAS_WIDTH = 980
const CANVAS_HEIGHT = 620
const PAD_X = 80
const PAD_Y = 80

export function buildFramePlanGraphicsModel(input: UnifiedInputState): FrameGraphicsModel {
  const { summary } = resolveSummary(input)
  const framePositions = resolveFramePositions(summary.lengthM, input.frameStepM)
  const fachwerkPositions = resolveFachwerkPositions(summary.lengthM, input.fakhverkStepM)
  const tiesEnabled = isEnabledPresence(input.perimeterBracing) || isEnabledPresence(input.tiesSetting)

  const scaleX = (CANVAS_WIDTH - PAD_X * 2) / summary.lengthM
  const scaleY = (CANVAS_HEIGHT - PAD_Y * 2) / summary.spanM
  const scale = Math.min(scaleX, scaleY)
  const mapX = (xM: number) => PAD_X + xM * scale
  const mapY = (yM: number) => CANVAS_HEIGHT - PAD_Y - yM * scale

  const model: FrameGraphicsModel = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    lines: [],
    polylines: [],
    rects: [],
    texts: [],
    summary,
  }

  model.rects.push({
    kind: 'rect',
    at: { x: mapX(0), y: mapY(summary.spanM) },
    width: summary.lengthM * scale,
    height: summary.spanM * scale,
    className: 'outline',
  })

  for (const frameX of framePositions) {
    model.lines.push({
      kind: 'line',
      from: { x: mapX(frameX), y: mapY(0) },
      to: { x: mapX(frameX), y: mapY(summary.spanM) },
      className: 'frame',
    })
  }

  for (const frameX of framePositions) {
    model.rects.push({
      kind: 'rect',
      at: { x: mapX(frameX) - 3, y: mapY(0) - 3 },
      width: 6,
      height: 6,
      className: 'column-node',
    })
    model.rects.push({
      kind: 'rect',
      at: { x: mapX(frameX) - 3, y: mapY(summary.spanM) - 3 },
      width: 6,
      height: 6,
      className: 'column-node',
    })
  }

  for (const xM of fachwerkPositions) {
    model.lines.push({
      kind: 'line',
      from: { x: mapX(xM), y: mapY(0) },
      to: { x: mapX(xM), y: mapY(0.7) },
      className: 'fachwerk',
    })
    model.lines.push({
      kind: 'line',
      from: { x: mapX(xM), y: mapY(summary.spanM - 0.7) },
      to: { x: mapX(xM), y: mapY(summary.spanM) },
      className: 'fachwerk',
    })
  }

  if (tiesEnabled && framePositions.length > 1) {
    const frontPanelX = framePositions[Math.min(1, framePositions.length - 1)]
    const backPanelX = framePositions[Math.max(framePositions.length - 2, 0)]

    model.lines.push({
      kind: 'line',
      from: { x: mapX(0), y: mapY(0) },
      to: { x: mapX(frontPanelX), y: mapY(summary.spanM) },
      className: 'bracing',
    })
    model.lines.push({
      kind: 'line',
      from: { x: mapX(frontPanelX), y: mapY(0) },
      to: { x: mapX(0), y: mapY(summary.spanM) },
      className: 'bracing',
    })

    model.lines.push({
      kind: 'line',
      from: { x: mapX(backPanelX), y: mapY(0) },
      to: { x: mapX(summary.lengthM), y: mapY(summary.spanM) },
      className: 'bracing',
    })
    model.lines.push({
      kind: 'line',
      from: { x: mapX(summary.lengthM), y: mapY(0) },
      to: { x: mapX(backPanelX), y: mapY(summary.spanM) },
      className: 'bracing',
    })
  }

  model.lines.push({
    kind: 'line',
    from: { x: mapX(0), y: mapY(-0.9) },
    to: { x: mapX(summary.lengthM), y: mapY(-0.9) },
    className: 'dimension',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(summary.lengthM / 2) - 44, y: mapY(-0.9) - 6 },
    text: `Длина ${summary.lengthM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.lines.push({
    kind: 'line',
    from: { x: mapX(summary.lengthM + 0.9), y: mapY(0) },
    to: { x: mapX(summary.lengthM + 0.9), y: mapY(summary.spanM) },
    className: 'dimension',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(summary.lengthM + 1.1), y: mapY(summary.spanM / 2) },
    text: `Пролет ${summary.spanM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.texts.push({
    kind: 'text',
    at: { x: mapX(0), y: mapY(summary.spanM) - 18 },
    text: `Рам: ${summary.framesCount}; шаг рам: ${input.frameStepM.toFixed(2)} м`,
    className: 'note-text',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapX(0), y: mapY(summary.spanM) - 34 },
    text: `Шаг фахверка: ${input.fakhverkStepM.toFixed(2)} м`,
    className: 'note-text',
  })

  return model
}
