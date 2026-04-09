import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CraneBeamDemoPage } from '../../src/pages/crane-beam-demo/ui/crane-beam-demo-page'

const text = {
  title: '\u041F\u043E\u0434\u0431\u043E\u0440 \u043F\u0440\u043E\u043A\u0430\u0442\u043D\u043E\u0439 \u043F\u043E\u0434\u043A\u0440\u0430\u043D\u043E\u0432\u043E\u0439 \u0431\u0430\u043B\u043A\u0438',
  backToCalculator: '\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440',
  loadCapacityT: '\u0413\u0440\u0443\u0437\u043E\u043F\u043E\u0434\u044A\u0435\u043C\u043D\u043E\u0441\u0442\u044C, \u0442',
  craneSpanM: '\u041F\u0440\u043E\u043B\u0435\u0442 \u043A\u0440\u0430\u043D\u0430, \u043C',
  wheelLoadKn: '\u041D\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0430 \u043A\u043E\u043B\u0435\u0441\u043E, \u043A\u041D',
  suspensionType: '\u0422\u0438\u043F \u043F\u043E\u0434\u0432\u0435\u0441\u0430',
  result: '\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0434\u0431\u043E\u0440\u0430',
} as const

describe('CraneBeamDemoPage', () => {
  it('renders the new calculator scaffold with the main sections', () => {
    render(<CraneBeamDemoPage />)

    expect(screen.getByTestId('crane-beam-demo-page')).toBeInTheDocument()
    expect(screen.getByText(text.title)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: text.backToCalculator })).toHaveAttribute('href', '/')
    expect(screen.getByText(text.result)).toBeInTheDocument()
  })

  it('allows changing numeric inputs', () => {
    render(<CraneBeamDemoPage />)

    const capacityInput = screen.getByLabelText(text.loadCapacityT)
    fireEvent.change(capacityInput, { target: { value: '10' } })

    expect(screen.getByLabelText(text.loadCapacityT)).toHaveValue('10')
    expect(screen.getByText(/Грузоподъемность, т: 10/)).toBeInTheDocument()
  })

  it('allows changing crane mode fields', () => {
    render(<CraneBeamDemoPage />)

    const suspensionSelect = screen.getByLabelText(text.suspensionType)

    fireEvent.change(suspensionSelect, { target: { value: 'жесткий' } })
    fireEvent.change(screen.getByLabelText(text.craneSpanM), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(text.wheelLoadKn), { target: { value: '75' } })

    expect(suspensionSelect).toHaveValue('жесткий')
    expect(screen.getByText(/Пролет крана, м: 30/)).toBeInTheDocument()
    expect(screen.getByText(/Нагрузка на колесо, кН: 75/)).toBeInTheDocument()
  })
})
