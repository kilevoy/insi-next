import { enclosingInputSchema, type EnclosingInput } from './enclosing-input'
import type {
  EnclosingCalculationResult,
  EnclosingFastenerConcreteSelection,
  EnclosingFastenerMetalSelection,
  EnclosingScenarioResult,
} from './enclosing-output'
import {
  ENCLOSING_SCENARIO_KEYS,
  enclosingAccessoriesReference,
  enclosingFastenerReference,
  enclosingPanelPriceRubPerM2,
  type EnclosingScenarioKey,
} from './enclosing-reference.generated'

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function roundRub(value: number): number {
  return Math.round(value)
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function isGableRoof(roofType: string): boolean {
  const normalized = normalizeText(roofType)
  return normalized.includes('двуск') || normalized.includes('gable')
}

function resolveRoofAreaM2(input: EnclosingInput): number {
  const angleRad = toRadians(input.roofSlopeDeg)
  const cosine = Math.max(Math.cos(angleRad), 0.2)
  return (input.spanM * input.buildingLengthM) / cosine
}

function resolveWallAreaGrossM2(input: EnclosingInput): number {
  const perimeterArea = 2 * (input.spanM + input.buildingLengthM) * input.buildingHeightM
  if (!isGableRoof(input.roofType)) {
    return perimeterArea
  }

  const riseM = (input.spanM / 2) * Math.tan(toRadians(input.roofSlopeDeg))
  return perimeterArea + input.spanM * riseM
}

function resolveNearestThickness(availableThicknesses: number[], requestedThicknessMm: number): number {
  return availableThicknesses
    .slice()
    .sort((left, right) => left - right)
    .reduce((best, current) => {
      const bestDelta = Math.abs(best - requestedThicknessMm)
      const currentDelta = Math.abs(current - requestedThicknessMm)
      if (currentDelta < bestDelta) {
        return current
      }
      if (currentDelta === bestDelta) {
        return Math.min(best, current)
      }
      return best
    })
}

function resolvePricedThickness(
  table: Record<number, number>,
  requestedThicknessMm: number,
): { requestedThicknessMm: number; resolvedThicknessMm: number; unitPriceRubPerM2: number } {
  const thicknesses = Object.keys(table).map(Number)
  const resolvedThicknessMm = table[requestedThicknessMm]
    ? requestedThicknessMm
    : resolveNearestThickness(thicknesses, requestedThicknessMm)

  return {
    requestedThicknessMm,
    resolvedThicknessMm,
    unitPriceRubPerM2: table[resolvedThicknessMm] ?? table[thicknesses[0] ?? 0] ?? 0,
  }
}

function resolveFastenerMetal(
  table: Record<number, number>,
  requestedThicknessMm: number,
): EnclosingFastenerMetalSelection {
  const thicknesses = Object.keys(table).map(Number)
  const resolvedThicknessMm = table[requestedThicknessMm]
    ? requestedThicknessMm
    : resolveNearestThickness(thicknesses, requestedThicknessMm)

  return {
    requestedThicknessMm,
    resolvedThicknessMm,
    lengthMm: table[resolvedThicknessMm] ?? 0,
  }
}

function resolveFastenerConcrete(
  table: Record<number, string>,
  requestedThicknessMm: number,
): EnclosingFastenerConcreteSelection {
  const thicknesses = Object.keys(table).map(Number)
  const resolvedThicknessMm = table[requestedThicknessMm]
    ? requestedThicknessMm
    : resolveNearestThickness(thicknesses, requestedThicknessMm)

  return {
    requestedThicknessMm,
    resolvedThicknessMm,
    diameterAndLength: table[resolvedThicknessMm] ?? '',
  }
}

function buildScenario(
  scenarioKey: EnclosingScenarioKey,
  requestedWallThicknessMm: number,
  requestedRoofThicknessMm: number,
  wallAreaNetM2: number,
  roofAreaM2: number,
): EnclosingScenarioResult {
  const catalog = enclosingPanelPriceRubPerM2[scenarioKey]
  const wall = resolvePricedThickness(catalog.wallZLock, requestedWallThicknessMm)
  const roof = resolvePricedThickness(catalog.roofK, requestedRoofThicknessMm)

  const wallTotalRub = roundRub(wallAreaNetM2 * wall.unitPriceRubPerM2)
  const roofTotalRub = roundRub(roofAreaM2 * roof.unitPriceRubPerM2)
  const notes: string[] = []

  if (wall.requestedThicknessMm !== wall.resolvedThicknessMm) {
    notes.push(
      `Толщина стеновой панели ${wall.requestedThicknessMm} мм не найдена в прайсе, использована ближайшая ${wall.resolvedThicknessMm} мм.`,
    )
  }

  if (roof.requestedThicknessMm !== roof.resolvedThicknessMm) {
    notes.push(
      `Толщина кровельной панели ${roof.requestedThicknessMm} мм не найдена в прайсе, использована ближайшая ${roof.resolvedThicknessMm} мм.`,
    )
  }

  return {
    key: scenarioKey,
    title:
      scenarioKey === 'class-1-gost'
        ? 'Класс 1 (ГОСТ 32603-2021)'
        : 'Класс 2 (стены ГОСТ, кровля ТУ 5284-001-37144780-2012)',
    wall: {
      requestedThicknessMm: wall.requestedThicknessMm,
      resolvedThicknessMm: wall.resolvedThicknessMm,
      areaM2: wallAreaNetM2,
      unitPriceRubPerM2: wall.unitPriceRubPerM2,
      totalRub: wallTotalRub,
    },
    roof: {
      requestedThicknessMm: roof.requestedThicknessMm,
      resolvedThicknessMm: roof.resolvedThicknessMm,
      areaM2: roofAreaM2,
      unitPriceRubPerM2: roof.unitPriceRubPerM2,
      totalRub: roofTotalRub,
    },
    panelsTotalRub: wallTotalRub + roofTotalRub,
    notes,
  }
}

export function calculateEnclosing(rawInput: EnclosingInput): EnclosingCalculationResult {
  const input = enclosingInputSchema.parse(rawInput)

  const wallAreaGrossM2 = resolveWallAreaGrossM2(input)
  const roofAreaM2 = resolveRoofAreaM2(input)
  const openingsAreaM2 = Math.max(0, input.openingsAreaM2)
  const wallAreaNetM2 = Math.max(0, wallAreaGrossM2 - openingsAreaM2)

  const scenarios = ENCLOSING_SCENARIO_KEYS.map((scenarioKey) =>
    buildScenario(scenarioKey, input.wallPanelThicknessMm, input.roofPanelThicknessMm, wallAreaNetM2, roofAreaM2),
  )

  const metalWall = resolveFastenerMetal(
    enclosingFastenerReference.metalHarpoonToSteelUpTo12_5mm.wallZLockLengthMmByThickness,
    input.wallPanelThicknessMm,
  )
  const metalRoof = resolveFastenerMetal(
    enclosingFastenerReference.metalHarpoonToSteelUpTo12_5mm.roofKLengthMmByThickness,
    input.roofPanelThicknessMm,
  )
  const concreteWall = resolveFastenerConcrete(
    enclosingFastenerReference.concreteHarpoon.wallZLockDiameterAndLengthByThickness,
    input.wallPanelThicknessMm,
  )
  const concreteRoof = resolveFastenerConcrete(
    enclosingFastenerReference.concreteHarpoon.roofKDiameterAndLengthByThickness,
    input.roofPanelThicknessMm,
  )

  const notes = scenarios.flatMap((scenario) => scenario.notes)
  if (metalWall.requestedThicknessMm !== metalWall.resolvedThicknessMm) {
    notes.push(
      `Для крепежа по металлу стен использована ближайшая толщина ${metalWall.resolvedThicknessMm} мм вместо ${metalWall.requestedThicknessMm} мм.`,
    )
  }
  if (metalRoof.requestedThicknessMm !== metalRoof.resolvedThicknessMm) {
    notes.push(
      `Для крепежа по металлу кровли использована ближайшая толщина ${metalRoof.resolvedThicknessMm} мм вместо ${metalRoof.requestedThicknessMm} мм.`,
    )
  }
  if (concreteWall.requestedThicknessMm !== concreteWall.resolvedThicknessMm) {
    notes.push(
      `Для крепежа по бетону стен использована ближайшая толщина ${concreteWall.resolvedThicknessMm} мм вместо ${concreteWall.requestedThicknessMm} мм.`,
    )
  }
  if (concreteRoof.requestedThicknessMm !== concreteRoof.resolvedThicknessMm) {
    notes.push(
      `Для крепежа по бетону кровли использована ближайшая толщина ${concreteRoof.resolvedThicknessMm} мм вместо ${concreteRoof.requestedThicknessMm} мм.`,
    )
  }

  return {
    snapshot: {
      sourceWorkbook: 'Прайс-лист №12.1 40 55 (14.08.2025), стр. 28',
      sourceSheets: ['Панели МВ (класс 1/класс 2)', 'Метизы (табл. 18, 22 техкаталога 22.07.2025)'],
      status: 'in-progress',
      note: 'SECRET FIX исключен из расчета в соответствии с заданием.',
    },
    geometry: {
      wallAreaGrossM2,
      wallAreaNetM2,
      roofAreaM2,
      openingsAreaM2,
    },
    scenarios,
    fasteners: {
      metal: {
        source: 'Harpoon, табл. 18: крепление к подконструкциям до 12.5 мм',
        wallZLock: metalWall,
        roofK: metalRoof,
      },
      concrete: {
        source: 'Harpoon, табл. 22: саморезы по бетону',
        wallZLock: concreteWall,
        roofK: concreteRoof,
      },
    },
    accessories: {
      flatSheetMultiplier: enclosingAccessoriesReference.flatSheetMultiplier,
      formula: enclosingAccessoriesReference.formula,
    },
    notes,
  }
}
