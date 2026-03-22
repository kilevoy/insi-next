import { CalculatorPage } from '@/pages/calculator/ui/calculator-page'

export type DomainTab = 'purlin' | 'column' | 'summary' | 'methodology'

export function App() {
  return <CalculatorPage initialDomain="column" />
}
