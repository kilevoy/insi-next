import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WindowRigelDemoPage } from '../../src/pages/window-rigel-demo/ui/window-rigel-demo-page'

describe('WindowRigelDemoPage', () => {
  it('shows the default calculated top candidates', () => {
    render(<WindowRigelDemoPage />)

    expect(screen.getByTestId('window-rigel-demo-page')).toBeInTheDocument()
    expect(screen.getAllByText(/кв\.120х3/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Сталь: С245').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Коэффициенты: гибкость 0,76 · прочность 0,82 · прогиб 0,87/)[0],
    ).toBeInTheDocument()
  })

  it('recalculates when the max utilization changes', () => {
    render(<WindowRigelDemoPage />)

    const maxUtilizationInput = screen.getByLabelText('Макс. к-т использования')
    fireEvent.change(maxUtilizationInput, { target: { value: '0,01' } })

    expect(screen.getByText('Подходящих нижних ригелей не найдено.')).toBeInTheDocument()
    expect(screen.getByText('Подходящих верхних ригелей не найдено.')).toBeInTheDocument()
  })

  it('allows changing the city through a safe select control', () => {
    render(<WindowRigelDemoPage />)

    const citySelect = screen.getByRole('combobox', { name: 'Город' })
    fireEvent.change(citySelect, { target: { value: 'Москва' } })

    expect(screen.getByDisplayValue('Москва')).toBeInTheDocument()
    expect(screen.getByText(/Ветер:/)).toBeInTheDocument()
  })

  it('updates the wind load when Almetyevsk is selected', () => {
    render(<WindowRigelDemoPage />)

    const citySelect = screen.getByRole('combobox', { name: 'Город' })
    fireEvent.change(citySelect, { target: { value: 'Альметьевск' } })

    expect(screen.getByDisplayValue('Альметьевск')).toBeInTheDocument()
    expect(screen.getByText('Ветер: 0,300 кПа')).toBeInTheDocument()
  })

  it('updates the vertical load when window construction changes', () => {
    render(<WindowRigelDemoPage />)

    const constructionSelect = screen.getByRole('combobox', { name: 'Конструкция окна' })
    fireEvent.change(constructionSelect, { target: { value: '1ый стеклопакет' } })

    expect(screen.getByDisplayValue('1ый стеклопакет')).toBeInTheDocument()
    expect(screen.getByText('Вертикальная: 0,300 кПа')).toBeInTheDocument()
  })

  it('keeps the window count input available for future wall visualization work', () => {
    render(<WindowRigelDemoPage />)

    const windowCountInput = screen.getByLabelText('Количество окон')
    fireEvent.change(windowCountInput, { target: { value: '6' } })

    expect(screen.getByLabelText('Количество окон')).toHaveValue('6')
  })

  it('shows a specification block with best rigels total mass and cost by window count', () => {
    render(<WindowRigelDemoPage />)

    const windowCountInput = screen.getByLabelText('Количество окон')
    fireEvent.change(windowCountInput, { target: { value: '6' } })

    expect(screen.getByText('Спецификация')).toBeInTheDocument()
    const bottomSpecification = screen.getByText('Лучший нижний ригель').closest('article')
    const topSpecification = screen.getByText('Лучший верхний ригель').closest('article')

    expect(bottomSpecification).not.toBeNull()
    expect(topSpecification).not.toBeNull()
    expect(screen.getByText(/Общая масса: 396 кг/)).toBeInTheDocument()
    expect(screen.getByText(/Общая масса: 328 кг/)).toBeInTheDocument()
    expect(bottomSpecification?.textContent).toContain('Стоимость: 51')
    expect(bottomSpecification?.textContent).toContain('560,45 руб.')
    expect(bottomSpecification?.textContent).toContain('130')
    expect(bottomSpecification?.textContent).toContain('200,00 руб/т')
    expect(topSpecification?.textContent).toContain('Стоимость: 42')
    expect(topSpecification?.textContent).toContain('654,38 руб.')
    expect(topSpecification?.textContent).toContain('130')
    expect(topSpecification?.textContent).toContain('200,00 руб/т')
  })

  it('renders the window type 5 glyph with two right-shifted vertical posts', () => {
    render(<WindowRigelDemoPage />)

    const typeFiveButton = screen.getByRole('button', { name: 'Тип окна 5' })

    expect(typeFiveButton.querySelectorAll('[data-testid^="glyph-mullion-5-"]')).toHaveLength(2)
  })
})
