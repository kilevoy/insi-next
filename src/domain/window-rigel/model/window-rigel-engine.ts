import { purlinCityLoads } from '@/domain/purlin/model/purlin-reference.generated'
import type { WindowRigelInput } from '@/domain/window-rigel/model/window-rigel-input'
import { normalizeWindowRigelCity } from '@/domain/window-rigel/model/window-rigel-input'
import {
  windowRigelCandidateCatalog,
  windowRigelNuGrid,
  windowRigelNuXValues,
  windowRigelNuYValues,
  windowRigelPressureCoefficients,
  windowRigelTerrainHeightTable,
  windowRigelWindowConstructionLoads,
  windowRigelWindowTypeFactors,
} from '@/domain/window-rigel/model/window-rigel-reference.generated'
import type { WindowRigelCandidate, WindowRigelUtilization } from '@/domain/window-rigel/model/window-rigel-output'

type CandidateFailure = 'flexibility' | 'strength' | 'deflection' | 'excluded'
type CandidatePosition = 'bottom' | 'top'

interface WindowRigelReferenceBundle {
  candidateCatalog: typeof windowRigelCandidateCatalog
}

export interface WindowRigelDerivedValues {
  input: WindowRigelInput
  reference: WindowRigelReferenceBundle
  windLoadKpa: number
  verticalLoadKpa: number
  horizontalLoadCase1Kpa: number
  horizontalLoadCase2Kpa: number
  outOfPlaneLengthM: number
  inPlaneLengthM: number
  lowerStrengthMoment: number
  upperStrengthMoment: number
  horizontalStrengthMoment: number
  lowerServiceVerticalKpa: number
  upperServiceVerticalKpa: number
  lowerServiceHorizontalKpa: number
  upperServiceHorizontalKpa: number
  windowTypeFactor: (typeof windowRigelWindowTypeFactors)[number]
}

export interface EvaluatedWindowRigelCandidate {
  passes: boolean
  failures: CandidateFailure[]
  utilization: WindowRigelUtilization
}

const ELASTICITY_MPA = 2.06e8
const LOWER_STRENGTH_SELF_WEIGHT_KPA = 0.6 * 0.32 * 0.5
const UPPER_STRENGTH_SELF_WEIGHT_KPA = 0.6 * 0.32 * 0.5
const LOWER_SERVICE_SELF_WEIGHT_KPA = 0.6 * 0.3 * 0.5
const UPPER_SERVICE_SELF_WEIGHT_KPA = 0.6 * 0.3 * 0.5

function resolveCityWindLoadKpa(city: string): number {
  const normalizedCity = normalizeWindowRigelCity(city)
  const cityLoad = purlinCityLoads.find((item) => normalizeWindowRigelCity(item.city) === normalizedCity)

  if (!cityLoad) {
    throw new Error(`Unknown window rigel city: ${city}`)
  }

  return cityLoad.windLoadKpa
}

function resolveWindowTypeFactor(windowType: number) {
  const factor = windowRigelWindowTypeFactors.find((item) => item.windowType === windowType)

  if (!factor) {
    throw new Error(`Unsupported window type: ${windowType}`)
  }

  return factor
}

function resolveWindowConstructionLoad(windowConstruction: string): number {
  const normalizedConstruction = windowConstruction.trim().toLowerCase()
  const record = windowRigelWindowConstructionLoads.find(
    (item) => item.name.trim().toLowerCase() === normalizedConstruction,
  )

  if (!record) {
    throw new Error(`Unsupported window construction: ${windowConstruction}`)
  }

  return record.loadKpa
}

