import { CalculatorPage } from '@/pages/calculator/ui/calculator-page'
import { WindowRigelDemoPage } from '@/pages/window-rigel-demo/ui/window-rigel-demo-page'

export type DomainTab =
  | 'purlin'
  | 'column'
  | 'truss'
  | 'summary'
  | 'selection-summary'
  | 'enclosing'
  | 'methodology'

export function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/window-rigel-demo') {
    return <WindowRigelDemoPage />
  }

  return <CalculatorPage initialDomain="column" />
}
