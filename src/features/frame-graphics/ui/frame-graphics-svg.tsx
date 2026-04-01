import type { CSSProperties } from 'react'
import type { FrameGraphicsModel } from '@/features/frame-graphics/model/build-frame-graphics-model'

interface FrameGraphicsSvgProps {
  model: FrameGraphicsModel
}

const STYLES: Record<string, CSSProperties> = {
  column: { stroke: '#1f4f99', strokeWidth: 2.2 },
  'truss-top': { stroke: '#7a1f1f', strokeWidth: 2.2 },
  'truss-bottom': { stroke: '#7a1f1f', strokeWidth: 1.8 },
  'truss-web': { stroke: '#9e4a4a', strokeWidth: 1.4 },
  purlin: { stroke: '#4b6b2f', strokeWidth: 1.2 },
  fachwerk: { stroke: '#755b2d', strokeWidth: 1.2 },
  bracing: { stroke: '#c2410c', strokeWidth: 1.6, strokeDasharray: '6 5' },
  axis: { stroke: '#6b7280', strokeWidth: 1.1, strokeDasharray: '5 4' },
  dimension: { stroke: '#0f766e', strokeWidth: 1.3 },
}

const TEXT_STYLES: Record<string, CSSProperties> = {
  'axis-text': { fill: '#4b5563', fontSize: 12, fontWeight: 600 },
  'dimension-text': { fill: '#0f766e', fontSize: 12, fontWeight: 600 },
  default: { fill: '#111827', fontSize: 12, fontWeight: 500 },
}

function styleByClass(className: string | undefined): CSSProperties {
  return className ? STYLES[className] ?? { stroke: '#111827', strokeWidth: 1.4 } : { stroke: '#111827', strokeWidth: 1.4 }
}

function textStyleByClass(className: string | undefined): CSSProperties {
  return className ? TEXT_STYLES[className] ?? TEXT_STYLES.default : TEXT_STYLES.default
}

export function FrameGraphicsSvg({ model }: FrameGraphicsSvgProps) {
  return (
    <svg
      aria-label="Параметрическая инженерная графика каркаса"
      viewBox={`0 0 ${model.width} ${model.height}`}
      className="frame-graphics-svg"
      style={{ width: '100%', height: 'auto', background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 10 }}
    >
      {model.lines.map((line, index) => (
        <line
          key={`line-${index}`}
          x1={line.from.x}
          y1={line.from.y}
          x2={line.to.x}
          y2={line.to.y}
          style={styleByClass(line.className)}
        />
      ))}

      {model.polylines.map((polyline, index) => (
        <polyline
          key={`polyline-${index}`}
          points={polyline.points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          style={styleByClass(polyline.className)}
        />
      ))}

      {model.texts.map((text, index) => (
        <text
          key={`text-${index}`}
          x={text.at.x}
          y={text.at.y}
          style={textStyleByClass(text.className)}
        >
          {text.text}
        </text>
      ))}
    </svg>
  )
}
