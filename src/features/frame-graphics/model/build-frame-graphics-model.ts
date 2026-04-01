import { deriveHeights } from '@/pages/calculator/model/height-derivations'
import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'

type Point3D = {
  x: number
  y: number
  z: number
}

export type Point = { x: number; y: number }

export type LinePrimitive = {
  kind: 'line'
  from: Point
  to: Point
  className?: string
}

export type PolylinePrimitive = {
  kind: 'polyline'
  points: Point[]
  className?: string
}

export type TextPrimitive = {
  kind: 'text'
  at: Point
  text: string
  className?: string
}

export type FrameGraphicsModel = {
  width: number
  height: number
  lines: LinePrimitive[]
  polylines: PolylinePrimitive[]
  texts: TextPrimitive[]
}

const CANVAS_WIDTH = 1180
const CANVAS_HEIGHT = 720
const CANVAS_PADDING = 48
const AXONOMETRIC_COS = 0.866
const AXONOMETRIC_DEPTH_FACTOR = 0.35
const PURLIN_STEP_FALLBACK_M = 1.5

function isMonopitchRoof(roofType: string): boolean {
  return roofType.trim().toLowerCase().includes('односкат')
}

function roundLabel(value: number, digits = 2): string {
  return value.toFixed(digits)
}

function resolveFramePositions(lengthM: number, frameStepM: number): number[] {
  const stepM = frameStepM > 0 ? frameStepM : 6
  const positions: number[] = [0]

  let current = stepM
  while (current < lengthM - 1e-6) {
    positions.push(current)
    current += stepM
  }

  if (lengthM > 0 && Math.abs(positions[positions.length - 1] - lengthM) > 1e-6) {
    positions.push(lengthM)
  }

  return positions
}

function resolveFachwerkPositions(lengthM: number, fakhverkStepM: number): number[] {
  const stepM = fakhverkStepM > 0 ? fakhverkStepM : 6
  const positions: number[] = []
  let current = stepM

  while (current < lengthM - 1e-6) {
    positions.push(current)
    current += stepM
  }

  return positions
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
  const segmentPoints = segments.flatMap((segment) => [segment.from, segment.to])
  const polylinePoints = polylines.flatMap((polyline) => polyline.points)
  const textPoints = labels.map((label) => label.at)
  return [...segmentPoints, ...polylinePoints, ...textPoints]
}

function projectBase(point: Point3D): Point {
  return {
    x: (point.x - point.y) * AXONOMETRIC_COS,
    y: point.z - (point.x + point.y) * AXONOMETRIC_DEPTH_FACTOR,
  }
}

