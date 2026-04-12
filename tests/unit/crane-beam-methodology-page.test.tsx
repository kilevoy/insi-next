import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CraneBeamMethodologyPage } from '../../src/pages/crane-beam-methodology/ui/crane-beam-methodology-page'

describe('CraneBeamMethodologyPage', () => {
  it('renders the professional methodology content and navigation links', () => {
    render(<CraneBeamMethodologyPage />)

    expect(screen.getByTestId('crane-beam-methodology-page')).toBeInTheDocument()
    expect(screen.getByText('Методика расчета и подбора профиля подкрановой балки')).toBeInTheDocument()
    expect(screen.getByText('Расчетные воздействия')).toBeInTheDocument()
    expect(screen.getByText('Проверка и подбор профиля')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Открыть модуль подкрановой балки' })).toHaveAttribute(
      'href',
      '/?route=crane-beam-demo',
    )
    expect(screen.getByRole('link', { name: 'Открыть основной калькулятор' })).toHaveAttribute('href', '/')
  })
})
