import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { UnifiedInputPanel } from '@/pages/calculator/ui/unified-input-panel'
import {
  defaultUnifiedInput,
  type UnifiedInputState,
} from '@/pages/calculator/model/unified-input'

function TestHarness() {
  const [input, setInput] = useState<UnifiedInputState>(defaultUnifiedInput)

  return (
    <UnifiedInputPanel
      input={input}
      onChange={(key, value) => setInput((prev) => ({ ...prev, [key]: value }))}
    />
  )
}

describe('UnifiedInputPanel', () => {
  it('shows readable Russian labels for the height fields', () => {
    render(<TestHarness />)

    expect(screen.getByText('Высота до низа несущих, м')).toBeInTheDocument()
    expect(screen.getByText('Высота фермы в карнизе, м')).toBeInTheDocument()
    expect(screen.getByText('Использовать ручное значение')).toBeInTheDocument()
  })

  it('keeps manual truss eave depth when entered with a comma', async () => {
    const user = userEvent.setup()
    render(<TestHarness />)

    await user.click(screen.getByRole('checkbox', { name: 'Использовать ручное значение' }))

    const input = screen.getByRole('textbox', { name: 'Высота фермы в карнизе, м' })

    await user.clear(input)
    await user.type(input, '1,08')

    expect(input).toHaveValue('1,08')
  })
})
