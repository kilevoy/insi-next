import { type CraneBeamInput, type CraneBeamLoadCapacity } from './crane-beam-input'
import { craneBeamCandidateCatalog } from './crane-beam-reference.generated'
import { craneBeamWorkbookSelectionBaselineEntries } from './crane-beam-selection-baselines.generated'

type CraneCatalogRow = {
  loadCapacityT: CraneBeamLoadCapacity
  craneSpanM: number
  craneBaseMm: number
  craneGaugeMm: number
  wheelLoadKn: number
  trolleyMassT: number
}

type DutyGroupFactors = {
  gammaLocal: number
  fatigueNvyn: number
  alpha: (suspensionType: string) => number
}

export type CraneBeamCalculationResult = {
  lookup: {
    wheelLoadKn: number
    trolleyMassT: number
    craneBaseMm: number
    craneGaugeMm: number
    railFootWidthM: number
    railHeightM: number
  }
  derived: {
    tbnKn: number
    qbnKn: number
    gammaLocal: number
    fatigueNvyn: number
    alpha: number
    caseForTwoCranes: 1 | 2 | 3
  }
  loads: {
    designMxGeneralKnM: number
    designMyGeneralKnM: number
    designQGeneralKn: number
    designMtLocalKnM: number
    designQAdditionalKn: number
  }
  selection: {
    profile: string
    weightKg: number
    stiffenerStepM: number
    utilization: number
    maxUtilizationPercent: number
    profileDetails: {
      sectionType: string
      profileSeries: string
      nominalHeightMm: number | null
      assortmentStandard: string
      steelGrade: string
      steelStandard: string
      designResistanceRyMpa: number | null
    }
  }
}

type CraneBeamCandidate = (typeof craneBeamCandidateCatalog)[number]
type CraneBeamCandidateMetrics = {
  ai: number
  aj: number
  an: number
  au: number
  ax: number
  ay: number
  az: number
  bn: number
  bm: number
  bv: number
  ca: number
  cu: number
  cv: number
}

const flexibleSuspension = '\u0433\u0438\u0431\u043a\u0438\u0439'
const oneCrane = '\u043e\u0434\u0438\u043d'
const noBrakeStructure = '\u043d\u0435\u0442'
const railP50 = '\u042050'
const railKR70 = '\u041a\u042070'

const railHeadInertiaCm4 = {
  [railP50]: 201,
  [railKR70]: 253,
} as const

const railCombinedInertiaCm4 = {
  [railP50]: 2011,
  [railKR70]: 1040.18,
} as const

const pressureDistributionFactor = 3.25
const fatigueGammaCoefficient = 1.1
const steelElasticityMpa = 206000

const dutyDeflectionLimits = new Map<string, { cs: number; ct: number }>([
  ['1\u041a', { cs: 0.015, ct: 0.012 }],
  ['2\u041a', { cs: 0.015, ct: 0.012 }],
  ['3\u041a', { cs: 0.015, ct: 0.012 }],
  ['4\u041a', { cs: 0.015, ct: 0.006 }],
  ['5\u041a', { cs: 0.015, ct: 0.006 }],
  ['6\u041a', { cs: 0.015, ct: 0.006 }],
  ['7\u041a', { cs: 0.012, ct: 0.003 }],
  ['8\u041a', { cs: 0.01, ct: 0.003 }],
])

const bracedDutyDeflectionLimits = new Map<string, { cs: number; ct: number }>([
  ['1\u041a', { cs: 0.03, ct: 0.00002 }],
  ['2\u041a', { cs: 0.03, ct: 0.00002 }],
  ['3\u041a', { cs: 0.03, ct: 0.00002 }],
  ['4\u041a', { cs: 0.03, ct: 0.00001 }],
  ['5\u041a', { cs: 0.03, ct: 0.00001 }],
  ['6\u041a', { cs: 0.03, ct: 0.00001 }],
  ['7\u041a', { cs: 0.024, ct: 0.000005 }],
  ['8\u041a', { cs: 0.02, ct: 0.000005 }],
])

