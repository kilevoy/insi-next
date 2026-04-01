import type { FrameGraphicsModel } from '@/features/frame-graphics/model/graphics-types'
import { FrameGraphicsBaseSvg } from './frame-graphics-base-svg'

interface BuildingPreviewSvgProps {
  model: FrameGraphicsModel
}

export function BuildingPreviewSvg({ model }: BuildingPreviewSvgProps) {
  return <FrameGraphicsBaseSvg model={model} ariaLabel="Превью здания" />
}
