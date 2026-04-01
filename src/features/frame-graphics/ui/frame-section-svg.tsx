import type { FrameGraphicsModel } from '@/features/frame-graphics/model/graphics-types'
import { FrameGraphicsBaseSvg } from './frame-graphics-base-svg'

interface FrameSectionSvgProps {
  model: FrameGraphicsModel
}

export function FrameSectionSvg({ model }: FrameSectionSvgProps) {
  return <FrameGraphicsBaseSvg model={model} ariaLabel="Разрез каркаса" />
}