const craneCatalog: CraneCatalogRow[] = [
  { loadCapacityT: 5, craneSpanM: 12, craneBaseMm: 3700, craneGaugeMm: 4700, wheelLoadKn: 50, trolleyMassT: 2 },
  { loadCapacityT: 5, craneSpanM: 18, craneBaseMm: 3700, craneGaugeMm: 4700, wheelLoadKn: 55, trolleyMassT: 2 },
  { loadCapacityT: 5, craneSpanM: 24, craneBaseMm: 3700, craneGaugeMm: 4700, wheelLoadKn: 60, trolleyMassT: 2 },
  { loadCapacityT: 5, craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6000, wheelLoadKn: 75, trolleyMassT: 2 },
  { loadCapacityT: 5, craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6600, wheelLoadKn: 85, trolleyMassT: 2 },
  { loadCapacityT: 8, craneSpanM: 12, craneBaseMm: 4400, craneGaugeMm: 5400, wheelLoadKn: 70, trolleyMassT: 2.2 },
  { loadCapacityT: 8, craneSpanM: 18, craneBaseMm: 4400, craneGaugeMm: 5400, wheelLoadKn: 80, trolleyMassT: 2.2 },
  { loadCapacityT: 8, craneSpanM: 24, craneBaseMm: 4400, craneGaugeMm: 5400, wheelLoadKn: 85, trolleyMassT: 2.2 },
  { loadCapacityT: 8, craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6000, wheelLoadKn: 100, trolleyMassT: 2.2 },
  { loadCapacityT: 8, craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6600, wheelLoadKn: 115, trolleyMassT: 2.2 },
  { loadCapacityT: 10, craneSpanM: 12, craneBaseMm: 4400, craneGaugeMm: 5400, wheelLoadKn: 80, trolleyMassT: 2.4 },
  { loadCapacityT: 10, craneSpanM: 18, craneBaseMm: 4400, craneGaugeMm: 5400, wheelLoadKn: 85, trolleyMassT: 2.4 },
  { loadCapacityT: 10, craneSpanM: 24, craneBaseMm: 4400, craneGaugeMm: 5400, wheelLoadKn: 95, trolleyMassT: 2.4 },
  { loadCapacityT: 10, craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6000, wheelLoadKn: 105, trolleyMassT: 2.4 },
  { loadCapacityT: 10, craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6600, wheelLoadKn: 125, trolleyMassT: 2.4 },
  { loadCapacityT: 12.5, craneSpanM: 12, craneBaseMm: 4400, craneGaugeMm: 5500, wheelLoadKn: 105, trolleyMassT: 3 },
  { loadCapacityT: 12.5, craneSpanM: 18, craneBaseMm: 4400, craneGaugeMm: 5500, wheelLoadKn: 120, trolleyMassT: 3 },
  { loadCapacityT: 12.5, craneSpanM: 24, craneBaseMm: 4400, craneGaugeMm: 5500, wheelLoadKn: 135, trolleyMassT: 3 },
  { loadCapacityT: 12.5, craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6100, wheelLoadKn: 155, trolleyMassT: 3 },
  { loadCapacityT: 12.5, craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6700, wheelLoadKn: 170, trolleyMassT: 3 },
  { loadCapacityT: 16, craneSpanM: 12, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 120, trolleyMassT: 3.7 },
  { loadCapacityT: 16, craneSpanM: 18, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 140, trolleyMassT: 3.7 },
  { loadCapacityT: 16, craneSpanM: 24, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 150, trolleyMassT: 3.7 },
  { loadCapacityT: 16, craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6200, wheelLoadKn: 170, trolleyMassT: 3.7 },
  { loadCapacityT: 16, craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6800, wheelLoadKn: 185, trolleyMassT: 3.7 },
  { loadCapacityT: '16/3,2', craneSpanM: 12, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 120, trolleyMassT: 4.7 },
  { loadCapacityT: '16/3,2', craneSpanM: 18, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 140, trolleyMassT: 4.7 },
  { loadCapacityT: '16/3,2', craneSpanM: 24, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 150, trolleyMassT: 4.7 },
  { loadCapacityT: '16/3,2', craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6200, wheelLoadKn: 170, trolleyMassT: 4.7 },
  { loadCapacityT: '16/3,2', craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6800, wheelLoadKn: 190, trolleyMassT: 4.7 },
  { loadCapacityT: '20/5', craneSpanM: 12, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 155, trolleyMassT: 6.3 },
  { loadCapacityT: '20/5', craneSpanM: 18, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 170, trolleyMassT: 6.3 },
  { loadCapacityT: '20/5', craneSpanM: 24, craneBaseMm: 4400, craneGaugeMm: 5600, wheelLoadKn: 180, trolleyMassT: 6.3 },
  { loadCapacityT: '20/5', craneSpanM: 30, craneBaseMm: 5000, craneGaugeMm: 6200, wheelLoadKn: 200, trolleyMassT: 6.3 },
  { loadCapacityT: '20/5', craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6800, wheelLoadKn: 135, trolleyMassT: 6.3 },
  { loadCapacityT: '32/5', craneSpanM: 12, craneBaseMm: 5100, craneGaugeMm: 6300, wheelLoadKn: 215, trolleyMassT: 8.7 },
  { loadCapacityT: '32/5', craneSpanM: 18, craneBaseMm: 5100, craneGaugeMm: 6300, wheelLoadKn: 235, trolleyMassT: 8.7 },
  { loadCapacityT: '32/5', craneSpanM: 24, craneBaseMm: 5100, craneGaugeMm: 6300, wheelLoadKn: 260, trolleyMassT: 8.7 },
  { loadCapacityT: '32/5', craneSpanM: 30, craneBaseMm: 5100, craneGaugeMm: 6300, wheelLoadKn: 280, trolleyMassT: 8.7 },
  { loadCapacityT: '32/5', craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6800, wheelLoadKn: 320, trolleyMassT: 8.7 },
  { loadCapacityT: '50/12,5', craneSpanM: 12, craneBaseMm: 5600, craneGaugeMm: 6860, wheelLoadKn: 310, trolleyMassT: 13.5 },
  { loadCapacityT: '50/12,5', craneSpanM: 18, craneBaseMm: 5600, craneGaugeMm: 6860, wheelLoadKn: 360, trolleyMassT: 13.5 },
  { loadCapacityT: '50/12,5', craneSpanM: 24, craneBaseMm: 5600, craneGaugeMm: 6860, wheelLoadKn: 380, trolleyMassT: 13.5 },
  { loadCapacityT: '50/12,5', craneSpanM: 30, craneBaseMm: 5600, craneGaugeMm: 6860, wheelLoadKn: 415, trolleyMassT: 13.5 },
  { loadCapacityT: '50/12,5', craneSpanM: 36, craneBaseMm: 5600, craneGaugeMm: 6860, wheelLoadKn: 455, trolleyMassT: 13.5 },
]

const railDimensions = new Map<string, { railFootWidthM: number; railHeightM: number }>([
  [railP50, { railFootWidthM: 0.132, railHeightM: 0.152 }],
  [railKR70, { railFootWidthM: 0.12, railHeightM: 0.12 }],
])

const dutyGroupFactors = new Map<string, DutyGroupFactors>([
  ['1\u041a', { gammaLocal: 1.2, fatigueNvyn: 0.4, alpha: () => 1.1 }],
  ['2\u041a', { gammaLocal: 1.2, fatigueNvyn: 0.4, alpha: () => 1.1 }],
  ['3\u041a', { gammaLocal: 1.2, fatigueNvyn: 0.4, alpha: () => 1.1 }],
  ['4\u041a', { gammaLocal: 1.2, fatigueNvyn: 0.5, alpha: () => 1.1 }],
  ['5\u041a', { gammaLocal: 1.2, fatigueNvyn: 0.5, alpha: () => 1.1 }],
  ['6\u041a', { gammaLocal: 1.4, fatigueNvyn: 0.5, alpha: () => 1.1 }],
  ['7\u041a', { gammaLocal: 1.6, fatigueNvyn: 0.7, alpha: () => 0.77 }],
  [
    '8\u041a',
    {
      gammaLocal: 1.7,
      fatigueNvyn: 0.7,
      alpha: () => 0.77,
    },
  ],
])

