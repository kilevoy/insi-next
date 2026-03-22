import { expect, test } from '@playwright/test'

test('renders the calculator shell by default', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('calculator-page')).toBeVisible()
  await expect(page.getByTestId('tab-column')).toHaveClass(/active/)
  await expect(page.getByText('Параметры расчета')).toBeVisible()
})

test('switches between summary, methodology, column and purlin result tabs', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('tab-summary').click()
  await expect(page.getByTestId('tab-summary')).toHaveClass(/active/)
  await expect(page.getByText('Общие сведения о расчете')).toBeVisible()

  await page.getByTestId('tab-methodology').click()
  await expect(page.getByTestId('tab-methodology')).toHaveClass(/active/)
  await expect(page.getByText('Excel parity')).toBeVisible()

  await page.getByTestId('tab-purlin').click()
  await expect(page.getByTestId('tab-purlin')).toHaveClass(/active/)
  await expect(page.getByText('Источник спецификации прогонов')).toBeVisible()

  await page.getByTestId('tab-column').click()
  await expect(page.getByTestId('tab-column')).toHaveClass(/active/)
  await expect(page.getByText('Режим подбора колонн')).toBeVisible()
})

test('shows three snow bag modes in unified input', async ({ page }) => {
  await page.goto('/')

  const snowBagSelect = page.getByLabel('Снеговой мешок')
  await expect(snowBagSelect).toBeVisible()
  await snowBagSelect.selectOption('поперёк здания')
  await expect(page.getByText('Размер соседнего здания, м')).toBeVisible()
})

test('switches between light and dark themes', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('theme-dark').click()
  await expect(page.getByTestId('calculator-page')).toHaveAttribute('data-theme', 'dark')

  await page.getByTestId('theme-light').click()
  await expect(page.getByTestId('calculator-page')).toHaveAttribute('data-theme', 'light')
})
