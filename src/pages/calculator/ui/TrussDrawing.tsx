/* eslint-disable react-refresh/only-export-components */

import type { ReactElement } from 'react'

type Node = {
  id: string
  x: number
  y: number
}

type MemberRef = {
  id: string
  from: string
  to: string
}

type MemberForce = {
  memberId: string
  value: number
  x?: number
  y?: number
}

type MemberLabel = {
  memberId: string
  text: string
  x?: number
  y?: number
}

type TrussDrawingProps = {
  width?: number | string
  height?: number | string
  truss: {
    span: number
    supportHeightLeft: number
    supportHeightRight: number
    ridgeHeight: number
    panelCount: number
    nodes: Node[]
    topChord: MemberRef[]
    bottomChord: MemberRef[]
    webs: MemberRef[]
    supportNodeIds: {
      left: string
      right: string
    }
    spliceNodeIds?: string[]
    memberForces?: MemberForce[]
    memberLabels?: MemberLabel[]
  }
  display?: {
    showAxes?: boolean
    showSupports?: boolean
    showNodes?: boolean
    showNodeLabels?: boolean
    showDimensions?: boolean
    showSplice?: boolean
    showMemberForces?: boolean
    showMemberLabels?: boolean
  }
}

type Bounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

type SvgPoint = {
  x: number
  y: number
}

type ViewportTransform = {
  bounds: Bounds
  viewBoxWidth: number
  viewBoxHeight: number
  scale: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  geometryLeft: number
  geometryRight: number
  geometryTop: number
  geometryBottom: number
  fontSize: number
  smallFontSize: number
  memberStrokeWidth: number
  secondaryStrokeWidth: number
  dimensionStrokeWidth: number
  nodeRadius: number
}

type MemberLine = {
  id: string
  from: Node
  to: Node
  midpoint: Node
  length: number
  isVertical: boolean
}

const styles = {
  bg: '#ffffff',
  primary: '#1f1f1f',
  secondary: '#666666',
  axis: '#9aa3ad',
  dimension: '#555555',
  hidden: '#999999',
  splice: '#444444',
  support: '#2e2e2e',
  textBg: '#ffffff',
} as const

const defaultDisplay: Required<NonNullable<TrussDrawingProps['display']>> = {
  showAxes: true,
  showSupports: true,
  showNodes: true,
  showNodeLabels: false,
  showDimensions: true,
  showSplice: true,
  showMemberForces: false,
  showMemberLabels: false,
}

const VIEWBOX_WIDTH = 1400
const VIEWBOX_HEIGHT = 860
const AXIS_CIRCLE_RADIUS = 18
const AXIS_LABEL_CENTER_Y = VIEWBOX_HEIGHT - 42
const TITLE_Y = 48
const SUBTITLE_Y = 80
const AXIS_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'И'] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatMillimeters(value: number): string {
  return Math.round(value).toLocaleString('ru-RU')
}