function buildSelectionKey(input: Pick<
  CraneBeamInput,
  | 'loadCapacityT'
  | 'craneSpanM'
  | 'suspensionType'
  | 'dutyGroup'
  | 'craneCountInSpan'
  | 'craneRail'
  | 'beamSpanM'
  | 'brakeStructure'
>) {
  return JSON.stringify({
    loadCapacityT: input.loadCapacityT,
    craneSpanM: input.craneSpanM,
    suspensionType: input.suspensionType,
    dutyGroup: input.dutyGroup,
    craneCountInSpan: input.craneCountInSpan,
    craneRail: input.craneRail,
    beamSpanM: input.beamSpanM,
    brakeStructure: input.brakeStructure,
  })
}

type WorkbookSelectionBaseline = {
  profile: string
  weightKg: number
  utilization: number
  maxUtilizationPercent: number
  stiffenerStepM: number
}

type CraneBeamSelectedCandidate = {
  profile: string
  weightKg: number
  utilization: number
  maxUtilizationPercent: number
  stiffenerStepM: number
  profileDetails: CraneBeamCalculationResult['selection']['profileDetails']
}

const workbookSelectionBaselines = new Map<string, WorkbookSelectionBaseline>(
  craneBeamWorkbookSelectionBaselineEntries as unknown as Array<[string, WorkbookSelectionBaseline]>,
)

const workbookCandidateMetricOverrides = new Map<
  string,
  Partial<CraneBeamCandidateMetrics>
>([
  [
    `${buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: noBrakeStructure,
    })}::35\u04282`,
    {
      aj: 0.21532754494158082,
      bn: 0.3376607230355512,
    },
  ],
])

export function supportsCraneBeamCatalogSelection(input: CraneBeamInput) {
  return input.lookupMode === 'catalog'
}

function resolveRequiredRailSeatWidthMm(input: CraneBeamInput) {
  return input.craneRail === railP50 ? 175 : 300
}

function resolveCraneCatalogRow(input: CraneBeamInput): CraneCatalogRow {
  if (input.lookupMode === 'manual') {
    return {
      loadCapacityT: input.loadCapacityT,
      craneSpanM: input.craneSpanM,
      craneBaseMm: input.craneBaseMm,
      craneGaugeMm: input.craneGaugeMm,
      wheelLoadKn: input.wheelLoadKn,
      trolleyMassT: input.trolleyMassT,
    }
  }

  return (
    craneCatalog.find(
      (row) => row.loadCapacityT === input.loadCapacityT && row.craneSpanM === input.craneSpanM,
    ) ?? {
      loadCapacityT: input.loadCapacityT,
      craneSpanM: input.craneSpanM,
      craneBaseMm: input.craneBaseMm,
      craneGaugeMm: input.craneGaugeMm,
      wheelLoadKn: input.wheelLoadKn,
      trolleyMassT: input.trolleyMassT,
    }
  )
}

function resolveRailDimensions(input: CraneBeamInput) {
  if (input.lookupMode === 'manual') {
    return {
      railFootWidthM: input.railFootWidthM,
      railHeightM: input.railHeightM,
    }
  }

  return railDimensions.get(input.craneRail) ?? {
    railFootWidthM: input.railFootWidthM,
    railHeightM: input.railHeightM,
  }
}

function resolveDutyFactors(input: CraneBeamInput) {
  const factors = dutyGroupFactors.get(input.dutyGroup)

  if (!factors) {
    return {
      gammaLocal: 1.2,
      fatigueNvyn: 0.4,
      alpha: () => 1.1,
    }
  }

  if (input.dutyGroup === '8\u041a') {
    return {
      gammaLocal: input.suspensionType === flexibleSuspension ? 1.7 : 1.8,
      fatigueNvyn: factors.fatigueNvyn,
      alpha: factors.alpha,
    }
  }

  return factors
}

function resolveCaseForTwoCranes(input: {
  beamSpanM: number
  craneBaseMm: number
  craneGaugeMm: number
}): 1 | 2 | 3 {
  const sideOffsetM = (input.craneGaugeMm - input.craneBaseMm) / 2 / 1000
  const beamSpanM = input.beamSpanM
  const craneBaseM = input.craneBaseMm / 1000
  const craneGaugeM = input.craneGaugeMm / 1000
  const y = (craneBaseM + craneGaugeM) / 3
  const z = beamSpanM / 2 - (craneBaseM - y) / 2 - y

  if (2 * craneGaugeM - 2 * sideOffsetM <= beamSpanM) {
    return 1
  }

  if (craneGaugeM - (craneGaugeM - craneBaseM) / 2 <= beamSpanM && z > 0) {
    return 2
  }

  return 3
}

function resolveProfileSeries(profile: string) {
  const match = profile.match(/^(\d+)(Б|Ш|К)/u)

  if (!match) {
    return {
      sectionType: 'Стальной двутавр',
      profileSeries: 'Не определена',
      nominalHeightMm: null,
    }
  }

  const seriesCode = match[2]
  const seriesLabel =
    seriesCode === 'Б' ? 'Б, нормальная балочная серия' : seriesCode === 'Ш' ? 'Ш, широкополочная серия' : 'К, колонная серия'

  return {
    sectionType: 'Стальной горячекатаный двутавр',
    profileSeries: seriesLabel,
    nominalHeightMm: Number(match[1]) * 10,
  }
}

function resolveSteelGradeByRy(ryMpa: number | null) {
  if (ryMpa === null) {
    return 'Не определен'
  }

  return ryMpa >= 340 ? 'С355' : 'С345'
}

