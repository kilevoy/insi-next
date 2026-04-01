import type { FrameGraphicsModel } from '@/features/frame-graphics/model/graphics-types'
import { FrameAxonometricSvg } from './frame-axonometric-svg'

interface FrameGraphicsSvgProps {
  model: FrameGraphicsModel
}

export function FrameGraphicsSvg({ model }: FrameGraphicsSvgProps) {
  return <FrameAxonometricSvg model={model} />
}
