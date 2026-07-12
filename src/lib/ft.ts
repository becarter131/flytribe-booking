// FlyTribeBooking の共通ロジック
// 飛行場は1つの資源なので、どれかの利用区分で「確定」した日は
// 他の区分では「埋まり（occupied）」として予約不可になる

export type FtDateState = 'blank' | 'tentative' | 'confirmed' | 'rejected' | 'occupied'

// 区分単体の状態（他区分の影響を含まない）
// 予約確定は人数だけでは成立せず、管理者の承認（approved）が必要
export function computeOwnState(
  participantCount: number,
  _minParticipants: number,
  operatorStatus: 'none' | 'approved' | 'rejected'
): Exclude<FtDateState, 'occupied'> {
  if (operatorStatus === 'rejected') return 'rejected'
  if (operatorStatus === 'approved') return 'confirmed'
  if (participantCount > 0) return 'tentative'
  return 'blank'
}

// 他区分の確定を反映した最終状態
export function applyCrossBlock(
  own: Exclude<FtDateState, 'occupied'>,
  anyOtherConfirmed: boolean
): FtDateState {
  if (own !== 'confirmed' && anyOtherConfirmed) return 'occupied'
  return own
}

export const FT_STATE_LABEL: Record<FtDateState, string> = {
  blank: '空き',
  tentative: '仮予約',
  confirmed: '確定',
  rejected: '受付停止',
  occupied: '埋まり',
}
