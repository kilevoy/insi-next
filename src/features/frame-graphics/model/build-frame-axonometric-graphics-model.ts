import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import {
  isEnabledPresence,
  isMonopitchRoof,
  PURLIN_STEP_FALLBACK_M,
  resolveFachwerkPositions,
  resolveFramePositions,
  resolveSummary,
} from './frame-graphics-common'
import type { FrameGraphicsModel, Point } from './graphics-types'

type Point3D = {
  x: number
  y: number
  z: number
}

const CANVAS_WIDTH = 1180
const CANVAS_HEIGHT = 720
const CANVAS_PADDING = 48

const AXONOMETRIC_COS = 0.866
const AXONOMETRIC_DEPTH_XY = 0.35

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

function collectPoints3D(
  segments: Array<{ from: Point3D; to: Point3D }>,
  polylines: Array<{ points: Point3D[] }>,
  labels: Array<{ at: Point3D }>,
): Point3D[] {
  return [
    ...segments.flatMap((segment) => [segment.from, segment.to]),
    ...polylines.flatMap((polyline) => polyline.points),
    ...labels.map((label) => label.at),
  ]
}

function projectBase(point: Point3D): Point {
  return {
    x: (point.x - point.y) * AXONOMETRIC_COS,
    y: point.z - (point.x + point.y) * AXONOMETRIC_DEPTH_XY,
  }
}

