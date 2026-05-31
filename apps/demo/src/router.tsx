import { Link, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { CityScene, MuseumScene } from './scenes/MuseumScene'
import { VbaoBunnyScene } from './scenes/VbaoBunnyScene'
import { VbaoLabScene } from './scenes/VbaoLabScene'
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
        <nav aria-label="Scenes">
          <Link to="/" activeProps={{ className: 'active' }}>
            Grid
          </Link>
          <Link to="/lab" activeProps={{ className: 'active' }}>
            Lab
          </Link>
          <Link to="/city" activeProps={{ className: 'active' }}>
            City
          </Link>
          <Link to="/museum" activeProps={{ className: 'active' }}>
            Museum
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
  component: VbaoScene,
})

const sponzaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sponza',
  component: VbaoSponzaScene,
})

const labRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lab',
  component: VbaoLabScene,
})

const cityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/city',
  component: CityScene,
})

const museumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/museum',
  component: MuseumScene,
})

const suzanneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/suzanne',
  component: VbaoSuzanneScene,
})

const bunnyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bunny',
  component: VbaoBunnyScene,
})

const parityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vbao-parity',
  component: VbaoParityPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  labRoute,
  cityRoute,
  museumRoute,
  sponzaRoute,
  suzanneRoute,
  bunnyRoute,
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
