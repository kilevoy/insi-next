import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'

describe('App routing', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders the calculator on the root route', () => {
    window.history.replaceState({}, '', '/')

    render(<App />)

    expect(screen.getByTestId('calculator-page')).toBeInTheDocument()
    expect(screen.getByTestId('link-window-rigel-demo')).toHaveAttribute('href', '/window-rigel-demo')
  })

  it('renders the window rigel demo on the isolated route', () => {
    window.history.replaceState({}, '', '/window-rigel-demo')

    render(<App />)

    expect(screen.getByTestId('window-rigel-demo-page')).toBeInTheDocument()
    expect(screen.getByText('Подбор оконных ригелей')).toBeInTheDocument()
  })

  it('renders the window rigel demo on the GitHub Pages route', () => {
    window.history.replaceState({}, '', '/insi-next/window-rigel-demo')

    render(<App />)

    expect(screen.getByTestId('window-rigel-demo-page')).toBeInTheDocument()
  })
})
