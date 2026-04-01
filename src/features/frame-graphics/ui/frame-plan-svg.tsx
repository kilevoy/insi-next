import type { FrameGraphicsModel } from '@/features/frame-graphics/model/graphics-types'
import { FrameGraphicsBaseSvg } from './frame-graphics-base-svg'

interface FramePlanSvgProps {
  model: FrameGraphicsModel
}

export function FramePlanSvg({ model }: FramePlanSvgProps) {
  return <FrameGraphicsBaseSvg model={model} ariaLabel="План каркаса" />
}
