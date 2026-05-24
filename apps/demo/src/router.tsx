import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { BunnyScene } from './scenes/BunnyScene'
import { GridScene } from './scenes/GridScene'
import { SponzaScene } from './scenes/SponzaScene'
import { SuzanneScene } from './scenes/SuzanneScene'
import { VbaoBunnyScene } from './scenes/VbaoBunnyScene'
import { VbaoParityPage } from './scenes/VbaoParityPage'
import { VbaoScene } from './scenes/VbaoScene'
import { VbaoSponzaScene } from './scenes/VbaoSponzaScene'
import { VbaoSuzanneScene } from './scenes/VbaoSuzanneScene'

function RootLayout() {
  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Scene navigation">
        <Link to="/" className="brand" aria-label="HorizonAO grid scene">
          <span>Horizon</span>
          <strong>AO</strong>
        </Link>
        <nav>
          <Link to="/" activeProps={{ className: 'active' }}>
            Grid
          </Link>
          <Link to="/sponza" activeProps={{ className: 'active' }}>
            Sponza
          </Link>
          <Link to="/suzanne" activeProps={{ className: 'active' }}>
            Suzanne
          </Link>
          <Link to="/bunny" activeProps={{ className: 'active' }}>
            Bunny
          </Link>
          <Link to="/vbao" activeProps={{ className: 'active' }}>
            VBAO
          </Link>
          <Link to="/vbao-sponza" activeProps={{ className: 'active' }}>
            VBAO·Sponza
          </Link>
          <Link to="/vbao-bunny" activeProps={{ className: 'active' }}>
            VBAO·Bunny
          </Link>
          <Link to="/vbao-suzanne" activeProps={{ className: 'active' }}>
            VBAO·Suzanne
          </Link>
        </nav>
      </header>
      <Outlet />
    </main>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GridScene,
})

const sponzaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sponza',
  component: SponzaScene,
})

const suzanneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/suzanne',
  component: SuzanneScene,
})

const bunnyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bunny',
  component: BunnyScene,
})

const vbaoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vbao',
  component: VbaoScene,
})

const vbaoSponzaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vbao-sponza',
  component: VbaoSponzaScene,
})

const vbaoBunnyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vbao-bunny',
  component: VbaoBunnyScene,
})

const vbaoSuzanneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vbao-suzanne',
  component: VbaoSuzanneScene,
})

const parityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vbao-parity',
  component: VbaoParityPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  sponzaRoute,
  suzanneRoute,
  bunnyRoute,
  vbaoRoute,
  vbaoSponzaRoute,
  vbaoBunnyRoute,
  vbaoSuzanneRoute,
  parityRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
