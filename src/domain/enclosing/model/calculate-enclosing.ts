import { enclosingInputSchema, type EnclosingInput } from './enclosing-input'
import type {
  EnclosingAccessoryRow,
  EnclosingCalculationResult,
  EnclosingClassSpecification,
  EnclosingFastenerRow,
  EnclosingPanelSpecificationRow,
  EnclosingSectionSpecification,
} from './enclosing-output'
import {
  ENCLOSING_CLASS_KEYS,
  enclosingAccessoriesReference,
  enclosingFastenerReference,
  enclosingPanelPriceRubPerM2,
  type EnclosingClassKey,
} from './enclosing-reference.generated'

const STEEL_DENSITY_KG_PER_M3 = 7850
const FACING_STEEL_THICKNESS_M = 0.0005
const PANEL_WORKING_WIDTH_M = 1
const WALL_PANEL_WORKING_WIDTH_OPTIONS_MM = [1000, 1160, 1190] as const

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

const WALL_FASTENER_RATE_PER_M2 = 2.5
const ROOF_FASTENER_RATE_PER_M2 = 3.5
const WALL_ACCESSORY_FASTENER_RATE_PER_M = 3
const ROOF_ACCESSORY_FASTENER_RATE_PER_M = 3.5

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
    : resolveNearestThickness(thicknesses, requestedThicknessMm)

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
    : resolveNearestThickness(lengths, requestedLengthMm)

  return {
    requestedLengthMm,
    resolvedLengthMm,
    unitPriceRub: table[resolvedLengthMm] ?? table[lengths[0] ?? 0] ?? 0,
  }
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

