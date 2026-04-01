import { CalculatorPage } from '@/pages/calculator/ui/calculator-page'

export type DomainTab =
  | 'purlin'
  | 'column'
  | 'truss'
  | 'graphics'
  | 'summary'
  | 'selection-summary'
  | 'enclosing'
  | 'methodology'

export function App() {
  return <CalculatorPage initialDomain="column" />
}
