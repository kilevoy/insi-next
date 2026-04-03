import { resolveTrussGeometryTemplate } from '@/domain/truss/model/truss-geometry'
import type { TrussCalculationResult } from '@/domain/truss/model/calculate-truss'
import type { UnifiedInputState } from '../model/unified-input'
import type { MemberForce, MemberLabel, MemberRef, Node, TrussDrawingProps } from './TrussDrawing'

type WebGroupKey = 'orb' | 'or' | 'rr'

function resolveRoofRiseMm(
  spanMm: number,
  roofSlopeDeg: number,
  roofType: UnifiedInputState['roofType'],
): number {
  const radians = (roofSlopeDeg * Math.PI) / 180
  const horizontalProjectionMm = roofType === 'двускатная' ? spanMm / 2 : spanMm
  return Math.tan(radians) * horizontalProjectionMm
}

function buildTopNodeY(
  x: number,
  spanMm: number,
  eaveHeightMm: number,
  roofRiseMm: number,
  roofType: UnifiedInputState['roofType'],
): number {
  const ratio = spanMm <= 0 ? 0 : x / spanMm

  if (roofType === 'двускатная') {
    return eaveHeightMm + roofRiseMm * (1 - Math.abs(1 - 2 * ratio))
  }

  return eaveHeightMm + roofRiseMm * ratio
}

function toMemberRef(member: { id: string; from: string; to: string }): MemberRef {
  return {
    id: member.id,
    from: member.from,
    to: member.to,
  }
}

function resolveWebGroupKey(memberId: string, panelCount: number): WebGroupKey {
  const match = memberId.match(/^(WL|WR)(\d+)$/)

  if (!match) {
    return 'rr'
  }

  const panelIndex = Number(match[2])
  const mirroredIndex = Math.min(panelIndex, panelCount - panelIndex + 1)

  if (mirroredIndex === 1) {
    return 'orb'
  }

  if (mirroredIndex === 2) {
    return 'or'
  }

  return 'rr'
}

function buildMemberLabels(
  topChord: MemberRef[],
  bottomChord: MemberRef[],
  webs: MemberRef[],
  panelCount: number,
  trussResult: TrussCalculationResult,
): MemberLabel[] {
  const topPrefix = trussResult.groups.vp.label || 'ВП'
  const bottomPrefix = trussResult.groups.np.label || 'НП'

  return [
    ...topChord.map((member, index) => ({
      memberId: member.id,
      text: `${topPrefix}-${index + 1}`,
    })),
    ...bottomChord.map((member, index) => ({
      memberId: member.id,
      text: `${bottomPrefix}-${index + 1}`,
    })),
    ...webs.map((member, index) => ({
      memberId: member.id,
      text: `${trussResult.groups[resolveWebGroupKey(member.id, panelCount)].label}-${index + 1}`,
    })),
  ]
}

function buildMemberForces(
  topChord: MemberRef[],
  bottomChord: MemberRef[],
  webs: MemberRef[],
  panelCount: number,
  trussResult: TrussCalculationResult,
): MemberForce[] {
  const { efforts } = trussResult

  const webEfforts = {
    orb: { plus: efforts.orbNPlus, minus: efforts.orbNMinus },
    or: { plus: efforts.orNPlus, minus: efforts.orNMinus },
    rr: { plus: efforts.rrNPlus, minus: efforts.rrNMinus },
  } as const

  return [
    ...topChord.map((member) => ({
      memberId: member.id,
      value: -Math.abs(efforts.vpN),
    })),
    ...bottomChord.map((member) => ({
      memberId: member.id,
      value: Math.abs(efforts.npNPlus),
    })),
    ...webs.map((member) => {
      const groupKey = resolveWebGroupKey(member.id, panelCount)
      const effort = webEfforts[groupKey]

      return {
        memberId: member.id,
        value: member.id.startsWith('WR') ? Math.abs(effort.plus) : -Math.abs(effort.minus),
      }
    }),
  ]
}

function resolveCenterSpliceNodeIds(topNodes: Node[], spanMm: number): string[] {
  if (topNodes.length === 0) {
    return []
  }

  const centerX = spanMm / 2
  const centerNode = topNodes.reduce((best, node) => {
    return Math.abs(node.x - centerX) < Math.abs(best.x - centerX) ? node : best
  }, topNodes[0])

  return centerNode ? [centerNode.id] : []
}

export function buildTrussDrawingData(
  roofType: UnifiedInputState['roofType'],
  trussResult: TrussCalculationResult,
): TrussDrawingProps['truss'] | null {
  const template = resolveTrussGeometryTemplate(trussResult.loadSummary.spanM)

  if (!template) {
    return null
  }

  const spanMm = template.spanM * 1000
  const roofRiseMm = resolveRoofRiseMm(spanMm, trussResult.loadSummary.roofSlopeDeg, roofType)
  const topNodes: Node[] = template.nodes
    .filter((node) => node.belt === 'top')
    .map((node) => ({
      id: node.id,
      x: node.xMm,
      y: buildTopNodeY(node.xMm, spanMm, template.supportHeightMm, roofRiseMm, roofType),
    }))
  const bottomNodes: Node[] = template.nodes
    .filter((node) => node.belt === 'bottom')
    .map((node) => ({
      id: node.id,
      x: node.xMm,
      y: 0,
    }))
  const nodes = [...topNodes, ...bottomNodes]
  const topChord = template.members.filter((member) => member.kind === 'top-chord').map(toMemberRef)
  const bottomChord = template.members.filter((member) => member.kind === 'bottom-chord').map(toMemberRef)
  const webs = template.members.filter((member) => member.kind === 'web').map(toMemberRef)
  const leftSupportNode = topNodes[0]
  const rightSupportNode = topNodes[topNodes.length - 1]
  const panelCount = Math.max(topNodes.length - 1, 1)
  const ridgeHeight = Math.max(...topNodes.map((node) => node.y))

  if (!leftSupportNode || !rightSupportNode) {
    return null
  }

  return {
    span: spanMm,
    supportHeightLeft: leftSupportNode.y,
    supportHeightRight: rightSupportNode.y,
    ridgeHeight,
    panelCount,
    nodes,
    topChord,
    bottomChord,
    webs,
    supportNodeIds: {
      left: leftSupportNode.id,
      right: rightSupportNode.id,
    },
    spliceNodeIds: resolveCenterSpliceNodeIds(topNodes, spanMm),
    memberForces: buildMemberForces(topChord, bottomChord, webs, panelCount, trussResult),
    memberLabels: buildMemberLabels(topChord, bottomChord, webs, panelCount, trussResult),
  }
}
