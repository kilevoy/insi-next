import { enclosingInputSchema, type EnclosingInput } from './enclosing-input'
import type {
  EnclosingAccessoryRow,
  EnclosingCalculationResult,
  EnclosingClassSpecification,
  EnclosingFastenerRow,
  EnclosingPanelSpecificationRow,
  EnclosingSealantRow,
  EnclosingSectionSpecification,
} from './enclosing-output'
import {
  ENCLOSING_CLASS_KEYS,
  enclosingAccessoriesReference,
  enclosingPanelPriceRubPerM2,
  type EnclosingClassKey,
} from './enclosing-reference.generated'

const STEEL_DENSITY_KG_PER_M3 = 7850
const FACING_STEEL_THICKNESS_M = 0.0005
const PANEL_WORKING_WIDTH_M = 1

const ACCESSORY_BASE_FLAT_SHEET_PRICE_RUB_PER_M2 = 500

const HARPOON_PANEL_FASTENER_PRICE_RUB_BY_LENGTH_MM: Record<number, number> = {
  105: 39.1,
  115: 43.1,
  140: 51.9,
  160: 71.1,
  190: 94.8,
  240: 145.7,
  285: 188.9,
  350: 271.2,
}
const ACCESSORY_FASTENER_PRICE_RUB = 4
const ACCESSORY_FASTENER_LENGTH_MM = 28
const LOCK_GASKET_PACK_LENGTH_M = 30
const LOCK_GASKET_PACK_PRICE_RUB = 90
const ROOF_PROFILE_GASKET_PIECE_LENGTH_M = 1
const ROOF_PROFILE_GASKET_PRICE_RUB = 55

const WALL_FASTENER_RATE_PER_M2 = 2.5
const ROOF_FASTENER_RATE_PER_M2 = 3.5
const WALL_ACCESSORY_FASTENER_RATE_PER_M = 3
const ROOF_ACCESSORY_FASTENER_RATE_PER_M = 3.5

const WALL_FASTENER_LENGTH_MM_BY_THICKNESS_ATR: Record<number, number> = {
  50: 115,
  60: 115,
  80: 140,
  100: 170,
  120: 190,
  150: 210,
  170: 240,
  180: 240,
  200: 285,
  250: 305,
}
const ROOF_FASTENER_LENGTH_MM_BY_THICKNESS_ATR: Record<number, number> = {
  50: 140,
  60: 170,
  80: 190,
  100: 190,
  120: 210,
  150: 240,
  170: 285,
  180: 285,
  200: 285,
  250: 305,
}

const WALL_JOINT_COVER_FI11_DEV_WIDTH_M = 0.208
const WALL_OUTER_CORNER_FI10_DEV_WIDTH_M_BY_THICKNESS: Record<number, number> = {
  50: 0.416,
  80: 0.469,
  100: 0.469,
  120: 0.5,
  150: 0.625,
  200: 0.664,
  250: 0.75,
}
const WALL_STARTER_FIU6_DEV_WIDTH_M_BY_THICKNESS: Record<number, number> = {
  50: 0.111,
  80: 0.141,
  100: 0.161,
  120: 0.181,
  150: 0.211,
  200: 0.261,
  250: 0.311,
}
const WALL_STARTER_FIU6_THICKNESS_MM = 2.0

const ROOF_RIDGE_FI28_DEV_WIDTH_M = 0.416
const ROOF_RIDGE_FI29_DEV_WIDTH_M = 0.178
const ROOF_EAVE_FI35_DEV_WIDTH_M_BY_THICKNESS: Record<number, number> = {
  50: 0.178,
  80: 0.208,
  100: 0.25,
  120: 0.25,
  150: 0.312,
  200: 0.312,
  250: 0.36,
}
const ROOF_EAVE_CORNER_FI7_DEV_WIDTH_M = 0.156
const ROOF_END_FI34_DEV_WIDTH_M_BY_THICKNESS: Record<number, number> = {
  50: 0.625,
  80: 0.625,
  100: 0.625,
  120: 0.625,
  150: 0.625,
  200: 0.834,
  250: 0.834,
}

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

