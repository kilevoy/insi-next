import type { EnclosingScenarioKey } from './enclosing-reference.generated'

export interface EnclosingPanelScenarioLine {
  requestedThicknessMm: number
  resolvedThicknessMm: number
  areaM2: number
  unitPriceRubPerM2: number
  totalRub: number
}

export interface EnclosingScenarioResult {
  key: EnclosingScenarioKey
  title: string
  wall: EnclosingPanelScenarioLine
  roof: EnclosingPanelScenarioLine
  panelsTotalRub: number
  notes: string[]
}

export interface EnclosingFastenerMetalSelection {
  requestedThicknessMm: number
  resolvedThicknessMm: number
  lengthMm: number
}

export interface EnclosingFastenerConcreteSelection {
  requestedThicknessMm: number
  resolvedThicknessMm: number
  diameterAndLength: string
}

export interface EnclosingCalculationResult {
  snapshot: {
    sourceWorkbook: string
    sourceSheets: readonly string[]
    status: 'in-progress' | 'parity-verified'
    note: string
  }
  geometry: {
    wallAreaGrossM2: number
    wallAreaNetM2: number
    roofAreaM2: number
    openingsAreaM2: number
  }
  scenarios: EnclosingScenarioResult[]
  fasteners: {
    metal: {
      source: string
      wallZLock: EnclosingFastenerMetalSelection
      roofK: EnclosingFastenerMetalSelection
    }
    concrete: {
      source: string
      wallZLock: EnclosingFastenerConcreteSelection
      roofK: EnclosingFastenerConcreteSelection
    }
  }
  accessories: {
    flatSheetMultiplier: number
    formula: string
  }
  notes: string[]
}
