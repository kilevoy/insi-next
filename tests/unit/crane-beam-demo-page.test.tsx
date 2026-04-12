import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CraneBeamDemoPage } from '../../src/pages/crane-beam-demo/ui/crane-beam-demo-page'

const text = {
  title: 'Подбор прокатной подкрановой балки',
  backToCalculator: 'Открыть основной калькулятор',
  methodology: 'Методика расчета и подбора профиля',
  loadCapacityT: 'Грузоподъемность, т',
  craneSpanM: 'Пролет крана, м',
  wheelLoadKn: 'Нагрузка на колесо, кН',
  suspensionType: 'Тип подвеса',
  lookupMode: 'Источник паспортных данных',
  result: 'Результат подбора',
} as const

describe('CraneBeamDemoPage', () => {
  it('renders the calculator scaffold with the main sections', () => {
    render(<CraneBeamDemoPage />)

    expect(screen.getByTestId('crane-beam-demo-page')).toBeInTheDocument()
    expect(screen.getByText(text.title)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: text.backToCalculator })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: text.methodology })).toHaveAttribute(
      'href',
      '/?route=crane-beam-methodology',
    )
    expect(screen.getByText(text.result)).toBeInTheDocument()
  })

  it('allows changing core inputs', () => {
    render(<CraneBeamDemoPage />)

    const capacityInput = screen.getByRole('combobox', { name: text.loadCapacityT })
    fireEvent.change(capacityInput, { target: { value: '10' } })
    fireEvent.change(screen.getByRole('textbox', { name: text.craneSpanM }), { target: { value: '30' } })

    expect(screen.getByRole('combobox', { name: text.loadCapacityT })).toHaveValue('10')
    expect(screen.getByRole('textbox', { name: text.craneSpanM })).toHaveValue('30')
    expect(screen.getByText(text.result)).toBeInTheDocument()
  })

  it('keeps catalog passport fields read-only until manual mode is enabled', () => {
    render(<CraneBeamDemoPage />)

    const lookupModeSelect = screen.getByRole('combobox', { name: text.lookupMode })
    const wheelLoadInput = screen.getByRole('textbox', { name: text.wheelLoadKn })

    expect(lookupModeSelect).toHaveValue('catalog')
    expect(wheelLoadInput).toBeDisabled()

    fireEvent.change(lookupModeSelect, { target: { value: 'manual' } })

    expect(lookupModeSelect).toHaveValue('manual')
    expect(wheelLoadInput).toBeEnabled()
  })

  it('allows changing crane mode fields', () => {
    render(<CraneBeamDemoPage />)

    const suspensionSelect = screen.getByRole('combobox', { name: text.suspensionType })

    fireEvent.change(suspensionSelect, { target: { value: 'жесткий' } })
    fireEvent.change(screen.getByRole('textbox', { name: text.craneSpanM }), { target: { value: '30' } })

    expect(suspensionSelect).toHaveValue('жесткий')
    expect(screen.getByRole('textbox', { name: text.craneSpanM })).toHaveValue('30')
  })

  it('shows and hides field help on click', () => {
    render(<CraneBeamDemoPage />)

    const helpButton = screen.getByRole('button', { name: `${text.lookupMode}: подсказка` })

    expect(screen.queryByRole('note')).not.toBeInTheDocument()

    fireEvent.click(helpButton)

    expect(screen.getByRole('note')).toHaveTextContent(
      'Показывает, откуда брать паспортные данные крана и рельса.',
    )

    fireEvent.click(helpButton)

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})
