import type { CSSProperties } from 'react'
import type { FrameGraphicsModel } from '@/features/frame-graphics/model/graphics-types'

interface FrameGraphicsBaseSvgProps {
  model: FrameGraphicsModel
  ariaLabel: string
}

const STYLES: Record<string, CSSProperties> = {
  column: { stroke: '#1f2937', strokeWidth: 2.4 },
  frame: { stroke: '#334155', strokeWidth: 1.8 },
  'truss-top': { stroke: '#7f1d1d', strokeWidth: 2.1 },
  'truss-bottom': { stroke: '#7f1d1d', strokeWidth: 1.8 },
  'truss-web': { stroke: '#991b1b', strokeWidth: 1.2 },
  purlin: { stroke: '#4b5563', strokeWidth: 1.0 },
  'purlin-node': { fill: '#4b5563', stroke: 'none' },
  fachwerk: { stroke: '#6b7280', strokeWidth: 1.1 },
  bracing: { stroke: '#374151', strokeWidth: 1.3, strokeDasharray: '5 4' },
  axis: { stroke: '#9ca3af', strokeWidth: 1.0, strokeDasharray: '4 3' },
  dimension: { stroke: '#0f766e', strokeWidth: 1.2 },
  floor: { stroke: '#111827', strokeWidth: 1.4 },
  outline: { stroke: '#1f2937', strokeWidth: 1.2, fill: 'none' },
  'column-node': { fill: '#1f2937', stroke: 'none' },
  'preview-shadow': { fill: '#e2e8f0', stroke: 'none' },
  'preview-wall-front': { fill: '#dbe4ee', stroke: '#334155', strokeWidth: 1.2 },
  'preview-wall-side': { fill: '#cfd8e3', stroke: '#334155', strokeWidth: 1.2 },
  'preview-roof-left': { fill: '#b7c4d4', stroke: '#334155', strokeWidth: 1.2 },
  'preview-roof-right': { fill: '#aebccd', stroke: '#334155', strokeWidth: 1.2 },
  'preview-gate': { fill: '#475569', stroke: '#1e293b', strokeWidth: 1.1 },
  'preview-window': { fill: '#f1f5f9', stroke: '#64748b', strokeWidth: 0.9 },
  'preview-outline': { stroke: '#1e293b', strokeWidth: 1.4, fill: 'none' },
}

const TEXT_STYLES: Record<string, CSSProperties> = {
  'axis-text': { fill: '#6b7280', fontSize: 12, fontWeight: 600 },
  'dimension-text': { fill: '#0f766e', fontSize: 12, fontWeight: 700 },
  'note-text': { fill: '#334155', fontSize: 12, fontWeight: 500 },
  default: { fill: '#111827', fontSize: 12, fontWeight: 500 },
}

function styleByClass(className: string | undefined): CSSProperties {
  return className
    ? STYLES[className] ?? { stroke: '#111827', strokeWidth: 1.2, fill: 'none' }
    : { stroke: '#111827', strokeWidth: 1.2, fill: 'none' }
}

function textStyleByClass(className: string | undefined): CSSProperties {
  return className ? TEXT_STYLES[className] ?? TEXT_STYLES.default : TEXT_STYLES.default
}

export function FrameGraphicsBaseSvg({ model, ariaLabel }: FrameGraphicsBaseSvgProps) {
  return (
    <svg
      aria-label={ariaLabel}
      viewBox={`0 0 ${model.width} ${model.height}`}
      style={{
        width: '100%',
        height: 'auto',
        maxHeight: 620,
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: 10,
      }}
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

      {model.polygons.map((polygon, index) => (
        <polygon
          key={`polygon-${index}`}
          points={polygon.points.map((point) => `${point.x},${point.y}`).join(' ')}
          style={styleByClass(polygon.className)}
        />
      ))}

      {model.rects.map((rect, index) => (
        <rect
          key={`rect-${index}`}
          x={rect.at.x}
          y={rect.at.y}
          width={rect.width}
          height={rect.height}
          style={styleByClass(rect.className)}
        />
      ))}

      {model.texts.map((text, index) => (
        <text key={`text-${index}`} x={text.at.x} y={text.at.y} style={textStyleByClass(text.className)}>
          {text.text}
        </text>
      ))}
    </svg>
  )
}
