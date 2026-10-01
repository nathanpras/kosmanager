import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { h, defineComponent } from 'vue'
import MobileShell from '../../components/mobile/MobileShell.vue'

/**
 * Tahap 1 port: shell mobile berdiri sendiri — tiga tab, tumpukan layar, dan
 * dok yang turun begitu masuk drill-down.
 */

const Kosong = defineComponent({ render: () => h('div', { class: 'uji-layar' }) })

function buatRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/m',
        component: MobileShell,
        children: [
          { path: '',         name: 'm-properti', component: Kosong },
          { path: 'kalender', name: 'm-kalender', component: Kosong },
          { path: 'penghuni', name: 'm-penghuni', component: Kosong },
          /* Drill-down: bukan layar tab, jadi doknya harus turun */
          { path: 'prop/:id', name: 'm-prop',     component: Kosong },
        ],
      },
    ],
  })
}

let router: Router

beforeEach(() => { router = buatRouter() })

/* Pasang RouterView sebagai akar: router yang merakit MobileShell beserta
   layar anaknya, persis seperti di aplikasi. */
async function pasang(ke: string) {
  await router.push(ke)
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await w.vm.$nextTick()
  return w
}

describe('MobileShell', () => {
  it('akar memakai class .kmob — tanpa itu seluruh gayanya tidak berlaku', async () => {
    const w = await pasang('/m')
    expect(w.find('.kmob').exists()).toBe(true)
  })

  it('punya tepat tiga tab: Properti, Kalender, Penghuni', async () => {
    const w = await pasang('/m')
    const tab = w.findAll('.dock .tabitem')
    expect(tab.map(t => t.text())).toEqual(['Properti', 'Kalender', 'Penghuni'])
  })

  it('Tagihan sengaja bukan tab', async () => {
    const w = await pasang('/m')
    expect(w.find('.dock').text()).not.toContain('Tagihan')
  })

  it('menandai tab yang sedang aktif', async () => {
    const w = await pasang('/m/kalender')
    const aktif = w.findAll('.dock .tabitem').filter(t => t.classes('is-on'))
    expect(aktif).toHaveLength(1)
    expect(aktif[0].text()).toBe('Kalender')
    expect(aktif[0].attributes('aria-current')).toBe('page')
  })

  it('mengetuk tab berpindah rute', async () => {
    const w = await pasang('/m')
    await w.findAll('.dock .tabitem')[2].trigger('click')
    await flushPromises()   /* navigasi router asinkron */
    expect(router.currentRoute.value.name).toBe('m-penghuni')
  })

  it('dok turun saat masuk drill-down, bukan layar tab', async () => {
    const wTab = await pasang('/m')
    expect(wTab.find('.dock').classes()).not.toContain('is-hidden')

    const wDalam = await pasang('/m/prop/p1')
    expect(wDalam.find('.dock').classes()).toContain('is-hidden')
  })
})
