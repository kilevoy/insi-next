import { CalculatorPage } from '@/pages/calculator/ui/calculator-page'
import { CraneBeamDemoPage } from '@/pages/crane-beam-demo/ui/crane-beam-demo-page'
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

function isCraneBeamDemoRoute(pathname: string): boolean {
  return pathname === '/crane-beam-demo' || pathname.endsWith('/crane-beam-demo')
}

export function App() {
  if (typeof window !== 'undefined' && isCraneBeamDemoRoute(window.location.pathname)) {
    return <CraneBeamDemoPage />
  }

  if (typeof window !== 'undefined' && isWindowRigelDemoRoute(window.location.pathname)) {
    return <WindowRigelDemoPage />
  }

  return <CalculatorPage initialDomain="column" />
}