export function buildFrameGraphicsModel(input: UnifiedInputState): FrameGraphicsModel {
  const heights = deriveHeights(input)
  const spanM = Math.max(input.spanM, 1)
  const lengthM = Math.max(input.buildingLengthM, 1)
  const framePositions = resolveFramePositions(lengthM, input.frameStepM)
  const fakhwerkPositions = resolveFachwerkPositions(lengthM, input.fakhverkStepM)
  const halfSpanM = spanM / 2
  const monoRoof = isMonopitchRoof(input.roofType)
  const purlinStepM =
    input.manualMaxStepMm > 0 ? input.manualMaxStepMm / 1000 : PURLIN_STEP_FALLBACK_M
  const tiesEnabled = input.perimeterBracing === 'есть' || input.tiesSetting === 'есть'

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
      from: { x: frameX, y: 0, z: input.clearHeightToBottomChordM },
      to: { x: frameX, y: spanM, z: input.clearHeightToBottomChordM },
      className: 'truss-bottom',
    })
    segments3D.push({
      from: { x: frameX, y: 0, z: input.clearHeightToBottomChordM },
      to: { x: frameX, y: 0, z: heights.eaveSupportHeightM },
      className: 'truss-web',
    })
    segments3D.push({
      from: { x: frameX, y: spanM, z: input.clearHeightToBottomChordM },
      to: { x: frameX, y: spanM, z: heights.eaveSupportHeightM },
      className: 'truss-web',
    })

    if (!monoRoof) {
      segments3D.push({
        from: { x: frameX, y: halfSpanM, z: input.clearHeightToBottomChordM },
        to: { x: frameX, y: halfSpanM, z: heights.maxBuildingHeightM },
        className: 'truss-web',
      })
    }
  }

  for (const fakhwerkX of fakhwerkPositions) {
    segments3D.push({
      from: { x: fakhwerkX, y: 0, z: 0 },
      to: { x: fakhwerkX, y: 0, z: heights.eaveSupportHeightM },
      className: 'fachwerk',
    })
    segments3D.push({
      from: { x: fakhwerkX, y: spanM, z: 0 },
      to: { x: fakhwerkX, y: spanM, z: heights.eaveSupportHeightM },
      className: 'fachwerk',
    })
  }

  if (purlinStepM > 0) {
    if (monoRoof) {
      for (let y = purlinStepM; y < spanM - 1e-6; y += purlinStepM) {
        const z = roofTopZ(input.roofType, y, spanM, heights.eaveSupportHeightM, heights.roofRiseM)
        segments3D.push({
          from: { x: 0, y, z },
          to: { x: lengthM, y, z },
          className: 'purlin',
        })
      }
    } else {
      for (let y = purlinStepM; y < halfSpanM - 1e-6; y += purlinStepM) {
        const leftZ = roofTopZ(input.roofType, y, spanM, heights.eaveSupportHeightM, heights.roofRiseM)
        const rightY = spanM - y
        const rightZ = roofTopZ(
          input.roofType,
          rightY,
          spanM,
          heights.eaveSupportHeightM,
          heights.roofRiseM,
        )

        segments3D.push({
          from: { x: 0, y, z: leftZ },
          to: { x: lengthM, y, z: leftZ },
          className: 'purlin',
        })
        segments3D.push({
          from: { x: 0, y: rightY, z: rightZ },
          to: { x: lengthM, y: rightY, z: rightZ },
          className: 'purlin',
        })
      }

      segments3D.push({
        from: { x: 0, y: halfSpanM, z: heights.maxBuildingHeightM },
        to: { x: lengthM, y: halfSpanM, z: heights.maxBuildingHeightM },
        className: 'purlin',
      })
    }
  }

  if (tiesEnabled && framePositions.length >= 2) {
    const firstFrameX = framePositions[0]
    const secondFrameX = framePositions[1]

    segments3D.push({
      from: { x: firstFrameX, y: 0, z: 0 },
      to: { x: secondFrameX, y: 0, z: heights.eaveSupportHeightM },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: firstFrameX, y: 0, z: heights.eaveSupportHeightM },
      to: { x: secondFrameX, y: 0, z: 0 },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: firstFrameX, y: spanM, z: 0 },
      to: { x: secondFrameX, y: spanM, z: heights.eaveSupportHeightM },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: firstFrameX, y: spanM, z: heights.eaveSupportHeightM },
      to: { x: secondFrameX, y: spanM, z: 0 },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: 0, y: 0, z: 0 },
      to: { x: 0, y: spanM, z: heights.eaveSupportHeightM },
      className: 'bracing',
    })
    segments3D.push({
      from: { x: 0, y: 0, z: heights.eaveSupportHeightM },
      to: { x: 0, y: spanM, z: 0 },
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

  segments3D.push({
    from: { x: 0, y: axisOffsetY, z: 0 },
    to: { x: lengthM, y: axisOffsetY, z: 0 },
    className: 'axis',
  })
  texts3D.push({
    at: { x: lengthM / 2, y: axisOffsetY - 1.05, z: 0 },
    text: `Длина ${roundLabel(lengthM, 1)} м`,
    className: 'dimension-text',
  })
  texts3D.push({
    at: { x: lengthM + 0.8, y: spanM / 2, z: 0.35 },
    text: `Пролет ${roundLabel(spanM, 1)} м`,
    className: 'dimension-text',
  })

  segments3D.push({
    from: { x: lengthM + 0.8, y: 0, z: 0 },
    to: { x: lengthM + 0.8, y: 0, z: input.clearHeightToBottomChordM },
    className: 'dimension',
  })
  texts3D.push({
    at: { x: lengthM + 1.1, y: 0, z: input.clearHeightToBottomChordM / 2 },
    text: `До низа несущих ${roundLabel(input.clearHeightToBottomChordM)} м`,
    className: 'dimension-text',
  })

  segments3D.push({
    from: { x: lengthM + 1.5, y: 0, z: input.clearHeightToBottomChordM },
    to: { x: lengthM + 1.5, y: 0, z: heights.eaveSupportHeightM },
    className: 'dimension',
  })
  texts3D.push({
    at: { x: lengthM + 1.8, y: 0, z: input.clearHeightToBottomChordM + heights.eaveTrussDepthM / 2 },
    text: `Ферма в карнизе ${roundLabel(heights.eaveTrussDepthM)} м`,
    className: 'dimension-text',
  })

  segments3D.push({
    from: { x: lengthM + 2.2, y: 0, z: 0 },
    to: { x: lengthM + 2.2, y: 0, z: heights.maxBuildingHeightM },
    className: 'dimension',
  })
  texts3D.push({
    at: { x: lengthM + 2.5, y: 0, z: heights.maxBuildingHeightM / 2 },
    text: `Макс. высота ${roundLabel(heights.maxBuildingHeightM)} м`,
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

  const lines: LinePrimitive[] = segments3D.map((segment) => ({
    kind: 'line',
    from: mapPoint(segment.from),
    to: mapPoint(segment.to),
    className: segment.className,
  }))
  const polylines: PolylinePrimitive[] = polylines3D.map((polyline) => ({
    kind: 'polyline',
    points: polyline.points.map(mapPoint),
    className: polyline.className,
  }))
  const texts: TextPrimitive[] = texts3D.map((text) => ({
    kind: 'text',
    at: mapPoint(text.at),
    text: text.text,
    className: text.className,
  }))

  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    lines,
    polylines,
    texts,
  }
}

