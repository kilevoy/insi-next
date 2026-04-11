export const craneBeamLoadCapacities = [
  5,
  8,
  10,
  12.5,
  16,
  '16/3,2',
  '20/5',
  '32/5',
  '50/12,5',
] as const

export type CraneBeamLoadCapacity = (typeof craneBeamLoadCapacities)[number]

export type CraneBeamInput = {
  lookupMode: string
  loadCapacityT: CraneBeamLoadCapacity
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
}

export const craneBeamLookupModes = ['catalog', 'manual'] as const
export const craneBeamSuspensionTypes = ['\u0433\u0438\u0431\u043a\u0438\u0439', '\u0436\u0435\u0441\u0442\u043a\u0438\u0439'] as const
export const craneBeamDutyGroups = [
  '1\u041a',
  '2\u041a',
  '3\u041a',
  '4\u041a',
  '5\u041a',
  '6\u041a',
  '7\u041a',
  '8\u041a',
] as const
export const craneBeamCountsInSpan = ['\u043e\u0434\u0438\u043d', '\u0434\u0432\u0430'] as const
export const craneBeamRails = ['\u042050', '\u041a\u042070'] as const
export const craneBeamBrakeStructures = ['\u043d\u0435\u0442', '\u0435\u0441\u0442\u044c'] as const

export const defaultCraneBeamInput: CraneBeamInput = {
  lookupMode: 'catalog',
  loadCapacityT: 5,
  craneSpanM: 24,
  wheelLoadKn: 60,
  wheelCount: 4,
  trolleyMassT: 2,
  craneBaseMm: 3700,
  craneGaugeMm: 4700,
  suspensionType: '\u0433\u0438\u0431\u043a\u0438\u0439',
  dutyGroup: '3\u041a',
  craneCountInSpan: '\u043e\u0434\u0438\u043d',
  craneRail: '\u042050',
  railFootWidthM: 0.132,
  railHeightM: 0.152,
  beamSpanM: 6,
  brakeStructure: '\u043d\u0435\u0442',
  stiffenerStepM: 0,
}
