// 講座項目の表示ラベル（ショップ・チケット表示で共用）

export const MACHINE_LABEL: Record<string, string> = {
  multicopter: 'マルチコプター',
  helicopter: 'ヘリコプター',
}
export const LICENSE_LABEL: Record<string, string> = {
  first: '一等',
  second: '二等',
}
export const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: '初学者',
  experienced: '経験者',
}
export const ITEM_TYPE_LABEL: Record<string, string> = {
  basic: '基本料金',
  night: '夜間',
  bvlos: '目視外',
  heavy: '25kg以上',
}

export function courseItemLabel(i: {
  machine: string
  license: string
  experience: string
  item_type: string
  days?: number | null
}): string {
  const base = `【${MACHINE_LABEL[i.machine]}】${LICENSE_LABEL[i.license]}・${EXPERIENCE_LABEL[i.experience]} ${ITEM_TYPE_LABEL[i.item_type]}`
  return i.item_type === 'basic' && i.days != null ? `${base}（受講${i.days}日）` : base
}
