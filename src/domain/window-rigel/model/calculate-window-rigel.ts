import {
  buildWindowRigelDerivedValues,
  rankBottomWindowRigelCandidates,
  rankTopWindowRigelCandidates,
} from '@/domain/window-rigel/model/window-rigel-engine'
import {
  windowRigelInputSchema,
  type WindowRigelInput,
} from '@/domain/window-rigel/model/window-rigel-input'
import type { WindowRigelCalculationResult } from '@/domain/window-rigel/model/window-rigel-output'

export type { WindowRigelCalculationResult }

export function calculateWindowRigel(input: WindowRigelInput): WindowRigelCalculationResult {
  const validated = windowRigelInputSchema.parse(input)
  const derived = buildWindowRigelDerivedValues(validated)
  const bottomCandidates = rankBottomWindowRigelCandidates(derived)
  const topCandidates = rankTopWindowRigelCandidates(derived)
  const workbookEffectiveTopCandidates = topCandidates

  return {
    input: validated,
    loads: {
      windLoadKpa: derived.windLoadKpa,
      verticalLoadKpa: derived.verticalLoadKpa,
      horizontalLoadCase1Kpa: derived.horizontalLoadCase1Kpa,
      horizontalLoadCase2Kpa: derived.horizontalLoadCase2Kpa,
    },
    lengths: {
      outOfPlaneM: derived.outOfPlaneLengthM,
      inPlaneM: derived.inPlaneLengthM,
    },
    bottomCandidates,
    topCandidates,
    workbookPrimaryCandidates: bottomCandidates,
    workbookType1TopCandidates: topCandidates,
    workbookEffectiveTopCandidates,
  }
}