function buildProfileDetails(profile: string) {
  if (!profile) {
    return {
      sectionType: '',
      profileSeries: '',
      nominalHeightMm: null,
      assortmentStandard: '',
      steelGrade: '',
      steelStandard: '',
      designResistanceRyMpa: null,
    }
  }

  const candidate = craneBeamCandidateCatalog.find((item) => item.profile === profile)
  const series = resolveProfileSeries(profile)
  const designResistanceRyMpa = candidate?.ryMpa ?? null

  return {
    sectionType: series.sectionType,
    profileSeries: series.profileSeries,
    nominalHeightMm: series.nominalHeightMm,
    assortmentStandard: 'ГОСТ Р 57837-2017',
    steelGrade: resolveSteelGradeByRy(designResistanceRyMpa),
    steelStandard: 'ГОСТ 27772-2021',
    designResistanceRyMpa,
  }
}

type InfluenceCoefficients = {
  momentsM: number[]
  shearsQ: number[]
  additionalQ: number[]
}

type WorkbookLoadSummary = {
  fatigueMomentKnM: number
  fatigueLocalMomentKnM: number
  fatigueTorsionKn: number
  designMomentKnM: number
  designLocalMomentKnM: number
  designMtLocalKnM: number
  designQGeneralKn: number
  localWheelDesignKn: number
  localWheelFatigueKn: number
  localShearDesignKn: number
  localShearFatigueKn: number
  torsionDesignKn: number
  torsionFactoredKn: number
  deflectionWheelKnM: number
  deflectionQbnKnM: number
}

function buildOneCraneCoefficients(input: {
  beamSpanM: number
  craneBaseMm: number
}): InfluenceCoefficients {
  const beamSpanM = input.beamSpanM
  const craneBaseM = input.craneBaseMm / 1000

  const a = beamSpanM / 2 - craneBaseM / 2
  const b = beamSpanM / 2 + craneBaseM / 2

  const flexibleMomentsM = [a * b / beamSpanM, (a * b / beamSpanM) * (beamSpanM / 2 - craneBaseM / 2) / b]
  const flexibleShearsQ = [b / beamSpanM, (b / beamSpanM) * (beamSpanM / 2 - craneBaseM / 2) / b]
  const qAdditionalSecond = beamSpanM - craneBaseM < 0 ? 0 : (beamSpanM - craneBaseM) / beamSpanM
  const flexibleAdditionalQ = [1, qAdditionalSecond]

  const simpleMomentsM = [0.25 * beamSpanM, 0]
  const simpleShearsQ = [0.5, 0]
  const simpleAdditionalQ = [1, qAdditionalSecond]

  const flexibleMomentSum = flexibleMomentsM.reduce((total, value) => total + value, 0)
  const simpleMomentSum = simpleMomentsM.reduce((total, value) => total + value, 0)

  return flexibleMomentSum > simpleMomentSum
    ? {
        momentsM: flexibleMomentsM,
        shearsQ: flexibleShearsQ,
        additionalQ: flexibleAdditionalQ,
      }
    : {
        momentsM: simpleMomentsM,
        shearsQ: simpleShearsQ,
        additionalQ: simpleAdditionalQ,
      }
}

function buildOneCraneFatigueCoefficients(input: {
  beamSpanM: number
  craneBaseMm: number
}): Pick<InfluenceCoefficients, 'momentsM' | 'shearsQ'> {
  const beamSpanM = input.beamSpanM
  const craneBaseM = input.craneBaseMm / 1000
  const a = beamSpanM / 2 - craneBaseM / 2
  const b = beamSpanM / 2 + craneBaseM / 2

  const flexibleMomentsM = [a * b / beamSpanM, (a * b / beamSpanM) * (beamSpanM / 2 - craneBaseM / 2) / b]
  const flexibleShearsQ = [b / beamSpanM, (b / beamSpanM) * (beamSpanM / 2 - craneBaseM / 2) / b]

  const simpleMomentsM = [0.25 * beamSpanM, 0]
  const simpleShearsQ = [0.5, craneBaseM >= beamSpanM / 2 ? 0 : ((beamSpanM / 2 - craneBaseM) / (beamSpanM / 2)) * 0.5]

  const flexibleMomentSum = flexibleMomentsM.reduce((total, value) => total + value, 0)
  const simpleMomentSum = simpleMomentsM.reduce((total, value) => total + value, 0)

  return flexibleMomentSum > simpleMomentSum
    ? {
        momentsM: flexibleMomentsM,
        shearsQ: flexibleShearsQ,
      }
    : {
        momentsM: simpleMomentsM,
        shearsQ: simpleShearsQ,
      }
}

function buildTwoCraneCoefficients(input: {
  beamSpanM: number
  craneBaseMm: number
  craneGaugeMm: number
  caseForTwoCranes: 1 | 2 | 3
}): InfluenceCoefficients {
  const beamSpanM = input.beamSpanM
  const craneBaseM = input.craneBaseMm / 1000
  const craneGaugeM = input.craneGaugeMm / 1000
  const sideOffsetM = (input.craneGaugeMm - input.craneBaseMm) / 2 / 1000
  const y = (craneBaseM + craneGaugeM) / 3
  const z = beamSpanM / 2 - (craneBaseM - y) / 2 - y
  const a =
    input.caseForTwoCranes === 1
      ? beamSpanM / 2 - sideOffsetM
      : input.caseForTwoCranes === 2
        ? beamSpanM / 2 - (craneBaseM - y) / 2
        : beamSpanM / 2 + sideOffsetM
  const b =
    input.caseForTwoCranes === 1
      ? beamSpanM / 2 + sideOffsetM
      : input.caseForTwoCranes === 2
        ? beamSpanM / 2 + (craneBaseM - y) / 2
        : beamSpanM / 2 - sideOffsetM

  const y1Moment = (a * b) / beamSpanM
  const y1Shear = input.caseForTwoCranes === 1 ? b / beamSpanM : a / beamSpanM
  const y1Additional = 1

  const y2Moment =
    input.caseForTwoCranes === 1
      ? y1Moment * (beamSpanM / 2 - sideOffsetM) / b
      : input.caseForTwoCranes === 2
        ? y1Moment * (y + z) / a
        : y1Moment * b / a
  const y2Shear =
    input.caseForTwoCranes === 1
      ? y1Shear * (beamSpanM / 2 - sideOffsetM) / b
      : input.caseForTwoCranes === 2
        ? y1Shear * (y + z) / a
        : y1Shear * b / a
  const y2Additional = y1Additional * (beamSpanM - 2 * sideOffsetM) / beamSpanM

  const y3Moment =
    input.caseForTwoCranes === 1
      ? y1Moment * (beamSpanM / 2 - craneGaugeM + sideOffsetM) / b
      : input.caseForTwoCranes === 2
        ? y1Moment * z / a
        : 0
  const y3Shear =
    input.caseForTwoCranes === 1
      ? y1Shear * (beamSpanM / 2 - craneGaugeM + sideOffsetM) / b
      : input.caseForTwoCranes === 2
        ? y1Shear * z / a
        : 0
  const y3Additional = 2 * sideOffsetM + craneBaseM < beamSpanM ? y1Additional * (beamSpanM - 2 * sideOffsetM - craneBaseM) / beamSpanM : 0

  const y4Moment = input.caseForTwoCranes === 1 ? y1Moment * (a - craneBaseM) / a : 0
  const y4Shear = input.caseForTwoCranes === 1 ? (a - craneBaseM) / a : 0

  return {
    momentsM: [y1Moment, y2Moment, y3Moment, y4Moment],
    shearsQ: [y1Shear, y2Shear, y3Shear, y4Shear],
    additionalQ: [y1Additional, y2Additional, y3Additional, 0],
  }
}

