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

const routeTree = rootRoute.addChildren([indexRoute, sponzaRoute, suzanneRoute, bunnyRoute])

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
