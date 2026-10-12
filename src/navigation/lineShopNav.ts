export type LineShopArea = 'body' | 'paint'

export type LineShopPatch = {
  department: 'production'
  productionArea: LineShopArea
  productionPage: 'home' | 'training' | 'missing' | 'vehicles'
  trainingTab?: 'attendance'
  attendanceSubTab?: 'today'
  productivityTab?: 'productivity' | 'stops'
}

export type LineShopNavItem = {
  key: 'home' | 'training' | 'missing' | 'vehicles'
  perm: 'home' | 'training' | 'missing' | 'vehicles'
  label: string
  patch: LineShopPatch
  children?: { key: 'productivity' | 'stops'; label: string; patch: LineShopPatch }[]
}

/** صفحات البودي والدهان. الدهان يزيد النواقص. */
export function lineShopNavItems(area: LineShopArea, t: (key: string) => string): LineShopNavItem[] {
  const areaPatch = { department: 'production' as const, productionArea: area }
  const items: LineShopNavItem[] = [
    {
      key: 'home',
      perm: 'home',
      label: t('nav.home'),
      patch: { ...areaPatch, productionPage: 'home' }
    },
    {
      key: 'training',
      perm: 'training',
      label: t('home.attendanceTodayTitle'),
      patch: {
        ...areaPatch,
        productionPage: 'training',
        trainingTab: 'attendance',
        attendanceSubTab: 'today'
      }
    }
  ]

  if (area === 'paint') {
    items.push({
      key: 'missing',
      perm: 'missing',
      label: t('nav.missingParts'),
      patch: { ...areaPatch, productionPage: 'missing' }
    })
  }

  items.push({
    key: 'vehicles',
    perm: 'vehicles',
    label: t('nav.productivity'),
    patch: { ...areaPatch, productionPage: 'vehicles', productivityTab: 'productivity' },
    children: [
      {
        key: 'productivity',
        label: t('productivity.tabs.productivity'),
        patch: { ...areaPatch, productionPage: 'vehicles', productivityTab: 'productivity' }
      },
      {
        key: 'stops',
        label: t('productivity.tabs.stops'),
        patch: { ...areaPatch, productionPage: 'vehicles', productivityTab: 'stops' }
      }
    ]
  })

  return items
}
