import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { UnifiedInputPanel } from '@/pages/calculator/ui/unified-input-panel'
import {
  defaultUnifiedInput,
  type UnifiedInputState,
} from '@/pages/calculator/model/unified-input'

const CLEAR_HEIGHT_LABEL = 'Высота до низа несущих, м'
const TRUSS_EAVE_DEPTH_LABEL = 'Высота фермы в карнизе, м'
const USE_MANUAL_LABEL = 'Использовать ручное значение'

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

    expect(screen.getByText(CLEAR_HEIGHT_LABEL)).toBeInTheDocument()
    expect(screen.getByText(TRUSS_EAVE_DEPTH_LABEL)).toBeInTheDocument()
    expect(screen.getByText(USE_MANUAL_LABEL)).toBeInTheDocument()
  })

  it('keeps manual truss eave depth when entered with a comma', async () => {
    const user = userEvent.setup()
    render(<TestHarness />)

    await user.click(screen.getByRole('checkbox', { name: USE_MANUAL_LABEL }))

    const input = screen.getByRole('textbox', { name: TRUSS_EAVE_DEPTH_LABEL })

    await user.clear(input)
    await user.type(input, '1,08')

    expect(input).toHaveValue('1,08')
  })

  it('keeps manual truss eave depth when pasted with a comma', async () => {
    const user = userEvent.setup()
    render(<TestHarness />)

    await user.click(screen.getByRole('checkbox', { name: USE_MANUAL_LABEL }))

    const input = screen.getByRole('textbox', { name: TRUSS_EAVE_DEPTH_LABEL })

    await user.clear(input)
    await user.click(input)
    await user.paste('1,08')

    expect(input).toHaveValue('1,08')
  })
})