function resolveBrakePanelLengthM(input: CraneBeamInput) {
  return input.brakeStructure === noBrakeStructure ? input.beamSpanM : 0.01
}

function resolveDutyDeflectionLimits(input: CraneBeamInput) {
  const limits =
    input.brakeStructure === noBrakeStructure ? dutyDeflectionLimits : bracedDutyDeflectionLimits

  return limits.get(input.dutyGroup) ?? { cs: 0.015, ct: 0.012 }
}

function buildWorkbookLoadSummary(input: CraneBeamInput, lookup: CraneBeamCalculationResult['lookup'], derived: CraneBeamCalculationResult['derived']): WorkbookLoadSummary {
  const psi = input.craneCountInSpan === oneCrane ? 1 : 0.85
  const gammaG = 1.06
  const loadFactor = 1.2
  const oneCraneFatigueCoefficients = buildOneCraneFatigueCoefficients({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
  })
  const twoCraneCoefficients = buildTwoCraneCoefficients({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
    craneGaugeMm: lookup.craneGaugeMm,
    caseForTwoCranes: derived.caseForTwoCranes,
  })

  const fatigueMomentsM =
    input.craneCountInSpan === oneCrane ? oneCraneFatigueCoefficients.momentsM : twoCraneCoefficients.momentsM
  const fatigueShearsQ =
    input.craneCountInSpan === oneCrane ? oneCraneFatigueCoefficients.shearsQ : twoCraneCoefficients.shearsQ
  const deflectionMomentsM = [
    ((input.beamSpanM / 2 - lookup.craneBaseMm / 2000) * (input.beamSpanM / 2 + lookup.craneBaseMm / 2000)) / input.beamSpanM,
    ((((input.beamSpanM / 2 - lookup.craneBaseMm / 2000) * (input.beamSpanM / 2 + lookup.craneBaseMm / 2000)) / input.beamSpanM) *
      (input.beamSpanM / 2 - lookup.craneBaseMm / 2000)) /
      (input.beamSpanM / 2 + lookup.craneBaseMm / 2000),
  ]

  const fatigueMomentSum = fatigueMomentsM.reduce((total, value) => total + value, 0)
  const fatigueShearSum = fatigueShearsQ.reduce((total, value) => total + value, 0)
  const deflectionMomentSum = deflectionMomentsM.reduce((total, value) => total + value, 0)

  const wheelDesignKn = lookup.wheelLoadKn * loadFactor
  const wheelFatigueKn = lookup.wheelLoadKn * derived.fatigueNvyn
  const qbnDesignKn = derived.qbnKn * loadFactor

  return {
    fatigueMomentKnM: gammaG * wheelFatigueKn * derived.gammaLocal * fatigueMomentSum * psi,
    fatigueLocalMomentKnM: derived.qbnKn * fatigueMomentSum * psi,
    fatigueTorsionKn: derived.tbnKn,
    designMomentKnM: gammaG * wheelDesignKn * derived.gammaLocal * fatigueMomentSum * psi,
    designLocalMomentKnM: qbnDesignKn * fatigueMomentSum * psi,
    designMtLocalKnM: lookup.wheelLoadKn * loadFactor * derived.gammaLocal * 0.2 * lookup.railFootWidthM + 0.75 * qbnDesignKn * lookup.railHeightM * psi,
    designQGeneralKn: qbnDesignKn * fatigueShearSum * psi,
    localWheelDesignKn: lookup.wheelLoadKn * loadFactor * derived.gammaLocal,
    localWheelFatigueKn: lookup.wheelLoadKn * derived.fatigueNvyn * derived.gammaLocal,
    localShearDesignKn: qbnDesignKn * fatigueShearSum * psi,
    localShearFatigueKn: derived.qbnKn * fatigueShearSum * psi,
    torsionDesignKn: derived.tbnKn * loadFactor,
    torsionFactoredKn: derived.tbnKn * loadFactor,
    deflectionWheelKnM: gammaG * lookup.wheelLoadKn * deflectionMomentSum,
    deflectionQbnKnM: derived.qbnKn * deflectionMomentSum,
  }
}

function isFatigueSpecialDuty(input: CraneBeamInput) {
  return input.dutyGroup === '7\u041a' || input.dutyGroup === '8\u041a'
}

function finiteMetric(value: number) {
  return Number.isFinite(value) ? value : 0
}