function interpolateAxisValue(target: number, axis: readonly number[]): { lowerIndex: number; upperIndex: number } {
  if (target <= axis[0]) {
    return { lowerIndex: 0, upperIndex: 0 }
  }

  const lastIndex = axis.length - 1
  if (target >= axis[lastIndex]) {
    return { lowerIndex: lastIndex, upperIndex: lastIndex }
  }

  for (let index = 0; index < axis.length - 1; index += 1) {
    const lower = axis[index]
    const upper = axis[index + 1]
    if (target >= lower && target <= upper) {
      return { lowerIndex: index, upperIndex: index + 1 }
    }
  }

  return { lowerIndex: lastIndex, upperIndex: lastIndex }
}

function interpolateLinear(target: number, lower: number, upper: number, lowerValue: number, upperValue: number): number {
  if (Math.abs(upper - lower) < 1e-9) {
    return lowerValue
  }

  return ((target - lower) / (upper - lower)) * (upperValue - lowerValue) + lowerValue
}

function interpolateNu(x: number, y: number): number {
  const xBounds = interpolateAxisValue(x, windowRigelNuXValues)
  const yBounds = interpolateAxisValue(y, windowRigelNuYValues)

  const x1 = windowRigelNuXValues[xBounds.lowerIndex]
  const x2 = windowRigelNuXValues[xBounds.upperIndex]
  const y1 = windowRigelNuYValues[yBounds.lowerIndex]
  const y2 = windowRigelNuYValues[yBounds.upperIndex]

  const q11 = windowRigelNuGrid[xBounds.lowerIndex][yBounds.lowerIndex]
  const q12 = windowRigelNuGrid[xBounds.lowerIndex][yBounds.upperIndex]
  const q21 = windowRigelNuGrid[xBounds.upperIndex][yBounds.lowerIndex]
  const q22 = windowRigelNuGrid[xBounds.upperIndex][yBounds.upperIndex]

  if (xBounds.lowerIndex === xBounds.upperIndex && yBounds.lowerIndex === yBounds.upperIndex) {
    return q11
  }

  if (xBounds.lowerIndex === xBounds.upperIndex) {
    return ((y2 - y) / (y2 - y1)) * (q12 - q11) + q11
  }

  if (yBounds.lowerIndex === yBounds.upperIndex) {
    return interpolateLinear(x, x1, x2, q11, q21)
  }

  const lowerInterpolated = interpolateLinear(x, x1, x2, q11, q21)
  const upperInterpolated = interpolateLinear(x, x1, x2, q12, q22)
  return ((y2 - y) / (y2 - y1)) * (upperInterpolated - lowerInterpolated) + lowerInterpolated
}

function lookupTerrainValue(
  heightM: number,
  terrainType: WindowRigelInput['terrainType'],
  field: 'kByTerrain' | 'zetaByTerrain',
): number {
  const first = windowRigelTerrainHeightTable[0]
  if (heightM <= first.heightM) {
    return first[field][terrainType]
  }

  const last = windowRigelTerrainHeightTable[windowRigelTerrainHeightTable.length - 1]
  if (heightM >= last.heightM) {
    return last[field][terrainType]
  }

  for (let index = 0; index < windowRigelTerrainHeightTable.length - 1; index += 1) {
    const lower = windowRigelTerrainHeightTable[index]
    const upper = windowRigelTerrainHeightTable[index + 1]

    if (heightM >= lower.heightM && heightM <= upper.heightM) {
      return interpolateLinear(
        heightM,
        lower.heightM,
        upper.heightM,
        lower[field][terrainType],
        upper[field][terrainType],
      )
    }
  }

  return last[field][terrainType]
}

function calculateWindCase(cCoefficient: number, windLoadKpa: number, k: number, zeta: number, nu: number): number {
  const base = Math.abs(windLoadKpa * k * cCoefficient * windowRigelPressureCoefficients.gustFactor)
  return base + base * zeta * nu
}

