import { deriveHeights } from '@/pages/calculator/model/height-derivations'
import type { UnifiedInputState } from '@/pages/calculator/model/unified-input'
import type { FrameGraphicsSummary } from './graphics-types'

export const PURLIN_STEP_FALLBACK_M = 1.5

export function isMonopitchRoof(roofType: string): boolean {
  return roofType.trim().toLowerCase().includes('односкат')
}

export function isEnabledPresence(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase().includes('есть')
}

export function resolveFramePositions(lengthM: number, frameStepM: number): number[] {
  const stepM = frameStepM > 0 ? frameStepM : 6
  const normalizedLength = Math.max(lengthM, 1)
  const positions: number[] = [0]
  let current = stepM

  while (current < normalizedLength - 1e-6) {
    positions.push(current)
    current += stepM
  }

  if (Math.abs(positions[positions.length - 1] - normalizedLength) > 1e-6) {
    positions.push(normalizedLength)
  }

  return positions
}

export function resolveFachwerkPositions(lengthM: number, fakhverkStepM: number): number[] {
  const stepM = fakhverkStepM > 0 ? fakhverkStepM : 6
  const normalizedLength = Math.max(lengthM, 1)
  const positions: number[] = []
  let current = stepM

  while (current < normalizedLength - 1e-6) {
    positions.push(current)
    current += stepM
  }

  return positions
}

export function resolveSummary(input: UnifiedInputState): {
  summary: FrameGraphicsSummary
  heights: ReturnType<typeof deriveHeights>
} {
  const heights = deriveHeights(input)
  const spanM = Math.max(input.spanM, 1)
  const lengthM = Math.max(input.buildingLengthM, 1)
  const framePositions = resolveFramePositions(lengthM, input.frameStepM)

  return {
    heights,
    summary: {
      spanM,
      lengthM,
      clearHeightToBottomChordM: input.clearHeightToBottomChordM,
      eaveTrussDepthM: heights.eaveTrussDepthM,
      eaveSupportHeightM: heights.eaveSupportHeightM,
      maxBuildingHeightM: heights.maxBuildingHeightM,
      framesCount: framePositions.length,
    },
  }
}
