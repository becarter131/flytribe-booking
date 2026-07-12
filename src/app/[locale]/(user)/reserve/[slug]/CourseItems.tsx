'use client'

import { useEffect, useState } from 'react'

interface CourseItem {
  id: string
  machine: 'multicopter' | 'helicopter'
  license: 'first' | 'second'
  experience: 'beginner' | 'experienced'
  itemType: 'basic' | 'night' | 'bvlos' | 'heavy'
  days: number | null
  priceJpy: number
}

const MACHINE_LABEL = { multicopter: 'マルチコプター', helicopter: 'ヘリコプター' } as const
const LICENSE_LABEL = { first: '一等', second: '二等' } as const
const EXPERIENCE_LABEL = { beginner: '初学者', experienced: '経験者' } as const
const ITEM_LABEL = {
  basic: '基本料金',
  night: '夜間（基本料金に加算）',
  bvlos: '目視外（基本料金に加算）',
  heavy: '25kg以上（基本料金に加算）',
} as const

type MachineFilter = 'all' | 'multicopter' | 'helicopter'
type LicenseFilter = 'all' | 'first' | 'second'
type ExperienceFilter = 'all' | 'beginner' | 'experienced'

// 国家資格講座のコース内容・料金表（フィルター付き）
export default function CourseItems() {
  const [items, setItems] = useState<CourseItem[]>([])
  const [machine, setMachine] = useState<MachineFilter>('all')
  const [license, setLicense] = useState<LicenseFilter>('all')
  const [experience, setExperience] = useState<ExperienceFilter>('all')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/ft/course-items')
      if (res.ok) setItems(await res.json())
    }
    void load()
  }, [])

  const filtered = items.filter(
    (i) =>
      (machine === 'all' || i.machine === machine) &&
      (license === 'all' || i.license === license) &&
      (experience === 'all' || i.experience === experience)
  )

  // 機体×等級×区分 ごとにグループ表示する
  const groups: { key: string; title: string; items: CourseItem[] }[] = []
  for (const i of filtered) {
    const key = `${i.machine}|${i.license}|${i.experience}`
    let g = groups.find((g) => g.key === key)
    if (!g) {
      g = {
        key,
        title: `【${MACHINE_LABEL[i.machine]}】${LICENSE_LABEL[i.license]}無人航空機操縦士コース（${EXPERIENCE_LABEL[i.experience]}）`,
        items: [],
      }
      groups.push(g)
    }
    g.items.push(i)
  }

  const chip = (active: boolean) =>
    `text-sm px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-sky-600 text-white border-sky-600'
        : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400'
    }`

  return (
    <section className="bg-white rounded-2xl shadow-md p-5 mb-4">
      <h2 className="font-bold text-gray-800 mb-1">コース内容・料金</h2>
      <p className="text-xs text-gray-500 mb-3">※料金は全て税込</p>

      {/* フィルター */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMachine('all')} className={chip(machine === 'all')}>
            全機体
          </button>
          <button
            type="button"
            onClick={() => setMachine('multicopter')}
            className={chip(machine === 'multicopter')}
          >
            マルチコプター
          </button>
          <button
            type="button"
            onClick={() => setMachine('helicopter')}
            className={chip(machine === 'helicopter')}
          >
            ヘリコプター
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLicense('all')} className={chip(license === 'all')}>
            一等・二等
          </button>
          <button type="button" onClick={() => setLicense('first')} className={chip(license === 'first')}>
            一等
          </button>
          <button
            type="button"
            onClick={() => setLicense('second')}
            className={chip(license === 'second')}
          >
            二等
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExperience('all')}
            className={chip(experience === 'all')}
          >
            初学者・経験者
          </button>
          <button
            type="button"
            onClick={() => setExperience('beginner')}
            className={chip(experience === 'beginner')}
          >
            初学者
          </button>
          <button
            type="button"
            onClick={() => setExperience('experienced')}
            className={chip(experience === 'experienced')}
          >
            経験者
          </button>
        </div>
      </div>

      {/* 料金表 */}
      {groups.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">
          該当するコースがありません
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="border border-gray-200 rounded-xl overflow-hidden">
              <p className="bg-sky-50 text-sky-800 font-semibold text-sm px-4 py-2">
                {g.title}
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-700">
                        {ITEM_LABEL[i.itemType]}
                        {i.itemType === 'basic' && i.days != null && (
                          <span className="text-xs text-gray-400 ml-1">
                            （受講{i.days}日）
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {i.itemType === 'basic' ? '' : '+'}
                        {i.priceJpy.toLocaleString()}円
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