export function buildWindowRigelDerivedValues(input: WindowRigelInput): WindowRigelDerivedValues {
  const windLoadKpa = resolveCityWindLoadKpa(input.city)
  const verticalLoadKpa = resolveWindowConstructionLoad(input.windowConstruction)
  const windowTypeFactor = resolveWindowTypeFactor(input.windowType)
  const k = lookupTerrainValue(input.buildingHeightM, input.terrainType, 'kByTerrain')
  const zeta = lookupTerrainValue(input.buildingHeightM, input.terrainType, 'zetaByTerrain')
  const nuY = interpolateNu(0.4 * input.buildingSpanM, input.buildingHeightM)
  const negativeEdge = calculateWindCase(windowRigelPressureCoefficients.negativeEdge, windLoadKpa, k, zeta, nuY)
  const negativeMiddle = calculateWindCase(windowRigelPressureCoefficients.negativeMiddle, windLoadKpa, k, zeta, nuY)
  const positive = calculateWindCase(windowRigelPressureCoefficients.positive, windLoadKpa, k, zeta, nuY)
  const horizontalLoadCase1Kpa = (negativeEdge + positive) * input.responsibilityLevel
  const horizontalLoadCase2Kpa = ((negativeMiddle / 1.4) + (positive / 1.4)) * input.responsibilityLevel
  const outOfPlaneLengthM = input.frameStepM
  const inPlaneLengthM = input.frameStepM * windowTypeFactor.lengthFactor
  const lowerStrengthMoment =
    (verticalLoadKpa * input.windowHeightM + LOWER_STRENGTH_SELF_WEIGHT_KPA) *
    input.frameStepM ** 2 *
    windowTypeFactor.momentFactor
  const upperStrengthMoment = UPPER_STRENGTH_SELF_WEIGHT_KPA * input.frameStepM ** 2 * windowTypeFactor.momentFactor
  const horizontalStrengthMoment =
    (horizontalLoadCase1Kpa * (input.windowHeightM + 1.2) / 2) *
    input.frameStepM ** 2 *
    windowTypeFactor.momentFactor
  const lowerServiceVerticalKpa = verticalLoadKpa * input.windowHeightM + LOWER_SERVICE_SELF_WEIGHT_KPA
  const upperServiceVerticalKpa = UPPER_SERVICE_SELF_WEIGHT_KPA
  const lowerServiceHorizontalKpa = horizontalLoadCase1Kpa * (input.windowHeightM + 1.2) / 2
  const upperServiceHorizontalKpa = horizontalLoadCase2Kpa * (input.windowHeightM + 1.2) / 2

  return {
    input,
    reference: {
      candidateCatalog: windowRigelCandidateCatalog,
    },
    windLoadKpa,
    verticalLoadKpa,
    horizontalLoadCase1Kpa,
    horizontalLoadCase2Kpa,
    outOfPlaneLengthM,
    inPlaneLengthM,
    lowerStrengthMoment,
    upperStrengthMoment,
    horizontalStrengthMoment,
    lowerServiceVerticalKpa,
    upperServiceVerticalKpa,
    lowerServiceHorizontalKpa,
    upperServiceHorizontalKpa,
    windowTypeFactor,
  }
}

function calculateFlexibilityUtilization(
  candidate: (typeof windowRigelCandidateCatalog)[number],
  derived: WindowRigelDerivedValues,
): number {
  return Math.max(
    (derived.inPlaneLengthM * 100) / candidate.radiusXcm,
    (derived.outOfPlaneLengthM * 100) / candidate.radiusYcm,
  ) / 200
}

function calculateStrengthUtilization(
  candidate: (typeof windowRigelCandidateCatalog)[number],
  derived: WindowRigelDerivedValues,
): number {
  const numerator =
    (derived.lowerStrengthMoment +
      (candidate.unitMassKgPerM * derived.input.frameStepM ** 2 * derived.windowTypeFactor.momentFactor) / 100) /
      (candidate.sectionModulusXCm3 / 1e6) +
    derived.horizontalStrengthMoment / (candidate.sectionModulusYCm3 / 1e6)

  return (numerator / 1000) / candidate.strengthResistanceMpa
}

