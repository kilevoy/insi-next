import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import { isMonopitchRoof, resolveSummary } from './frame-graphics-common'
import type { FrameGraphicsModel, Point } from './graphics-types'

type Point3D = { x: number; y: number; z: number }

export type PreviewOpening = {
  wall: 'front' | 'side'
  kind: 'gate' | 'window'
  centerM: number
  widthM: number
  heightM: number
  bottomM: number
}

interface BuildBuildingPreviewOptions {
  openings?: PreviewOpening[]
}

const WIDTH = 1120
const HEIGHT = 700
const PAD = 56
const KX = 0.92
const KY = 0.58
const KZ = 1.0

function project(point: Point3D): Point {
  return {
    x: point.x * KX - point.y * KY,
    y: -point.z * KZ + point.y * 0.42 + point.x * 0.06,
  }
}

function mapWithBounds(points: Point3D[]): { mapPoint: (point: Point3D) => Point } {
  const projected = points.map(project)
  const minX = Math.min(...projected.map((point) => point.x))
  const maxX = Math.max(...projected.map((point) => point.x))
  const minY = Math.min(...projected.map((point) => point.y))
  const maxY = Math.max(...projected.map((point) => point.y))
  const contentW = Math.max(1, maxX - minX)
  const contentH = Math.max(1, maxY - minY)
  const scale = Math.min((WIDTH - PAD * 2) / contentW, (HEIGHT - PAD * 2) / contentH)

  return {
    mapPoint: (point: Point3D) => {
      const p = project(point)
      return {
        x: PAD + (p.x - minX) * scale,
        y: HEIGHT - PAD - (p.y - minY) * scale,
      }
    },
  }
}

function openingPolygonPoints(
  opening: PreviewOpening,
  lengthM: number,
  spanM: number,
): Point3D[] {
  if (opening.wall === 'front') {
    const x1 = Math.max(0, opening.centerM - opening.widthM / 2)
    const x2 = Math.min(lengthM, opening.centerM + opening.widthM / 2)
    return [
      { x: x1, y: 0, z: opening.bottomM },
      { x: x2, y: 0, z: opening.bottomM },
      { x: x2, y: 0, z: opening.bottomM + opening.heightM },
      { x: x1, y: 0, z: opening.bottomM + opening.heightM },
    ]
  }

  const y1 = Math.max(0, opening.centerM - opening.widthM / 2)
  const y2 = Math.min(spanM, opening.centerM + opening.widthM / 2)
  return [
    { x: lengthM, y: y1, z: opening.bottomM },
    { x: lengthM, y: y2, z: opening.bottomM },
    { x: lengthM, y: y2, z: opening.bottomM + opening.heightM },
    { x: lengthM, y: y1, z: opening.bottomM + opening.heightM },
  ]
}

function resolveDefaultOpenings(lengthM: number, clearHeightM: number, spanM: number): PreviewOpening[] {
  const gateCount = lengthM >= 36 ? 2 : 1
  const gates: PreviewOpening[] = Array.from({ length: gateCount }).map((_, index) => ({
    wall: 'front',
    kind: 'gate',
    centerM: gateCount === 1 ? lengthM * 0.35 : lengthM * (0.28 + index * 0.22),
    widthM: 4.2,
    heightM: Math.min(clearHeightM * 0.75, 4.8),
    bottomM: 0,
  }))

  const windows: PreviewOpening[] = [
    { wall: 'front', kind: 'window', centerM: lengthM * 0.62, widthM: 2.1, heightM: 1.4, bottomM: 2.2 },
    { wall: 'front', kind: 'window', centerM: lengthM * 0.75, widthM: 2.1, heightM: 1.4, bottomM: 2.2 },
    { wall: 'side', kind: 'window', centerM: spanM * 0.42, widthM: 1.8, heightM: 1.2, bottomM: 2.3 },
  ]

  return [...gates, ...windows]
}

