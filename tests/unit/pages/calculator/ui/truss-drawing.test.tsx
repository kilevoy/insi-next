import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  TrussDrawing,
  buildMemberLines,
  buildNodeMap,
  createViewportTransform,
  getBoundsFromNodes,
  mockTrussData,
  toSvgPoint,
  type MemberRef,
} from '@/pages/calculator/ui/TrussDrawing'

describe('TrussDrawing helpers', () => {
  it('calculates truss bounds from explicit node coordinates', () => {
    const bounds = getBoundsFromNodes(mockTrussData.nodes)

    expect(bounds.minX).toBe(0)
    expect(bounds.maxX).toBe(24000)
    expect(bounds.minY).toBe(0)
    expect(bounds.maxY).toBe(2160)
    expect(bounds.width).toBe(24000)
    expect(bounds.height).toBe(2160)
  })

  it('maps engineering coordinates into svg coordinates without flipping left-right', () => {
    const bounds = getBoundsFromNodes(mockTrussData.nodes)
    const transform = createViewportTransform(bounds)

    const leftBottom = toSvgPoint({ x: 0, y: 0 }, transform)
    const leftTop = toSvgPoint({ x: 0, y: 2160 }, transform)
    const rightBottom = toSvgPoint({ x: 24000, y: 0 }, transform)

    expect(leftTop.y).toBeLessThan(leftBottom.y)
    expect(rightBottom.x).toBeGreaterThan(leftBottom.x)
  })

  it('skips members that reference missing nodes', () => {
    const nodeMap = buildNodeMap(mockTrussData.nodes)
    const members: MemberRef[] = [
      { id: 'valid', from: mockTrussData.topChord[0].from, to: mockTrussData.topChord[0].to },
      { id: 'invalid', from: 'missing-from', to: 'missing-to' },
    ]

    const memberLines = buildMemberLines(members, nodeMap)

    expect(memberLines).toHaveLength(1)
    expect(memberLines[0]?.id).toBe('valid')
  })
})

describe('TrussDrawing', () => {
  it('renders engineering layers, dimensions, splice and member annotations', () => {
    render(
      <TrussDrawing
        truss={mockTrussData}
        display={{
          showAxes: true,
          showSupports: true,
          showNodes: true,
          showNodeLabels: true,
          showDimensions: true,
          showSplice: true,
          showMemberForces: true,
          showMemberLabels: true,
        }}
      />,
    )

    const svg = screen.getByLabelText('Чертеж стропильной фермы')

    expect(within(svg).getByTestId('layer-axes')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-supports')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-truss-members')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-nodes')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-dimensions')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-labels')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-splice')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-member-forces')).toBeInTheDocument()
    expect(within(svg).getByTestId('layer-member-labels')).toBeInTheDocument()

    expect(screen.getByText(/24\s?000/)).toBeInTheDocument()
    expect(screen.getAllByText(/3\s?000/).length).toBeGreaterThan(0)
    expect(screen.getByText(/900/)).toBeInTheDocument()
    expect(screen.getByText(/2\s?160/)).toBeInTheDocument()
    expect(screen.getByText('Монтажный стык')).toBeInTheDocument()
    expect(screen.getAllByText('+145.0 kN').length).toBeGreaterThan(0)
    expect(screen.getByText('ВП-1')).toBeInTheDocument()
  })

  it('hides optional layers when disabled', () => {
    render(
      <TrussDrawing
        truss={mockTrussData}
        display={{
          showAxes: false,
          showSupports: false,
          showNodes: false,
          showNodeLabels: false,
          showDimensions: false,
          showSplice: false,
          showMemberForces: false,
          showMemberLabels: false,
        }}
      />,
    )

    expect(screen.queryByTestId('layer-axes')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-supports')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-nodes')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-dimensions')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-labels')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-splice')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-member-forces')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layer-member-labels')).not.toBeInTheDocument()
    expect(screen.getByTestId('layer-truss-members')).toBeInTheDocument()
  })
})