function resolveEconomicalWallWorkingWidthMm(params: {
  wallAreaNetM2: number
  wallPanelLengthM: number
}): number {
  const variants = WALL_PANEL_WORKING_WIDTH_OPTIONS_MM.map((widthMm) => {
    const workingWidthM = widthMm / 1000
    const panelsCount = calcPanelsCount(params.wallAreaNetM2, params.wallPanelLengthM, workingWidthM)
    const purchasedAreaM2 = panelsCount * workingWidthM * Math.max(params.wallPanelLengthM, 0.1)
    const wasteAreaM2 = Math.max(0, purchasedAreaM2 - params.wallAreaNetM2)

    return {
      widthMm,
      panelsCount,
      purchasedAreaM2,
      wasteAreaM2,
    }
  })

  const best = variants.sort((left, right) => {
    if (left.purchasedAreaM2 !== right.purchasedAreaM2) {
      return left.purchasedAreaM2 - right.purchasedAreaM2
    }
    if (left.wasteAreaM2 !== right.wasteAreaM2) {
      return left.wasteAreaM2 - right.wasteAreaM2
    }
    if (left.panelsCount !== right.panelsCount) {
      return left.panelsCount - right.panelsCount
    }
    return right.widthMm - left.widthMm
  })[0]

  return best?.widthMm ?? 1000
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
  const quantityM2 = lengthM * developedWidthM
  return {
    key,
    section,
    item,
    unit: 'м.п.',
    lengthM,
    developedWidthM,
    quantityM2,
    unitPriceRubPerM2: derivedUnitPriceRubPerM2,
    totalRub: roundRub(quantityM2 * derivedUnitPriceRubPerM2),
    note: 'Цена фасонного изделия = цена плоского листа x 1.9',
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
  panelWorkingWidthM?: number
  panelFastenerLengthMm: number
  panelFastenerPriceRub: number
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
  const accessoryLengthM = accessories.reduce((sum, row) => sum + row.lengthM, 0)

  const fasteners: EnclosingFastenerRow[] = [
    {
      key: `${params.classKey}-${params.section}-panel-fastener`,
      section: params.section,
      item:
        params.section === 'walls'
          ? 'Саморез для крепления стеновых панелей к металлокаркасу'
          : 'Саморез для крепления кровельных панелей к металлокаркасу',
      unit: 'шт',
      quantity: Math.ceil(params.areaM2 * params.panelFastenerRate),
      lengthMm: params.panelFastenerLengthMm,
      unitPriceRub: params.panelFastenerPriceRub,
      totalRub: roundRub(Math.ceil(params.areaM2 * params.panelFastenerRate) * params.panelFastenerPriceRub),
      note: 'Норма крепежа на 1 м2, цена по прайсу №12.4 (Гарпун).',
    },
    {
      key: `${params.classKey}-${params.section}-accessory-fastener`,
      section: params.section,
      item: 'Саморез для крепления доборных элементов',
      unit: 'шт',
      quantity: Math.ceil(accessoryLengthM * params.accessoryFastenerRate),
      lengthMm: ACCESSORY_FASTENER_LENGTH_MM,
      unitPriceRub: ACCESSORY_FASTENER_PRICE_RUB,
      totalRub: roundRub(Math.ceil(accessoryLengthM * params.accessoryFastenerRate) * ACCESSORY_FASTENER_PRICE_RUB),
      note: 'Норма крепежа на 1 м.п., цена по прайсу №7 (4,8x28 ROOFRetail).',
    },
  ]

  const panelsRub = sumRub(panelSpecification)
  const accessoriesRub = sumRub(accessories)
  const fastenersRub = sumRub(fasteners)

  return {
    panelSpecification,
    accessories,
    fasteners,
    totals: {
      panelsRub,
      accessoriesRub,
      fastenersRub,
      sectionRub: panelsRub + accessoriesRub + fastenersRub,
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
  wallFastenerLengthMm: number
  wallFastenerPriceRub: number
  roofFastenerLengthMm: number
  roofFastenerPriceRub: number
  notes: string[]
}): EnclosingClassSpecification {
  const classLabel = params.classKey === 'class-1-gost' ? 'Класс 1' : 'Класс 2'
  const densityKgPerM3 = params.classKey === 'class-1-gost' ? 105 : 95

  const wallWorkingWidthM = params.selectedWallWorkingWidthMm / 1000
  const wallPanelsApprox = calcPanelsCount(params.wallAreaNetM2, params.input.buildingHeightM, wallWorkingWidthM)
  const perimeterM = 2 * (params.input.spanM + params.input.buildingLengthM)
  const wallJointLengthM = Math.max(0, wallPanelsApprox - 4) * params.input.buildingHeightM

  const wallAccessories = [
    calcAccessoryRow(
      `${params.classKey}-walls-joint-cover`,
      'walls',
      'Нащельник стыка стеновых панелей',
      wallJointLengthM,
      0.25,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-walls-outer-corner`,
      'walls',
      'Угол наружный стеновой',
      4 * params.input.buildingHeightM,
      0.3,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-walls-top-cap`,
      'walls',
      'Планка парапетная верхняя',
      perimeterM,
      0.35,
      params.derivedAccessoryPriceRubPerM2,
    ),
  ].filter((row): row is EnclosingAccessoryRow => row !== null)

  const roofEdgeLengthM = isGableRoof(params.input.roofType)
    ? 4 * params.roofPanelLengthM
    : 2 * params.roofPanelLengthM

  const roofAccessories = [
    calcAccessoryRow(
      `${params.classKey}-roof-ridge`,
      'roof',
      'Планка конька',
      isGableRoof(params.input.roofType) ? params.input.buildingLengthM : 0,
      0.5,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-roof-eave`,
      'roof',
      'Планка карнизная',
      2 * params.input.buildingLengthM,
      0.3,
      params.derivedAccessoryPriceRubPerM2,
    ),
    calcAccessoryRow(
      `${params.classKey}-roof-end`,
      'roof',
      'Планка торцевая',
      roofEdgeLengthM,
      0.3,
      params.derivedAccessoryPriceRubPerM2,
    ),
  ].filter((row): row is EnclosingAccessoryRow => row !== null)

  const walls = buildSectionSpecification({
    classKey: params.classKey,
    classLabel,
    section: 'walls',
    densityKgPerM3,
    requestedThicknessMm: params.input.wallPanelThicknessMm,
    areaM2: params.wallAreaNetM2,
    panelLengthM: params.input.buildingHeightM,
    standard: params.classKey === 'class-1-gost' ? 'ГОСТ 32603-2021, класс 1' : 'ГОСТ 32603-2021, класс 2',
    panelType: 'Стеновая трехслойная сэндвич-панель с видимым креплением Z-Lock',
    mark: 'МП ТСП-Z',
    workingWidthMm: String(params.selectedWallWorkingWidthMm),
    unit: 'м2',
    priceTable: enclosingPanelPriceRubPerM2[params.classKey].wallZLock,
    accessoryRows: wallAccessories,
    panelWorkingWidthM: wallWorkingWidthM,
    panelFastenerLengthMm: params.wallFastenerLengthMm,
    panelFastenerPriceRub: params.wallFastenerPriceRub,
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
    panelFastenerLengthMm: params.roofFastenerLengthMm,
    panelFastenerPriceRub: params.roofFastenerPriceRub,
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
  const selectedWallWorkingWidthMm = resolveEconomicalWallWorkingWidthMm({
    wallAreaNetM2,
    wallPanelLengthM: input.buildingHeightM,
  })

  const derivedAccessoryPriceRubPerM2 =
    ACCESSORY_BASE_FLAT_SHEET_PRICE_RUB_PER_M2 * enclosingAccessoriesReference.flatSheetMultiplier

  const wallFastener = resolveFastenerLengthByThickness(
    enclosingFastenerReference.metalHarpoonToSteelUpTo12_5mm.wallZLockLengthMmByThickness,
    input.wallPanelThicknessMm,
  )
  const roofFastener = resolveFastenerLengthByThickness(
    enclosingFastenerReference.metalHarpoonToSteelUpTo12_5mm.roofKLengthMmByThickness,
    input.roofPanelThicknessMm,
  )
  const wallFastenerPrice = resolveFastenerPriceByLength(
    HARPOON_PANEL_FASTENER_PRICE_RUB_BY_LENGTH_MM,
    wallFastener.lengthMm,
  )
  const roofFastenerPrice = resolveFastenerPriceByLength(
    HARPOON_PANEL_FASTENER_PRICE_RUB_BY_LENGTH_MM,
    roofFastener.lengthMm,
  )

  const notes: string[] = [
    'Panel quantities are calculated by an enlarged layout scheme.',
    `Accessories are calculated by price formula: flat sheet price x ${enclosingAccessoriesReference.flatSheetMultiplier} (base ${ACCESSORY_BASE_FLAT_SHEET_PRICE_RUB_PER_M2} RUB/m2).`,
    'Fastener prices use price list №12.4 (Harpoon for sandwich panels) and price list №7 (4.8x28 for accessories).',
    `Wall panel working width ${selectedWallWorkingWidthMm} mm is selected automatically from 1000/1160/1190 by economical layout.`,
  ]
  if (wallFastener.requestedThicknessMm !== wallFastener.resolvedThicknessMm) {
    notes.push(
      `Для стенового крепежа использована ближайшая толщина ${wallFastener.resolvedThicknessMm} мм вместо ${wallFastener.requestedThicknessMm} мм.`,
    )
  }
  if (roofFastener.requestedThicknessMm !== roofFastener.resolvedThicknessMm) {
    notes.push(
      `Для кровельного крепежа использована ближайшая толщина ${roofFastener.resolvedThicknessMm} мм вместо ${roofFastener.requestedThicknessMm} мм.`,
    )
  }
  if (wallFastenerPrice.requestedLengthMm !== wallFastenerPrice.resolvedLengthMm) {
    notes.push(
      `Для стенового крепежа применена цена ближайшей длины ${wallFastenerPrice.resolvedLengthMm} мм вместо ${wallFastenerPrice.requestedLengthMm} мм.`,
    )
  }
  if (roofFastenerPrice.requestedLengthMm !== roofFastenerPrice.resolvedLengthMm) {
    notes.push(
      `Для кровельного крепежа применена цена ближайшей длины ${roofFastenerPrice.resolvedLengthMm} мм вместо ${roofFastenerPrice.requestedLengthMm} мм.`,
    )
  }

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
        wallFastenerLengthMm: wallFastener.lengthMm,
        wallFastenerPriceRub: wallFastenerPrice.unitPriceRub,
        roofFastenerLengthMm: roofFastener.lengthMm,
        roofFastenerPriceRub: roofFastenerPrice.unitPriceRub,
        notes,
      }),
    ]),
  ) as Record<EnclosingClassKey, EnclosingClassSpecification>

  return {
    snapshot: {
      sourceWorkbook: 'Прайс-лист №12.1 40 55 (14.08.2025), стр. 28',
      sourceSheets: [
        'Панели МВ (класс 1/класс 2, стр. 28)',
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
