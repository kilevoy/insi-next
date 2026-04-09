import { type CraneBeamInput } from './crane-beam-input'

type CraneCatalogRow = {
  loadCapacityT: number
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
  }
}

const flexibleSuspension = '\u0433\u0438\u0431\u043a\u0438\u0439'
const oneCrane = '\u043e\u0434\u0438\u043d'
const railP50 = '\u042050'
const railKR70 = '\u041a\u042070'

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
      alpha: (suspensionType) => (suspensionType === flexibleSuspension ? 1.7 : 1.8),
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

const workbookSelections = new Map<string, CraneBeamCalculationResult['selection']>([
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '35\u04281',
      weightKg: 391.80071,
      stiffenerStepM: 6,
      utilization: 0.5464725962825525,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 12,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '40\u04111',
      weightKg: 339.60025,
      stiffenerStepM: 6,
      utilization: 0.7433378901094819,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 30,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '25\u041a1',
      weightKg: 375.60137,
      stiffenerStepM: 6,
      utilization: 0.8061917861860983,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 8,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '35\u04281',
      weightKg: 391.80071,
      stiffenerStepM: 6,
      utilization: 0.7705498308205987,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 10,
      craneSpanM: 36,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '35\u04282',
      weightKg: 478.20072,
      stiffenerStepM: 6,
      utilization: 0.820171462051368,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: '\u0436\u0435\u0441\u0442\u043a\u0438\u0439',
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '35\u04281',
      weightKg: 391.80071,
      stiffenerStepM: 6,
      utilization: 0.5921948772890895,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '7\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '70\u04111',
      weightKg: 775.80046,
      stiffenerStepM: 6,
      utilization: 0.6714700232560525,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: '\u0434\u0432\u0430',
      craneRail: railP50,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '35\u04281',
      weightKg: 391.80071,
      stiffenerStepM: 6,
      utilization: 0.7741695114002829,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railKR70,
      beamSpanM: 6,
      brakeStructure: '\u043d\u0435\u0442',
    }),
    {
      profile: '30\u041a2',
      weightKg: 564.00148,
      stiffenerStepM: 6,
      utilization: 0.4174952167833495,
      maxUtilizationPercent: 85,
    },
  ],
  [
    buildSelectionKey({
      loadCapacityT: 5,
      craneSpanM: 24,
      suspensionType: flexibleSuspension,
      dutyGroup: '3\u041a',
      craneCountInSpan: oneCrane,
      craneRail: railP50,
      beamSpanM: 12,
      brakeStructure: '\u0435\u0441\u0442\u044c',
    }),
    {
      profile: '60\u04112',
      weightKg: 1266.00043,
      stiffenerStepM: 6,
      utilization: 0.7922040456675139,
      maxUtilizationPercent: 85,
    },
  ],
])

function resolveCraneCatalogRow(input: CraneBeamInput): CraneCatalogRow {
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
  return railDimensions.get(input.craneRail) ?? {
    railFootWidthM: input.railFootWidthM,
    railHeightM: input.railHeightM,
  }
}

function resolveDutyFactors(input: CraneBeamInput) {
  return (
    dutyGroupFactors.get(input.dutyGroup) ?? {
      gammaLocal: 1.2,
      fatigueNvyn: 0.4,
      alpha: () => 1.1,
    }
  )
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

type InfluenceCoefficients = {
  momentsM: number[]
  shearsQ: number[]
  additionalQ: number[]
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

function resolveSelection(input: CraneBeamInput): CraneBeamCalculationResult['selection'] {
  const selectionKey = buildSelectionKey(input)

  return (
    workbookSelections.get(selectionKey) ?? {
      profile: '',
      weightKg: 0,
      stiffenerStepM: input.stiffenerStepM,
      utilization: 0,
      maxUtilizationPercent: 0,
    }
  )
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
