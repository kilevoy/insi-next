import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CraneBeamDemoPage } from '../../src/pages/crane-beam-demo/ui/crane-beam-demo-page'

const text = {
  title: '\u041f\u043e\u0434\u0431\u043e\u0440 \u043f\u0440\u043e\u043a\u0430\u0442\u043d\u043e\u0439 \u043f\u043e\u0434\u043a\u0440\u0430\u043d\u043e\u0432\u043e\u0439 \u0431\u0430\u043b\u043a\u0438',
  backToCalculator: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u043a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440',
  loadCapacityT: '\u0413\u0440\u0443\u0437\u043e\u043f\u043e\u0434\u044a\u0435\u043c\u043d\u043e\u0441\u0442\u044c, \u0442',
  craneSpanM: '\u041f\u0440\u043e\u043b\u0435\u0442 \u043a\u0440\u0430\u043d\u0430, \u043c',
  wheelLoadKn: '\u041d\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043d\u0430 \u043a\u043e\u043b\u0435\u0441\u043e, \u043a\u041d',
  suspensionType: '\u0422\u0438\u043f \u043f\u043e\u0434\u0432\u0435\u0441\u0430',
  result: '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u043e\u0434\u0431\u043e\u0440\u0430',
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
    expect(screen.getByText(text.result)).toBeInTheDocument()
  })

  it('allows changing crane mode fields', () => {
    render(<CraneBeamDemoPage />)

    const suspensionSelect = screen.getByLabelText(text.suspensionType)

    fireEvent.change(suspensionSelect, { target: { value: '\u0436\u0435\u0441\u0442\u043a\u0438\u0439' } })
    fireEvent.change(screen.getByLabelText(text.craneSpanM), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(text.wheelLoadKn), { target: { value: '75' } })

    expect(suspensionSelect).toHaveValue('\u0436\u0435\u0441\u0442\u043a\u0438\u0439')
    expect(screen.getByLabelText(text.craneSpanM)).toHaveValue('30')
    expect(screen.getByLabelText(text.wheelLoadKn)).toHaveValue('75')
  })
})
