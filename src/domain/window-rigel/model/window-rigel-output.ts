export interface WindowRigelUtilization {
  flexibility: number
  strength: number
  deflection: number
}

export interface WindowRigelCandidate {
  ordinal: number
  profile: string
  steelGrade: string
  massKg: number
  rankScore: number
  utilization: WindowRigelUtilization
  passes: boolean
}

export interface WindowRigelCalculationResult {
  input: {
    city: string
    responsibilityLevel: number
    windowHeightM: number
    frameStepM: number
    windowType: number
    buildingHeightM: number
    buildingSpanM: number
    buildingLengthM: number
    terrainType: 'А' | 'В' | 'С'
    windowConstruction: string
    maxUtilization: number
  }
  loads: {
    windLoadKpa: number
    verticalLoadKpa: number
    horizontalLoadCase1Kpa: number
    horizontalLoadCase2Kpa: number
  }
  lengths: {
    outOfPlaneM: number
    inPlaneM: number
  }
  bottomCandidates: WindowRigelCandidate[]
  topCandidates: WindowRigelCandidate[]
  workbookPrimaryCandidates: WindowRigelCandidate[]
  workbookType1TopCandidates: WindowRigelCandidate[]
  workbookEffectiveTopCandidates: WindowRigelCandidate[]
}
