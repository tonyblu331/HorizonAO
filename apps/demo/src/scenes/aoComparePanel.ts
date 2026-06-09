export type AoMode = 'off' | 'gtao' | 'ssao' | 'vbao' | 'n8ao'

export type AoViewMode = 'combined' | 'ao'

interface AoComparePanel {
  readonly element: HTMLDivElement
  sync: (mode: AoMode, viewMode: AoViewMode) => void
  remove: () => void
}

export function createAoComparePanel(
  container: HTMLElement,
  initialMode: AoMode,
  initialViewMode: AoViewMode,
  onChange: (state: { readonly mode?: AoMode; readonly viewMode?: AoViewMode }) => void,
  aoAvailable = true,
): AoComparePanel {
  const panel = document.createElement('div')
  panel.className = 'compare-panel'
  panel.innerHTML = `
    <strong>AO</strong>
    <div class="compare-options" role="group" aria-label="Ambient occlusion mode">
      <button type="button" data-ao="off">Off</button>
      <button type="button" data-ao="gtao">GTAO</button>
      <button type="button" data-ao="ssao" title="TSL/WebGPU SSAO baseline">SSAO</button>
      <button type="button" data-ao="vbao">VBAO</button>
      <button type="button" data-ao="n8ao">N8AO</button>
    </div>
    <div class="compare-options compare-options-secondary" role="group" aria-label="AO display mode">
      <button type="button" data-view="combined">Scene</button>
      <button type="button" data-view="ao">AO only</button>
    </div>
  `
  container.appendChild(panel)
  if (!aoAvailable) {
    panel
      .querySelectorAll<HTMLButtonElement>('[data-ao]:not([data-ao="off"]), [data-view="ao"]')
      .forEach((button) => {
        button.disabled = true
        button.title = 'AO comparison requires the Three.js WebGPU backend.'
      })
  }

  const sync = (mode: AoMode, viewMode: AoViewMode) => {
    panel.querySelectorAll<HTMLButtonElement>('[data-ao]').forEach((button) => {
      const selected = button.dataset.ao === mode
      button.classList.toggle('active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    panel.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
      const selected = button.dataset.view === viewMode
      button.classList.toggle('active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof HTMLButtonElement)) return
    if (
      target.dataset.ao === 'off' ||
      target.dataset.ao === 'gtao' ||
      target.dataset.ao === 'ssao' ||
      target.dataset.ao === 'vbao' ||
      target.dataset.ao === 'n8ao'
    ) {
      onChange({ mode: target.dataset.ao })
      return
    }
    if (target.dataset.view === 'combined' || target.dataset.view === 'ao') {
      onChange({ viewMode: target.dataset.view })
    }
  }

  panel.addEventListener('click', onClick)
  sync(initialMode, initialViewMode)

  return {
    element: panel,
    sync,
    remove: () => {
      panel.removeEventListener('click', onClick)
      panel.remove()
    },
  }
}
