import type { EnclosingInput } from './enclosing-input'

interface UnifiedInputLike {
  roofType: string
  spanM: number
  buildingLengthM: number
  buildingHeightM: number
  roofSlopeDeg: number
  wallCoveringType: string
  roofCoveringType: string
  doubleDoorAreaM2: number
  singleDoorCount: number
  entranceBlockAreaM2: number
  tambourDoorAreaM2: number
  windowsAreaM2: number
  gatesAreaM2: number
}

const DEFAULT_WALL_PANEL_THICKNESS_MM = 100
const DEFAULT_ROOF_PANEL_THICKNESS_MM = 150
const DEFAULT_SINGLE_DOOR_AREA_M2 = 2

function normalizeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function parsePanelThicknessMm(covering: string, fallback: number): number {
  const match = covering.match(/(\d{2,3})/)
  if (!match) {
    return fallback
  }

  const thickness = Number(match[1])
  return Number.isFinite(thickness) && thickness > 0 ? thickness : fallback
}

function resolveOpeningsAreaM2(input: UnifiedInputLike): number {
  const singleDoorAreaM2 = normalizeNonNegative(input.singleDoorCount) * DEFAULT_SINGLE_DOOR_AREA_M2
  return (
    normalizeNonNegative(input.doubleDoorAreaM2) +
    singleDoorAreaM2 +
    normalizeNonNegative(input.entranceBlockAreaM2) +
    normalizeNonNegative(input.tambourDoorAreaM2) +
    normalizeNonNegative(input.windowsAreaM2) +
    normalizeNonNegative(input.gatesAreaM2)
  )
}

export function mapUnifiedInputToEnclosingInput(input: UnifiedInputLike): EnclosingInput {
  return {
    roofType: input.roofType,
    spanM: normalizeNonNegative(input.spanM),
    buildingLengthM: normalizeNonNegative(input.buildingLengthM),
    buildingHeightM: normalizeNonNegative(input.buildingHeightM),
    roofSlopeDeg: normalizeNonNegative(input.roofSlopeDeg),
    wallPanelThicknessMm: parsePanelThicknessMm(input.wallCoveringType, DEFAULT_WALL_PANEL_THICKNESS_MM),
    roofPanelThicknessMm: parsePanelThicknessMm(input.roofCoveringType, DEFAULT_ROOF_PANEL_THICKNESS_MM),
    openingsAreaM2: resolveOpeningsAreaM2(input),
  }
}
