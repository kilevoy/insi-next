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

function isWindowRigelDemoRoute(pathname: string): boolean {
  return pathname === '/window-rigel-demo' || pathname.endsWith('/window-rigel-demo')
}

export function App() {
  if (typeof window !== 'undefined' && isWindowRigelDemoRoute(window.location.pathname)) {
    return <WindowRigelDemoPage />
  }

  return <CalculatorPage initialDomain="column" />
}