function formatForce(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} kN`
}

function getFallbackBounds(): Bounds {
  return {
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1,
    width: 1,
    height: 1,
  }
}

export function getBoundsFromNodes(nodes: Node[]): Bounds {
  if (nodes.length === 0) {
    return getFallbackBounds()
  }

  const minX = Math.min(...nodes.map((node) => node.x))
  const maxX = Math.max(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxY = Math.max(...nodes.map((node) => node.y))

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

export function createViewportTransform(bounds: Bounds): ViewportTransform {
  const padding = {
    top: 96,
    right: 184,
    bottom: 198,
    left: 176,
  }
  const usableWidth = VIEWBOX_WIDTH - padding.left - padding.right
  const usableHeight = VIEWBOX_HEIGHT - padding.top - padding.bottom
  const scale = Math.min(usableWidth / Math.max(bounds.width, 1), usableHeight / Math.max(bounds.height, 1))

  return {
    bounds,
    viewBoxWidth: VIEWBOX_WIDTH,
    viewBoxHeight: VIEWBOX_HEIGHT,
    scale,
    padding,
    geometryLeft: padding.left,
    geometryRight: padding.left + bounds.width * scale,
    geometryTop: padding.top,
    geometryBottom: padding.top + bounds.height * scale,
    fontSize: clamp(13, 12, 16),
    smallFontSize: clamp(12, 11, 14),
    memberStrokeWidth: 3.2,
    secondaryStrokeWidth: 1.9,
    dimensionStrokeWidth: 1.35,
    nodeRadius: 4.25,
  }
}

export function toSvgPoint(point: Pick<Node, 'x' | 'y'>, transform: ViewportTransform): SvgPoint {
  return {
    x: transform.geometryLeft + (point.x - transform.bounds.minX) * transform.scale,
    y: transform.geometryBottom - (point.y - transform.bounds.minY) * transform.scale,
  }
}

export function buildNodeMap(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((node) => [node.id, node]))
}

export function buildMemberLines(members: MemberRef[], nodeMap: Map<string, Node>): MemberLine[] {
  return members.flatMap((member) => {
    const from = nodeMap.get(member.from)
    const to = nodeMap.get(member.to)

    if (!from || !to) {
      return []
    }

    return [
      {
        id: member.id,
        from,
        to,
        midpoint: {
          id: `${member.id}-mid`,
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
        },
        length: Math.hypot(to.x - from.x, to.y - from.y),
        isVertical: Math.abs(to.x - from.x) < 0.001,
      },
    ]
  })
}

function uniqueSortedNodesByX(nodes: Node[]): Node[] {
  return [...new Map(nodes.sort((left, right) => left.x - right.x).map((node) => [node.id, node])).values()].sort(
    (left, right) => left.x - right.x,
  )
}

function uniqueSortedXPositions(values: number[]): number[] {
  return [...new Set(values.map((value) => Number(value.toFixed(3))))].sort((left, right) => left - right)
}

function resolveAxisStations(span: number): number[] {
  if (span <= 0) {
    return [0]
  }

  if (span % 6000 === 0) {
    return Array.from({ length: span / 6000 + 1 }, (_, index) => index * 6000)
  }

  const intervalCount = Math.min(4, Math.max(2, Math.round(span / 6000)))

  return Array.from({ length: intervalCount + 1 }, (_, index) => (span / intervalCount) * index)
}

function resolveReadableAngle(angleDeg: number): number {
  if (angleDeg > 90) {
    return angleDeg - 180
  }

  if (angleDeg < -90) {
    return angleDeg + 180
  }

  return angleDeg
}

function resolveLineAngleDeg(start: SvgPoint, end: SvgPoint): number {
  return resolveReadableAngle((Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI)
}

function resolveOffsetLinePoints(start: SvgPoint, end: SvgPoint, offsetPx: number) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  let normalX = -dy / length
  let normalY = dx / length

  if (normalY > 0) {
    normalX *= -1
    normalY *= -1
  }

  return {
    start: {
      x: start.x + normalX * offsetPx,
      y: start.y + normalY * offsetPx,
    },
    end: {
      x: end.x + normalX * offsetPx,
      y: end.y + normalY * offsetPx,
    },
    normalX,
    normalY,
  }
}

function resolveMemberTextTransform(memberLine: MemberLine, point: SvgPoint, transform: ViewportTransform): string {
  const start = toSvgPoint(memberLine.from, transform)
  const end = toSvgPoint(memberLine.to, transform)
  const angle = resolveLineAngleDeg(start, end)

  return `rotate(${angle} ${point.x} ${point.y})`
}

function resolveSupportNodes(
  truss: TrussDrawingProps['truss'],
  nodeMap: Map<string, Node>,
  bounds: Bounds,
) {
  const leftSupport = nodeMap.get(truss.supportNodeIds.left) ?? {
    id: '__left-support__',
    x: bounds.minX,
    y: bounds.minY,
  }
  const rightSupport = nodeMap.get(truss.supportNodeIds.right) ?? {
    id: '__right-support__',
    x: bounds.maxX,
    y: bounds.minY,
  }

  return leftSupport.x <= rightSupport.x
    ? { leftSupport, rightSupport }
    : { leftSupport: rightSupport, rightSupport: leftSupport }
}

function resolveRidgeNode(nodes: Node[], bounds: Bounds): Node {
  if (nodes.length === 0) {
    return { id: '__ridge__', x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY }
  }

  const centerX = (bounds.minX + bounds.maxX) / 2

  return nodes.reduce((best, node) => {
    if (node.y > best.y + 0.001) {
      return node
    }

    if (Math.abs(node.y - best.y) <= 0.001 && Math.abs(node.x - centerX) < Math.abs(best.x - centerX)) {
      return node
    }

    return best
  }, nodes[0])
}

function resolveBottomDimensionNodes(
  truss: TrussDrawingProps['truss'],
  nodeMap: Map<string, Node>,
  leftSupport: Node,
  rightSupport: Node,
): Node[] {
  const bottomChordNodeIds = new Set<string>()

  for (const member of truss.bottomChord) {
    bottomChordNodeIds.add(member.from)
    bottomChordNodeIds.add(member.to)
  }

  const bottomNodes = [...bottomChordNodeIds]
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is Node => Boolean(node))

  return uniqueSortedNodesByX([leftSupport, ...bottomNodes, rightSupport])
}

function resolveAnnotationPoint(
  memberLine: MemberLine,
  transform: ViewportTransform,
  offsetPx: number,
  explicitX?: number,
  explicitY?: number,
): SvgPoint {
  if (explicitX !== undefined && explicitY !== undefined) {
    return toSvgPoint({ x: explicitX, y: explicitY }, transform)
  }

  const start = toSvgPoint(memberLine.from, transform)
  const end = toSvgPoint(memberLine.to, transform)
  const mid = toSvgPoint(memberLine.midpoint, transform)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)

  if (length <= 0.001) {
    return { x: mid.x, y: mid.y - offsetPx }
  }

  return {
    x: mid.x + (-dy / length) * offsetPx,
    y: mid.y + (dx / length) * offsetPx,
  }
}

function drawDimensionTerminator(
  x: number,
  y: number,
  orientation: 'horizontal' | 'vertical',
  key: string,
) {
  const size = 8

  if (orientation === 'horizontal') {
    return (
      <line
        key={key}
        stroke={styles.dimension}
        strokeWidth={1.35}
        x1={x - size}
        x2={x + size}
        y1={y + size}
        y2={y - size}
      />
    )
  }

  return (
    <line
      key={key}
      stroke={styles.dimension}
      strokeWidth={1.35}
      x1={x - size}
      x2={x + size}
      y1={y - size}
      y2={y + size}
    />
  )
}

function drawDimensionText(
  key: string,
  x: number,
  y: number,
  text: string,
  transform: ViewportTransform,
  rotate?: number,
  anchor: 'start' | 'middle' | 'end' = 'middle',
) {
  return (
    <text
      key={key}
      fill={styles.dimension}
      fontFamily="'Consolas', 'Courier New', monospace"
      fontSize={transform.fontSize}
      fontWeight={700}
      paintOrder="stroke"
      stroke={styles.textBg}
      strokeWidth={4}
      textAnchor={anchor}
      transform={rotate === undefined ? undefined : `rotate(${rotate} ${x} ${y})`}
      x={x}
      y={y}
    >
      {text}
    </text>
  )
}

function drawAxes(
  transform: ViewportTransform,
  bounds: Bounds,
  leftSupport: Node,
  rightSupport: Node,
  ridgeNode: Node,
) {
  return drawSheetAxes(transform, bounds, leftSupport, rightSupport, ridgeNode)
}

export function drawSupports(
  leftSupport: Node,
  rightSupport: Node,
  transform: ViewportTransform,
) {
  const left = toSvgPoint(leftSupport, transform)
  const right = toSvgPoint(rightSupport, transform)
  const stemHeight = 18
  const triangleWidth = 34
  const triangleHeight = 16
  const baseWidth = 52

  return (
    <g data-layer="supports" data-testid="layer-supports">
      <g>
        <line
          stroke={styles.support}
          strokeWidth={1.6}
          x1={left.x}
          x2={left.x}
          y1={left.y}
          y2={left.y + stemHeight}
        />
        <path
          d={`M ${left.x} ${left.y + stemHeight} L ${left.x - triangleWidth / 2} ${
            left.y + stemHeight + triangleHeight
          } L ${left.x + triangleWidth / 2} ${left.y + stemHeight + triangleHeight} Z`}
          fill={styles.bg}
          stroke={styles.support}
          strokeWidth={1.6}
        />
        <line
          stroke={styles.support}
          strokeWidth={1.6}
          x1={left.x - baseWidth / 2}
          x2={left.x + baseWidth / 2}
          y1={left.y + stemHeight + triangleHeight + 7}
          y2={left.y + stemHeight + triangleHeight + 7}
        />
      </g>

      <g>
        <line
          stroke={styles.support}
          strokeWidth={1.6}
          x1={right.x}
          x2={right.x}
          y1={right.y}
          y2={right.y + stemHeight}
        />
        <path
          d={`M ${right.x} ${right.y + stemHeight} L ${right.x - triangleWidth / 2} ${
            right.y + stemHeight + triangleHeight
          } L ${right.x + triangleWidth / 2} ${right.y + stemHeight + triangleHeight} Z`}
          fill={styles.bg}
          stroke={styles.support}
          strokeWidth={1.6}
        />
        <circle
          cx={right.x - 8}
          cy={right.y + stemHeight + triangleHeight + 6}
          fill={styles.bg}
          r={3.4}
          stroke={styles.support}
          strokeWidth={1.4}
        />
        <circle
          cx={right.x + 8}
          cy={right.y + stemHeight + triangleHeight + 6}
          fill={styles.bg}
          r={3.4}
          stroke={styles.support}
          strokeWidth={1.4}
        />
        <line
          stroke={styles.support}
          strokeWidth={1.6}
          x1={right.x - baseWidth / 2}
          x2={right.x + baseWidth / 2}
          y1={right.y + stemHeight + triangleHeight + 13}
          y2={right.y + stemHeight + triangleHeight + 13}
        />
      </g>
    </g>
  )
}

export function drawNodes(nodes: Node[], transform: ViewportTransform) {
  return (
    <g data-layer="nodes" data-testid="layer-nodes">
      {nodes.map((node) => {
        const point = toSvgPoint(node, transform)

        return (
          <circle
            cx={point.x}
            cy={point.y}
            fill={styles.bg}
            key={node.id}
            r={transform.nodeRadius}
            stroke={styles.primary}
            strokeWidth={1.35}
          />
        )
      })}
    </g>
  )
}

function drawNodeLabels(nodes: Node[], transform: ViewportTransform) {
  return nodes.map((node) => {
    const point = toSvgPoint(node, transform)

    return (
      <text
        fill={styles.secondary}
        fontFamily="'Consolas', 'Courier New', monospace"
        fontSize={transform.smallFontSize}
        fontWeight={600}
        key={`label-${node.id}`}
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="middle"
        x={point.x}
        y={point.y - 10}
      >
        {node.id}
      </text>
    )
  })
}

export function drawSplice(
  spliceNodeIds: string[] | undefined,
  nodeMap: Map<string, Node>,
  transform: ViewportTransform,
  bounds: Bounds,
) {
  if (!spliceNodeIds || spliceNodeIds.length === 0) {
    return null
  }

  const spliceNodes = spliceNodeIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is Node => Boolean(node))

  if (spliceNodes.length === 0) {
    return null
  }

  const spliceX = spliceNodes.reduce((sum, node) => sum + node.x, 0) / spliceNodes.length
  const topPoint = toSvgPoint({ x: spliceX, y: bounds.maxY }, transform)
  const bottomPoint = toSvgPoint({ x: spliceX, y: bounds.minY }, transform)
  const centerY = (topPoint.y + bottomPoint.y) / 2

  return (
    <g data-layer="splice" data-testid="layer-splice">
      <line
        stroke={styles.splice}
        strokeDasharray="10 6"
        strokeWidth={1.5}
        x1={topPoint.x}
        x2={topPoint.x}
        y1={topPoint.y - 26}
        y2={bottomPoint.y + 26}
      />
      <line
        stroke={styles.splice}
        strokeWidth={1.5}
        x1={topPoint.x - 10}
        x2={topPoint.x + 10}
        y1={centerY - 18}
        y2={centerY - 2}
      />
      <line
        stroke={styles.splice}
        strokeWidth={1.5}
        x1={topPoint.x - 10}
        x2={topPoint.x + 10}
        y1={centerY + 2}
        y2={centerY + 18}
      />
      <text
        fill={styles.splice}
        fontFamily="'Consolas', 'Courier New', monospace"
        fontSize={transform.fontSize}
        fontWeight={700}
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="middle"
        x={topPoint.x}
        y={topPoint.y - 38}
      >
        Монтажный стык
      </text>
    </g>
  )
}

export function drawDimensions(
  truss: TrussDrawingProps['truss'],
  transform: ViewportTransform,
  bounds: Bounds,
  nodeMap: Map<string, Node>,
  leftSupport: Node,
  rightSupport: Node,
  ridgeNode: Node,
) {
  const bottomNodes = resolveBottomDimensionNodes(truss, nodeMap, leftSupport, rightSupport)
  const bottomXPositions = uniqueSortedXPositions(bottomNodes.map((node) => node.x))
  const baselineLeft = toSvgPoint({ x: leftSupport.x, y: bounds.minY }, transform)
  const baselineRight = toSvgPoint({ x: rightSupport.x, y: bounds.minY }, transform)
  const supportTopLeft = toSvgPoint({ x: leftSupport.x, y: bounds.minY + truss.supportHeightLeft }, transform)
  const supportTopRight = toSvgPoint({ x: rightSupport.x, y: bounds.minY + truss.supportHeightRight }, transform)
  const ridgeBottom = toSvgPoint({ x: ridgeNode.x, y: bounds.minY }, transform)
  const ridgeTop = toSvgPoint({ x: ridgeNode.x, y: bounds.minY + truss.ridgeHeight }, transform)
  const panelDimensionY = Math.max(baselineLeft.y, baselineRight.y) + 62
  const totalDimensionY = panelDimensionY + 56
  const leftHeightDimensionX = transform.geometryLeft - 74
  const ridgeHeightDimensionX = transform.geometryRight + 74
  const elements: ReactElement[] = []

  bottomXPositions.forEach((xPosition, index) => {
    const point = toSvgPoint({ x: xPosition, y: bounds.minY }, transform)

    elements.push(
      <line
        key={`panel-ext-${index}`}
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={point.x}
        x2={point.x}
        y1={point.y}
        y2={totalDimensionY + 12}
      />,
    )
  })

  for (let index = 0; index < bottomXPositions.length - 1; index += 1) {
    const start = toSvgPoint({ x: bottomXPositions[index], y: bounds.minY }, transform)
    const end = toSvgPoint({ x: bottomXPositions[index + 1], y: bounds.minY }, transform)
    const sizeText = formatMillimeters(bottomXPositions[index + 1] - bottomXPositions[index])

    elements.push(
      <line
        key={`panel-dim-${index}`}
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={start.x}
        x2={end.x}
        y1={panelDimensionY}
        y2={panelDimensionY}
      />,
    )
    elements.push(drawDimensionTerminator(start.x, panelDimensionY, 'horizontal', `panel-term-start-${index}`))
    elements.push(drawDimensionTerminator(end.x, panelDimensionY, 'horizontal', `panel-term-end-${index}`))
    elements.push(drawDimensionText(`panel-text-${index}`, (start.x + end.x) / 2, panelDimensionY - 10, sizeText, transform))
  }

  elements.push(
    <line
      key="total-dimension-line"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={baselineLeft.x}
      x2={baselineRight.x}
      y1={totalDimensionY}
      y2={totalDimensionY}
    />,
  )
  elements.push(drawDimensionTerminator(baselineLeft.x, totalDimensionY, 'horizontal', 'total-term-start'))
  elements.push(drawDimensionTerminator(baselineRight.x, totalDimensionY, 'horizontal', 'total-term-end'))
  elements.push(
    drawDimensionText(
      'total-dimension-text',
      (baselineLeft.x + baselineRight.x) / 2,
      totalDimensionY - 12,
      formatMillimeters(truss.span),
      transform,
    ),
  )

  elements.push(
    <line
      key="support-left-base-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={baselineLeft.x}
      x2={leftHeightDimensionX}
      y1={baselineLeft.y}
      y2={baselineLeft.y}
    />,
  )
  elements.push(
    <line
      key="support-left-top-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={supportTopLeft.x}
      x2={leftHeightDimensionX}
      y1={supportTopLeft.y}
      y2={supportTopLeft.y}
    />,
  )
  elements.push(
    <line
      key="support-left-dimension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={leftHeightDimensionX}
      x2={leftHeightDimensionX}
      y1={baselineLeft.y}
      y2={supportTopLeft.y}
    />,
  )
  elements.push(drawDimensionTerminator(leftHeightDimensionX, baselineLeft.y, 'vertical', 'support-left-term-bottom'))
  elements.push(drawDimensionTerminator(leftHeightDimensionX, supportTopLeft.y, 'vertical', 'support-left-term-top'))
  elements.push(
    drawDimensionText(
      'support-left-height-text',
      leftHeightDimensionX - 12,
      (baselineLeft.y + supportTopLeft.y) / 2,
      formatMillimeters(truss.supportHeightLeft),
      transform,
      -90,
    ),
  )

  if (Math.abs(truss.supportHeightRight - truss.supportHeightLeft) > 0.001) {
    const rightHeightDimensionX = transform.geometryRight + 126

    elements.push(
      <line
        key="support-right-base-extension"
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={baselineRight.x}
        x2={rightHeightDimensionX}
        y1={baselineRight.y}
        y2={baselineRight.y}
      />,
    )
    elements.push(
      <line
        key="support-right-top-extension"
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={supportTopRight.x}
        x2={rightHeightDimensionX}
        y1={supportTopRight.y}
        y2={supportTopRight.y}
      />,
    )
    elements.push(
      <line
        key="support-right-dimension"
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={rightHeightDimensionX}
        x2={rightHeightDimensionX}
        y1={baselineRight.y}
        y2={supportTopRight.y}
      />,
    )
    elements.push(drawDimensionTerminator(rightHeightDimensionX, baselineRight.y, 'vertical', 'support-right-term-bottom'))
    elements.push(drawDimensionTerminator(rightHeightDimensionX, supportTopRight.y, 'vertical', 'support-right-term-top'))
    elements.push(
      drawDimensionText(
        'support-right-height-text',
        rightHeightDimensionX + 12,
        (baselineRight.y + supportTopRight.y) / 2,
        formatMillimeters(truss.supportHeightRight),
        transform,
        -90,
      ),
    )
  }

  elements.push(
    <line
      key="ridge-base-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={ridgeBottom.x}
      x2={ridgeHeightDimensionX}
      y1={ridgeBottom.y}
      y2={ridgeBottom.y}
    />,
  )
  elements.push(
    <line
      key="ridge-top-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={ridgeTop.x}
      x2={ridgeHeightDimensionX}
      y1={ridgeTop.y}
      y2={ridgeTop.y}
    />,
  )
  elements.push(
    <line
      key="ridge-dimension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={ridgeHeightDimensionX}
      x2={ridgeHeightDimensionX}
      y1={ridgeBottom.y}
      y2={ridgeTop.y}
    />,
  )
  elements.push(drawDimensionTerminator(ridgeHeightDimensionX, ridgeBottom.y, 'vertical', 'ridge-term-bottom'))
  elements.push(drawDimensionTerminator(ridgeHeightDimensionX, ridgeTop.y, 'vertical', 'ridge-term-top'))
  elements.push(
    drawDimensionText(
      'ridge-height-text',
      ridgeHeightDimensionX + 14,
      (ridgeBottom.y + ridgeTop.y) / 2,
      formatMillimeters(truss.ridgeHeight),
      transform,
      -90,
    ),
  )

  return (
    <g data-layer="dimensions" data-testid="layer-dimensions">
      {elements}
    </g>
  )
}

export function drawMemberForces(
  memberForces: MemberForce[] | undefined,
  memberMap: Map<string, MemberLine>,
  transform: ViewportTransform,
) {
  if (!memberForces || memberForces.length === 0) {
    return null
  }

  const annotations = memberForces.flatMap((force) => {
    const memberLine = memberMap.get(force.memberId)

    if (!memberLine) {
      return []
    }

    const point = resolveAnnotationPoint(memberLine, transform, -18, force.x, force.y)

    return [
      <text
        fill={styles.secondary}
        fontFamily="'Consolas', 'Courier New', monospace"
        fontSize={transform.smallFontSize}
        fontWeight={700}
        key={`force-${force.memberId}`}
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="middle"
        x={point.x}
        y={point.y}
      >
        {formatForce(force.value)}
      </text>,
    ]
  })

  if (annotations.length === 0) {
    return null
  }

  return (
    <g data-layer="member-forces" data-testid="layer-member-forces">
      {annotations}
    </g>
  )
}

export function drawMemberLabels(
  memberLabels: MemberLabel[] | undefined,
  memberMap: Map<string, MemberLine>,
  transform: ViewportTransform,
) {
  if (!memberLabels || memberLabels.length === 0) {
    return null
  }

  const annotations = memberLabels.flatMap((label) => {
    const memberLine = memberMap.get(label.memberId)

    if (!memberLine) {
      return []
    }

    const point = resolveAnnotationPoint(memberLine, transform, 18, label.x, label.y)

    return [
      <text
        fill={styles.primary}
        fontFamily="'Consolas', 'Courier New', monospace"
        fontSize={transform.smallFontSize}
        fontWeight={700}
        key={`member-label-${label.memberId}`}
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="middle"
        x={point.x}
        y={point.y}
      >
        {label.text}
      </text>,
    ]
  })

  if (annotations.length === 0) {
    return null
  }

  return (
    <g data-layer="member-labels" data-testid="layer-member-labels">
      {annotations}
    </g>
  )
}

function drawSlopedTick(key: string, point: SvgPoint, angleDeg: number) {
  const tickAngleRad = ((angleDeg + 60) * Math.PI) / 180
  const size = 10

  return (
    <line
      key={key}
      stroke={styles.dimension}
      strokeWidth={1.1}
      x1={point.x - Math.cos(tickAngleRad) * size}
      x2={point.x + Math.cos(tickAngleRad) * size}
      y1={point.y - Math.sin(tickAngleRad) * size}
      y2={point.y + Math.sin(tickAngleRad) * size}
    />
  )
}

function drawSheetAxes(
  transform: ViewportTransform,
  bounds: Bounds,
  leftSupport: Node,
  rightSupport: Node,
  ridgeNode: Node,
) {
  const baselineLeft = toSvgPoint({ x: leftSupport.x, y: bounds.minY }, transform)
  const baselineRight = toSvgPoint({ x: rightSupport.x, y: bounds.minY }, transform)
  const centerX = toSvgPoint({ x: ridgeNode.x, y: bounds.minY }, transform).x
  const topY = toSvgPoint({ x: ridgeNode.x, y: bounds.maxY }, transform).y - 22
  const bottomY = AXIS_LABEL_CENTER_Y - AXIS_CIRCLE_RADIUS - 18
  const axisStations = resolveAxisStations(rightSupport.x - leftSupport.x).map((offset) => leftSupport.x + offset)

  return (
    <g data-layer="axes" data-testid="layer-axes">
      <text
        fill={styles.primary}
        fontFamily="'Segoe UI', 'Arial', sans-serif"
        fontSize={22}
        fontStyle="italic"
        fontWeight={500}
        textAnchor="middle"
        x={transform.viewBoxWidth / 2}
        y={TITLE_Y}
      >
        Геометрическая схема стропильной фермы
      </text>
      <text
        fill={styles.primary}
        fontFamily="'Segoe UI', 'Arial', sans-serif"
        fontSize={14}
        fontStyle="italic"
        textAnchor="middle"
        x={transform.viewBoxWidth / 2}
        y={SUBTITLE_Y}
      >
        (размеры даны в осях, мм; усилия , кН)
      </text>
      <line
        stroke={styles.axis}
        strokeDasharray="8 8"
        strokeWidth={1}
        x1={baselineLeft.x - 36}
        x2={baselineRight.x + 36}
        y1={baselineLeft.y}
        y2={baselineRight.y}
      />
      <line
        stroke={styles.axis}
        strokeDasharray="8 8"
        strokeWidth={1}
        x1={centerX}
        x2={centerX}
        y1={topY}
        y2={bottomY}
      />
      {axisStations.map((axisX, index) => {
        const point = toSvgPoint({ x: axisX, y: bounds.minY }, transform)
        const letter = AXIS_LETTERS[index] ?? `${index + 1}`

        return (
          <g key={`axis-station-${axisX}`}>
            <line
              stroke={styles.axis}
              strokeWidth={0.9}
              x1={point.x}
              x2={point.x}
              y1={topY}
              y2={bottomY}
            />
            <circle
              cx={point.x}
              cy={AXIS_LABEL_CENTER_Y}
              fill={styles.bg}
              r={AXIS_CIRCLE_RADIUS}
              stroke={styles.axis}
              strokeWidth={1}
            />
            <text
              fill={styles.primary}
              fontFamily="'Segoe UI', 'Arial', sans-serif"
              fontSize={18}
              fontStyle="italic"
              textAnchor="middle"
              x={point.x}
              y={AXIS_LABEL_CENTER_Y + 7}
            >
              {letter}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function drawSheetSplice(
  spliceNodeIds: string[] | undefined,
  nodeMap: Map<string, Node>,
  transform: ViewportTransform,
  bounds: Bounds,
) {
  if (!spliceNodeIds || spliceNodeIds.length === 0) {
    return null
  }

  const spliceNodes = spliceNodeIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is Node => Boolean(node))

  if (spliceNodes.length === 0) {
    return null
  }

  const spliceX = spliceNodes.reduce((sum, node) => sum + node.x, 0) / spliceNodes.length
  const topPoint = toSvgPoint({ x: spliceX, y: bounds.maxY }, transform)
  const bottomPoint = toSvgPoint({ x: spliceX, y: bounds.minY }, transform)
  const noteY = bottomPoint.y + 54
  const noteX = topPoint.x + 104

  return (
    <g data-layer="splice" data-testid="layer-splice">
      <line
        stroke={styles.splice}
        strokeWidth={1.8}
        x1={topPoint.x}
        x2={topPoint.x}
        y1={topPoint.y - 26}
        y2={bottomPoint.y + 26}
      />
      <line
        stroke={styles.splice}
        strokeWidth={1.1}
        x1={topPoint.x + 8}
        x2={noteX - 12}
        y1={noteY - 10}
        y2={noteY - 10}
      />
      <line
        stroke={styles.splice}
        strokeWidth={1.1}
        x1={topPoint.x + 8}
        x2={topPoint.x + 18}
        y1={noteY - 10}
        y2={noteY - 14}
      />
      <text
        fill={styles.splice}
        fontFamily="'Segoe UI', 'Arial', sans-serif"
        fontSize={transform.smallFontSize + 1}
        fontStyle="italic"
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="start"
        x={noteX}
        y={noteY}
      >
        Ось монтажного стыка
      </text>
    </g>
  )
}

function drawSheetDimensions(
  truss: TrussDrawingProps['truss'],
  transform: ViewportTransform,
  bounds: Bounds,
  nodeMap: Map<string, Node>,
  leftSupport: Node,
  rightSupport: Node,
  ridgeNode: Node,
) {
  const bottomNodes = resolveBottomDimensionNodes(truss, nodeMap, leftSupport, rightSupport)
  const bottomXPositions = uniqueSortedXPositions(bottomNodes.map((node) => node.x))
  const axisStations = resolveAxisStations(rightSupport.x - leftSupport.x).map((offset) => leftSupport.x + offset)
  const topChordLines = buildMemberLines(truss.topChord, nodeMap)
  const baselineLeft = toSvgPoint({ x: leftSupport.x, y: bounds.minY }, transform)
  const baselineRight = toSvgPoint({ x: rightSupport.x, y: bounds.minY }, transform)
  const supportTopLeft = toSvgPoint({ x: leftSupport.x, y: bounds.minY + truss.supportHeightLeft }, transform)
  const supportTopRight = toSvgPoint({ x: rightSupport.x, y: bounds.minY + truss.supportHeightRight }, transform)
  const ridgeBottom = toSvgPoint({ x: ridgeNode.x, y: bounds.minY }, transform)
  const ridgeTop = toSvgPoint({ x: ridgeNode.x, y: bounds.minY + truss.ridgeHeight }, transform)
  const panelDimensionY = Math.max(baselineLeft.y, baselineRight.y) + 48
  const axisDimensionY = panelDimensionY + 42
  const totalDimensionY = axisDimensionY + 48
  const leftHeightDimensionX = transform.geometryLeft - 74
  const ridgeHeightDimensionX = transform.geometryRight + 74
  const extensionBottomY = AXIS_LABEL_CENTER_Y - AXIS_CIRCLE_RADIUS - 8
  const elements: ReactElement[] = []

  topChordLines.forEach((memberLine, index) => {
    const start = toSvgPoint(memberLine.from, transform)
    const end = toSvgPoint(memberLine.to, transform)
    const offsetLine = resolveOffsetLinePoints(start, end, 24)
    const textPoint = {
      x: (offsetLine.start.x + offsetLine.end.x) / 2,
      y: (offsetLine.start.y + offsetLine.end.y) / 2 - 6,
    }
    const angle = resolveLineAngleDeg(offsetLine.start, offsetLine.end)

    elements.push(
      <line
        key={`top-dim-ext-a-${index}`}
        stroke={styles.dimension}
        strokeWidth={1}
        x1={start.x}
        x2={offsetLine.start.x}
        y1={start.y}
        y2={offsetLine.start.y}
      />,
    )
    elements.push(
      <line
        key={`top-dim-ext-b-${index}`}
        stroke={styles.dimension}
        strokeWidth={1}
        x1={end.x}
        x2={offsetLine.end.x}
        y1={end.y}
        y2={offsetLine.end.y}
      />,
    )
    elements.push(
      <line
        key={`top-dim-line-${index}`}
        stroke={styles.dimension}
        strokeWidth={1}
        x1={offsetLine.start.x}
        x2={offsetLine.end.x}
        y1={offsetLine.start.y}
        y2={offsetLine.end.y}
      />,
    )
    elements.push(drawSlopedTick(`top-dim-tick-a-${index}`, offsetLine.start, angle))
    elements.push(drawSlopedTick(`top-dim-tick-b-${index}`, offsetLine.end, angle))
    elements.push(drawDimensionText(`top-dim-text-${index}`, textPoint.x, textPoint.y, formatMillimeters(memberLine.length), transform, angle))
  })

  bottomXPositions.forEach((xPosition, index) => {
    const point = toSvgPoint({ x: xPosition, y: bounds.minY }, transform)

    elements.push(
      <line
        key={`panel-ext-${index}`}
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={point.x}
        x2={point.x}
        y1={point.y}
        y2={extensionBottomY}
      />,
    )
  })

  axisStations.forEach((axisX, index) => {
    const point = toSvgPoint({ x: axisX, y: bounds.minY }, transform)

    elements.push(
      <line
        key={`axis-ext-${index}`}
        stroke={styles.axis}
        strokeWidth={0.95}
        x1={point.x}
        x2={point.x}
        y1={baselineLeft.y}
        y2={extensionBottomY}
      />,
    )
  })

  for (let index = 0; index < bottomXPositions.length - 1; index += 1) {
    const start = toSvgPoint({ x: bottomXPositions[index], y: bounds.minY }, transform)
    const end = toSvgPoint({ x: bottomXPositions[index + 1], y: bounds.minY }, transform)
    const sizeText = formatMillimeters(bottomXPositions[index + 1] - bottomXPositions[index])

    elements.push(
      <line
        key={`panel-dim-${index}`}
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={start.x}
        x2={end.x}
        y1={panelDimensionY}
        y2={panelDimensionY}
      />,
    )
    elements.push(drawDimensionTerminator(start.x, panelDimensionY, 'horizontal', `panel-term-start-${index}`))
    elements.push(drawDimensionTerminator(end.x, panelDimensionY, 'horizontal', `panel-term-end-${index}`))
    elements.push(drawDimensionText(`panel-text-${index}`, (start.x + end.x) / 2, panelDimensionY - 8, sizeText, transform))
  }

  for (let index = 0; index < axisStations.length - 1; index += 1) {
    const start = toSvgPoint({ x: axisStations[index], y: bounds.minY }, transform)
    const end = toSvgPoint({ x: axisStations[index + 1], y: bounds.minY }, transform)
    const sizeText = formatMillimeters(axisStations[index + 1] - axisStations[index])

    elements.push(
      <line
        key={`axis-dim-${index}`}
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={start.x}
        x2={end.x}
        y1={axisDimensionY}
        y2={axisDimensionY}
      />,
    )
    elements.push(drawDimensionTerminator(start.x, axisDimensionY, 'horizontal', `axis-term-start-${index}`))
    elements.push(drawDimensionTerminator(end.x, axisDimensionY, 'horizontal', `axis-term-end-${index}`))
    elements.push(drawDimensionText(`axis-text-${index}`, (start.x + end.x) / 2, axisDimensionY - 8, sizeText, transform))
  }

  elements.push(
    <line
      key="total-dimension-line"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={baselineLeft.x}
      x2={baselineRight.x}
      y1={totalDimensionY}
      y2={totalDimensionY}
    />,
  )
  elements.push(drawDimensionTerminator(baselineLeft.x, totalDimensionY, 'horizontal', 'total-term-start'))
  elements.push(drawDimensionTerminator(baselineRight.x, totalDimensionY, 'horizontal', 'total-term-end'))
  elements.push(
    drawDimensionText(
      'total-dimension-text',
      (baselineLeft.x + baselineRight.x) / 2,
      totalDimensionY - 10,
      formatMillimeters(truss.span),
      transform,
    ),
  )

  elements.push(
    <line
      key="support-left-base-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={baselineLeft.x}
      x2={leftHeightDimensionX}
      y1={baselineLeft.y}
      y2={baselineLeft.y}
    />,
  )
  elements.push(
    <line
      key="support-left-top-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={supportTopLeft.x}
      x2={leftHeightDimensionX}
      y1={supportTopLeft.y}
      y2={supportTopLeft.y}
    />,
  )
  elements.push(
    <line
      key="support-left-dimension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={leftHeightDimensionX}
      x2={leftHeightDimensionX}
      y1={baselineLeft.y}
      y2={supportTopLeft.y}
    />,
  )
  elements.push(drawDimensionTerminator(leftHeightDimensionX, baselineLeft.y, 'vertical', 'support-left-term-bottom'))
  elements.push(drawDimensionTerminator(leftHeightDimensionX, supportTopLeft.y, 'vertical', 'support-left-term-top'))
  elements.push(
    drawDimensionText(
      'support-left-height-text',
      leftHeightDimensionX - 14,
      (baselineLeft.y + supportTopLeft.y) / 2,
      formatMillimeters(truss.supportHeightLeft),
      transform,
      -90,
    ),
  )

  if (Math.abs(truss.supportHeightRight - truss.supportHeightLeft) > 0.001) {
    const rightHeightDimensionX = transform.geometryRight + 126

    elements.push(
      <line
        key="support-right-base-extension"
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={baselineRight.x}
        x2={rightHeightDimensionX}
        y1={baselineRight.y}
        y2={baselineRight.y}
      />,
    )
    elements.push(
      <line
        key="support-right-top-extension"
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={supportTopRight.x}
        x2={rightHeightDimensionX}
        y1={supportTopRight.y}
        y2={supportTopRight.y}
      />,
    )
    elements.push(
      <line
        key="support-right-dimension"
        stroke={styles.dimension}
        strokeWidth={transform.dimensionStrokeWidth}
        x1={rightHeightDimensionX}
        x2={rightHeightDimensionX}
        y1={baselineRight.y}
        y2={supportTopRight.y}
      />,
    )
    elements.push(drawDimensionTerminator(rightHeightDimensionX, baselineRight.y, 'vertical', 'support-right-term-bottom'))
    elements.push(drawDimensionTerminator(rightHeightDimensionX, supportTopRight.y, 'vertical', 'support-right-term-top'))
    elements.push(
      drawDimensionText(
        'support-right-height-text',
        rightHeightDimensionX + 14,
        (baselineRight.y + supportTopRight.y) / 2,
        formatMillimeters(truss.supportHeightRight),
        transform,
        -90,
      ),
    )
  }

  elements.push(
    <line
      key="ridge-base-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={ridgeBottom.x}
      x2={ridgeHeightDimensionX}
      y1={ridgeBottom.y}
      y2={ridgeBottom.y}
    />,
  )
  elements.push(
    <line
      key="ridge-top-extension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={ridgeTop.x}
      x2={ridgeHeightDimensionX}
      y1={ridgeTop.y}
      y2={ridgeTop.y}
    />,
  )
  elements.push(
    <line
      key="ridge-dimension"
      stroke={styles.dimension}
      strokeWidth={transform.dimensionStrokeWidth}
      x1={ridgeHeightDimensionX}
      x2={ridgeHeightDimensionX}
      y1={ridgeBottom.y}
      y2={ridgeTop.y}
    />,
  )
  elements.push(drawDimensionTerminator(ridgeHeightDimensionX, ridgeBottom.y, 'vertical', 'ridge-term-bottom'))
  elements.push(drawDimensionTerminator(ridgeHeightDimensionX, ridgeTop.y, 'vertical', 'ridge-term-top'))
  elements.push(
    drawDimensionText(
      'ridge-height-text',
      ridgeHeightDimensionX + 14,
      (ridgeBottom.y + ridgeTop.y) / 2,
      formatMillimeters(truss.ridgeHeight),
      transform,
      -90,
    ),
  )

  return (
    <g data-layer="dimensions" data-testid="layer-dimensions">
      {elements}
    </g>
  )
}

function drawRotatedMemberForces(
  memberForces: MemberForce[] | undefined,
  memberMap: Map<string, MemberLine>,
  transform: ViewportTransform,
) {
  if (!memberForces || memberForces.length === 0) {
    return null
  }

  const annotations = memberForces.flatMap((force) => {
    const memberLine = memberMap.get(force.memberId)

    if (!memberLine) {
      return []
    }

    const point = resolveAnnotationPoint(memberLine, transform, -18, force.x, force.y)

    return [
      <text
        dominantBaseline="central"
        fill={styles.secondary}
        fontFamily="'Segoe UI', 'Arial', sans-serif"
        fontSize={transform.smallFontSize}
        fontStyle="italic"
        key={`force-rotated-${force.memberId}`}
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="middle"
        transform={resolveMemberTextTransform(memberLine, point, transform)}
        x={point.x}
        y={point.y}
      >
        {formatForce(force.value)}
      </text>,
    ]
  })

  return annotations.length > 0 ? (
    <g data-layer="member-forces" data-testid="layer-member-forces">
      {annotations}
    </g>
  ) : null
}

function drawRotatedMemberLabels(
  memberLabels: MemberLabel[] | undefined,
  memberMap: Map<string, MemberLine>,
  transform: ViewportTransform,
) {
  if (!memberLabels || memberLabels.length === 0) {
    return null
  }

  const annotations = memberLabels.flatMap((label) => {
    const memberLine = memberMap.get(label.memberId)

    if (!memberLine) {
      return []
    }

    const point = resolveAnnotationPoint(memberLine, transform, 18, label.x, label.y)

    return [
      <text
        dominantBaseline="central"
        fill={styles.primary}
        fontFamily="'Segoe UI', 'Arial', sans-serif"
        fontSize={transform.smallFontSize}
        fontStyle="italic"
        key={`member-label-rotated-${label.memberId}`}
        paintOrder="stroke"
        stroke={styles.textBg}
        strokeWidth={4}
        textAnchor="middle"
        transform={resolveMemberTextTransform(memberLine, point, transform)}
        x={point.x}
        y={point.y}
      >
        {label.text}
      </text>,
    ]
  })

  return annotations.length > 0 ? (
    <g data-layer="member-labels" data-testid="layer-member-labels">
      {annotations}
    </g>
  ) : null
}

const mockTopChord: MemberRef[] = [
  { id: 'TC1', from: 'T0', to: 'T1' },
  { id: 'TC2', from: 'T1', to: 'T2' },
  { id: 'TC3', from: 'T2', to: 'T3' },
  { id: 'TC4', from: 'T3', to: 'T4' },
  { id: 'TC5', from: 'T4', to: 'T5' },
  { id: 'TC6', from: 'T5', to: 'T6' },
  { id: 'TC7', from: 'T6', to: 'T7' },
  { id: 'TC8', from: 'T7', to: 'T8' },
]

const mockBottomChord: MemberRef[] = [
  { id: 'BC1', from: 'B0', to: 'B1' },
  { id: 'BC2', from: 'B1', to: 'B2' },
  { id: 'BC3', from: 'B2', to: 'B3' },
  { id: 'BC4', from: 'B3', to: 'B4' },
  { id: 'BC5', from: 'B4', to: 'B5' },
  { id: 'BC6', from: 'B5', to: 'B6' },
  { id: 'BC7', from: 'B6', to: 'B7' },
  { id: 'BC8', from: 'B7', to: 'B8' },
]

const mockWebs: MemberRef[] = [
  { id: 'V0', from: 'B0', to: 'T0' },
  { id: 'V1', from: 'B1', to: 'T1' },
  { id: 'V2', from: 'B2', to: 'T2' },
  { id: 'V3', from: 'B3', to: 'T3' },
  { id: 'V4', from: 'B4', to: 'T4' },
  { id: 'V5', from: 'B5', to: 'T5' },
  { id: 'V6', from: 'B6', to: 'T6' },
  { id: 'V7', from: 'B7', to: 'T7' },
  { id: 'V8', from: 'B8', to: 'T8' },
  { id: 'D1', from: 'B0', to: 'T1' },
  { id: 'D2', from: 'B1', to: 'T2' },
  { id: 'D3', from: 'B2', to: 'T3' },
  { id: 'D4', from: 'B3', to: 'T4' },
  { id: 'D5', from: 'T4', to: 'B5' },
  { id: 'D6', from: 'T5', to: 'B6' },
  { id: 'D7', from: 'T6', to: 'B7' },
  { id: 'D8', from: 'T7', to: 'B8' },
]

const mockTopForces = [-188, -194, -205, -214, -214, -205, -194, -188]
const mockBottomForces = [145, 152, 160, 166, 166, 160, 152, 145]
const mockWebForces = [-62, -48, -34, -18, 12, 18, 34, 48, 62, 88, 96, 101, 108, -108, -101, -96, -88]

export const mockTrussData: TrussDrawingProps['truss'] = {
  span: 24000,
  supportHeightLeft: 900,
  supportHeightRight: 900,
  ridgeHeight: 2160,
  panelCount: 8,
  nodes: [
    { id: 'B0', x: 0, y: 0 },
    { id: 'B1', x: 3000, y: 0 },
    { id: 'B2', x: 6000, y: 0 },
    { id: 'B3', x: 9000, y: 0 },
    { id: 'B4', x: 12000, y: 0 },
    { id: 'B5', x: 15000, y: 0 },
    { id: 'B6', x: 18000, y: 0 },
    { id: 'B7', x: 21000, y: 0 },
    { id: 'B8', x: 24000, y: 0 },
    { id: 'T0', x: 0, y: 900 },
    { id: 'T1', x: 3000, y: 1215 },
    { id: 'T2', x: 6000, y: 1530 },
    { id: 'T3', x: 9000, y: 1845 },
    { id: 'T4', x: 12000, y: 2160 },
    { id: 'T5', x: 15000, y: 1845 },
    { id: 'T6', x: 18000, y: 1530 },
    { id: 'T7', x: 21000, y: 1215 },
    { id: 'T8', x: 24000, y: 900 },
  ],
  topChord: mockTopChord,
  bottomChord: mockBottomChord,
  webs: mockWebs,
  supportNodeIds: {
    left: 'B0',
    right: 'B8',
  },
  spliceNodeIds: ['T4', 'B4'],
  memberForces: [
    ...mockTopChord.map((member, index) => ({ memberId: member.id, value: mockTopForces[index] })),
    ...mockBottomChord.map((member, index) => ({ memberId: member.id, value: mockBottomForces[index] })),
    ...mockWebs.map((member, index) => ({ memberId: member.id, value: mockWebForces[index] })),
  ],
  memberLabels: [
    ...mockTopChord.map((member, index) => ({ memberId: member.id, text: `ВП-${index + 1}` })),
    ...mockBottomChord.map((member, index) => ({ memberId: member.id, text: `НП-${index + 1}` })),
    ...mockWebs.map((member, index) => ({
      memberId: member.id,
      text: member.id.startsWith('V') ? `Ст-${index + 1}` : `Р-${index - 8}`,
    })),
  ],
}

export function TrussDrawing({
  width = '100%',
  height,
  truss,
  display,
}: TrussDrawingProps) {
  const visible = {
    ...defaultDisplay,
    ...display,
  }
  const bounds = getBoundsFromNodes(truss.nodes)
  const transform = createViewportTransform(bounds)
  const nodeMap = buildNodeMap(truss.nodes)
  const { leftSupport, rightSupport } = resolveSupportNodes(truss, nodeMap, bounds)
  const ridgeNode = resolveRidgeNode(truss.nodes, bounds)
  const topChordLines = buildMemberLines(truss.topChord, nodeMap)
  const bottomChordLines = buildMemberLines(truss.bottomChord, nodeMap)
  const webLines = buildMemberLines(truss.webs, nodeMap)
  const memberMap = new Map<string, MemberLine>(
    [...topChordLines, ...bottomChordLines, ...webLines].map((memberLine) => [memberLine.id, memberLine]),
  )
  const labels = visible.showNodeLabels ? drawNodeLabels(truss.nodes, transform) : null

  return (
    <svg
      aria-label="Чертеж стропильной фермы"
      preserveAspectRatio="xMidYMid meet"
      style={{
        background: styles.bg,
        display: 'block',
        height: height ?? 'auto',
        maxWidth: '100%',
        width,
      }}
      viewBox={`0 0 ${transform.viewBoxWidth} ${transform.viewBoxHeight}`}
    >
      <rect fill={styles.bg} height={transform.viewBoxHeight} width={transform.viewBoxWidth} x={0} y={0} />

      {visible.showAxes && drawAxes(transform, bounds, leftSupport, rightSupport, ridgeNode)}
      {visible.showSupports && drawSupports(leftSupport, rightSupport, transform)}

      <g data-layer="truss-members" data-testid="layer-truss-members">
        {topChordLines.map((memberLine) => {
          const start = toSvgPoint(memberLine.from, transform)
          const end = toSvgPoint(memberLine.to, transform)

          return (
            <line
              key={memberLine.id}
              stroke={styles.primary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={transform.memberStrokeWidth}
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
            />
          )
        })}

        {bottomChordLines.map((memberLine) => {
          const start = toSvgPoint(memberLine.from, transform)
          const end = toSvgPoint(memberLine.to, transform)

          return (
            <line
              key={memberLine.id}
              stroke={styles.primary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={transform.memberStrokeWidth}
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
            />
          )
        })}

        {webLines.map((memberLine) => {
          const start = toSvgPoint(memberLine.from, transform)
          const end = toSvgPoint(memberLine.to, transform)

          return (
            <line
              key={memberLine.id}
              stroke={styles.primary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={memberLine.isVertical ? transform.secondaryStrokeWidth + 0.1 : transform.secondaryStrokeWidth}
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
            />
          )
        })}
      </g>

      {visible.showNodes && drawNodes(truss.nodes, transform)}

      {visible.showDimensions &&
        drawSheetDimensions(truss, transform, bounds, nodeMap, leftSupport, rightSupport, ridgeNode)}

      {visible.showNodeLabels && (
        <g data-layer="labels" data-testid="layer-labels">
          {labels}
        </g>
      )}

      {visible.showSplice && drawSheetSplice(truss.spliceNodeIds, nodeMap, transform, bounds)}
      {visible.showMemberForces && drawRotatedMemberForces(truss.memberForces, memberMap, transform)}
      {visible.showMemberLabels && drawRotatedMemberLabels(truss.memberLabels, memberMap, transform)}
    </svg>
  )
}

export type { Bounds, MemberForce, MemberLabel, MemberLine, MemberRef, Node, SvgPoint, TrussDrawingProps, ViewportTransform }
