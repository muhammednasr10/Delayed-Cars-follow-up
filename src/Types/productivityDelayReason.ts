export type ProductivityDelayKind = 'entry' | 'exit'

export type ProductivityDelayReason = {
  id: string
  workDate: string
  kind: ProductivityDelayKind
  reasons: string
}

export type ProductivityDelayReasonInput = {
  workDate: string
  kind: ProductivityDelayKind
  reasons: string
}