export function buildFrameAxonometricGraphicsModel(input: UnifiedInputState): FrameGraphicsModel {
  const { heights, summary } = resolveSummary(input)
  const spanM = summary.spanM
  const lengthM = summary.lengthM
  const framePositions = resolveFramePositions(lengthM, input.frameStepM)
  const fachwerkPositions = resolveFachwerkPositions(lengthM, input.fakhverkStepM)
  const halfSpanM = spanM / 2
  const monoRoof = isMonopitchRoof(input.roofType)
  const purlinStepM = input.manualMaxStepMm > 0 ? input.manualMaxStepMm / 1000 : PURLIN_STEP_FALLBACK_M
  const purlinYPositions = resolvePurlinYPositions(spanM, input.roofType, purlinStepM)
  const tiesEnabled = isEnabledPresence(input.perimeterBracing) || isEnabledPresence(input.tiesSetting)

  const segments3D: Array<{ from: Point3D; to: Point3D; className?: string }> = []
  const polylines3D: Array<{ points: Point3D[]; className?: string }> = []
  const texts3D: Array<{ at: Point3D; text: string; className?: string }> = []

  for (const frameX of framePositions) {
    segments3D.push({
      from: { x: frameX, y: 0, z: 0 },
      to: { x: frameX, y: 0, z: heights.eaveSupportHeightM },
      className: 'column',
    })
    segments3D.push({
      from: { x: frameX, y: spanM, z: 0 },
      to: { x: frameX, y: spanM, z: heights.eaveSupportHeightM },
      className: 'column',
    })

    if (monoRoof) {
      polylines3D.push({
        points: [
          { x: frameX, y: 0, z: heights.eaveSupportHeightM },
          { x: frameX, y: spanM, z: heights.maxBuildingHeightM },
        ],
        className: 'truss-top',
      })
    } else {
      polylines3D.push({
        points: [
          { x: frameX, y: 0, z: heights.eaveSupportHeightM },
          { x: frameX, y: halfSpanM, z: heights.maxBuildingHeightM },
          { x: frameX, y: spanM, z: heights.eaveSupportHeightM },
        ],
        className: 'truss-top',
      })
    }

    segments3D.push({
      from: { x: frameX, y: 0, z: summary.clearHeightToBottomChordM },
      to: { x: frameX, y: spanM, z: summary.clearHeightToBottomChordM },
      className: 'truss-bottom',
    })
  }

  for (const yM of purlinYPositions) {
    const roofZ = roofTopZ(input.roofType, yM, spanM, heights.eaveSupportHeightM, heights.roofRiseM)
    segments3D.push({
      from: { x: 0, y: yM, z: roofZ },
      to: { x: lengthM, y: yM, z: roofZ },
      className: 'purlin',
    })
  }

  for (const xM of fachwerkPositions) {
    segments3D.push({
      from: { x: xM, y: 0, z: 0 },
      to: { x: xM, y: 0, z: heights.eaveSupportHeightM },
      className: 'fachwerk',
    })
    segments3D.push({
      from: { x: xM, y: spanM, z: 0 },
      to: { x: xM, y: spanM, z: heights.eaveSupportHeightM },
      className: 'fachwerk',
    })
  }

  if (tiesEnabled && framePositions.length > 1) {
    const tieEndX = framePositions[Math.min(1, framePositions.length - 1)]
    const tieBackX = framePositions[Math.max(framePositions.length - 2, 0)]

    segments3D.push({
      from: { x: tieEndX, y: 0, z: 0 },
      to: { x: 0, y: 0, z: heights.eaveSupportHeightM },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: tieEndX, y: 0, z: heights.eaveSupportHeightM },
      to: { x: 0, y: 0, z: 0 },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: tieBackX, y: spanM, z: 0 },
      to: { x: lengthM, y: spanM, z: heights.eaveSupportHeightM },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: tieBackX, y: spanM, z: heights.eaveSupportHeightM },
      to: { x: lengthM, y: spanM, z: 0 },
      className: 'bracing',
    })
  }

  const axisOffsetY = -1.4
  for (const [index, frameX] of framePositions.entries()) {
    segments3D.push({
      from: { x: frameX, y: axisOffsetY + 0.4, z: 0 },
      to: { x: frameX, y: axisOffsetY, z: 0 },
      className: 'axis',
    })
    texts3D.push({
      at: { x: frameX, y: axisOffsetY - 0.55, z: 0 },
      text: `${index + 1}`,
      className: 'axis-text',
    })
  }

  texts3D.push({
    at: { x: lengthM / 2, y: axisOffsetY - 1.05, z: 0 },
    text: `L = ${summary.lengthM.toFixed(2)} m`,
    className: 'dimension-text',
  })
  texts3D.push({
    at: { x: lengthM + 1.1, y: spanM / 2, z: 0.4 },
    text: `B = ${summary.spanM.toFixed(2)} m`,
    className: 'dimension-text',
  })

  const referencePoints = collectPoints3D(segments3D, polylines3D, texts3D)
  const projectedPoints = referencePoints.map(projectBase)
  const minX = Math.min(...projectedPoints.map((point) => point.x))
  const maxX = Math.max(...projectedPoints.map((point) => point.x))
  const minY = Math.min(...projectedPoints.map((point) => point.y))
  const maxY = Math.max(...projectedPoints.map((point) => point.y))

  const contentWidth = Math.max(maxX - minX, 1e-6)
  const contentHeight = Math.max(maxY - minY, 1e-6)
  const scale = Math.min(
    (CANVAS_WIDTH - CANVAS_PADDING * 2) / contentWidth,
    (CANVAS_HEIGHT - CANVAS_PADDING * 2) / contentHeight,
  )

  const mapPoint = (point: Point3D): Point => {
    const projected = projectBase(point)
    return {
      x: CANVAS_PADDING + (projected.x - minX) * scale,
      y: CANVAS_HEIGHT - CANVAS_PADDING - (projected.y - minY) * scale,
    }
  }

  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    lines: segments3D.map((segment) => ({
      kind: 'line',
      from: mapPoint(segment.from),
      to: mapPoint(segment.to),
      className: segment.className,
    })),
    polylines: polylines3D.map((polyline) => ({
      kind: 'polyline',
      points: polyline.points.map(mapPoint),
      className: polyline.className,
    })),
    rects: [],
    texts: texts3D.map((text) => ({
      kind: 'text',
      at: mapPoint(text.at),
      text: text.text,
      className: text.className,
    })),
    summary,
  }
}
