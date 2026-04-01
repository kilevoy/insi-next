import type { FrameGraphicsModel } from '@/features/frame-graphics/model/graphics-types'
import { FrameGraphicsBaseSvg } from './frame-graphics-base-svg'

interface FrameAxonometricSvgProps {
  model: FrameGraphicsModel
}

export function FrameAxonometricSvg({ model }: FrameAxonometricSvgProps) {
  return <FrameGraphicsBaseSvg model={model} ariaLabel="Общий вид каркаса" />
}
