import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CraneBeamMethodologyPage } from '../../src/pages/crane-beam-methodology/ui/crane-beam-methodology-page'

describe('CraneBeamMethodologyPage', () => {
  it('renders the methodology content and navigation links', () => {
    render(<CraneBeamMethodologyPage />)

    expect(screen.getByTestId('crane-beam-methodology-page')).toBeInTheDocument()
    expect(screen.getByText('Цель и методика подбора подкрановой балки')).toBeInTheDocument()
    expect(screen.getByText('Цель калькулятора')).toBeInTheDocument()
    expect(screen.getByText('Как устроен подбор')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Открыть модуль подкрановой балки' })).toHaveAttribute(
      'href',
      '/crane-beam-demo',
    )
    expect(screen.getByRole('link', { name: 'Открыть основной калькулятор' })).toHaveAttribute('href', '/')
  })
})
