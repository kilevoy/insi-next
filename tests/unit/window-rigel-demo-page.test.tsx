import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WindowRigelDemoPage } from '../../src/pages/window-rigel-demo/ui/window-rigel-demo-page'

const text = {
  city: '\u0413\u043E\u0440\u043E\u0434',
  construction: '\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u043E\u043A\u043D\u0430',
  maxUtilization: '\u041C\u0430\u043A\u0441. \u043A-\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F',
  windowCount: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u043A\u043E\u043D',
  tubeS245: '\u0422\u0440\u0443\u0431\u0430 \u0421245, \u0440\u0443\u0431/\u043A\u0433',
  result: '\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0434\u0431\u043E\u0440\u0430',
  bestBottom: '\u041B\u0443\u0447\u0448\u0438\u0439 \u043D\u0438\u0436\u043D\u0438\u0439 \u0440\u0438\u0433\u0435\u043B\u044C',
  bestTop: '\u041B\u0443\u0447\u0448\u0438\u0439 \u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u0440\u0438\u0433\u0435\u043B\u044C',
  noBottom: '\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u043D\u0438\u0436\u043D\u0438\u0445 \u0440\u0438\u0433\u0435\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.',
  noTop: '\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0432\u0435\u0440\u0445\u043D\u0438\u0445 \u0440\u0438\u0433\u0435\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.',
  wind: '\u0412\u0435\u0442\u0435\u0440',
  vertical: '\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u0430\u044F',
  windowType: '\u0422\u0438\u043F \u043E\u043A\u043D\u0430',
} as const

describe('WindowRigelDemoPage', () => {
  it('shows the default calculated top candidates', () => {
    render(<WindowRigelDemoPage />)

    expect(screen.getByTestId('window-rigel-demo-page')).toBeInTheDocument()
    expect(screen.getAllByText(/кв\.120х3/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Сталь: С245').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Коэффициенты: гибкость 0,76 · прочность 0,82 · прогиб 0,87/)[0]).toBeInTheDocument()
  })

  it('recalculates when the max utilization changes', () => {
    render(<WindowRigelDemoPage />)

    fireEvent.change(screen.getByLabelText(text.maxUtilization), { target: { value: '0,01' } })

    expect(screen.getByText(text.noBottom)).toBeInTheDocument()
    expect(screen.getByText(text.noTop)).toBeInTheDocument()
  })

  it('allows changing the city through a safe select control', () => {
    render(<WindowRigelDemoPage />)

    const citySelect = screen.getByRole('combobox', { name: text.city })
    fireEvent.change(citySelect, { target: { value: 'Москва' } })

    expect(screen.getByDisplayValue('Москва')).toBeInTheDocument()
    expect(screen.getByText(/Ветер:/)).toBeInTheDocument()
  })

  it('updates the wind load when Almetyevsk is selected', () => {
    render(<WindowRigelDemoPage />)

    const citySelect = screen.getByRole('combobox', { name: text.city })
    fireEvent.change(citySelect, { target: { value: 'Альметьевск' } })

    expect(screen.getByDisplayValue('Альметьевск')).toBeInTheDocument()
    expect(screen.getByText('Ветер: 0,300 кПа')).toBeInTheDocument()
  })

  it('updates the vertical load when window construction changes', () => {
    render(<WindowRigelDemoPage />)

    const constructionSelect = screen.getByRole('combobox', { name: text.construction })
    fireEvent.change(constructionSelect, { target: { value: '1ый стеклопакет' } })

    expect(screen.getByDisplayValue('1ый стеклопакет')).toBeInTheDocument()
    expect(screen.getByText('Вертикальная: 0,300 кПа')).toBeInTheDocument()
  })

  it('keeps the window count input available for future wall visualization work', () => {
    render(<WindowRigelDemoPage />)

    const windowCountInput = screen.getByLabelText(text.windowCount)
    fireEvent.change(windowCountInput, { target: { value: '6' } })

    expect(screen.getByLabelText(text.windowCount)).toHaveValue('6')
  })

  it('shows a result block with best rigels total mass and cost by window count', () => {
    render(<WindowRigelDemoPage />)

    fireEvent.change(screen.getByLabelText(text.windowCount), { target: { value: '6' } })

    expect(screen.getByText(text.result)).toBeInTheDocument()
    const bottomSpecification = screen.getByText(text.bestBottom).closest('article')
    const topSpecification = screen.getByText(text.bestTop).closest('article')

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

    const typeFiveButton = screen.getByRole('button', { name: `${text.windowType} 5` })

    expect(typeFiveButton.querySelectorAll('[data-testid^="glyph-mullion-5-"]')).toHaveLength(2)
  })

  it('recalculates cost when tube prices change', () => {
    render(<WindowRigelDemoPage />)

    fireEvent.change(screen.getByLabelText(text.windowCount), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText(text.tubeS245), { target: { value: '150' } })

    const bottomSpecification = screen.getByText(text.bestBottom).closest('article')
    const topSpecification = screen.getByText(text.bestTop).closest('article')

    expect(bottomSpecification?.textContent).toContain('59')
    expect(bottomSpecification?.textContent).toContain('401,44 руб.')
    expect(bottomSpecification?.textContent).toContain('150')
    expect(bottomSpecification?.textContent).toContain('000,00 руб/т')
    expect(topSpecification?.textContent).toContain('49')
    expect(topSpecification?.textContent).toContain('140,99 руб.')
    expect(topSpecification?.textContent).toContain('150')
    expect(topSpecification?.textContent).toContain('000,00 руб/т')
  })
})