function calculateDeflectionUtilization(
  candidate: (typeof windowRigelCandidateCatalog)[number],
  derived: WindowRigelDerivedValues,
  position: CandidatePosition,
): number {
  const serviceVerticalKpa = position === 'bottom' ? derived.lowerServiceVerticalKpa : derived.upperServiceVerticalKpa
  const serviceHorizontalKpa = position === 'bottom' ? derived.lowerServiceHorizontalKpa : derived.upperServiceHorizontalKpa
  const lengthM = derived.outOfPlaneLengthM

  const verticalDeflection =
    (5 / 384) *
    (serviceVerticalKpa + candidate.unitMassKgPerM / 100) *
    lengthM ** 4 /
    (ELASTICITY_MPA * (candidate.momentOfInertiaXCm4 / 1e8))
  const horizontalDeflection =
    (5 / 384) *
    serviceHorizontalKpa *
    lengthM ** 4 /
    (ELASTICITY_MPA * (candidate.momentOfInertiaYCm4 / 1e8))

  return Math.max(
    (verticalDeflection / (lengthM / 300)) * derived.windowTypeFactor.deflectionFactor,
    horizontalDeflection / (lengthM / 200),
  )
}

function evaluateForPosition(
  candidate: (typeof windowRigelCandidateCatalog)[number],
  derived: WindowRigelDerivedValues,
  position: CandidatePosition,
): {
  passes: boolean
  failures: CandidateFailure[]
  utilization: WindowRigelUtilization
  rankScore: number
} {
  const flexibility = calculateFlexibilityUtilization(candidate, derived)
  const strength = calculateStrengthUtilization(candidate, derived)
  const deflection = calculateDeflectionUtilization(candidate, derived, position)
  const failures: CandidateFailure[] = []

  if (candidate.excluded) {
    failures.push('excluded')
  }
  if (flexibility > 1) {
    failures.push('flexibility')
  }
  if (strength > derived.input.maxUtilization) {
    failures.push('strength')
  }
  if (deflection > 1) {
    failures.push('deflection')
  }

  const passes = failures.length === 0
  return {
    passes,
    failures,
    utilization: {
      flexibility,
      strength,
      deflection,
    },
    rankScore: passes ? candidate.unitMassKgPerM * derived.input.frameStepM + (0.0001 * candidate.ordinal) : 999999999,
  }
}

export function evaluateWindowRigelCandidate(
  candidate: (typeof windowRigelCandidateCatalog)[number],
  derived: WindowRigelDerivedValues,
): EvaluatedWindowRigelCandidate {
  const evaluation = evaluateForPosition(candidate, derived, 'bottom')
  return {
    passes: evaluation.passes,
    failures: evaluation.failures,
    utilization: evaluation.utilization,
  }
}

function buildRankedCandidates(
  derived: WindowRigelDerivedValues,
  position: CandidatePosition,
): WindowRigelCandidate[] {
  return derived.reference.candidateCatalog
    .map((candidate) => {
      const evaluation = evaluateForPosition(candidate, derived, position)

      return {
        ordinal: candidate.ordinal,
        profile: candidate.profile,
        steelGrade: candidate.steelGrade,
        massKg: evaluation.rankScore,
        rankScore: evaluation.rankScore,
        utilization: evaluation.utilization,
        passes: evaluation.passes,
      } satisfies WindowRigelCandidate
    })
    .filter((candidate) => candidate.passes)
    .sort((left, right) => left.rankScore - right.rankScore)
    .slice(0, 10)
}

export function rankBottomWindowRigelCandidates(derived: WindowRigelDerivedValues): WindowRigelCandidate[] {
  return buildRankedCandidates(derived, 'bottom')
}

export function rankTopWindowRigelCandidates(derived: WindowRigelDerivedValues): WindowRigelCandidate[] {
  return buildRankedCandidates(derived, 'top')
}
