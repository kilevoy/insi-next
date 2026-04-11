import { CalculatorPage } from '@/pages/calculator/ui/calculator-page'
import { CraneBeamDemoPage } from '@/pages/crane-beam-demo/ui/crane-beam-demo-page'
import { CraneBeamMethodologyPage } from '@/pages/crane-beam-methodology/ui/crane-beam-methodology-page'
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

function isCraneBeamMethodologyRoute(pathname: string): boolean {
  return pathname === '/crane-beam-methodology' || pathname.endsWith('/crane-beam-methodology')
}

function resolveRoutePath(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  const searchParams = new URLSearchParams(window.location.search)
  const routeParam = searchParams.get('route')?.trim()
  if (routeParam) {
    return routeParam.startsWith('/') ? routeParam : `/${routeParam}`
  }

  const hash = window.location.hash.trim()
  if (hash.startsWith('#/')) {
    return hash.slice(1)
  }

  return window.location.pathname
}

export function App() {
  const routePath = resolveRoutePath()

  if (isCraneBeamMethodologyRoute(routePath)) {
    return <CraneBeamMethodologyPage />
  }

  if (isCraneBeamDemoRoute(routePath)) {
    return <CraneBeamDemoPage />
  }

  if (isWindowRigelDemoRoute(routePath)) {
    return <WindowRigelDemoPage />
  }

  return <CalculatorPage initialDomain="column" />
}