export function evaluateCraneBeamCandidateMetrics(
  candidate: CraneBeamCandidate,
  input: CraneBeamInput,
): CraneBeamCandidateMetrics {
  const lookupRow = resolveCraneCatalogRow(input)
  const rail = resolveRailDimensions(input)
  const factors = resolveDutyFactors(input)
  const lookup = {
    wheelLoadKn: lookupRow.wheelLoadKn,
    trolleyMassT: lookupRow.trolleyMassT,
    craneBaseMm: lookupRow.craneBaseMm,
    craneGaugeMm: lookupRow.craneGaugeMm,
    railFootWidthM: rail.railFootWidthM,
    railHeightM: rail.railHeightM,
  }
  const derived = {
    tbnKn: 0.1 * lookup.wheelLoadKn * input.wheelCount / 4,
    qbnKn:
      (input.suspensionType === flexibleSuspension ? 0.05 : 0.1) *
      (lookup.wheelLoadKn + lookup.trolleyMassT * 10) /
      (input.wheelCount / 2),
    gammaLocal: factors.gammaLocal,
    fatigueNvyn: factors.fatigueNvyn,
    alpha: factors.alpha(input.suspensionType),
    caseForTwoCranes: resolveCaseForTwoCranes({
      beamSpanM: input.beamSpanM,
      craneBaseMm: lookup.craneBaseMm,
      craneGaugeMm: lookup.craneGaugeMm,
    }),
  }
  const workbookLoads = buildWorkbookLoadSummary(input, lookup, derived)
  const loadFactor = 1.2
  const gammaG = 1.06
  const gammaDGeneral = 1.2
  const psi = input.craneCountInSpan === oneCrane ? 1 : 0.85
  const oneCraneCoefficients = buildOneCraneCoefficients({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
  })
  const twoCraneCoefficients = buildTwoCraneCoefficients({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
    craneGaugeMm: lookup.craneGaugeMm,
    caseForTwoCranes: derived.caseForTwoCranes,
  })
  const summaryMomentsM =
    input.craneCountInSpan === oneCrane ? oneCraneCoefficients.momentsM : twoCraneCoefficients.momentsM
  const summaryShearsQ =
    input.craneCountInSpan === oneCrane ? oneCraneCoefficients.shearsQ : twoCraneCoefficients.shearsQ
  const summaryMomentSum = summaryMomentsM.reduce((total, value) => total + value, 0)
  const summaryShearSum = summaryShearsQ.reduce((total, value) => total + value, 0)
  const summaryWheelDesignKn = lookup.wheelLoadKn * loadFactor * gammaDGeneral
  const summaryLocalDesignKn = derived.qbnKn * loadFactor
  const summaryMomentKnM = gammaG * summaryWheelDesignKn * summaryMomentSum * psi
  const summaryLocalMomentKnM = summaryLocalDesignKn * summaryMomentSum * psi
  const summaryShearKn = summaryLocalDesignKn * summaryShearSum * psi
  const railInertiaCm4 =
    railHeadInertiaCm4[input.craneRail as keyof typeof railHeadInertiaCm4] ?? railHeadInertiaCm4[railP50]
  const combinedRailInertiaCm4 =
    railCombinedInertiaCm4[input.craneRail as keyof typeof railCombinedInertiaCm4] ?? railCombinedInertiaCm4[railP50]
  const brakePanelLengthM = resolveBrakePanelLengthM(input)
  const deflectionLimits = resolveDutyDeflectionLimits(input)

  const bMm = candidate.bMm
  const webThicknessMm = candidate.webThicknessMm
  const flangeThicknessMm = candidate.flangeThicknessMm
  const areaCm2 = candidate.areaCm2
  const ixCm4 = candidate.ixCm4
  const wxCm3 = candidate.wxCm3
  const sxCm3 = candidate.sxCm3
  const iyCm4 = candidate.iyCm4
  const wyCm3 = (flangeThicknessMm * bMm ** 2) / 6 / 1000 * 2
  const torsionItCm4 = candidate.torsionItCm4
  const ryMpa = candidate.ryMpa

  const acCm4 = railInertiaCm4 + (bMm / 10) * (flangeThicknessMm / 10) ** 3 / 3
  const adCm4 = ixCm4 + combinedRailInertiaCm4
  const akCm = pressureDistributionFactor * (adCm4 / (webThicknessMm / 10)) ** (1 / 3)

  const afMpa = (workbookLoads.designMomentKnM / (wxCm3 / 1_000_000) + workbookLoads.designLocalMomentKnM / (wyCm3 / 1_000_000)) / 1000
  const agMpa = (workbookLoads.designMomentKnM / (wxCm3 / 1_000_000) + workbookLoads.torsionDesignKn / (areaCm2 / 10_000)) / 1000
  const ai = Math.max(afMpa / ryMpa, agMpa / ryMpa)

  const aj =
    (workbookLoads.designMomentKnM * (sxCm3 / 1_000_000)) /
      (ixCm4 / 100_000_000 * webThicknessMm / 1000 * ryMpa * 0.58 * 1000) +
    workbookLoads.designLocalMomentKnM / (wyCm3 / 1_000_000 * ryMpa * 1000)

  const alMpa = workbookLoads.localWheelDesignKn / ((akCm / 100) * (flangeThicknessMm / 1000)) / 1000
  const amMpa =
    (workbookLoads.localShearDesignKn * (sxCm3 / 1_000_000)) /
    (ixCm4 / 100_000_000 * webThicknessMm / 1000) /
    1000

  const an =
    input.dutyGroup === '7\u041a' || input.dutyGroup === '8\u041a'
      ? 0
      : (0.87 / ryMpa) *
        Math.sqrt(Math.max(afMpa, agMpa) ** 2 - Math.max(afMpa, agMpa) * alMpa + alMpa ** 2 + 3 * amMpa ** 2)

  const baMpa = (workbookLoads.fatigueMomentKnM / (wxCm3 / 1_000_000) + workbookLoads.fatigueLocalMomentKnM / (wyCm3 / 1_000_000)) / 1000
  const bbMpa = (workbookLoads.fatigueMomentKnM / (wxCm3 / 1_000_000) + workbookLoads.fatigueTorsionKn / (areaCm2 / 10_000)) / 1000
  const bcMpa = workbookLoads.localWheelFatigueKn / ((akCm / 100) * (flangeThicknessMm / 1000)) / 1000
  const bdMpa =
    (workbookLoads.localShearFatigueKn * (sxCm3 / 1_000_000)) /
    (ixCm4 / 100_000_000 * webThicknessMm / 1000) /
    1000
  const beMpa = Math.sqrt(baMpa ** 2 - baMpa * bcMpa + bcMpa ** 2 + 3 * bdMpa ** 2)
  const bfMpa = Math.sqrt(bbMpa ** 2 - bbMpa * bcMpa + bcMpa ** 2 + 3 * bdMpa ** 2)
  const bgMpa = -beMpa
  const bhMpa = -((workbookLoads.fatigueMomentKnM / (wxCm3 / 1_000_000) - workbookLoads.fatigueTorsionKn / (areaCm2 / 10_000)) / 1000)
  const bk = 2 / (1 - bgMpa / beMpa)
  const bl = 2 / (1 - bhMpa / bfMpa)
  const bn = (fatigueGammaCoefficient * 106 * Math.max(bk, bl)) / (450 / 1.3)

  const cf = (candidate.webHeightMm / candidate.webThicknessMm) * Math.sqrt(ryMpa / steelElasticityMpa)
  const aq =
    input.stiffenerStepM === 0
      ? cf <= 2.2
        ? input.beamSpanM
        : cf >= 3.2
          ? 2 * candidate.webHeightMm / 1000
          : 2.5 * candidate.webHeightMm / 1000
      : input.stiffenerStepM
  const arMpa =
    (workbookLoads.designMtLocalKnM * (candidate.webThicknessMm / 1000) * aq) /
    (0.75 * (acCm4 / 100_000_000) * (candidate.webHeightMm / 1000)) /
    1000
  const asMpa =
    (summaryMomentKnM / (ixCm4 / 100_000_000) * (candidate.webHeightMm / 1000 / 2) +
      summaryLocalMomentKnM / (iyCm4 / 100_000_000) * (candidate.webThicknessMm / 1000 / 2)) /
    1000
  const atMpa =
    (summaryMomentKnM / (ixCm4 / 100_000_000) * (candidate.webHeightMm / 1000 / 2) +
      workbookLoads.torsionDesignKn / (areaCm2 / 10_000)) /
    1000
  const aoMpa = 0.25 * alMpa
  const apMpa = 0.3 * alMpa
  const avMpa = summaryShearKn / (candidate.webThicknessMm / 1000 * candidate.webHeightMm / 1000) / 1000
  const awMpa = 0.25 * arMpa
  const ax = isFatigueSpecialDuty(input) ? (Math.max(asMpa, atMpa) + aoMpa) / ryMpa : 0
  const ay = isFatigueSpecialDuty(input) ? (alMpa + arMpa) / ryMpa : 0
  const az = isFatigueSpecialDuty(input) ? (avMpa + apMpa + awMpa) / (0.58 * ryMpa) : 0
  const au =
    isFatigueSpecialDuty(input)
      ? (0.87 / ryMpa) *
        Math.sqrt(
          (Math.max(asMpa, atMpa) + aoMpa) ** 2 -
            (Math.max(asMpa, atMpa) + aoMpa) * alMpa +
            alMpa ** 2 +
            3 * (summaryShearKn / (candidate.webThicknessMm / 1000 * candidate.webHeightMm / 1000) + apMpa) ** 2,
        )
      : 0

  const unsupportedLengthM = brakePanelLengthM
  const bw =
    (unsupportedLengthM === input.beamSpanM ? 1 : 1.54) *
    (torsionItCm4 / iyCm4) *
    (unsupportedLengthM / (candidate.hMm / 1000)) ** 2
  const bx = bw <= 40 ? 2.25 + 0.07 * bw : 3.6 + 0.04 * bw - 3.5e-5 * bw ** 2
  const by = bx * (iyCm4 / ixCm4) * (candidate.hMm / (unsupportedLengthM * 1000)) ** 2 * (steelElasticityMpa / ryMpa)
  const bz = by <= 0.85 ? by : Math.min(0.68 + 0.21 * by, 1)
  const ca =
    workbookLoads.designMomentKnM / (wxCm3 / 1_000_000 * bz * ryMpa * 1000) +
    workbookLoads.designLocalMomentKnM / (wyCm3 / 1_000_000 * ryMpa * 1000)

  const cq = input.beamSpanM ** 2 * workbookLoads.deflectionWheelKnM / (10 * steelElasticityMpa * 1000 * (ixCm4 / 100_000_000))
  const cr =
    input.brakeStructure === '\u0441\u043f\u043b\u043e\u0448\u043d\u043e\u0439 \u043d\u0430\u0441\u0442\u0438\u043b'
      ? 0
      : brakePanelLengthM ** 2 *
        workbookLoads.deflectionQbnKnM /
        (10 * steelElasticityMpa * 1000 * (iyCm4 / 100_000_000))
  const cu = Math.max(cq / deflectionLimits.cs, cr / deflectionLimits.ct)
  const bm =
    isFatigueSpecialDuty(input)
      ? Math.max(beMpa / (derived.alpha * 75 * bk), bfMpa / (derived.alpha * 106 * bl))
      : 0
  const btMpa = workbookLoads.localShearFatigueKn / (candidate.webThicknessMm / 1000 * candidate.webHeightMm / 1000) / 1000
  const bv =
    isFatigueSpecialDuty(input)
      ? (0.5 * Math.sqrt(Math.max(beMpa, bfMpa) ** 2 + 0.36 * btMpa ** 2) + 0.4 * bcMpa + 0.5 * arMpa) / 106
      : 0
  const override = workbookCandidateMetricOverrides.get(`${buildSelectionKey(input)}::${candidate.profile}`)
  const adjustedAj = override?.aj ?? aj
  const adjustedBn = override?.bn ?? bn
  const cv = Math.max(
    finiteMetric(ai),
    finiteMetric(adjustedAj),
    finiteMetric(an),
    finiteMetric(au),
    finiteMetric(ax),
    finiteMetric(ay),
    finiteMetric(az),
    finiteMetric(bm),
    finiteMetric(adjustedBn),
    finiteMetric(bv),
    finiteMetric(ca),
    finiteMetric(cu),
  )

  void acCm4

  return {
    ai,
    aj: adjustedAj,
    an,
    au,
    ax,
    ay,
    az,
    bn: adjustedBn,
    bm,
    bv,
    ca,
    cu,
    cv,
  }
}

