export type CraneBeamInput = {
  loadCapacityT: number
  craneSpanM: number
  wheelLoadKn: number
  wheelCount: number
  trolleyMassT: number
  craneBaseMm: number
  craneGaugeMm: number
  suspensionType: string
  dutyGroup: string
  craneCountInSpan: string
  craneRail: string
  railFootWidthM: number
  railHeightM: number
  beamSpanM: number
  brakeStructure: string
  stiffenerStepM: number
  tbnKn: number
  qbnKn: number
}

export const craneBeamSuspensionTypes = ['гибкий', 'жесткий'] as const
export const craneBeamDutyGroups = ['1К', '2К', '3К', '4К', '5К'] as const
export const craneBeamCountsInSpan = ['один', 'два'] as const
export const craneBeamRails = ['Р50', 'КР70'] as const
export const craneBeamBrakeStructures = ['нет', 'есть'] as const

export const defaultCraneBeamInput: CraneBeamInput = {
  loadCapacityT: 5,
  craneSpanM: 24,
  wheelLoadKn: 60,
  wheelCount: 4,
  trolleyMassT: 2,
  craneBaseMm: 3700,
  craneGaugeMm: 4700,
  suspensionType: 'гибкий',
  dutyGroup: '3К',
  craneCountInSpan: 'один',
  craneRail: 'Р50',
  railFootWidthM: 0.132,
  railHeightM: 0.152,
  beamSpanM: 6,
  brakeStructure: 'нет',
  stiffenerStepM: 0,
  tbnKn: 6,
  qbnKn: 2,
}