function resolveRoofPanelLengthM(input: EnclosingInput): number {
  const angleRad = toRadians(input.roofSlopeDeg)
  const cosine = Math.max(Math.cos(angleRad), 0.2)
  return isGableRoof(input.roofType) ? input.spanM / (2 * cosine) : input.spanM / cosine
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

function resolveClosestNotLess(availableValues: number[], requestedValue: number): number {
  const sorted = availableValues.slice().sort((left, right) => left - right)
  const resolved = sorted.find((value) => value >= requestedValue)
  return resolved ?? sorted[sorted.length - 1] ?? 0
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

function resolveFastenerLengthByThickness(table: Record<number, number>, requestedThicknessMm: number) {
  const thicknesses = Object.keys(table).map(Number)
  const resolvedThicknessMm = table[requestedThicknessMm]
    ? requestedThicknessMm
    : resolveClosestNotLess(thicknesses, requestedThicknessMm)

  return {
    requestedThicknessMm,
    resolvedThicknessMm,
    lengthMm: table[resolvedThicknessMm] ?? 0,
  }
}

function resolveFastenerPriceByLength(table: Record<number, number>, requestedLengthMm: number) {
  const lengths = Object.keys(table).map(Number)
  const resolvedLengthMm = table[requestedLengthMm]
    ? requestedLengthMm
    : resolveClosestNotLess(lengths, requestedLengthMm)

  return {
    requestedLengthMm,
    resolvedLengthMm,
    unitPriceRub: table[resolvedLengthMm] ?? table[lengths[0] ?? 0] ?? 0,
  }
}

function resolveDevelopedWidthByThickness(table: Record<number, number>, requestedThicknessMm: number): number {
  const thicknesses = Object.keys(table).map(Number)
  const resolvedThicknessMm = resolveClosestNotLess(thicknesses, requestedThicknessMm)
  return table[resolvedThicknessMm] ?? 0
}

function calcFacingSteelMassKgPerM2(): number {
  return 2 * FACING_STEEL_THICKNESS_M * STEEL_DENSITY_KG_PER_M3
}

function calcUnitMassKgPerM2(densityKgPerM3: number, thicknessMm: number): number {
  const coreMass = densityKgPerM3 * (thicknessMm / 1000)
  return coreMass + calcFacingSteelMassKgPerM2()
}

function calcPanelsCount(areaM2: number, panelLengthM: number, panelWorkingWidthM = PANEL_WORKING_WIDTH_M): number {
  const panelArea = panelWorkingWidthM * Math.max(panelLengthM, 0.1)
  if (panelArea <= 0) {
    return 0
  }
  return Math.max(1, Math.ceil(areaM2 / panelArea))
}

function calcAccessoryRow(
  key: string,
  section: 'walls' | 'roof',
  item: string,
  lengthM: number,
  developedWidthM: number,
  derivedUnitPriceRubPerM2: number,
): EnclosingAccessoryRow | null {
  if (lengthM <= 0 || developedWidthM <= 0) {
    return null
  }
  const areaM2 = lengthM * developedWidthM
  return {
    key,
    section,
    item,
    unit: 'м2',
    requiredLengthM: lengthM,
    quantity: areaM2,
    developedWidthM,
    unitPriceRub: roundRub(derivedUnitPriceRubPerM2),
    totalRub: roundRub(areaM2 * derivedUnitPriceRubPerM2),
    note: 'Расчет по площади фасонного изделия (развертка × длина).',
  }
}

function calcRollSealantRow(
  key: string,
  section: 'walls' | 'roof',
  item: string,
  requiredLengthM: number,
  packLengthM: number,
  packPriceRub: number,
): EnclosingSealantRow | null {
  if (requiredLengthM <= 0 || packLengthM <= 0) {
    return null
  }
  const quantity = Math.max(1, Math.ceil(requiredLengthM / packLengthM))
  return {
    key,
    section,
    item,
    unit: 'уп.',
    quantity,
    unitPriceRub: packPriceRub,
    totalRub: roundRub(quantity * packPriceRub),
    note: `Расчет по длине ${requiredLengthM.toFixed(2)} м.п., упаковка ${packLengthM} м.`,
  }
}

function calcPieceSealantRow(
  key: string,
  section: 'walls' | 'roof',
  item: string,
  requiredLengthM: number,
  pieceLengthM: number,
  piecePriceRub: number,
): EnclosingSealantRow | null {
  if (requiredLengthM <= 0 || pieceLengthM <= 0) {
    return null
  }
  const quantity = Math.max(1, Math.ceil(requiredLengthM / pieceLengthM))
  return {
    key,
    section,
    item,
    unit: 'шт',
    quantity,
    unitPriceRub: piecePriceRub,
    totalRub: roundRub(quantity * piecePriceRub),
    note: `Расчет по длине ${requiredLengthM.toFixed(2)} м.п., элемент ${pieceLengthM} м.`,
  }
}

function sumRub<T extends { totalRub: number }>(rows: T[]): number {
  return rows.reduce((sum, row) => sum + row.totalRub, 0)
}

function sumMass<T extends { totalMassKg: number }>(rows: T[]): number {
  return rows.reduce((sum, row) => sum + row.totalMassKg, 0)
}

function buildSectionSpecification(params: {
  classKey: EnclosingClassKey
  classLabel: string
  section: 'walls' | 'roof'
  densityKgPerM3: number
  requestedThicknessMm: number
  areaM2: number
  panelLengthM: number
  standard: string
  panelType: string
  mark: string
  workingWidthMm: string
  unit: string
  priceTable: Record<number, number>
  accessoryRows: EnclosingAccessoryRow[]
  sealantRows: EnclosingSealantRow[]
  panelWorkingWidthM?: number
  panelFastenerLengthByThicknessMm: Record<number, number>
  panelFastenerRate: number
  accessoryFastenerRate: number
  notes: string[]
}): EnclosingSectionSpecification {
  const priced = resolvePricedThickness(params.priceTable, params.requestedThicknessMm)
  if (priced.requestedThicknessMm !== priced.resolvedThicknessMm) {
    params.notes.push(
      `${params.classLabel}: для раздела ${params.section === 'walls' ? 'стены' : 'кровля'} толщина ${priced.requestedThicknessMm} мм заменена на ${priced.resolvedThicknessMm} мм.`,
    )
  }

  const unitMassKgPerM2 = calcUnitMassKgPerM2(params.densityKgPerM3, priced.resolvedThicknessMm)
  const panelSpecification: EnclosingPanelSpecificationRow[] = [
    {
      key: `${params.classKey}-${params.section}-panel`,
      section: params.section,
      classKey: params.classKey,
      classLabel: params.classLabel,
      panelType: params.panelType,
      mark: params.mark,
      workingWidthMm: params.workingWidthMm,
      unit: params.unit,
      thicknessMm: priced.resolvedThicknessMm,
      standard: params.standard,
      densityKgPerM3: params.densityKgPerM3,
      areaM2: params.areaM2,
      panelLengthM: params.panelLengthM,
      panelsCount: calcPanelsCount(params.areaM2, params.panelLengthM, params.panelWorkingWidthM ?? PANEL_WORKING_WIDTH_M),
      unitMassKgPerM2,
      totalMassKg: params.areaM2 * unitMassKgPerM2,
      unitPriceRubPerM2: priced.unitPriceRubPerM2,
      totalRub: roundRub(params.areaM2 * priced.unitPriceRubPerM2),
    },
  ]

  const accessories = params.accessoryRows
  const sealants = params.sealantRows
  const accessoryLengthM = accessories.reduce((sum, row) => sum + row.requiredLengthM, 0)
  const panelFastener = resolveFastenerLengthByThickness(
    params.panelFastenerLengthByThicknessMm,
    priced.resolvedThicknessMm,
  )
  const panelFastenerPrice = resolveFastenerPriceByLength(
    HARPOON_PANEL_FASTENER_PRICE_RUB_BY_LENGTH_MM,
    panelFastener.lengthMm,
  )
  if (panelFastener.requestedThicknessMm !== panelFastener.resolvedThicknessMm) {
    params.notes.push(
      `${params.classLabel}: для крепежа раздела ${params.section === 'walls' ? 'стены' : 'кровля'} применена ближайшая большая толщина ${panelFastener.resolvedThicknessMm} мм вместо ${panelFastener.requestedThicknessMm} мм.`,
    )
  }
  if (panelFastenerPrice.requestedLengthMm !== panelFastenerPrice.resolvedLengthMm) {
    params.notes.push(
      `${params.classLabel}: для крепежа раздела ${params.section === 'walls' ? 'стены' : 'кровля'} применена ближайшая большая длина ${panelFastenerPrice.resolvedLengthMm} мм вместо ${panelFastenerPrice.requestedLengthMm} мм (по доступным позициям прайса).`,
    )
  }

  const fasteners: EnclosingFastenerRow[] = [
    {
      key: `${params.classKey}-${params.section}-panel-fastener`,
      section: params.section,
      item:
        params.section === 'walls'
          ? 'Самонарезающий винт с ЭПДМ-прокладкой для МП ТСП-Z (по АТР ТСП)'
          : 'Самонарезающий винт с ЭПДМ-прокладкой для МП ТСП-К (по АТР ТСП)',
      unit: 'шт',
      quantity: Math.ceil(params.areaM2 * params.panelFastenerRate),
      lengthMm: panelFastener.lengthMm,
      unitPriceRub: panelFastenerPrice.unitPriceRub,
      totalRub: roundRub(Math.ceil(params.areaM2 * params.panelFastenerRate) * panelFastenerPrice.unitPriceRub),
      note: 'Длина подбирается строго по АТР ТСП; цена по прайсу №12.4 (Гарпун).',
    },
    {
      key: `${params.classKey}-${params.section}-accessory-fastener`,
      section: params.section,
      item: 'Саморез Ø4,8х19(28) с ЭПДМ-прокладкой для крепления фасонных изделий (по АТР ТСП)',
      unit: 'шт',
      quantity: Math.ceil(accessoryLengthM * params.accessoryFastenerRate),
      lengthMm: ACCESSORY_FASTENER_LENGTH_MM,
      unitPriceRub: ACCESSORY_FASTENER_PRICE_RUB,
      totalRub: roundRub(Math.ceil(accessoryLengthM * params.accessoryFastenerRate) * ACCESSORY_FASTENER_PRICE_RUB),
      note: 'Норма крепежа на 1 м.п., тип по АТР ТСП (поз. Ø4,8х19(28)).',
    },
  ]

  const panelsRub = sumRub(panelSpecification)
  const accessoriesRub = sumRub(accessories)
  const sealantsRub = sumRub(sealants)
  const fastenersRub = sumRub(fasteners)

  return {
    panelSpecification,
    accessories,
    sealants,
    fasteners,
    totals: {
      panelsRub,
      accessoriesRub,
      sealantsRub,
      fastenersRub,
      sectionRub: panelsRub + accessoriesRub + sealantsRub + fastenersRub,
      panelMassKg: sumMass(panelSpecification),
    },
  }
}

function buildClassSpecification(params: {
  classKey: EnclosingClassKey
  input: EnclosingInput
  wallAreaNetM2: number
  roofAreaM2: number
  roofPanelLengthM: number
  derivedAccessoryPriceRubPerM2: number
  selectedWallWorkingWidthMm: number
  notes: string[]
}): EnclosingClassSpecification {
  const classLabel = params.classKey === 'class-1-gost' ? 'Класс 1' : 'Класс 2'
  const densityKgPerM3 = params.classKey === 'class-1-gost' ? 105 : 95

  const wallWorkingWidthM = params.selectedWallWorkingWidthMm / 1000
  const perimeterM = 2 * (params.input.spanM + params.input.buildingLengthM)
  const wallRowsCount = Math.max(1, Math.ceil(params.input.buildingHeightM / wallWorkingWidthM))
  const wallJointLengthM = perimeterM * Math.max(0, wallRowsCount - 1)

  const wallAccessories = [
    calcAccessoryRow(
      `${params.classKey}-walls-starter-fiu6`,
      'walls',
      `Стартовая планка (опорный элемент ФИУ6хA, t=${WALL_STARTER_FIU6_THICKNESS_MM.toFixed(1).replace('.', ',')} мм, узел 1.3.4, АТР ТСП)`,
      perimeterM,
      resolveDevelopedWidthByThickness(WALL_STARTER_FIU6_DEV_WIDTH_M_BY_THICKNESS, params.input.wallPanelThicknessMm),
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-walls-joint-cover`,
      'walls',
      'Нащельник стыка ФИ11 (узел 1.2.3, АТР ТСП)',
      wallJointLengthM,
      WALL_JOINT_COVER_FI11_DEV_WIDTH_M,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-walls-outer-corner`,
      'walls',
      'Угловой элемент наружный ФИ10хA (узел 1.5.2/1.5.4, АТР ТСП)',
      4 * params.input.buildingHeightM,
      resolveDevelopedWidthByThickness(WALL_OUTER_CORNER_FI10_DEV_WIDTH_M_BY_THICKNESS, params.input.wallPanelThicknessMm),
      params.derivedAccessoryPriceRubPerM2,
    ),
  ].filter((row): row is EnclosingAccessoryRow => row !== null)

  const wallSealants = [
    calcRollSealantRow(
      `${params.classKey}-walls-lock-gasket`,
      'walls',
      'Уплотнитель замкового соединения ТСП (8 мм x 30 м)',
      wallJointLengthM,
      LOCK_GASKET_PACK_LENGTH_M,
      LOCK_GASKET_PACK_PRICE_RUB,
    ),
  ].filter((row): row is EnclosingSealantRow => row !== null)

  const roofEdgeLengthM = isGableRoof(params.input.roofType)
    ? 4 * params.roofPanelLengthM
    : 2 * params.roofPanelLengthM

  const roofAccessories = [
    calcAccessoryRow(
      `${params.classKey}-roof-ridge-fi28`,
      'roof',
      'Стыковочный элемент конька ФИ28 (узел 3.2, АТР ТСП)',
      isGableRoof(params.input.roofType) ? params.input.buildingLengthM : 0,
      ROOF_RIDGE_FI28_DEV_WIDTH_M,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-roof-ridge-fi29`,
      'roof',
      'Стыковочный элемент конька ФИ29 (узел 3.2, АТР ТСП)',
      isGableRoof(params.input.roofType) ? params.input.buildingLengthM : 0,
      ROOF_RIDGE_FI29_DEV_WIDTH_M,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-roof-eave-fi35`,
      'roof',
      'Стыковочный элемент карниза ФИ35хA (узел 3.4.4/3.4.6, АТР ТСП)',
      2 * params.input.buildingLengthM,
      resolveDevelopedWidthByThickness(ROOF_EAVE_FI35_DEV_WIDTH_M_BY_THICKNESS, params.input.roofPanelThicknessMm),
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-roof-eave-fi7`,
      'roof',
      'Угловой элемент карниза ФИ7 (узел 3.4.4/3.4.6, АТР ТСП)',
      2 * params.input.buildingLengthM,
      ROOF_EAVE_CORNER_FI7_DEV_WIDTH_M,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-roof-end`,
      'roof',
      'Стыковочный элемент торца ФИ34хA (узел 3.4.3, АТР ТСП)',
      roofEdgeLengthM,
      resolveDevelopedWidthByThickness(ROOF_END_FI34_DEV_WIDTH_M_BY_THICKNESS, params.input.roofPanelThicknessMm),
      params.derivedAccessoryPriceRubPerM2,
    ),
  ].filter((row): row is EnclosingAccessoryRow => row !== null)

  const roofSlopesCount = isGableRoof(params.input.roofType) ? 2 : 1
  const roofPanelsPerSlope = Math.max(1, Math.ceil(params.input.buildingLengthM / PANEL_WORKING_WIDTH_M))
  const roofLockJointLengthM = roofSlopesCount * Math.max(0, roofPanelsPerSlope - 1) * params.roofPanelLengthM
  const ridgeLengthM = isGableRoof(params.input.roofType) ? params.input.buildingLengthM : 0
  const eaveLengthM = 2 * params.input.buildingLengthM

  const roofSealants = [
    calcRollSealantRow(
      `${params.classKey}-roof-lock-gasket`,
      'roof',
      'Уплотнитель замкового соединения ТСП (8 мм x 30 м)',
      roofLockJointLengthM,
      LOCK_GASKET_PACK_LENGTH_M,
      LOCK_GASKET_PACK_PRICE_RUB,
    ),
    calcPieceSealantRow(
      `${params.classKey}-roof-profile-gasket-a`,
      'roof',
      'Уплотнитель МП ТСП-К-А',
      ridgeLengthM,
      ROOF_PROFILE_GASKET_PIECE_LENGTH_M,
      ROOF_PROFILE_GASKET_PRICE_RUB,
    ),
    calcPieceSealantRow(
      `${params.classKey}-roof-profile-gasket-b`,
      'roof',
      'Уплотнитель МП ТСП-К-В',
      eaveLengthM,
      ROOF_PROFILE_GASKET_PIECE_LENGTH_M,
      ROOF_PROFILE_GASKET_PRICE_RUB,
    ),
  ].filter((row): row is EnclosingSealantRow => row !== null)

  const walls = buildSectionSpecification({
    classKey: params.classKey,
    classLabel,
    section: 'walls',
    densityKgPerM3,
    requestedThicknessMm: params.input.wallPanelThicknessMm,
    areaM2: params.wallAreaNetM2,
    panelLengthM: params.input.frameStepM,
    standard: params.classKey === 'class-1-gost' ? 'ГОСТ 32603-2021, класс 1' : 'ГОСТ 32603-2021, класс 2',
    panelType: 'Стеновая трехслойная сэндвич-панель с видимым креплением Z-Lock',
    mark: 'МП ТСП-Z',
    workingWidthMm: String(params.selectedWallWorkingWidthMm),
    unit: 'м2',
    priceTable: enclosingPanelPriceRubPerM2[params.classKey].wallZLock,
    accessoryRows: wallAccessories,
    sealantRows: wallSealants,
    panelWorkingWidthM: wallWorkingWidthM,
    panelFastenerLengthByThicknessMm: WALL_FASTENER_LENGTH_MM_BY_THICKNESS_ATR,
    panelFastenerRate: WALL_FASTENER_RATE_PER_M2,
    accessoryFastenerRate: WALL_ACCESSORY_FASTENER_RATE_PER_M,
    notes: params.notes,
  })

  const roof = buildSectionSpecification({
    classKey: params.classKey,
    classLabel,
    section: 'roof',
    densityKgPerM3,
    requestedThicknessMm: params.input.roofPanelThicknessMm,
    areaM2: params.roofAreaM2,
    panelLengthM: params.roofPanelLengthM,
    standard:
      params.classKey === 'class-1-gost' ? 'ГОСТ 32603-2021, класс 1' : 'ТУ 5284-001-37144780-2012',
    panelType: 'Кровельная трехслойная сэндвич-панель',
    mark: 'МП ТСП-К',
    workingWidthMm: '1000',
    unit: 'м2',
    priceTable: enclosingPanelPriceRubPerM2[params.classKey].roofK,
    accessoryRows: roofAccessories,
    sealantRows: roofSealants,
    panelFastenerLengthByThicknessMm: ROOF_FASTENER_LENGTH_MM_BY_THICKNESS_ATR,
    panelFastenerRate: ROOF_FASTENER_RATE_PER_M2,
    accessoryFastenerRate: ROOF_ACCESSORY_FASTENER_RATE_PER_M,
    notes: params.notes,
  })

  return {
    key: params.classKey,
    label: classLabel,
    walls,
    roof,
    totals: {
      panelsRub: walls.totals.panelsRub + roof.totals.panelsRub,
      accessoriesRub: walls.totals.accessoriesRub + roof.totals.accessoriesRub,
      sealantsRub: walls.totals.sealantsRub + roof.totals.sealantsRub,
      fastenersRub: walls.totals.fastenersRub + roof.totals.fastenersRub,
      classRub: walls.totals.sectionRub + roof.totals.sectionRub,
      panelMassKg: walls.totals.panelMassKg + roof.totals.panelMassKg,
    },
  }
}

export function calculateEnclosing(rawInput: EnclosingInput): EnclosingCalculationResult {
  const input = enclosingInputSchema.parse(rawInput)

  const wallAreaGrossM2 = resolveWallAreaGrossM2(input)
  const roofAreaM2 = resolveRoofAreaM2(input)
  const openingsAreaM2 = Math.max(0, input.openingsAreaM2)
  const wallAreaNetM2 = Math.max(0, wallAreaGrossM2 - openingsAreaM2)
  const roofPanelLengthM = resolveRoofPanelLengthM(input)
  const selectedWallWorkingWidthMm = 1000

  const derivedAccessoryPriceRubPerM2 =
    ACCESSORY_BASE_FLAT_SHEET_PRICE_RUB_PER_M2 * enclosingAccessoriesReference.flatSheetMultiplier

  const notes: string[] = [
    'Panel quantities are calculated by an enlarged layout scheme.',
    `Accessories are calculated by price formula: flat sheet price x ${enclosingAccessoriesReference.flatSheetMultiplier} (base ${ACCESSORY_BASE_FLAT_SHEET_PRICE_RUB_PER_M2} RUB/m2).`,
    'Accessories are priced per m2 according to the TSP price formula.',
    'Sealants are added from price list №12.5 (lock gasket and roof profile gaskets).',
    'Wall accessories include only panel joints and outer corners (no openings considered).',
    'Fastener lengths for MP ТСП-Z and MP ТСП-К are selected strictly by ATR recommendations.',
    'Fastener prices use price list №12.4 (Harpoon for sandwich panels) and price list №7 (4.8x28 for accessories). If exact screw length is absent in price list, the next larger available length is used.',
    'Wall panel working width is fixed at 1000 mm.',
    `Wall panels are assumed to be mounted horizontally; panel length is taken as frame step (${input.frameStepM} m).`,
  ]

  const classes = Object.fromEntries(
    ENCLOSING_CLASS_KEYS.map((classKey) => [
      classKey,
      buildClassSpecification({
        classKey,
        input,
        wallAreaNetM2,
        roofAreaM2,
        roofPanelLengthM,
        derivedAccessoryPriceRubPerM2,
        selectedWallWorkingWidthMm,
        notes,
      }),
    ]),
  ) as Record<EnclosingClassKey, EnclosingClassSpecification>

  return {
    snapshot: {
      sourceWorkbook: 'Прайс-лист №12.1 40 55 (14.08.2025), стр. 28',
      sourceSheets: [
        'Панели МВ (класс 1/класс 2, стр. 28)',
        'АТР ТСП: рекомендуемый перечень крепежных элементов (лист 9)',
        '№12.4 Крепежные изделия для сэндвич-панелей (стр. 31)',
        '№12.5 Элементы комплектации для сэндвич-панелей (стр. 32)',
        '№1.7 и №7 (плоский лист и крепеж доборов)',
      ],
      status: 'in-progress',
      note: 'SECRET FIX исключен из расчета в соответствии с заданием.',
    },
    geometry: {
      wallAreaGrossM2,
      wallAreaNetM2,
      roofAreaM2,
      openingsAreaM2,
    },
    classes,
    accessories: {
      flatSheetMultiplier: enclosingAccessoriesReference.flatSheetMultiplier,
      formula: enclosingAccessoriesReference.formula,
      baseFlatSheetPriceRubPerM2: ACCESSORY_BASE_FLAT_SHEET_PRICE_RUB_PER_M2,
      derivedUnitPriceRubPerM2: derivedAccessoryPriceRubPerM2,
    },
    notes,
  }
}