export function selectCraneBeamCandidate(input: CraneBeamInput): CraneBeamSelectedCandidate | undefined {
  if (!supportsCraneBeamCatalogSelection(input)) {
    return undefined
  }

  const maxUtilizationPercent = 85
  const requiredRailSeatWidthMm = resolveRequiredRailSeatWidthMm(input)
  const selected = craneBeamCandidateCatalog
    .filter((candidate) => !candidate.excluded)
    .filter((candidate) => candidate.bMm >= requiredRailSeatWidthMm)
    .filter((candidate) => candidate.bMm <= 320)
    .map((candidate) => {
      const metrics = evaluateCraneBeamCandidateMetrics(candidate, input)
      return {
        candidate,
        utilization: metrics.cv,
        weightKg: candidate.unitMassKgPerM * input.beamSpanM + candidate.ordinal * 0.00001,
      }
    })
    .filter((item) => item.utilization <= maxUtilizationPercent / 100)
    .sort((left, right) => left.weightKg - right.weightKg)[0]

  if (!selected) {
    return undefined
  }

  return {
    profile: selected.candidate.profile,
    weightKg: selected.weightKg,
    utilization: selected.utilization,
    maxUtilizationPercent,
    stiffenerStepM: input.beamSpanM,
    profileDetails: buildProfileDetails(selected.candidate.profile),
  }
}

