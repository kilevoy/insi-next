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

export type RectPrimitive = {
  kind: 'rect'
  at: Point
  width: number
  height: number
  className?: string
}

export type TextPrimitive = {
  kind: 'text'
  at: Point
  text: string
  className?: string
}

export type FrameGraphicsSummary = {
  spanM: number
  lengthM: number
  clearHeightToBottomChordM: number
  eaveTrussDepthM: number
  eaveSupportHeightM: number
  maxBuildingHeightM: number
  framesCount: number
}

export type FrameGraphicsModel = {
  width: number
  height: number
  lines: LinePrimitive[]
  polylines: PolylinePrimitive[]
  rects: RectPrimitive[]
  texts: TextPrimitive[]
  summary: FrameGraphicsSummary
}