export function buildBuildingPreviewModel(
  input: UnifiedInputState,
  options: BuildBuildingPreviewOptions = {},
): FrameGraphicsModel {
  const { summary } = resolveSummary(input)
  const lengthM = summary.lengthM
  const spanM = summary.spanM
  const eaveM = summary.eaveSupportHeightM
  const roofTopM = summary.maxBuildingHeightM
  const monoRoof = isMonopitchRoof(input.roofType)

  const A: Point3D = { x: 0, y: 0, z: 0 }
  const B: Point3D = { x: lengthM, y: 0, z: 0 }
  const C: Point3D = { x: lengthM, y: spanM, z: 0 }
  const D: Point3D = { x: 0, y: spanM, z: 0 }

  const A1: Point3D = { x: 0, y: 0, z: eaveM }
  const B1: Point3D = { x: lengthM, y: 0, z: eaveM }
  const C1: Point3D = { x: lengthM, y: spanM, z: eaveM }
  const D1: Point3D = { x: 0, y: spanM, z: eaveM }

  const Rf: Point3D = { x: 0, y: spanM / 2, z: roofTopM }
  const Rb: Point3D = { x: lengthM, y: spanM / 2, z: roofTopM }

  const shadowPts: Point3D[] = [
    { x: -1.2, y: -1.0, z: 0 },
    { x: lengthM + 1.4, y: -0.8, z: 0 },
    { x: lengthM + 1.9, y: spanM + 1.4, z: 0 },
    { x: -0.8, y: spanM + 1.2, z: 0 },
  ]

  const refPoints = [A, B, C, D, A1, B1, C1, D1, Rf, Rb, ...shadowPts]
  const { mapPoint } = mapWithBounds(refPoints)
  const openings = options.openings ?? resolveDefaultOpenings(lengthM, summary.clearHeightToBottomChordM, spanM)

  const model: FrameGraphicsModel = {
    width: WIDTH,
    height: HEIGHT,
    lines: [],
    polylines: [],
    polygons: [],
    rects: [],
    texts: [],
    summary,
  }

  model.polygons.push({
    kind: 'polygon',
    points: shadowPts.map(mapPoint),
    className: 'preview-shadow',
  })

  model.polygons.push({
    kind: 'polygon',
    points: [A, B, B1, A1].map(mapPoint),
    className: 'preview-wall-front',
  })
  model.polygons.push({
    kind: 'polygon',
    points: [B, C, C1, B1].map(mapPoint),
    className: 'preview-wall-side',
  })

  if (monoRoof) {
    const C2: Point3D = { x: lengthM, y: spanM, z: roofTopM }
    const D2: Point3D = { x: 0, y: spanM, z: roofTopM }
    model.polygons.push({
      kind: 'polygon',
      points: [A1, B1, C2, D2].map(mapPoint),
      className: 'preview-roof-left',
    })
    model.lines.push({
      kind: 'line',
      from: mapPoint(D2),
      to: mapPoint(C2),
      className: 'preview-outline',
    })
  } else {
    model.polygons.push({
      kind: 'polygon',
      points: [A1, B1, Rb, Rf].map(mapPoint),
      className: 'preview-roof-left',
    })
    model.polygons.push({
      kind: 'polygon',
      points: [Rf, Rb, C1, D1].map(mapPoint),
      className: 'preview-roof-right',
    })
    model.lines.push({
      kind: 'line',
      from: mapPoint(Rf),
      to: mapPoint(Rb),
      className: 'preview-outline',
    })
  }

  for (const opening of openings) {
    model.polygons.push({
      kind: 'polygon',
      points: openingPolygonPoints(opening, lengthM, spanM).map(mapPoint),
      className: opening.kind === 'gate' ? 'preview-gate' : 'preview-window',
    })
  }

  model.lines.push({ kind: 'line', from: mapPoint(A), to: mapPoint(B), className: 'preview-outline' })
  model.lines.push({ kind: 'line', from: mapPoint(B), to: mapPoint(C), className: 'preview-outline' })
  model.lines.push({ kind: 'line', from: mapPoint(B), to: mapPoint(B1), className: 'preview-outline' })
  model.lines.push({ kind: 'line', from: mapPoint(C), to: mapPoint(C1), className: 'preview-outline' })

  model.texts.push({
    kind: 'text',
    at: { x: mapPoint(B).x - 190, y: mapPoint(B).y + 22 },
    text: `Длина ${summary.lengthM.toFixed(2)} м`,
    className: 'dimension-text',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapPoint(C).x - 24, y: mapPoint(C).y + 16 },
    text: `Пролет ${summary.spanM.toFixed(2)} м`,
    className: 'dimension-text',
  })
  model.texts.push({
    kind: 'text',
    at: { x: mapPoint(B1).x + 8, y: mapPoint(B1).y + 2 },
    text: `Высота ${summary.maxBuildingHeightM.toFixed(2)} м`,
    className: 'dimension-text',
  })

  model.texts.push({
    kind: 'text',
    at: { x: mapPoint(A).x + 12, y: mapPoint(A).y - 10 },
    text: `Рам: ${summary.framesCount}, шаг ${input.frameStepM.toFixed(2)} м`,
    className: 'note-text',
  })

  if (input.snowRetentionPurlin.toLowerCase().includes('есть')) {
    model.texts.push({
      kind: 'text',
      at: { x: mapPoint(Rb).x - 78, y: mapPoint(Rb).y - 14 },
      text: 'Снегозадержание',
      className: 'note-text',
    })
  }
  if (input.barrierPurlin.toLowerCase().includes('есть')) {
    model.texts.push({
      kind: 'text',
      at: { x: mapPoint(C1).x - 16, y: mapPoint(C1).y - 18 },
      text: 'Ограждение кровли',
      className: 'note-text',
    })
  }

  return model
}