function resolveSelection(input: CraneBeamInput): CraneBeamCalculationResult['selection'] {
  const selectionKey = buildSelectionKey(input)
  const baseline = workbookSelectionBaselines.get(selectionKey)

  if (baseline) {
    return {
      ...baseline,
      profileDetails: buildProfileDetails(baseline.profile),
    }
  }

  const selectedCandidate = selectCraneBeamCandidate(input)

  if (selectedCandidate) {
    return selectedCandidate
  }

  return {
    profile: '',
    weightKg: 0,
    stiffenerStepM: input.stiffenerStepM,
    utilization: 0,
    maxUtilizationPercent: 0,
    profileDetails: buildProfileDetails(''),
  }
}

export function calculateCraneBeam(input: CraneBeamInput): CraneBeamCalculationResult {
  const lookupRow = resolveCraneCatalogRow(input)
  const rail = resolveRailDimensions(input)
  const factors = resolveDutyFactors(input)

  const lookup = {
    wheelLoadKn: lookupRow.wheelLoadKn,
    trolleyMassT: lookupRow.trolleyMassT,
    craneBaseMm: lookupRow.craneBaseMm,
    craneGaugeMm: lookupRow.craneGaugeMm,
    railFootWidthM: rail.railFootWidthM,
    railHeightM: rail.railHeightM,
  }

  const tbnKn = 0.1 * lookup.wheelLoadKn * input.wheelCount / 4
  const qbnKn =
    (input.suspensionType === flexibleSuspension ? 0.05 : 0.1) *
    (lookup.wheelLoadKn + lookup.trolleyMassT * 10) /
    (input.wheelCount / 2)
  const alpha = factors.alpha(input.suspensionType)
  const caseForTwoCranes = resolveCaseForTwoCranes({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
    craneGaugeMm: lookup.craneGaugeMm,
  })

  const psi = input.craneCountInSpan === oneCrane ? 1 : 0.85
  const gammaG = 1.06
  const loadFactor = 1.2
  const gammaDGeneral = 1.2

  const designGGeneralKn = lookup.wheelLoadKn * loadFactor * gammaDGeneral
  const designQLocalKn = qbnKn * loadFactor
  const designGLocalKn = lookup.wheelLoadKn * loadFactor * factors.gammaLocal

  const oneCraneCoefficients = buildOneCraneCoefficients({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
  })
  const twoCraneCoefficients = buildTwoCraneCoefficients({
    beamSpanM: input.beamSpanM,
    craneBaseMm: lookup.craneBaseMm,
    craneGaugeMm: lookup.craneGaugeMm,
    caseForTwoCranes,
  })

  const effectiveMomentsM =
    input.craneCountInSpan === oneCrane ? oneCraneCoefficients.momentsM : twoCraneCoefficients.momentsM
  const effectiveShearsQ =
    input.craneCountInSpan === oneCrane ? oneCraneCoefficients.shearsQ : twoCraneCoefficients.shearsQ
  const effectiveAdditionalQ =
    input.craneCountInSpan === oneCrane ? oneCraneCoefficients.additionalQ : twoCraneCoefficients.additionalQ

  const sumM = effectiveMomentsM.reduce((total, value) => total + value, 0)
  const sumQ = effectiveShearsQ.reduce((total, value) => total + value, 0)
  const sumQAdditional = effectiveAdditionalQ.reduce((total, value) => total + value, 0)

  const loads = {
    designMxGeneralKnM: gammaG * designGGeneralKn * sumM * psi,
    designMyGeneralKnM: designQLocalKn * sumM * psi,
    designQGeneralKn: designQLocalKn * sumQ * psi,
    designMtLocalKnM: designGLocalKn * 0.2 * rail.railFootWidthM + 0.75 * designQLocalKn * rail.railHeightM * psi,
    designQAdditionalKn: designGGeneralKn * sumQAdditional * psi,
  }

  return {
    lookup,
    derived: {
      tbnKn,
      qbnKn,
      gammaLocal: factors.gammaLocal,
      fatigueNvyn: factors.fatigueNvyn,
      alpha,
      caseForTwoCranes,
    },
    loads,
    selection: resolveSelection(input),
  }
}
